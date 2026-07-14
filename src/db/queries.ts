import { db } from './index.ts';
import { users, clients, personnel, menuItems, orders, orderItems, notifications, reservations, suppliers, stocks, expenses, deliveries } from './schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';

// Helper to sanitize database errors and log them securely
function handleDbError(message: string, error: any): never {
  console.error(`${message}:`, error);
  throw new Error(`${message}. Please try again later.`, { cause: error });
}

export async function getUserById(userId: number) {
  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result[0];
  } catch (error) {
    handleDbError("Failed to fetch user by id", error);
  }
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string,
  role?: string,
  ownerEmail?: string // e-mail du super admin à rejoindre (pour un gérant)
) {
  try {
    // Résolution du propriétaire : si un e-mail de super admin est fourni, on rattache le compte.
    let ownerId: number | null = null;
    if (ownerEmail) {
      const owners = await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1);
      // On ne se rattache pas à soi-même.
      if (owners[0] && owners[0].uid !== uid) {
        ownerId = owners[0].id;
      }
    }

    const insertValues: any = {
      uid,
      email,
      displayName: displayName || null,
      photoUrl: photoUrl || null,
    };
    if (role) {
      insertValues.role = role;
    }
    if (ownerId) {
      insertValues.ownerId = ownerId;
    }
    const result = await db.insert(users)
      .values(insertValues)
      // À la reconnexion, on met à jour le profil mais on ne touche pas au rattachement/rôle existant.
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    handleDbError("Failed to register or retrieve user", error);
  }
}

export async function updateUserConfig(
  dbUserId: number,
  updates: {
    restaurantName?: string;
    restaurantLogoUrl?: string | null;
    restaurantPhone?: string | null;
    restaurantAddress?: string | null;
    role?: string;
  }
) {
  try {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, dbUserId))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update user config", error);
  }
}

// Récupère un utilisateur par son uid (Firebase ou login de test) — sert à vérifier son rôle côté serveur.
export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0];
  } catch (error) {
    handleDbError("Failed to fetch user by uid", error);
  }
}

// --- CLIENTS CRUD ---

export async function getClients(dbUserId: number) {
  try {
    return await db.select()
      .from(clients)
      .where(eq(clients.userId, dbUserId))
      .orderBy(desc(clients.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch clients from database", error);
  }
}

export async function createClient(
  dbUserId: number,
  name: string,
  email?: string,
  phone?: string,
  loyaltyPoints = 0,
  notes?: string
) {
  try {
    const result = await db.insert(clients)
      .values({
        userId: dbUserId,
        name,
        email: email || null,
        phone: phone || null,
        loyaltyPoints,
        notes: notes || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create client", error);
  }
}

export async function updateClient(
  clientId: number,
  dbUserId: number,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    loyaltyPoints?: number;
    notes?: string;
  }
) {
  try {
    const result = await db.update(clients)
      .set(updates)
      .where(and(eq(clients.id, clientId), eq(clients.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update client", error);
  }
}

export async function deleteClient(clientId: number, dbUserId: number) {
  try {
    const result = await db.delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete client", error);
  }
}

// --- PERSONNEL CRUD ---

export async function getPersonnel(dbUserId: number) {
  try {
    return await db.select()
      .from(personnel)
      .where(eq(personnel.userId, dbUserId))
      .orderBy(desc(personnel.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch personnel from database", error);
  }
}

export async function createPersonnel(
  dbUserId: number,
  name: string,
  email?: string,
  phone?: string,
  role = 'serveur',
  status = 'actif',
  hourlyRate = 15.0,
  salary = 0.0,
  leaveStart?: string | null,
  leaveEnd?: string | null,
  hireDate?: string | null,
  avatarUrl?: string | null
) {
  try {
    const result = await db.insert(personnel)
      .values({
        userId: dbUserId,
        name,
        email: email || null,
        phone: phone || null,
        role,
        status,
        hourlyRate,
        salary,
        leaveStart: leaveStart || null,
        leaveEnd: leaveEnd || null,
        hireDate: hireDate || null,
        avatarUrl: avatarUrl || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create personnel member", error);
  }
}

export async function updatePersonnel(
  personnelId: number,
  dbUserId: number,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    status?: string;
    hourlyRate?: number;
    salary?: number;
    leaveStart?: string | null;
    leaveEnd?: string | null;
    hireDate?: string | null;
    avatarUrl?: string | null;
  }
) {
  try {
    const result = await db.update(personnel)
      .set(updates)
      .where(and(eq(personnel.id, personnelId), eq(personnel.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update personnel member", error);
  }
}

export async function deletePersonnel(personnelId: number, dbUserId: number) {
  try {
    const result = await db.delete(personnel)
      .where(and(eq(personnel.id, personnelId), eq(personnel.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete personnel member", error);
  }
}

// --- MENU ITEMS CRUD ---

export async function getMenuItems(dbUserId: number) {
  try {
    return await db.select()
      .from(menuItems)
      .where(eq(menuItems.userId, dbUserId))
      .orderBy(desc(menuItems.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch menu items from database", error);
  }
}

export async function createMenuItem(
  dbUserId: number,
  name: string,
  description?: string,
  price = 0.0,
  category = 'plat',
  isAvailable = true,
  imageUrl?: string | null,
  ingredients: any = null
) {
  try {
    const result = await db.insert(menuItems)
      .values({
        userId: dbUserId,
        name,
        description: description || null,
        price,
        category,
        isAvailable,
        imageUrl: imageUrl || null,
        ingredients: ingredients ?? null,
      })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create menu item", error);
  }
}

export async function updateMenuItem(
  itemId: number,
  dbUserId: number,
  updates: {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    isAvailable?: boolean;
    imageUrl?: string | null;
    ingredients?: any;
  }
) {
  try {
    const result = await db.update(menuItems)
      .set(updates)
      .where(and(eq(menuItems.id, itemId), eq(menuItems.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update menu item", error);
  }
}

export async function deleteMenuItem(itemId: number, dbUserId: number) {
  try {
    const result = await db.delete(menuItems)
      .where(and(eq(menuItems.id, itemId), eq(menuItems.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete menu item", error);
  }
}

// --- ORDERS CRUD ---

type OrderItemInput = { menuItemId: number; quantity: number; unitPrice: number };

// Attache les lignes (plats/boissons) + leurs libellés (nom, catégorie) à des commandes.
async function attachOrderItems(orderRows: any[]) {
  if (!orderRows || orderRows.length === 0) return orderRows || [];
  const ids = orderRows.map((o) => o.id);
  const lines = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuItemId: orderItems.menuItemId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      name: menuItems.name,
      category: menuItems.category,
    })
    .from(orderItems)
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(inArray(orderItems.orderId, ids));

  const byOrder = new Map<number, any[]>();
  for (const line of lines) {
    const list = byOrder.get(line.orderId) || [];
    list.push(line);
    byOrder.set(line.orderId, list);
  }
  return orderRows.map((o) => ({ ...o, items: byOrder.get(o.id) || [] }));
}

export async function getOrders(dbUserId: number) {
  try {
    const rows = await db.select()
      .from(orders)
      .where(eq(orders.userId, dbUserId))
      .orderBy(desc(orders.createdAt));
    return await attachOrderItems(rows);
  } catch (error) {
    handleDbError("Failed to fetch orders from database", error);
  }
}

export async function getOrderById(orderId: number, dbUserId: number) {
  const rows = await db.select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, dbUserId)));
  const enriched = await attachOrderItems(rows);
  return enriched[0];
}

export async function createOrder(
  dbUserId: number,
  tableNumber: number,
  status = 'en_attente',
  paymentMethod = 'carte',
  items: OrderItemInput[] = [],
  serverName: string | null = null,
  orderType = 'sur_place',
  taxRate = 0
) {
  try {
    // L'addition est TOUJOURS recalculée côté serveur à partir des lignes.
    const totalAmount = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const result = await db.insert(orders)
      .values({ userId: dbUserId, tableNumber, status, totalAmount, paymentMethod, serverName, orderType, taxRate })
      .returning();
    const order = result[0];
    if (items.length > 0) {
      await db.insert(orderItems).values(
        items.map((it) => ({
          orderId: order.id,
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }))
      );
    }
    return await getOrderById(order.id, dbUserId);
  } catch (error) {
    handleDbError("Failed to create order", error);
  }
}

export async function updateOrder(
  orderId: number,
  dbUserId: number,
  updates: {
    tableNumber?: number;
    status?: string;
    paymentMethod?: string;
    serverName?: string | null;
    orderType?: string;
    taxRate?: number;
    items?: OrderItemInput[];
  }
) {
  try {
    // On ignore délibérément tout "total" fourni par le client : il est recalculé depuis les lignes.
    const setFields: any = {};
    if (updates.tableNumber !== undefined) setFields.tableNumber = updates.tableNumber;
    if (updates.status !== undefined) setFields.status = updates.status;
    if (updates.paymentMethod !== undefined) setFields.paymentMethod = updates.paymentMethod;
    if (updates.serverName !== undefined) setFields.serverName = updates.serverName;
    if (updates.orderType !== undefined) setFields.orderType = updates.orderType;
    if (updates.taxRate !== undefined) setFields.taxRate = updates.taxRate;
    if (updates.items !== undefined) {
      setFields.totalAmount = updates.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    }

    const result = await db.update(orders)
      .set(setFields)
      .where(and(eq(orders.id, orderId), eq(orders.userId, dbUserId)))
      .returning();

    if (result.length === 0) return undefined;

    // Remplacement complet des lignes si une nouvelle liste est fournie.
    if (updates.items !== undefined) {
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      if (updates.items.length > 0) {
        await db.insert(orderItems).values(
          updates.items.map((it) => ({
            orderId,
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          }))
        );
      }
    }

    return await getOrderById(orderId, dbUserId);
  } catch (error) {
    handleDbError("Failed to update order", error);
  }
}

export async function deleteOrder(orderId: number, dbUserId: number) {
  try {
    const result = await db.delete(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete order", error);
  }
}

// --- RESERVATIONS CRUD ---

export async function getReservations(dbUserId: number) {
  try {
    return await db.select()
      .from(reservations)
      .where(eq(reservations.userId, dbUserId))
      .orderBy(desc(reservations.reservationDate));
  } catch (error) {
    handleDbError("Failed to fetch reservations", error);
  }
}

export async function createReservation(
  dbUserId: number,
  clientName: string,
  clientPhone: string | null,
  reservationDate: string,
  guestsCount = 2,
  tableNumber?: number | null,
  status = 'confirme',
  notes?: string | null
) {
  try {
    const result = await db.insert(reservations)
      .values({
        userId: dbUserId,
        clientName,
        clientPhone,
        reservationDate,
        guestsCount,
        tableNumber: tableNumber || null,
        status,
        notes: notes || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create reservation", error);
  }
}

export async function updateReservation(
  reservationId: number,
  dbUserId: number,
  updates: {
    clientName?: string;
    clientPhone?: string | null;
    reservationDate?: string;
    guestsCount?: number;
    tableNumber?: number | null;
    status?: string;
    notes?: string | null;
  }
) {
  try {
    const result = await db.update(reservations)
      .set(updates)
      .where(and(eq(reservations.id, reservationId), eq(reservations.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update reservation", error);
  }
}

export async function deleteReservation(reservationId: number, dbUserId: number) {
  try {
    const result = await db.delete(reservations)
      .where(and(eq(reservations.id, reservationId), eq(reservations.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete reservation", error);
  }
}

// --- SUPPLIERS CRUD ---

export async function getSuppliers(dbUserId: number) {
  try {
    return await db.select()
      .from(suppliers)
      .where(eq(suppliers.userId, dbUserId))
      .orderBy(desc(suppliers.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch suppliers", error);
  }
}

export async function createSupplier(
  dbUserId: number,
  name: string,
  contactName?: string | null,
  phone?: string | null,
  email?: string | null,
  paymentStatus = 'en_attente',
  contractDate?: string | null,
  amountDue = 0.0
) {
  try {
    const result = await db.insert(suppliers)
      .values({
        userId: dbUserId,
        name,
        contactName,
        phone,
        email,
        paymentStatus,
        contractDate,
        amountDue,
      })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create supplier", error);
  }
}

export async function updateSupplier(
  supplierId: number,
  dbUserId: number,
  updates: {
    name?: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    paymentStatus?: string;
    contractDate?: string | null;
    amountDue?: number;
  }
) {
  try {
    const result = await db.update(suppliers)
      .set(updates)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update supplier", error);
  }
}

export async function deleteSupplier(supplierId: number, dbUserId: number) {
  try {
    const result = await db.delete(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete supplier", error);
  }
}

// --- STOCKS CRUD ---

export async function getStocks(dbUserId: number) {
  try {
    return await db.select()
      .from(stocks)
      .where(eq(stocks.userId, dbUserId))
      .orderBy(desc(stocks.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch stocks", error);
  }
}

export async function createStock(
  dbUserId: number,
  itemName: string,
  quantity = 0.0,
  unit = 'kg',
  minStock = 10.0,
  supplierId?: number | null,
  invoiceImageUrl?: string | null
) {
  try {
    const result = await db.insert(stocks)
      .values({
        userId: dbUserId,
        itemName,
        quantity,
        unit,
        minStock,
        supplierId: supplierId || null,
        invoiceImageUrl: invoiceImageUrl || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create stock item", error);
  }
}

export async function updateStock(
  stockId: number,
  dbUserId: number,
  updates: {
    itemName?: string;
    quantity?: number;
    unit?: string;
    minStock?: number;
    supplierId?: number | null;
    invoiceImageUrl?: string | null;
  }
) {
  try {
    const result = await db.update(stocks)
      .set(updates)
      .where(and(eq(stocks.id, stockId), eq(stocks.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update stock", error);
  }
}

export async function deleteStock(stockId: number, dbUserId: number) {
  try {
    const result = await db.delete(stocks)
      .where(and(eq(stocks.id, stockId), eq(stocks.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete stock", error);
  }
}

// --- NOTIFICATIONS CRUD ---

export async function getNotifications(dbUserId: number) {
  try {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, dbUserId))
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch notifications from database", error);
  }
}

export async function createNotification(
  dbUserId: number,
  title: string,
  message: string,
  type = 'info'
) {
  try {
    const result = await db.insert(notifications)
      .values({
        userId: dbUserId,
        title,
        message,
        type,
      })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create notification", error);
  }
}

export async function markNotificationAsRead(notificationId: number, dbUserId: number) {
  try {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to mark notification as read", error);
  }
}

export async function markAllNotificationsAsRead(dbUserId: number) {
  try {
    return await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, dbUserId))
      .returning();
  } catch (error) {
    handleDbError("Failed to mark all notifications as read", error);
  }
}

// --- EXPENSES CRUD (Dépenses diverses) ---

export async function getExpenses(dbUserId: number) {
  try {
    return await db.select()
      .from(expenses)
      .where(eq(expenses.userId, dbUserId))
      .orderBy(desc(expenses.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch expenses from database", error);
  }
}

export async function createExpense(
  dbUserId: number,
  label: string,
  category = 'divers',
  amount = 0.0,
  expenseDate: string | null = null,
  notes: string | null = null,
  invoiceNumber: string | null = null,
  origin: string | null = null,
  imageUrl: string | null = null
) {
  try {
    const result = await db.insert(expenses)
      .values({ userId: dbUserId, label, category, amount, expenseDate, notes, invoiceNumber, origin, imageUrl })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create expense", error);
  }
}

export async function updateExpense(
  expenseId: number,
  dbUserId: number,
  updates: {
    label?: string;
    category?: string;
    amount?: number;
    expenseDate?: string | null;
    notes?: string | null;
    invoiceNumber?: string | null;
    origin?: string | null;
    imageUrl?: string | null;
  }
) {
  try {
    const result = await db.update(expenses)
      .set(updates)
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update expense", error);
  }
}

export async function deleteExpense(expenseId: number, dbUserId: number) {
  try {
    const result = await db.delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete expense", error);
  }
}

// --- DELIVERIES CRUD (Livraisons de commandes) ---

export async function getDeliveries(dbUserId: number) {
  try {
    return await db.select()
      .from(deliveries)
      .where(eq(deliveries.userId, dbUserId))
      .orderBy(desc(deliveries.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch deliveries from database", error);
  }
}

export async function createDelivery(
  dbUserId: number,
  clientName: string,
  address: string,
  clientPhone: string | null = null,
  deliveryDate: string | null = null,
  deliveryTime: string | null = null,
  orderId: number | null = null,
  driverName: string | null = null,
  status = 'en_preparation',
  notes: string | null = null
) {
  try {
    const result = await db.insert(deliveries)
      .values({ userId: dbUserId, clientName, address, clientPhone, deliveryDate, deliveryTime, orderId, driverName, status, notes })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create delivery", error);
  }
}

export async function updateDelivery(
  deliveryId: number,
  dbUserId: number,
  updates: {
    clientName?: string;
    address?: string;
    clientPhone?: string | null;
    deliveryDate?: string | null;
    deliveryTime?: string | null;
    orderId?: number | null;
    driverName?: string | null;
    status?: string;
    notes?: string | null;
  }
) {
  try {
    const result = await db.update(deliveries)
      .set(updates)
      .where(and(eq(deliveries.id, deliveryId), eq(deliveries.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update delivery", error);
  }
}

export async function deleteDelivery(deliveryId: number, dbUserId: number) {
  try {
    const result = await db.delete(deliveries)
      .where(and(eq(deliveries.id, deliveryId), eq(deliveries.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete delivery", error);
  }
}

