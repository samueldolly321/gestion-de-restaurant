import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision, jsonb } from 'drizzle-orm/pg-core';

// Define the 'users' table (Main restaurant manager / owner)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
  // App Config customization
  restaurantName: text('restaurant_name').default('RestoPilote'),
  restaurantLogoUrl: text('restaurant_logo_url'),
  restaurantPhone: text('restaurant_phone'), // Téléphone du restaurant (modifiable)
  restaurantAddress: text('restaurant_address'), // Adresse du restaurant (modifiable)
  role: text('role').notNull().default('super_admin'), // 'super_admin' or 'gerant'
  ownerId: integer('owner_id'), // Si défini, le compte partage les données de cet utilisateur (le super admin propriétaire)
});

// Define the 'clients' table (Customer loyalty and reservation tracking)
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'personnel' table (Staff management)
export const personnel = pgTable('personnel', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role').notNull().default('serveur'), // 'serveur', 'cuisinier', 'barman', 'manager'
  status: text('status').notNull().default('actif'), // 'actif', 'pause', 'absent'
  hourlyRate: doublePrecision('hourly_rate').notNull().default(15.0),
  salary: doublePrecision('salary').notNull().default(0.0), // monthly salary
  leaveStart: text('leave_start'), // Date de début congé
  leaveEnd: text('leave_end'),     // Date de fin congé
  hireDate: text('hire_date'),     // Date d'embauche
  avatarUrl: text('avatar_url'),   // Photo de profil de l'employé (URL ou base64)
  cvUrl: text('cv_url'),           // CV de l'employé (PDF ou image, URL ou base64)
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'menu_items' table (Dishes, drinks, desserts)
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: doublePrecision('price').notNull().default(0.0),
  category: text('category').notNull().default('plat'), // 'entree', 'plat', 'dessert', 'boisson'
  isAvailable: boolean('is_available').notNull().default(true),
  imageUrl: text('image_url'), // plat image (URL or base64 data)
  ingredients: jsonb('ingredients'), // liste [{ name, grammage, unit, cost }] pour la fiche technique du plat
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'orders' table (Tables and sales tracking)
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tableNumber: integer('table_number').notNull(),
  status: text('status').notNull().default('en_attente'), // 'en_attente', 'en_preparation', 'servi', 'paye'
  orderType: text('order_type').notNull().default('sur_place'), // 'sur_place' ou 'a_livrer'
  taxRate: doublePrecision('tax_rate').notNull().default(0.0), // taux de TVA en % (ex. 20). Prix menu = TTC.
  stockDeducted: boolean('stock_deducted').notNull().default(false), // stock des ingrédients déjà décrémenté (au paiement) ?
  totalAmount: doublePrecision('total_amount').notNull().default(0.0),
  paymentMethod: text('payment_method').notNull().default('carte'), // 'carte', 'especes', 'mobile'
  serverName: text('server_name'), // Nom du serveur / serveuse ayant pris la commande
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'order_items' table (Joint table for order detail rows)
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  menuItemId: integer('menu_item_id')
    .references(() => menuItems.id, { onDelete: 'cascade' })
    .notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: doublePrecision('unit_price').notNull(),
});

// Define the 'reservations' table (Reservations tracker)
export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone'),
  reservationDate: text('reservation_date').notNull(), // format YYYY-MM-DD HH:MM or similar
  guestsCount: integer('guests_count').notNull().default(2),
  tableNumber: integer('table_number'),
  status: text('status').notNull().default('confirme'), // 'confirme', 'annule', 'en_attente'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'suppliers' table (Fournisseurs)
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  paymentStatus: text('payment_status').notNull().default('en_attente'), // 'paye', 'en_attente', 'non_paye'
  contractDate: text('contract_date'), // date de transaction ou d'échéance
  amountDue: doublePrecision('amount_due').notNull().default(0.0), // montant
  invoiceNumber: text('invoice_number'), // numéro de la facture fournisseur
  invoiceImageUrl: text('invoice_image_url'), // photo de la facture (URL ou base64)
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'supplier_orders' table (Commandes passées à un fournisseur, avec historique)
export const supplierOrders = pgTable('supplier_orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull(), // description de la commande (ex. « Filet de calmar »)
  quantity: doublePrecision('quantity').notNull().default(1.0), // quantité commandée
  unitPrice: doublePrecision('unit_price').notNull().default(0.0), // prix unitaire (Ar)
  amount: doublePrecision('amount').notNull().default(0.0), // montant total = quantité × prix unitaire
  orderDate: text('order_date'), // date de la commande (YYYY-MM-DD)
  paymentStatus: text('payment_status').notNull().default('en_attente'), // 'paye', 'en_attente', 'non_paye'
  invoiceNumber: text('invoice_number'),
  invoiceImageUrl: text('invoice_image_url'),
  note: text('note'),
  expenseId: integer('expense_id').references(() => expenses.id, { onDelete: 'set null' }), // dépense créée auto au paiement
  stockId: integer('stock_id').references(() => stocks.id, { onDelete: 'set null' }), // article de stock alimenté à la réception
  received: boolean('received').notNull().default(false), // marchandise reçue ?
  stockApplied: boolean('stock_applied').notNull().default(false), // quantité déjà ajoutée au stock (garde-fou)
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'stocks' table (Stocks)
export const stocks = pgTable('stocks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  itemName: text('item_name').notNull(),
  quantity: doublePrecision('quantity').notNull().default(0.0), // quantité restante (décrémentée à la vente)
  initialQuantity: doublePrecision('initial_quantity').notNull().default(0.0), // quantité initiale (achat/réappro de référence)
  unit: text('unit').notNull().default('kg'), // 'kg', 'l', 'pieces', 'bouteilles'
  unitCost: doublePrecision('unit_cost').notNull().default(0.0), // coût d'achat par unité (Ar), sert au coût de revient des plats
  minStock: doublePrecision('min_stock').notNull().default(10.0),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id, { onDelete: 'set null' }),
  invoiceImageUrl: text('invoice_image_url'), // Image de la facture du stock (URL ou base64)
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'stock_movements' table (Historique des approvisionnements de stock)
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  stockId: integer('stock_id')
    .references(() => stocks.id, { onDelete: 'cascade' })
    .notNull(),
  itemName: text('item_name').notNull(), // libellé au moment du mouvement (robuste si l'article est supprimé)
  quantity: doublePrecision('quantity').notNull().default(0.0), // quantité approvisionnée
  unit: text('unit').notNull().default('kg'),
  note: text('note'), // ex. « Reçu de Les délices de mimi »
  createdAt: timestamp('created_at').defaultNow(), // date + heure de l'appro
});

// Define the 'notifications' table (Real-time logs)
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  type: text('type').notNull().default('info'), // 'order_created', 'order_status_updated', 'staff_update', 'client_update', 'system'
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'expenses' table (Dépenses diverses : loyer, électricité, eau, achats divers...)
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull(), // Libellé de la dépense
  category: text('category').notNull().default('divers'), // 'loyer', 'electricite', 'eau', 'telecom', 'entretien', 'fournitures', 'taxes', 'transport', 'divers'
  amount: doublePrecision('amount').notNull().default(0.0),
  invoiceNumber: text('invoice_number'), // Numéro de facture
  origin: text('origin'), // Origine / émetteur de la facture
  imageUrl: text('image_url'), // Photo de la facture (URL ou base64)
  expenseDate: text('expense_date'), // format YYYY-MM-DD
  notes: text('notes'),
  recurringId: integer('recurring_id'), // si généré depuis une charge récurrente
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'recurring_expenses' table (Charges récurrentes mensuelles : loyer, internet, assurances...)
export const recurringExpenses = pgTable('recurring_expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull(),
  category: text('category').notNull().default('divers'),
  amount: doublePrecision('amount').notNull().default(0.0),
  dayOfMonth: integer('day_of_month').notNull().default(1), // jour du mois où la charge tombe (1-28)
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'deliveries' table (Livraisons de commandes)
export const deliveries = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  clientName: text('client_name').notNull(), // Nom du client
  clientPhone: text('client_phone'), // Numéro de téléphone
  address: text('address').notNull(), // Adresse de livraison
  deliveryDate: text('delivery_date'), // Date de livraison (YYYY-MM-DD)
  deliveryTime: text('delivery_time'), // Heure de livraison (HH:MM)
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }), // Commande à livrer (numéro)
  driverName: text('driver_name'), // Nom du livreur (personnel de rôle 'livreur')
  status: text('status').notNull().default('en_preparation'), // 'en_preparation', 'en_route', 'livree', 'annulee'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'special_events' table (Événements spéciaux du calendrier : concerts, soirées, fermetures...)
export const specialEvents = pgTable('special_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time'), // HH:MM
  category: text('category').notNull().default('theme'), // 'concert', 'theme', 'vip', 'fermeture', 'autre'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'incomes' table (Rentrées d'argent : recettes hors additions, ou saisies manuelles)
export const incomes = pgTable('incomes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull(), // libellé de la rentrée
  category: text('category').notNull().default('autre'), // 'vente', 'evenement', 'subvention', 'remboursement', 'pourboire', 'autre'
  amount: doublePrecision('amount').notNull().default(0.0),
  source: text('source'), // origine (ex. client, organisme...)
  paymentMethod: text('payment_method').notNull().default('especes'), // 'especes', 'carte_visa', 'mvola', 'orange_money', 'airtel_money', 'virement', 'autre'
  incomeDate: text('income_date'), // YYYY-MM-DD
  imageUrl: text('image_url'), // justificatif (photo/reçu)
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Relationships ---

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  personnel: many(personnel),
  menuItems: many(menuItems),
  orders: many(orders),
  notifications: many(notifications),
  reservations: many(reservations),
  suppliers: many(suppliers),
  stocks: many(stocks),
  deliveries: many(deliveries),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  user: one(users, {
    fields: [deliveries.userId],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
}));

export const personnelRelations = relations(personnel, ({ one }) => ({
  user: one(users, {
    fields: [personnel.userId],
    references: [users.id],
  }),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  user: one(users, {
    fields: [menuItems.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  user: one(users, {
    fields: [suppliers.userId],
    references: [users.id],
  }),
  stocks: many(stocks),
  supplierOrders: many(supplierOrders),
}));

export const supplierOrdersRelations = relations(supplierOrders, ({ one }) => ({
  user: one(users, {
    fields: [supplierOrders.userId],
    references: [users.id],
  }),
  supplier: one(suppliers, {
    fields: [supplierOrders.supplierId],
    references: [suppliers.id],
  }),
}));

export const stocksRelations = relations(stocks, ({ one }) => ({
  user: one(users, {
    fields: [stocks.userId],
    references: [users.id],
  }),
  supplier: one(suppliers, {
    fields: [stocks.supplierId],
    references: [suppliers.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
  stock: one(stocks, {
    fields: [stockMovements.stockId],
    references: [stocks.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
