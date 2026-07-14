import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

import { requireAuth, AuthRequest, TEST_LOGIN_TOKEN } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getUserByUid,
  getUserById,
  updateUserConfig,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getPersonnel,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierOrders,
  getSupplierOrderById,
  createSupplierOrder,
  updateSupplierOrder,
  deleteSupplierOrder,
  getStocks,
  createStock,
  updateStock,
  deleteStock,
  deductStockForOrder,
  getStockMovements,
  createStockMovement,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
  getSpecialEvents,
  createSpecialEvent,
  deleteSpecialEvent,
  getRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  generateRecurringExpenses,
  getDeliveries,
  createDelivery,
  updateDelivery,
  deleteDelivery
} from './src/db/queries.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createHttpServer(app);
  
  // Set up Socket.io server
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Handle Socket.io connections
  io.on('connection', (socket) => {
    socket.on('join', (roomName) => {
      socket.join(String(roomName));
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      // Clean up
    });
  });

  app.use(express.json());

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Enrichit l'utilisateur avec dataOwnerId (propriétaire effectif des données).
  // Pour un gérant rattaché, on affiche aussi le nom/logo du restaurant du propriétaire.
  async function buildSessionUser(dbUser: any) {
    const dataOwnerId = dbUser.ownerId || dbUser.id;
    const sessionUser: any = { ...dbUser, dataOwnerId };
    if (dbUser.ownerId) {
      const owner = await getUserById(dbUser.ownerId);
      if (owner) {
        sessionUser.restaurantName = owner.restaurantName;
        sessionUser.restaurantLogoUrl = owner.restaurantLogoUrl;
        sessionUser.restaurantPhone = owner.restaurantPhone;
        sessionUser.restaurantAddress = owner.restaurantAddress;
      }
    }
    return sessionUser;
  }

  // API Route: Test Login (accès admin local sans Firebase, gated par ENABLE_TEST_LOGIN)
  app.post('/api/auth/test-login', async (req, res) => {
    try {
      if (process.env.ENABLE_TEST_LOGIN !== 'true') {
        return res.status(403).json({ error: 'Le login de test est désactivé sur ce serveur.' });
      }
      const dbUser = await getOrCreateUser(
        'test-super-admin',
        'admin@test.local',
        'Admin Test',
        '',
        'super_admin'
      );
      res.json({ token: TEST_LOGIN_TOKEN, user: await buildSessionUser(dbUser) });
    } catch (error: any) {
      console.error('Error during test login:', error);
      res.status(500).json({ error: error.message || 'Le login de test a échoué' });
    }
  });

  // API Route: Sync Auth User (Register or fetch PostgreSQL user)
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userPayload = req.user;
      if (!userPayload) {
        return res.status(401).json({ error: 'User token verification failed' });
      }

      const { role, ownerEmail } = req.body;
      const email = userPayload.email || '';
      const uid = userPayload.uid;
      const displayName = userPayload.name || email.split('@')[0];
      const photoUrl = userPayload.picture || '';

      const dbUser = await getOrCreateUser(uid, email, displayName, photoUrl, role, ownerEmail);
      res.json(await buildSessionUser(dbUser));
    } catch (error: any) {
      console.error('Error syncing auth user:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // --- CLIENTS ENDPOINTS ---

  app.get('/api/clients', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId parameter' });
      }

      const clientsList = await getClients(dbUserId);
      res.json(clientsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/clients', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, name, email, phone, loyaltyPoints, notes } = req.body;
      if (!dbUserId || !name) {
        return res.status(400).json({ error: 'Missing dbUserId or name' });
      }

      const newClient = await createClient(
        parseInt(dbUserId),
        name,
        email,
        phone,
        loyaltyPoints ? parseInt(loyaltyPoints) : 0,
        notes
      );

      // Save notification to database
      const notifTitle = 'Client Enregistré';
      const notifMsg = `Le client "${name}" a été ajouté avec succès.`;
      const newNotif = await createNotification(parseInt(dbUserId), notifTitle, notifMsg, 'client_update');

      // Send real-time events via Socket.io
      const room = String(dbUserId);
      io.to(room).emit('client_created', newClient);
      io.to(room).emit('notification', newNotif);

      res.status(201).json(newClient);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/clients/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { dbUserId, name, email, phone, loyaltyPoints, notes } = req.body;

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const updated = await updateClient(clientId, parseInt(dbUserId), {
        name,
        email,
        phone,
        loyaltyPoints: loyaltyPoints ? parseInt(loyaltyPoints) : undefined,
        notes
      });

      if (!updated) {
        return res.status(404).json({ error: 'Client not found or access denied' });
      }

      // Send real-time events via Socket.io
      const room = String(dbUserId);
      io.to(room).emit('client_updated', updated);

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/clients/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const deleted = await deleteClient(clientId, dbUserId);
      if (!deleted) {
        return res.status(404).json({ error: 'Client not found or access denied' });
      }

      // Send real-time events via Socket.io
      const room = String(dbUserId);
      io.to(room).emit('client_deleted', { id: clientId });

      res.json({ message: 'Client deleted successfully', client: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- PERSONNEL ENDPOINTS ---

  app.get('/api/personnel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId parameter' });
      }

      const list = await getPersonnel(dbUserId);
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/personnel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, name, email, phone, role, status, hourlyRate, salary, leaveStart, leaveEnd, hireDate, avatarUrl, cvUrl } = req.body;
      if (!dbUserId || !name) {
        return res.status(400).json({ error: 'Missing dbUserId or name' });
      }

      // Restriction : seul le super_admin peut fixer un salaire. Un gérant crée avec un salaire à 0.
      const creator = req.user?.uid ? await getUserByUid(req.user.uid) : null;
      const creatorIsGerant = creator?.role === 'gerant';
      const effectiveSalary = creatorIsGerant ? 0.0 : (salary ? parseFloat(salary) : 0.0);

      const newMember = await createPersonnel(
        parseInt(dbUserId),
        name,
        email,
        phone,
        role,
        status,
        hourlyRate ? parseFloat(hourlyRate) : 15.0,
        effectiveSalary,
        leaveStart,
        leaveEnd,
        hireDate,
        avatarUrl,
        cvUrl
      );

      // Save notification to database
      const notifTitle = 'Personnel Ajouté';
      const notifMsg = `${name} (${role}) a rejoint l'équipe du restaurant.`;
      const newNotif = await createNotification(parseInt(dbUserId), notifTitle, notifMsg, 'staff_update');

      // Send real-time events via Socket.io
      const room = String(dbUserId);
      io.to(room).emit('personnel_created', newMember);
      io.to(room).emit('notification', newNotif);

      res.status(201).json(newMember);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/personnel/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const personnelId = parseInt(req.params.id);
      const { dbUserId, name, email, phone, role, status, hourlyRate, salary, leaveStart, leaveEnd, hireDate, avatarUrl, cvUrl } = req.body;

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      // Restriction : un gérant ne peut pas modifier le salaire (on laisse la valeur existante inchangée).
      const editor = req.user?.uid ? await getUserByUid(req.user.uid) : null;
      const editorIsGerant = editor?.role === 'gerant';

      const updated = await updatePersonnel(personnelId, parseInt(dbUserId), {
        name,
        email,
        phone,
        role,
        status,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        salary: editorIsGerant ? undefined : (salary ? parseFloat(salary) : undefined),
        leaveStart,
        leaveEnd,
        hireDate,
        avatarUrl,
        cvUrl
      });

      if (!updated) {
        return res.status(404).json({ error: 'Staff member not found or access denied' });
      }

      // Save notification to database on status shift
      const notifTitle = 'Mise à jour Staff';
      const notifMsg = `Le statut de ${name} est maintenant : ${status}.`;
      const newNotif = await createNotification(parseInt(dbUserId), notifTitle, notifMsg, 'staff_update');

      const room = String(dbUserId);
      io.to(room).emit('personnel_updated', updated);
      io.to(room).emit('notification', newNotif);

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/personnel/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const personnelId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const deleted = await deletePersonnel(personnelId, dbUserId);
      if (!deleted) {
        return res.status(404).json({ error: 'Staff member not found or access denied' });
      }

      // Send real-time events via Socket.io
      const room = String(dbUserId);
      io.to(room).emit('personnel_deleted', { id: personnelId });

      res.json({ message: 'Staff deleted successfully', member: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- MENU ITEMS ENDPOINTS ---

  app.get('/api/menu-items', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId parameter' });
      }

      const items = await getMenuItems(dbUserId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/menu-items', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, name, description, price, category, isAvailable, imageUrl, ingredients } = req.body;
      if (!dbUserId || !name) {
        return res.status(400).json({ error: 'Missing dbUserId or name' });
      }

      const newItem = await createMenuItem(
        parseInt(dbUserId),
        name,
        description,
        price ? parseFloat(price) : 0.0,
        category,
        isAvailable !== undefined ? Boolean(isAvailable) : true,
        imageUrl,
        Array.isArray(ingredients) ? ingredients : null
      );

      const room = String(dbUserId);
      io.to(room).emit('menu_item_created', newItem);

      res.status(201).json(newItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/menu-items/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { dbUserId, name, description, price, category, isAvailable, imageUrl, ingredients } = req.body;

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const updated = await updateMenuItem(itemId, parseInt(dbUserId), {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        category,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined,
        imageUrl,
        ingredients: Array.isArray(ingredients) ? ingredients : undefined
      });

      if (!updated) {
        return res.status(404).json({ error: 'Menu item not found or access denied' });
      }

      const room = String(dbUserId);
      io.to(room).emit('menu_item_updated', updated);

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/menu-items/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const deleted = await deleteMenuItem(itemId, dbUserId);
      if (!deleted) {
        return res.status(404).json({ error: 'Menu item not found or access denied' });
      }

      const room = String(dbUserId);
      io.to(room).emit('menu_item_deleted', { id: itemId });

      res.json({ message: 'Menu item deleted successfully', item: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- ORDERS ENDPOINTS ---

  app.get('/api/orders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId parameter' });
      }

      const ordersList = await getOrders(dbUserId);
      res.json(ordersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Déduction auto du stock des ingrédients quand une commande est payée (une seule fois par commande).
  async function handleStockDeduction(dbUserId: number, orderId: number) {
    const result = await deductStockForOrder(dbUserId, orderId);
    if (!result || !result.deducted || result.stocks.length === 0) return;
    const room = String(dbUserId);
    for (const s of result.stocks) io.to(room).emit('stock_updated', s);
    for (const a of result.alerts) {
      const notif = await createNotification(
        dbUserId,
        'Stock bas',
        `${a.itemName} : ${a.quantity} ${a.unit} restant (seuil ${a.minStock}).`,
        'system'
      );
      io.to(room).emit('notification', notif);
    }
  }

  app.post('/api/orders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, tableNumber, status, paymentMethod, items, serverName, orderType, taxRate } = req.body;
      if (!dbUserId || !tableNumber) {
        return res.status(400).json({ error: 'Missing dbUserId or tableNumber' });
      }

      const newOrder = await createOrder(
        parseInt(dbUserId),
        parseInt(tableNumber),
        status,
        paymentMethod,
        Array.isArray(items) ? items : [],
        serverName || null,
        orderType || 'sur_place',
        taxRate !== undefined ? parseFloat(taxRate) : 0
      );

      // Save notification to database
      const notifTitle = 'Nouvelle Commande';
      const notifMsg = `Une commande a été ouverte pour la Table ${tableNumber} d'un montant de ${newOrder?.totalAmount || 0} Ar`;
      const newNotif = await createNotification(parseInt(dbUserId), notifTitle, notifMsg, 'order_created');

      // Send real-time events via Socket.io
      const room = String(dbUserId);
      io.to(room).emit('order_created', newOrder);
      io.to(room).emit('notification', newNotif);

      // Dès que le plat est servi (ou payé), on décrémente le stock des ingrédients consommés.
      if (newOrder?.status === 'servi' || newOrder?.status === 'paye') {
        await handleStockDeduction(parseInt(dbUserId), newOrder.id);
      }

      res.status(201).json(newOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/orders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { dbUserId, tableNumber, status, paymentMethod, items, serverName, orderType, taxRate } = req.body;

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const updated = await updateOrder(orderId, parseInt(dbUserId), {
        tableNumber: tableNumber ? parseInt(tableNumber) : undefined,
        status,
        paymentMethod,
        serverName: serverName !== undefined ? (serverName || null) : undefined,
        orderType: orderType !== undefined ? orderType : undefined,
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : undefined,
        items: Array.isArray(items) ? items : undefined
      });

      if (!updated) {
        return res.status(404).json({ error: 'Order not found or access denied' });
      }

      // Save notification to database on status shift
      const notifTitle = 'Statut Commande';
      const notifMsg = `La commande de la Table ${updated.tableNumber} est désormais : ${status}.`;
      const newNotif = await createNotification(parseInt(dbUserId), notifTitle, notifMsg, 'order_status_updated');

      const room = String(dbUserId);
      io.to(room).emit('order_updated', updated);
      io.to(room).emit('notification', newNotif);

      // Déduction auto du stock dès "servi" (ou "payé"), une seule fois grâce au drapeau stock_deducted.
      if (updated.status === 'servi' || updated.status === 'paye') {
        await handleStockDeduction(parseInt(dbUserId), orderId);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/orders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const deleted = await deleteOrder(orderId, dbUserId);
      if (!deleted) {
        return res.status(404).json({ error: 'Order not found or access denied' });
      }

      const room = String(dbUserId);
      io.to(room).emit('order_deleted', { id: orderId });

      res.json({ message: 'Order deleted successfully', order: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- NOTIFICATIONS ENDPOINTS ---

  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId parameter' });
      }

      const notifs = await getNotifications(dbUserId);
      res.json(notifs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
    try {
      const notifId = parseInt(req.params.id);
      const { dbUserId } = req.body;

      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const updated = await markNotificationAsRead(notifId, parseInt(dbUserId));
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/notifications/mark-all-read', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId } = req.body;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      await markAllNotificationsAsRead(parseInt(dbUserId));
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Simulated Restaurant Coworker / IoT Trigger (Simulation in French)
  app.post('/api/notifications/trigger-simulation', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId } = req.body;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      const notificationsPool = [
        {
          title: 'Nouvelle Réservation',
          message: 'Le client VIP Marc Brunet a réservé la table 8 pour 20h00.',
          type: 'client_update'
        },
        {
          title: 'Commande en cuisine',
          message: 'La table 5 a commandé : 2 Filets de Bœuf, 1 Tarte Tatin, 1 Bouteille de Bordeaux.',
          type: 'order_created'
        },
        {
          title: 'Statut Personnel',
          message: 'Le serveur Lucas Martin vient de commencer son service de soir.',
          type: 'staff_update'
        },
        {
          title: 'Paiement Reçu',
          message: 'La table 12 a réglé son addition de 114 500 Ar par Carte Bancaire.',
          type: 'order_status_updated'
        },
        {
          title: 'Fidélité Client',
          message: 'La cliente Sophie Laurent a cumulé 40 points de fidélité supplémentaires.',
          type: 'client_update'
        },
        {
          title: 'Rapport d\'activité',
          message: 'Cuisine en pleine effervescence : Temps moyen de préparation estimé à 14 minutes.',
          type: 'system'
        }
      ];

      const chosen = notificationsPool[Math.floor(Math.random() * notificationsPool.length)];

      // Store in DB
      const newNotif = await createNotification(parseInt(dbUserId), chosen.title, chosen.message, chosen.type);

      // Push real-time event to that user
      const room = String(dbUserId);
      io.to(room).emit('notification', newNotif);

      res.json(newNotif);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- CONFIG/SETTINGS ENDPOINTS ---
  app.put('/api/users/config', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, restaurantName, restaurantLogoUrl, restaurantPhone, restaurantAddress, role } = req.body;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }

      // Restriction : seul un super_admin peut modifier les paramètres (empêche l'auto-promotion d'un gérant).
      const caller = req.user?.uid ? await getUserByUid(req.user.uid) : null;
      if (caller?.role === 'gerant') {
        return res.status(403).json({ error: 'Accès refusé : réservé au Super Admin.' });
      }

      const updated = await updateUserConfig(parseInt(dbUserId), {
        restaurantName,
        restaurantLogoUrl,
        restaurantPhone: restaurantPhone !== undefined ? (restaurantPhone || null) : undefined,
        restaurantAddress: restaurantAddress !== undefined ? (restaurantAddress || null) : undefined,
        role
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- RESERVATIONS ENDPOINTS ---
  app.get('/api/reservations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getReservations(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/reservations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, clientName, clientPhone, reservationDate, guestsCount, tableNumber, status, notes } = req.body;
      if (!dbUserId || !clientName || !reservationDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      const newRes = await createReservation(
        parseInt(dbUserId),
        clientName,
        clientPhone,
        reservationDate,
        guestsCount ? parseInt(guestsCount) : 2,
        tableNumber ? parseInt(tableNumber) : null,
        status,
        notes
      );

      const room = String(dbUserId);
      io.to(room).emit('reservation_created', newRes);
      
      const notif = await createNotification(
        parseInt(dbUserId),
        'Nouvelle Réservation',
        `Réservation pour ${clientName} (${guestsCount} pers) le ${reservationDate}.`,
        'client_update'
      );
      io.to(room).emit('notification', notif);

      res.status(201).json(newRes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/reservations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const resId = parseInt(req.params.id);
      const { dbUserId, clientName, clientPhone, reservationDate, guestsCount, tableNumber, status, notes } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const updated = await updateReservation(resId, parseInt(dbUserId), {
        clientName,
        clientPhone,
        reservationDate,
        guestsCount: guestsCount ? parseInt(guestsCount) : undefined,
        tableNumber: tableNumber !== undefined ? (tableNumber ? parseInt(tableNumber) : null) : undefined,
        status,
        notes
      });
      const room = String(dbUserId);
      io.to(room).emit('reservation_updated', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/reservations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const resId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const deleted = await deleteReservation(resId, dbUserId);
      const room = String(dbUserId);
      io.to(room).emit('reservation_deleted', { id: resId });
      res.json({ message: 'Reservation deleted successfully', reservation: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- SUPPLIERS ENDPOINTS ---
  app.get('/api/suppliers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getSuppliers(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/suppliers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, name, contactName, phone, email, paymentStatus, contractDate, amountDue, invoiceNumber, invoiceImageUrl } = req.body;
      if (!dbUserId || !name) return res.status(400).json({ error: 'Missing required fields' });
      const newSupplier = await createSupplier(
        parseInt(dbUserId),
        name,
        contactName,
        phone,
        email,
        paymentStatus,
        contractDate,
        amountDue ? parseFloat(amountDue) : 0.0,
        invoiceNumber || null,
        invoiceImageUrl || null
      );
      const room = String(dbUserId);
      io.to(room).emit('supplier_created', newSupplier);
      res.status(201).json(newSupplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const { dbUserId, name, contactName, phone, email, paymentStatus, contractDate, amountDue, invoiceNumber, invoiceImageUrl } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const updated = await updateSupplier(supplierId, parseInt(dbUserId), {
        name,
        contactName,
        phone,
        email,
        paymentStatus,
        contractDate,
        amountDue: amountDue !== undefined ? parseFloat(amountDue) : undefined,
        invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber || null) : undefined,
        invoiceImageUrl: invoiceImageUrl !== undefined ? (invoiceImageUrl || null) : undefined
      });
      const room = String(dbUserId);
      io.to(room).emit('supplier_updated', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const deleted = await deleteSupplier(supplierId, dbUserId);
      const room = String(dbUserId);
      io.to(room).emit('supplier_deleted', { id: supplierId });
      res.json({ message: 'Supplier deleted successfully', supplier: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- SUPPLIER ORDERS ENDPOINTS (commandes passées aux fournisseurs) ---

  // Synchronise la dépense automatique liée à une commande fournisseur selon son statut de paiement.
  // Payé → crée/met à jour une dépense (Dépenses diverses) ; non payé → retire la dépense liée.
  async function syncSupplierOrderExpense(dbUserId: number, order: any) {
    const room = String(dbUserId);
    const sups = await getSuppliers(dbUserId);
    const supName = (sups || []).find((s: any) => s.id === order.supplierId)?.name || 'Fournisseur';

    if (order.paymentStatus === 'paye') {
      if (order.expenseId) {
        const upd = await updateExpense(order.expenseId, dbUserId, {
          label: order.label, category: 'ingredients', amount: order.amount,
          expenseDate: order.orderDate, notes: order.note,
          invoiceNumber: order.invoiceNumber, origin: supName, imageUrl: order.invoiceImageUrl,
        });
        if (upd) { io.to(room).emit('expense_updated', upd); return; }
        // La dépense a été supprimée entre-temps : on la recrée ci-dessous.
      }
      const exp = await createExpense(
        dbUserId, order.label, 'ingredients', order.amount,
        order.orderDate, order.note, order.invoiceNumber, supName, order.invoiceImageUrl
      );
      io.to(room).emit('expense_created', exp);
      await updateSupplierOrder(order.id, dbUserId, { expenseId: exp.id });
    } else if (order.expenseId) {
      // Non payé : on retire la dépense automatique précédemment créée.
      const del = await deleteExpense(order.expenseId, dbUserId);
      if (del) io.to(room).emit('expense_deleted', { id: order.expenseId });
      await updateSupplierOrder(order.id, dbUserId, { expenseId: null });
    }
  }

  // Option ① : à la réception d'une commande fournisseur liée à un article de stock,
  // on ajoute la quantité au stock (+ mouvement d'historique + coût unitaire). Idempotent.
  async function applySupplierOrderToStock(dbUserId: number, order: any) {
    if (!order || !order.received || !order.stockId || order.stockApplied) return;
    const stocksList = await getStocks(dbUserId);
    const stock = (stocksList || []).find((s: any) => s.id === order.stockId);
    if (!stock) return;
    const qty = Number(order.quantity) || 0;
    const newQty = (Number(stock.quantity) || 0) + qty;
    const newInit = (Number(stock.initialQuantity) || 0) + qty;
    const updatedStock = await updateStock(order.stockId, dbUserId, {
      quantity: newQty,
      initialQuantity: newInit,
      unitCost: Number(order.unitPrice) || stock.unitCost, // le prix d'achat met à jour le coût unitaire
    });
    const room = String(dbUserId);
    if (updatedStock) io.to(room).emit('stock_updated', updatedStock);
    const mv = await createStockMovement(dbUserId, stock.id, stock.itemName, qty, stock.unit, `Commande fournisseur : ${order.label}`);
    io.to(room).emit('stock_movement_created', mv);
    await updateSupplierOrder(order.id, dbUserId, { stockApplied: true });
  }

  app.get('/api/supplier-orders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getSupplierOrders(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/supplier-orders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, supplierId, label, quantity, unitPrice, orderDate, paymentStatus, invoiceNumber, invoiceImageUrl, note, stockId, received, newStockUnit } = req.body;
      if (!dbUserId || !supplierId || !label) {
        return res.status(400).json({ error: 'Missing dbUserId, supplierId or label' });
      }
      // Si demandé, on crée un NOUVEL article de stock (à partir de l'objet de la commande) et on le lie.
      let linkedStockId = stockId ? parseInt(stockId) : null;
      if (!linkedStockId && newStockUnit) {
        const st = await createStock(
          parseInt(dbUserId), label, 0, newStockUnit, 5,
          supplierId ? parseInt(supplierId) : null, null,
          unitPrice !== undefined ? parseFloat(unitPrice) : 0.0
        );
        linkedStockId = st.id;
        io.to(String(dbUserId)).emit('stock_created', st);
      }
      const newOrder = await createSupplierOrder(
        parseInt(dbUserId),
        parseInt(supplierId),
        label,
        quantity !== undefined ? parseFloat(quantity) : 1.0,
        unitPrice !== undefined ? parseFloat(unitPrice) : 0.0,
        orderDate || null,
        paymentStatus || 'en_attente',
        invoiceNumber || null,
        invoiceImageUrl || null,
        note || null,
        linkedStockId,
        received === true || received === 'true'
      );
      await syncSupplierOrderExpense(parseInt(dbUserId), newOrder);
      // Si créée déjà "reçue" et liée à un stock, on alimente le stock immédiatement.
      const afterExpense = await getSupplierOrderById(newOrder.id, parseInt(dbUserId));
      await applySupplierOrderToStock(parseInt(dbUserId), afterExpense);
      const finalOrder = await getSupplierOrderById(newOrder.id, parseInt(dbUserId));
      io.to(String(dbUserId)).emit('supplier_order_created', finalOrder);
      res.status(201).json(finalOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/supplier-orders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { dbUserId, supplierId, label, quantity, unitPrice, orderDate, paymentStatus, invoiceNumber, invoiceImageUrl, note, stockId, received, newStockUnit } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      // Création d'un nouvel article de stock lié (si demandé et aucun stockId fourni).
      let linkedStockId = stockId !== undefined ? (stockId ? parseInt(stockId) : null) : undefined;
      if ((linkedStockId === undefined || linkedStockId === null) && newStockUnit) {
        const existing = await getSupplierOrderById(orderId, parseInt(dbUserId));
        const stName = label || existing?.label || 'Article';
        const stPrice = unitPrice !== undefined ? parseFloat(unitPrice) : (existing?.unitPrice || 0);
        const st = await createStock(parseInt(dbUserId), stName, 0, newStockUnit, 5, supplierId ? parseInt(supplierId) : (existing?.supplierId || null), null, stPrice);
        linkedStockId = st.id;
        io.to(String(dbUserId)).emit('stock_created', st);
      }
      const updated = await updateSupplierOrder(orderId, parseInt(dbUserId), {
        supplierId: supplierId !== undefined ? parseInt(supplierId) : undefined,
        label,
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        orderDate: orderDate !== undefined ? (orderDate || null) : undefined,
        paymentStatus,
        invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber || null) : undefined,
        invoiceImageUrl: invoiceImageUrl !== undefined ? (invoiceImageUrl || null) : undefined,
        note: note !== undefined ? (note || null) : undefined,
        stockId: linkedStockId,
        received: received !== undefined ? (received === true || received === 'true') : undefined
      });
      if (!updated) return res.status(404).json({ error: 'Supplier order not found or access denied' });
      await syncSupplierOrderExpense(parseInt(dbUserId), updated);
      // Réception → alimente le stock (une seule fois, garde-fou stockApplied).
      const afterExpense = await getSupplierOrderById(orderId, parseInt(dbUserId));
      await applySupplierOrderToStock(parseInt(dbUserId), afterExpense);
      const finalOrder = await getSupplierOrderById(orderId, parseInt(dbUserId));
      io.to(String(dbUserId)).emit('supplier_order_updated', finalOrder);
      res.json(finalOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/supplier-orders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const existing = await getSupplierOrderById(orderId, dbUserId);
      const deleted = await deleteSupplierOrder(orderId, dbUserId);
      if (!deleted) return res.status(404).json({ error: 'Supplier order not found or access denied' });
      const room = String(dbUserId);
      // On retire aussi la dépense automatique liée, le cas échéant.
      if (existing?.expenseId) {
        const del = await deleteExpense(existing.expenseId, dbUserId);
        if (del) io.to(room).emit('expense_deleted', { id: existing.expenseId });
      }
      io.to(room).emit('supplier_order_deleted', { id: orderId });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- STOCKS ENDPOINTS ---
  app.get('/api/stocks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getStocks(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stocks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, itemName, quantity, initialQuantity, unit, minStock, supplierId, invoiceImageUrl, unitCost } = req.body;
      if (!dbUserId || !itemName) return res.status(400).json({ error: 'Missing required fields' });
      const newStock = await createStock(
        parseInt(dbUserId),
        itemName,
        quantity ? parseFloat(quantity) : 0.0,
        unit,
        minStock ? parseFloat(minStock) : 10.0,
        supplierId ? parseInt(supplierId) : null,
        invoiceImageUrl,
        unitCost ? parseFloat(unitCost) : 0.0,
        initialQuantity !== undefined ? parseFloat(initialQuantity) : undefined
      );
      const room = String(dbUserId);
      io.to(room).emit('stock_created', newStock);

      // Historique : l'approvisionnement initial est enregistré comme premier mouvement.
      if (newStock && newStock.quantity > 0) {
        const mv = await createStockMovement(parseInt(dbUserId), newStock.id, newStock.itemName, newStock.quantity, newStock.unit, 'Approvisionnement initial');
        io.to(room).emit('stock_movement_created', mv);
      }

      res.status(201).json(newStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/stocks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const stockId = parseInt(req.params.id);
      const { dbUserId, itemName, quantity, initialQuantity, unit, minStock, supplierId, invoiceImageUrl, unitCost, restockAmount, restockNote } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const updated = await updateStock(stockId, parseInt(dbUserId), {
        itemName,
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
        initialQuantity: initialQuantity !== undefined ? parseFloat(initialQuantity) : undefined,
        unit,
        minStock: minStock !== undefined ? parseFloat(minStock) : undefined,
        supplierId: supplierId !== undefined ? (supplierId ? parseInt(supplierId) : null) : undefined,
        invoiceImageUrl,
        unitCost: unitCost !== undefined ? parseFloat(unitCost) : undefined
      });
      const room = String(dbUserId);
      io.to(room).emit('stock_updated', updated);

      // Historique : si un réapprovisionnement a été saisi, on enregistre le mouvement daté.
      const restock = restockAmount !== undefined ? parseFloat(restockAmount) : 0;
      if (updated && restock > 0) {
        const mv = await createStockMovement(parseInt(dbUserId), updated.id, updated.itemName, restock, updated.unit, restockNote || null);
        io.to(room).emit('stock_movement_created', mv);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/stocks/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const stockId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const deleted = await deleteStock(stockId, dbUserId);
      const room = String(dbUserId);
      io.to(room).emit('stock_deleted', { id: stockId });
      res.json({ message: 'Stock item deleted successfully', stock: deleted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Historique des approvisionnements de stock (date + heure).
  app.get('/api/stock-movements', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getStockMovements(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- AI ANALYSIS ENDPOINT ---
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Clé API GEMINI_API_KEY manquante. Veuillez la configurer dans les paramètres.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  app.post('/api/ai/analyze', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, prompt } = req.body;
      if (!dbUserId) {
        return res.status(400).json({ error: 'Missing dbUserId' });
      }
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
      }

      // Fetch context data
      const [staff, menu, orders, reservations, stocks] = await Promise.all([
        getPersonnel(dbUserId).catch(() => []),
        getMenuItems(dbUserId).catch(() => []),
        getOrders(dbUserId).catch(() => []),
        getReservations(dbUserId).catch(() => []),
        getStocks(dbUserId).catch(() => [])
      ]);

      // format context
      const contextText = `
Données réelles de l'établissement :
- Personnel (${staff?.length || 0} employés) : ${JSON.stringify(staff?.map(p => ({ name: p.name, role: p.role, status: p.status, hourlyRate: p.hourlyRate, salary: p.salary, hireDate: p.hireDate, leave: p.leaveStart ? `${p.leaveStart} à ${p.leaveEnd}` : 'Aucun' })) || [])}
- Plats du Menu (${menu?.length || 0} articles) : ${JSON.stringify(menu?.map(m => ({ name: m.name, price: m.price, category: m.category, available: m.isAvailable })) || [])}
- Commandes / Ventes (${orders?.length || 0} ventes) : ${JSON.stringify(orders?.map(o => ({ id: o.id, table: o.tableNumber, status: o.status, amount: o.totalAmount, date: o.createdAt })) || [])}
- Réservations (${reservations?.length || 0} réservations) : ${JSON.stringify(reservations?.map(r => ({ name: r.clientName, date: r.reservationDate, guests: r.guestsCount, table: r.tableNumber, status: r.status })) || [])}
- Inventaire (${stocks?.length || 0} articles) : ${JSON.stringify(stocks?.map(s => ({ item: s.itemName, quantity: s.quantity, unit: s.unit, min: s.minStock })) || [])}
`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest', // alias : toujours le dernier modèle Flash (évite les dépréciations)
        contents: `Question/Requête de l'utilisateur : "${prompt}"\n\nContext de l'établissement :\n${contextText}`,
        config: {
          systemInstruction: `Tu es l'assistant IA de gestion intégrée du restaurant. Réponds en français.
Utilise les données réelles fournies de Madagascar / Ariary pour donner des réponses ultra-précises, chiffrées et concrètes.
Si l'utilisateur demande les plats les plus ou moins vendus, analyse la liste des commandes et le menu.
Si l'utilisateur demande le personnel qui travaille le plus ou le moins, analyse la liste du personnel (ceux en service "actif" vs en congé/absents, taux horaire, etc.).
S'il demande un système de méritocratie, calcule ou propose un indice de performance ou score de mérite pour chaque membre du personnel selon les données disponibles (taux horaire, disponibilité "actif" vs "absent", salaire mensuel, etc.), sous forme de classement élégant avec des conseils pratiques pour motiver l'équipe. Sois encourageant et objectif.`
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Error in AI analysis:', error);
      res.status(500).json({ error: error.message || 'Une erreur est survenue lors de l\'analyse par l\'IA.' });
    }
  });

  // --- EXPENSES ENDPOINTS (Dépenses diverses) ---
  app.get('/api/expenses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getExpenses(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/expenses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, label, category, amount, expenseDate, notes, invoiceNumber, origin, imageUrl } = req.body;
      if (!dbUserId || !label) {
        return res.status(400).json({ error: 'Missing dbUserId or label' });
      }
      const newExpense = await createExpense(
        parseInt(dbUserId),
        label,
        category,
        amount ? parseFloat(amount) : 0.0,
        expenseDate || null,
        notes || null,
        invoiceNumber || null,
        origin || null,
        imageUrl || null
      );

      const room = String(dbUserId);
      io.to(room).emit('expense_created', newExpense);

      const notif = await createNotification(
        parseInt(dbUserId),
        'Dépense enregistrée',
        `${label} : ${amount || 0} Ar (${category || 'divers'}).`,
        'system'
      );
      io.to(room).emit('notification', notif);

      res.status(201).json(newExpense);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/expenses/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const { dbUserId, label, category, amount, expenseDate, notes, invoiceNumber, origin, imageUrl } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });

      const updated = await updateExpense(expenseId, parseInt(dbUserId), {
        label,
        category,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        expenseDate: expenseDate !== undefined ? (expenseDate || null) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
        invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber || null) : undefined,
        origin: origin !== undefined ? (origin || null) : undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined
      });
      if (!updated) return res.status(404).json({ error: 'Expense not found or access denied' });

      io.to(String(dbUserId)).emit('expense_updated', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/expenses/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });

      const deleted = await deleteExpense(expenseId, dbUserId);
      if (!deleted) return res.status(404).json({ error: 'Expense not found or access denied' });

      io.to(String(dbUserId)).emit('expense_deleted', { id: expenseId });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- RECURRING EXPENSES ENDPOINTS (charges récurrentes) ---
  app.get('/api/recurring-expenses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      res.json((await getRecurringExpenses(dbUserId)) || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/recurring-expenses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, label, category, amount, dayOfMonth, active } = req.body;
      if (!dbUserId || !label) return res.status(400).json({ error: 'Missing dbUserId or label' });
      const created = await createRecurringExpense(
        parseInt(dbUserId), label, category || 'divers',
        amount ? parseFloat(amount) : 0.0,
        dayOfMonth ? parseInt(dayOfMonth) : 1,
        active !== undefined ? !!active : true
      );
      const room = String(dbUserId);
      io.to(room).emit('recurring_expense_created', created);
      // On matérialise immédiatement la charge pour le mois en cours.
      const monthPrefix = new Date().toISOString().slice(0, 7);
      const newExpenses = await generateRecurringExpenses(parseInt(dbUserId), monthPrefix);
      for (const e of (newExpenses || [])) io.to(room).emit('expense_created', e);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/recurring-expenses/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { dbUserId, label, category, amount, dayOfMonth, active } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const updated = await updateRecurringExpense(id, parseInt(dbUserId), {
        label, category,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        dayOfMonth: dayOfMonth !== undefined ? parseInt(dayOfMonth) : undefined,
        active: active !== undefined ? !!active : undefined
      });
      if (!updated) return res.status(404).json({ error: 'Recurring expense not found' });
      io.to(String(dbUserId)).emit('recurring_expense_updated', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/recurring-expenses/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const deleted = await deleteRecurringExpense(id, dbUserId);
      if (!deleted) return res.status(404).json({ error: 'Recurring expense not found' });
      io.to(String(dbUserId)).emit('recurring_expense_deleted', { id });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Matérialise les charges récurrentes du mois en cours (appelé au chargement de l'app).
  app.post('/api/recurring-expenses/generate', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const monthPrefix = new Date().toISOString().slice(0, 7);
      const created = await generateRecurringExpenses(parseInt(dbUserId), monthPrefix);
      const room = String(dbUserId);
      for (const e of (created || [])) io.to(room).emit('expense_created', e);
      res.json({ created: created || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- SPECIAL EVENTS ENDPOINTS (calendrier) ---
  app.get('/api/special-events', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      res.json((await getSpecialEvents(dbUserId)) || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/special-events', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, title, date, time, category, notes } = req.body;
      if (!dbUserId || !title || !date) return res.status(400).json({ error: 'Missing dbUserId, title or date' });
      const created = await createSpecialEvent(parseInt(dbUserId), title, date, time || null, category || 'theme', notes || null);
      io.to(String(dbUserId)).emit('special_event_created', created);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/special-events/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const deleted = await deleteSpecialEvent(eventId, dbUserId);
      if (!deleted) return res.status(404).json({ error: 'Event not found or access denied' });
      io.to(String(dbUserId)).emit('special_event_deleted', { id: eventId });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- INCOMES ENDPOINTS (Rentrées d'argent) ---
  app.get('/api/incomes', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getIncomes(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/incomes', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, label, category, amount, source, paymentMethod, incomeDate, imageUrl, notes } = req.body;
      if (!dbUserId || !label) return res.status(400).json({ error: 'Missing dbUserId or label' });
      const newIncome = await createIncome(
        parseInt(dbUserId),
        label,
        category,
        amount ? parseFloat(amount) : 0.0,
        source || null,
        paymentMethod || 'especes',
        incomeDate || null,
        imageUrl || null,
        notes || null
      );
      const room = String(dbUserId);
      io.to(room).emit('income_created', newIncome);
      res.status(201).json(newIncome);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/incomes/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const incomeId = parseInt(req.params.id);
      const { dbUserId, label, category, amount, source, paymentMethod, incomeDate, imageUrl, notes } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const updated = await updateIncome(incomeId, parseInt(dbUserId), {
        label,
        category,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        source: source !== undefined ? (source || null) : undefined,
        paymentMethod,
        incomeDate: incomeDate !== undefined ? (incomeDate || null) : undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined
      });
      if (!updated) return res.status(404).json({ error: 'Income not found or access denied' });
      io.to(String(dbUserId)).emit('income_updated', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/incomes/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const incomeId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const deleted = await deleteIncome(incomeId, dbUserId);
      if (!deleted) return res.status(404).json({ error: 'Income not found or access denied' });
      io.to(String(dbUserId)).emit('income_deleted', { id: incomeId });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- DELIVERIES ENDPOINTS (Livraisons de commandes) ---
  app.get('/api/deliveries', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.query.dbUserId ? parseInt(req.query.dbUserId as string) : null;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });
      const list = await getDeliveries(dbUserId);
      res.json(list || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/deliveries', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { dbUserId, clientName, address, clientPhone, deliveryDate, deliveryTime, orderId, driverName, status, notes } = req.body;
      if (!dbUserId || !clientName || !address) {
        return res.status(400).json({ error: 'Missing dbUserId, clientName or address' });
      }
      const newDelivery = await createDelivery(
        parseInt(dbUserId),
        clientName,
        address,
        clientPhone || null,
        deliveryDate || null,
        deliveryTime || null,
        orderId ? parseInt(orderId) : null,
        driverName || null,
        status || 'en_preparation',
        notes || null
      );

      const room = String(dbUserId);
      io.to(room).emit('delivery_created', newDelivery);

      const notif = await createNotification(
        parseInt(dbUserId),
        'Livraison enregistrée',
        `${clientName} — ${address}${driverName ? ` (livreur : ${driverName})` : ''}.`,
        'system'
      );
      io.to(room).emit('notification', notif);

      res.status(201).json(newDelivery);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/deliveries/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deliveryId = parseInt(req.params.id);
      const { dbUserId, clientName, address, clientPhone, deliveryDate, deliveryTime, orderId, driverName, status, notes } = req.body;
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });

      const updated = await updateDelivery(deliveryId, parseInt(dbUserId), {
        clientName,
        address,
        clientPhone: clientPhone !== undefined ? (clientPhone || null) : undefined,
        deliveryDate: deliveryDate !== undefined ? (deliveryDate || null) : undefined,
        deliveryTime: deliveryTime !== undefined ? (deliveryTime || null) : undefined,
        orderId: orderId !== undefined ? (orderId ? parseInt(orderId) : null) : undefined,
        driverName: driverName !== undefined ? (driverName || null) : undefined,
        status,
        notes: notes !== undefined ? (notes || null) : undefined
      });
      if (!updated) return res.status(404).json({ error: 'Delivery not found or access denied' });

      io.to(String(dbUserId)).emit('delivery_updated', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/deliveries/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deliveryId = parseInt(req.params.id);
      const dbUserId = parseInt(req.query.dbUserId as string);
      if (!dbUserId) return res.status(400).json({ error: 'Missing dbUserId' });

      const deleted = await deleteDelivery(deliveryId, dbUserId);
      if (!deleted) return res.status(404).json({ error: 'Delivery not found or access denied' });

      io.to(String(dbUserId)).emit('delivery_deleted', { id: deliveryId });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Setup Vite development server or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Server on PORT 3000 (MANDATORY INGRESS PORT)
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
