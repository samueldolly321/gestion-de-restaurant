export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: string;
  restaurantName?: string | null;
  restaurantLogoUrl?: string | null;
  restaurantPhone?: string | null;
  restaurantAddress?: string | null;
  role: 'super_admin' | 'gerant' | string;
  ownerId?: number | null; // propriétaire du restaurant si compte rattaché (gérant)
  dataOwnerId?: number; // id effectif à utiliser pour toutes les données partagées
}

export interface Client {
  id: number;
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  notes: string | null;
  createdAt: string;
}

export interface Personnel {
  id: number;
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'serveur' | 'cuisinier' | 'chef_cuisinier' | 'femme_menage' | 'livreur' | 'barman' | 'manager' | string;
  status: 'actif' | 'pause' | 'absent' | string;
  hourlyRate: number;
  salary: number; // Mensuel
  leaveStart: string | null; // Date début congé
  leaveEnd: string | null;   // Date fin congé
  hireDate: string | null;   // Date d'embauche
  avatarUrl?: string | null; // Photo de profil
  cvUrl?: string | null; // CV (PDF ou image)
  createdAt: string;
}

export interface Ingredient {
  name: string;
  grammage: number; // quantité (ex. 200 pour 200 g)
  unit: string; // 'g', 'kg', 'ml', 'l', 'pièce'
  cost: number; // coût de cet ingrédient (Ar)
  stockId?: number | null; // article de stock lié (déduction auto à la vente)
}

export interface MenuItem {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  price: number;
  category: 'entree' | 'plat' | 'dessert' | 'boisson' | string;
  isAvailable: boolean;
  imageUrl?: string | null;
  ingredients?: Ingredient[] | null; // fiche technique : ingrédients (grammage + coût)
  createdAt: string;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  menuItemId: number;
  quantity: number;
  unitPrice: number;
  name?: string;      // libellé du plat/boisson (jointure menu)
  category?: string;  // catégorie du plat/boisson (jointure menu)
}

export interface Order {
  id: number;
  userId: number;
  tableNumber: number;
  status: 'en_attente' | 'en_preparation' | 'servi' | 'paye' | string;
  orderType: 'sur_place' | 'a_livrer' | string; // sur place ou à livrer
  taxRate: number; // taux de TVA en % (prix menu = TTC)
  stockDeducted?: boolean; // stock des ingrédients déjà décrémenté (au paiement)
  totalAmount: number;
  paymentMethod: 'carte' | 'especes' | 'mobile' | string;
  serverName?: string | null; // serveur/serveuse ayant pris la commande
  items?: OrderItem[]; // lignes de commande (plats/boissons), addition = somme des lignes
  createdAt: string;
}

export interface Reservation {
  id: number;
  userId: number;
  clientName: string;
  clientPhone: string | null;
  reservationDate: string; // format YYYY-MM-DD HH:MM
  guestsCount: number;
  tableNumber: number | null;
  status: 'confirme' | 'annule' | 'en_attente' | string;
  notes: string | null;
  createdAt: string;
}

export interface Supplier {
  id: number;
  userId: number;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  paymentStatus: 'paye' | 'en_attente' | 'non_paye' | string;
  contractDate: string | null;
  amountDue: number;
  invoiceNumber: string | null; // numéro de facture fournisseur
  invoiceImageUrl: string | null; // photo de la facture
  createdAt: string;
}

export interface SupplierOrder {
  id: number;
  userId: number;
  supplierId: number;
  label: string; // description de la commande
  quantity: number; // quantité commandée
  unitPrice: number; // prix unitaire (Ar)
  amount: number; // total = quantité × prix unitaire
  orderDate: string | null; // YYYY-MM-DD
  paymentStatus: 'paye' | 'en_attente' | 'non_paye' | string;
  invoiceNumber: string | null;
  invoiceImageUrl: string | null;
  note: string | null;
  expenseId: number | null; // dépense liée (créée auto au paiement)
  stockId: number | null; // article de stock alimenté à la réception
  received: boolean; // marchandise reçue ?
  stockApplied?: boolean; // quantité déjà ajoutée au stock (garde-fou)
  createdAt: string;
}

export interface Stock {
  id: number;
  userId: number;
  itemName: string;
  quantity: number; // quantité restante
  initialQuantity: number; // quantité initiale (achat de référence)
  unit: string;
  unitCost: number; // coût d'achat par unité (Ar)
  minStock: number;
  supplierId: number | null;
  invoiceImageUrl?: string | null; // Facture jointe
  createdAt: string;
}

export interface Expense {
  id: number;
  userId: number;
  label: string;
  category: 'loyer' | 'electricite' | 'eau' | 'telecom' | 'entretien' | 'fournitures' | 'taxes' | 'transport' | 'divers' | string;
  amount: number;
  invoiceNumber: string | null; // numéro de facture
  origin: string | null; // origine / émetteur de la facture
  imageUrl: string | null; // photo de la facture (base64 ou URL)
  expenseDate: string | null; // YYYY-MM-DD
  notes: string | null;
  recurringId?: number | null; // généré depuis une charge récurrente
  createdAt: string;
}

export interface RecurringExpense {
  id: number;
  userId: number;
  label: string;
  category: string;
  amount: number;
  dayOfMonth: number; // 1-28
  active: boolean;
  createdAt: string;
}

export interface Delivery {
  id: number;
  userId: number;
  clientName: string;
  clientPhone: string | null;
  address: string;
  deliveryDate: string | null; // date de livraison (YYYY-MM-DD)
  deliveryTime: string | null; // heure de livraison
  orderId: number | null; // numéro de la commande à livrer
  driverName: string | null; // nom du livreur
  status: 'en_preparation' | 'en_route' | 'livree' | 'annulee' | string;
  notes: string | null;
  createdAt: string;
}

export interface StockMovement {
  id: number;
  userId: number;
  stockId: number;
  itemName: string;
  quantity: number; // quantité approvisionnée
  unit: string;
  note: string | null;
  createdAt: string; // date + heure
}

export interface Income {
  id: number;
  userId: number;
  label: string;
  category: 'vente' | 'evenement' | 'subvention' | 'remboursement' | 'pourboire' | 'autre' | string;
  amount: number;
  source: string | null; // origine
  paymentMethod: 'especes' | 'carte_visa' | 'mvola' | 'orange_money' | 'airtel_money' | 'virement' | 'autre' | string;
  incomeDate: string | null; // YYYY-MM-DD
  imageUrl: string | null; // justificatif
  notes: string | null;
  createdAt: string;
}

export interface SpecialEvent {
  id: number;
  userId: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  category: 'concert' | 'theme' | 'vip' | 'fermeture' | 'autre' | string;
  notes: string | null;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  type: 'order_created' | 'order_status_updated' | 'staff_update' | 'client_update' | 'system' | string;
  createdAt: string;
}
