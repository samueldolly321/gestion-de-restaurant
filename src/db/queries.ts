import { db } from './index.ts';
import { users, clients, personnel, menuItems, orders, orderItems, notifications, reservations, suppliers, supplierOrders, supplierOrderItems, supplierProducts, stocks, stockMovements, expenses, recurringExpenses, incomes, deliveries, specialEvents, assets } from './schema.ts';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';

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

// Incrémente (ou décrémente) les points de fidélité d'un client de façon atomique.
export async function incrementClientLoyalty(clientId: number, dbUserId: number, delta: number) {
  try {
    const result = await db.update(clients)
      .set({ loyaltyPoints: sql`GREATEST(0, ${clients.loyaltyPoints} + ${delta})` })
      .where(and(eq(clients.id, clientId), eq(clients.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update client loyalty points", error);
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
  avatarUrl?: string | null,
  cvUrl?: string | null,
  vehicleId?: number | null
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
        cvUrl: cvUrl || null,
        vehicleId: vehicleId ?? null,
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
    cvUrl?: string | null;
    vehicleId?: number | null;
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
  taxRate = 0,
  clientId: number | null = null,
  reference: string | null = null,
  deliveryFee = 0
) {
  try {
    // L'addition (plats) est recalculée côté serveur ; le total inclut les frais de livraison.
    const itemsSum = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const totalAmount = itemsSum + (deliveryFee || 0);
    const result = await db.insert(orders)
      .values({ userId: dbUserId, tableNumber, status, totalAmount, paymentMethod, serverName, orderType, taxRate, clientId, reference, deliveryFee })
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
    clientId?: number | null;
    deliveryFee?: number;
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
    if (updates.clientId !== undefined) setFields.clientId = updates.clientId;
    if (updates.deliveryFee !== undefined) setFields.deliveryFee = updates.deliveryFee;
    // Le total est recalculé si les lignes changent : addition (plats) + frais de livraison.
    if (updates.items !== undefined) {
      const itemsSum = updates.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
      let fee = updates.deliveryFee;
      if (fee === undefined) {
        const cur = (await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, dbUserId))))[0];
        fee = cur?.deliveryFee || 0;
      }
      setFields.totalAmount = itemsSum + (fee || 0);
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
  amountDue = 0.0,
  invoiceNumber?: string | null,
  invoiceImageUrl?: string | null
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
        invoiceNumber: invoiceNumber || null,
        invoiceImageUrl: invoiceImageUrl || null,
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
    invoiceNumber?: string | null;
    invoiceImageUrl?: string | null;
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

// --- SUPPLIER ORDERS CRUD (commandes passées aux fournisseurs) ---

// Type d'une ligne de commande fournisseur (entrée depuis l'API).
export type SupplierOrderItemInput = {
  label: string;
  quantity?: number;
  unitPrice?: number;
  stockId?: number | null;
  stockApplied?: boolean;
};

// Libellé résumé de l'en-tête (utilisé pour la dépense auto et l'affichage legacy).
function summarizeItems(items: SupplierOrderItemInput[]): string {
  if (!items.length) return 'Commande';
  if (items.length === 1) return items[0].label;
  return `${items[0].label} +${items.length - 1} article(s)`;
}

// Rattache les lignes à une liste d'en-têtes (renvoie chaque commande avec son tableau `items`).
async function attachItems<T extends { id: number }>(orders: T[]) {
  if (!orders.length) return orders.map((o) => ({ ...o, items: [] as any[] }));
  const ids = orders.map((o) => o.id);
  const items = await db.select().from(supplierOrderItems)
    .where(inArray(supplierOrderItems.orderId, ids))
    .orderBy(supplierOrderItems.id);
  const byOrder = new Map<number, any[]>();
  for (const it of items) {
    const arr = byOrder.get(it.orderId) || [];
    arr.push(it);
    byOrder.set(it.orderId, arr);
  }
  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) || [] }));
}

export async function getSupplierOrders(dbUserId: number) {
  try {
    const rows = await db.select()
      .from(supplierOrders)
      .where(eq(supplierOrders.userId, dbUserId))
      .orderBy(desc(supplierOrders.orderDate), desc(supplierOrders.createdAt));
    return await attachItems(rows);
  } catch (error) {
    handleDbError("Failed to fetch supplier orders", error);
  }
}

export async function getSupplierOrderById(orderId: number, dbUserId: number) {
  try {
    const rows = await db.select().from(supplierOrders)
      .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, dbUserId)));
    if (!rows[0]) return undefined;
    return (await attachItems(rows))[0];
  } catch (error) {
    handleDbError("Failed to fetch supplier order", error);
  }
}

// Écrit les lignes d'une commande (remplacement complet) et renvoie le montant total.
// À appeler dans une transaction. `tx` est le client Drizzle (transaction ou db).
async function writeItems(tx: any, dbUserId: number, orderId: number, items: SupplierOrderItemInput[]) {
  await tx.delete(supplierOrderItems).where(eq(supplierOrderItems.orderId, orderId));
  let total = 0;
  for (const it of items) {
    const quantity = Number(it.quantity) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    const amount = quantity * unitPrice;
    total += amount;
    await tx.insert(supplierOrderItems).values({
      userId: dbUserId,
      orderId,
      label: it.label,
      quantity,
      unitPrice,
      amount,
      stockId: it.stockId ?? null,
      stockApplied: !!it.stockApplied,
    });
  }
  return total;
}

export async function createSupplierOrder(
  dbUserId: number,
  supplierId: number,
  items: SupplierOrderItemInput[],
  orderDate: string | null = null,
  paymentStatus = 'en_attente',
  invoiceNumber: string | null = null,
  invoiceImageUrl: string | null = null,
  note: string | null = null,
  received = false
) {
  try {
    return await db.transaction(async (tx) => {
      const inserted = await tx.insert(supplierOrders)
        .values({
          userId: dbUserId, supplierId, label: summarizeItems(items),
          amount: 0, orderDate, paymentStatus, invoiceNumber, invoiceImageUrl, note, received,
        })
        .returning();
      const order = inserted[0];
      const total = await writeItems(tx, dbUserId, order.id, items);
      const updated = await tx.update(supplierOrders)
        .set({ amount: total, label: summarizeItems(items) })
        .where(eq(supplierOrders.id, order.id))
        .returning();
      return updated[0];
    });
  } catch (error) {
    handleDbError("Failed to create supplier order", error);
  }
}

// Met à jour l'en-tête d'une commande. Si `items` est fourni, remplace aussi les lignes
// et recalcule le montant total. Utilisé pour l'édition mais aussi pour les mises à jour
// partielles serveur (expenseId, paymentStatus, received…).
export async function updateSupplierOrder(
  orderId: number,
  dbUserId: number,
  updates: {
    supplierId?: number;
    orderDate?: string | null;
    paymentStatus?: string;
    invoiceNumber?: string | null;
    invoiceImageUrl?: string | null;
    note?: string | null;
    expenseId?: number | null;
    received?: boolean;
    items?: SupplierOrderItemInput[];
  }
) {
  try {
    const { items, ...headerUpdates } = updates;
    return await db.transaction(async (tx) => {
      // Garde-fou de propriété : la commande doit appartenir à l'utilisateur.
      const current = (await tx.select().from(supplierOrders)
        .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, dbUserId))))[0];
      if (!current) return undefined;

      const setFields: any = { ...headerUpdates };
      if (items !== undefined) {
        const total = await writeItems(tx, dbUserId, orderId, items);
        setFields.amount = total;
        setFields.label = summarizeItems(items);
      }
      if (Object.keys(setFields).length === 0) return current;
      const result = await tx.update(supplierOrders)
        .set(setFields)
        .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, dbUserId)))
        .returning();
      return result[0];
    });
  } catch (error) {
    handleDbError("Failed to update supplier order", error);
  }
}

// Marque une ligne comme appliquée au stock (garde-fou d'idempotence à la réception).
export async function markSupplierOrderItemApplied(itemId: number, dbUserId: number) {
  try {
    const result = await db.update(supplierOrderItems)
      .set({ stockApplied: true })
      .where(and(eq(supplierOrderItems.id, itemId), eq(supplierOrderItems.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to mark supplier order item applied", error);
  }
}

export async function deleteSupplierOrder(orderId: number, dbUserId: number) {
  try {
    // Les lignes (supplier_order_items) sont supprimées en cascade (FK onDelete cascade).
    const result = await db.delete(supplierOrders)
      .where(and(eq(supplierOrders.id, orderId), eq(supplierOrders.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete supplier order", error);
  }
}

// --- SUPPLIER PRODUCTS CRUD (catalogue produits d'un fournisseur) ---

export async function getSupplierProducts(dbUserId: number) {
  try {
    return await db.select()
      .from(supplierProducts)
      .where(eq(supplierProducts.userId, dbUserId))
      .orderBy(supplierProducts.name);
  } catch (error) {
    handleDbError("Failed to fetch supplier products", error);
  }
}

export async function createSupplierProduct(
  dbUserId: number,
  supplierId: number,
  name: string,
  unitPrice = 0.0,
  unit = 'pieces',
  stockId: number | null = null,
  active = true
) {
  try {
    const result = await db.insert(supplierProducts)
      .values({ userId: dbUserId, supplierId, name, unitPrice, unit, stockId, active })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create supplier product", error);
  }
}

export async function updateSupplierProduct(
  productId: number,
  dbUserId: number,
  updates: {
    supplierId?: number;
    name?: string;
    unitPrice?: number;
    unit?: string;
    stockId?: number | null;
    active?: boolean;
  }
) {
  try {
    const result = await db.update(supplierProducts)
      .set(updates)
      .where(and(eq(supplierProducts.id, productId), eq(supplierProducts.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update supplier product", error);
  }
}

export async function deleteSupplierProduct(productId: number, dbUserId: number) {
  try {
    const result = await db.delete(supplierProducts)
      .where(and(eq(supplierProducts.id, productId), eq(supplierProducts.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete supplier product", error);
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
  invoiceImageUrl?: string | null,
  unitCost = 0.0,
  initialQuantity?: number
) {
  try {
    const result = await db.insert(stocks)
      .values({
        userId: dbUserId,
        itemName,
        quantity,
        // À la création, la quantité initiale = quantité saisie (sauf valeur explicite).
        initialQuantity: initialQuantity ?? quantity,
        unit,
        minStock,
        supplierId: supplierId || null,
        invoiceImageUrl: invoiceImageUrl || null,
        unitCost,
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
    initialQuantity?: number;
    unit?: string;
    minStock?: number;
    supplierId?: number | null;
    invoiceImageUrl?: string | null;
    unitCost?: number;
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

// --- STOCK MOVEMENTS (historique des approvisionnements) ---

export async function getStockMovements(dbUserId: number) {
  try {
    return await db.select()
      .from(stockMovements)
      .where(eq(stockMovements.userId, dbUserId))
      .orderBy(desc(stockMovements.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch stock movements", error);
  }
}

export async function createStockMovement(
  dbUserId: number,
  stockId: number,
  itemName: string,
  quantity: number,
  unit: string,
  note: string | null = null
) {
  try {
    const result = await db.insert(stockMovements)
      .values({ userId: dbUserId, stockId, itemName, quantity, unit, note })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create stock movement", error);
  }
}

// Convertit une quantité d'une unité d'ingrédient vers l'unité d'un article de stock.
// Renvoie null si les familles d'unités sont incompatibles (ex. g vers l) — dans ce cas on ne décrémente pas.
function convertQty(value: number, fromUnit: string, toUnit: string): number | null {
  const family = (u: string) => {
    if (u === 'g' || u === 'kg') return 'mass';
    if (u === 'ml' || u === 'l') return 'volume';
    return 'count'; // piece, pieces, bouteilles, pce...
  };
  if (family(fromUnit) !== family(toUnit)) return null;
  const toBase: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000 };
  const fromFactor = toBase[fromUnit] ?? 1; // 'count' → 1
  const toFactor = toBase[toUnit] ?? 1;
  return (value * fromFactor) / toFactor;
}

// Décrémente le stock des ingrédients consommés par une commande (fiche technique × quantités vendues).
// Idempotent : ne s'exécute qu'une fois par commande (drapeau stock_deducted).
export async function deductStockForOrder(dbUserId: number, orderId: number) {
  try {
    const order = await getOrderById(orderId, dbUserId);
    if (!order || order.stockDeducted) return { deducted: false, stocks: [] as any[], alerts: [] as any[] };

    const items = order.items || [];
    // Marque comme traité même sans lignes, pour éviter de re-tenter.
    if (items.length === 0) {
      await db.update(orders).set({ stockDeducted: true }).where(and(eq(orders.id, orderId), eq(orders.userId, dbUserId)));
      return { deducted: true, stocks: [], alerts: [] };
    }

    // Fiches techniques (ingrédients) des plats de la commande.
    const menuIds = Array.from(new Set(items.map((it: any) => Number(it.menuItemId)))) as number[];
    const menus = await db.select().from(menuItems)
      .where(and(eq(menuItems.userId, dbUserId), inArray(menuItems.id, menuIds)));
    const ingredientsByMenu = new Map<number, any[]>(
      menus.map((m: any) => [m.id, Array.isArray(m.ingredients) ? m.ingredients : []])
    );

    const stockList = await getStocks(dbUserId);
    const stockById = new Map<number, any>((stockList || []).map((s: any) => [s.id, s]));

    // Cumul de consommation par article de stock (dans l'unité du stock).
    const consumption = new Map<number, number>();
    for (const it of items) {
      const ings = ingredientsByMenu.get(it.menuItemId) || [];
      for (const ing of ings) {
        if (ing.stockId == null) continue;
        const st = stockById.get(ing.stockId);
        if (!st) continue;
        const converted = convertQty((Number(ing.grammage) || 0) * (Number(it.quantity) || 0), ing.unit, st.unit);
        if (converted == null) continue; // unités incompatibles → on ne touche pas au stock
        consumption.set(ing.stockId, (consumption.get(ing.stockId) || 0) + converted);
      }
    }

    const affected: any[] = [];
    const alerts: any[] = [];
    for (const [stockId, amount] of consumption) {
      const st = stockById.get(stockId);
      const newQty = Math.max(0, (Number(st.quantity) || 0) - amount);
      const [updated] = await db.update(stocks)
        .set({ quantity: newQty })
        .where(and(eq(stocks.id, stockId), eq(stocks.userId, dbUserId)))
        .returning();
      if (updated) {
        affected.push(updated);
        if (updated.quantity < updated.minStock) alerts.push(updated);
      }
    }

    await db.update(orders).set({ stockDeducted: true }).where(and(eq(orders.id, orderId), eq(orders.userId, dbUserId)));
    return { deducted: true, stocks: affected, alerts };
  } catch (error) {
    handleDbError("Failed to deduct stock for order", error);
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
  imageUrl: string | null = null,
  recurringId: number | null = null
) {
  try {
    const result = await db.insert(expenses)
      .values({ userId: dbUserId, label, category, amount, expenseDate, notes, invoiceNumber, origin, imageUrl, recurringId })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create expense", error);
  }
}

// --- RECURRING EXPENSES (charges récurrentes mensuelles) ---

export async function getRecurringExpenses(dbUserId: number) {
  try {
    return await db.select().from(recurringExpenses)
      .where(eq(recurringExpenses.userId, dbUserId))
      .orderBy(desc(recurringExpenses.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch recurring expenses", error);
  }
}

export async function createRecurringExpense(
  dbUserId: number,
  label: string,
  category = 'divers',
  amount = 0.0,
  dayOfMonth = 1,
  active = true
) {
  try {
    const result = await db.insert(recurringExpenses)
      .values({ userId: dbUserId, label, category, amount, dayOfMonth, active })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create recurring expense", error);
  }
}

export async function updateRecurringExpense(
  id: number,
  dbUserId: number,
  updates: { label?: string; category?: string; amount?: number; dayOfMonth?: number; active?: boolean }
) {
  try {
    const result = await db.update(recurringExpenses)
      .set(updates)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update recurring expense", error);
  }
}

export async function deleteRecurringExpense(id: number, dbUserId: number) {
  try {
    const result = await db.delete(recurringExpenses)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete recurring expense", error);
  }
}

// Matérialise les charges récurrentes actives en dépenses réelles pour un mois donné (YYYY-MM),
// sans doublon (une dépense par charge et par mois). Renvoie les dépenses nouvellement créées.
export async function generateRecurringExpenses(dbUserId: number, monthPrefix: string) {
  try {
    const templates = await db.select().from(recurringExpenses)
      .where(and(eq(recurringExpenses.userId, dbUserId), eq(recurringExpenses.active, true)));
    const existing = await db.select().from(expenses)
      .where(eq(expenses.userId, dbUserId));
    const created: any[] = [];
    for (const t of templates) {
      const already = existing.some((e: any) => e.recurringId === t.id && (e.expenseDate || '').slice(0, 7) === monthPrefix);
      if (already) continue;
      const day = String(Math.min(28, Math.max(1, t.dayOfMonth || 1))).padStart(2, '0');
      const exp = await createExpense(
        dbUserId, t.label, t.category, t.amount,
        `${monthPrefix}-${day}`, 'Charge récurrente', null, null, null, t.id
      );
      created.push(exp);
    }
    return created;
  } catch (error) {
    handleDbError("Failed to generate recurring expenses", error);
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

// --- SPECIAL EVENTS CRUD (événements du calendrier) ---

export async function getSpecialEvents(dbUserId: number) {
  try {
    return await db.select().from(specialEvents)
      .where(eq(specialEvents.userId, dbUserId))
      .orderBy(desc(specialEvents.date));
  } catch (error) {
    handleDbError("Failed to fetch special events", error);
  }
}

export async function createSpecialEvent(
  dbUserId: number,
  title: string,
  date: string,
  time: string | null = null,
  category = 'theme',
  notes: string | null = null
) {
  try {
    const result = await db.insert(specialEvents)
      .values({ userId: dbUserId, title, date, time, category, notes })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create special event", error);
  }
}

export async function deleteSpecialEvent(eventId: number, dbUserId: number) {
  try {
    const result = await db.delete(specialEvents)
      .where(and(eq(specialEvents.id, eventId), eq(specialEvents.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete special event", error);
  }
}

// --- INCOMES CRUD (Rentrées d'argent) ---

export async function getIncomes(dbUserId: number) {
  try {
    return await db.select()
      .from(incomes)
      .where(eq(incomes.userId, dbUserId))
      .orderBy(desc(incomes.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch incomes from database", error);
  }
}

export async function createIncome(
  dbUserId: number,
  label: string,
  category = 'autre',
  amount = 0.0,
  source: string | null = null,
  paymentMethod = 'especes',
  incomeDate: string | null = null,
  imageUrl: string | null = null,
  notes: string | null = null
) {
  try {
    const result = await db.insert(incomes)
      .values({ userId: dbUserId, label, category, amount, source, paymentMethod, incomeDate, imageUrl, notes })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create income", error);
  }
}

export async function updateIncome(
  incomeId: number,
  dbUserId: number,
  updates: {
    label?: string;
    category?: string;
    amount?: number;
    source?: string | null;
    paymentMethod?: string;
    incomeDate?: string | null;
    imageUrl?: string | null;
    notes?: string | null;
  }
) {
  try {
    const result = await db.update(incomes)
      .set(updates)
      .where(and(eq(incomes.id, incomeId), eq(incomes.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update income", error);
  }
}

export async function deleteIncome(incomeId: number, dbUserId: number) {
  try {
    const result = await db.delete(incomes)
      .where(and(eq(incomes.id, incomeId), eq(incomes.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete income", error);
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
  notes: string | null = null,
  vehicleId: number | null = null
) {
  try {
    const result = await db.insert(deliveries)
      .values({ userId: dbUserId, clientName, address, clientPhone, deliveryDate, deliveryTime, orderId, driverName, status, notes, vehicleId })
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
    vehicleId?: number | null;
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

// --- ASSETS CRUD (biens & matériel du restaurant) ---

export async function getAssets(dbUserId: number) {
  try {
    return await db.select()
      .from(assets)
      .where(eq(assets.userId, dbUserId))
      .orderBy(desc(assets.createdAt));
  } catch (error) {
    handleDbError("Failed to fetch assets", error);
  }
}

export async function createAsset(
  dbUserId: number,
  name: string,
  category = 'autre',
  quantity = 1,
  condition = 'bon',
  purchaseValue = 0.0,
  photoUrl: string | null = null,
  notes: string | null = null
) {
  try {
    const result = await db.insert(assets)
      .values({ userId: dbUserId, name, category, quantity, condition, purchaseValue, photoUrl, notes })
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to create asset", error);
  }
}

export async function updateAsset(
  assetId: number,
  dbUserId: number,
  updates: {
    name?: string;
    category?: string;
    quantity?: number;
    condition?: string;
    purchaseValue?: number;
    photoUrl?: string | null;
    notes?: string | null;
  }
) {
  try {
    const result = await db.update(assets)
      .set(updates)
      .where(and(eq(assets.id, assetId), eq(assets.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to update asset", error);
  }
}

export async function deleteAsset(assetId: number, dbUserId: number) {
  try {
    const result = await db.delete(assets)
      .where(and(eq(assets.id, assetId), eq(assets.userId, dbUserId)))
      .returning();
    return result[0];
  } catch (error) {
    handleDbError("Failed to delete asset", error);
  }
}

