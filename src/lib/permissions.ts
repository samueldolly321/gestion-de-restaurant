// Permissions partagées front + back : rôles de connexion, onglets et accès par défaut.
// Modifié par le super admin par utilisateur (colonne users.allowed_tabs).

// Rôles de connexion (users.role) — distincts des rôles "métier" du personnel.
export type AppRole = 'super_admin' | 'gerant' | 'comptable' | 'chef_caisse' | 'serveur';

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  gerant: 'Gérant',
  comptable: 'Comptable',
  chef_caisse: 'Chef de caisse',
  serveur: 'Serveur(e)',
};

// Rôles assignables par le super admin dans l'onglet Utilisateurs (pas super_admin lui-même).
export const ASSIGNABLE_ROLES: AppRole[] = ['gerant', 'comptable', 'chef_caisse', 'serveur'];

// Onglets configurables (l'onglet "users" est exclusif au super admin, non listé ici).
export const TAB_IDS = [
  'dashboard', 'orders', 'menu', 'reservations', 'personnel', 'deliveries',
  'clients', 'calendar', 'stocks', 'assets', 'finance', 'incomes', 'expenses',
  'amortization', 'ia', 'settings',
] as const;

export type TabId = typeof TAB_IDS[number];

export const TAB_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  orders: 'Tables & Additions',
  menu: 'Carte du Chef',
  reservations: 'Réservations',
  personnel: 'Personnel',
  deliveries: 'Livraisons',
  clients: 'Clients',
  calendar: 'Calendrier Live',
  stocks: 'Stocks & Fournisseurs',
  assets: 'Biens & Matériel',
  finance: 'Argent (Finances)',
  incomes: "Rentrées d'argent",
  expenses: 'Dépenses diverses',
  amortization: 'Amortissement',
  ia: 'Analyses IA & Mérite',
  settings: 'Paramètres',
};

const ALL_TABS: TabId[] = [...TAB_IDS];

// Onglets par défaut selon le rôle (le super admin peut les personnaliser par utilisateur).
export const DEFAULT_ROLE_TABS: Record<AppRole, TabId[]> = {
  super_admin: ALL_TABS,
  gerant: ALL_TABS, // le gérant peut tout voir
  comptable: ['dashboard', 'finance', 'incomes', 'expenses', 'amortization'],
  chef_caisse: ['orders', 'menu', 'reservations', 'deliveries', 'clients', 'calendar'],
  serveur: ['orders', 'menu', 'reservations', 'deliveries', 'clients', 'calendar'],
};

// Onglets réellement accessibles par un utilisateur : sa liste perso si définie, sinon le défaut du rôle.
export function effectiveTabs(role: string, allowedTabs?: string[] | null): TabId[] {
  if (Array.isArray(allowedTabs) && allowedTabs.length > 0) {
    return ALL_TABS.filter((t) => allowedTabs.includes(t));
  }
  const def = DEFAULT_ROLE_TABS[role as AppRole];
  return def ? [...def] : [...DEFAULT_ROLE_TABS.serveur];
}
