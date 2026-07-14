import React, { useState, useEffect, useRef } from 'react';
import {
  auth
} from './lib/firebase.ts';
import {
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import io, { Socket } from 'socket.io-client';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Utensils,
  Award,
  LogOut,
  Bell,
  Sparkles,
  RefreshCw,
  Database,
  Lock,
  Cpu,
  AlertCircle,
  Clock,
  ChevronRight,
  Calendar,
  Package,
  Landmark,
  Settings,
  Truck,
  Receipt,
  TrendingUp,
  Menu,
  X,
  Phone,
  ArrowLeft,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import DashboardCharts from './components/DashboardCharts.tsx';
import NotificationPanel from './components/NotificationPanel.tsx';
import ClientsManager from './components/ClientsManager.tsx';
import PersonnelManager from './components/PersonnelManager.tsx';
import MenuManager from './components/MenuManager.tsx';
import OrdersManager from './components/OrdersManager.tsx';
import ReservationsManager from './components/ReservationsManager.tsx';
import FinanceManager from './components/FinanceManager.tsx';
import InventoryManager from './components/InventoryManager.tsx';
import SettingsManager from './components/SettingsManager.tsx';
import ExpensesManager from './components/ExpensesManager.tsx';
import IncomeManager from './components/IncomeManager.tsx';
import DeliveriesManager from './components/DeliveriesManager.tsx';
import CalendarManager from './components/CalendarManager.tsx';
import AIManager from './components/AIManager.tsx';

import { DbUser, Client, Personnel, MenuItem, Order, Notification, Reservation, Stock, Supplier, SupplierOrder, Expense, RecurringExpense, Income, Delivery, StockMovement, SpecialEvent } from './types.ts';

type TabType = 'dashboard' | 'orders' | 'clients' | 'reservations' | 'personnel' | 'stocks' | 'finance' | 'expenses' | 'incomes' | 'deliveries' | 'settings' | 'menu' | 'calendar' | 'ia';

export default function App() {
  // Authentication states
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // New credential login/register states
  const pendingRoleRef = useRef<string | undefined>(undefined);
  const pendingOwnerEmailRef = useRef<string | undefined>(undefined);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authOwnerEmail, setAuthOwnerEmail] = useState(''); // e-mail du super admin à rejoindre (gérant)
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'gerant'>('super_admin');
  const [loginSubView, setLoginSubView] = useState<'login' | 'contact' | 'privacy'>('login');

  // App active view
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Business states
  const [clients, setClients] = useState<Client[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // UI States
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isSimulatingNotif, setIsSimulatingNotif] = useState(false);

  // Socket reference
  const socketRef = useRef<Socket | null>(null);

  // Propriétaire effectif des données : le super admin pour un gérant rattaché, sinon soi-même.
  // Toutes les opérations de données (lecture/écriture/temps réel) utilisent cet id => partage des données.
  const dataOwnerId = dbUser ? (dbUser.dataOwnerId ?? dbUser.id) : 0;

  // Format Ariary helper
  const formatAr = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar').trim();
  };

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        setFirebaseUser(usr);
        try {
          const jwtToken = await usr.getIdToken();
          setToken(jwtToken);
          // Sync with Postgres backend, passing pending role + owner email if present
          const roleToSync = pendingRoleRef.current;
          const ownerEmailToSync = pendingOwnerEmailRef.current;
          pendingRoleRef.current = undefined; // reset
          pendingOwnerEmailRef.current = undefined;
          await syncUserWithBackend(jwtToken, roleToSync, ownerEmailToSync);
        } catch (err: any) {
          console.error("Auth sync failed", err);
          setErrorMsg("Impossible de s'authentifier avec les serveurs sécurisés.");
        }
      } else {
        setFirebaseUser(null);
        setDbUser(null);
        setToken(null);
        setClients([]);
        setPersonnel([]);
        setMenuItems([]);
        setOrders([]);
        setReservations([]);
        setStocks([]);
        setSuppliers([]);
        setSupplierOrders([]);
        setStockMovements([]);
        setExpenses([]);
        setRecurringExpenses([]);
        setIncomes([]);
        setSpecialEvents([]);
        setDeliveries([]);
        setNotifications([]);
        setIsAuthLoading(false);
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Safeguard redirect if user is Gérant on a restricted tab
  useEffect(() => {
    if (dbUser && dbUser.role === 'gerant' && activeTab === 'finance') {
      setActiveTab('dashboard');
    }
  }, [dbUser, activeTab]);

  // Titre de l'onglet du navigateur = nom du restaurant (identité) une fois connecté.
  useEffect(() => {
    const name = dbUser?.restaurantName?.trim();
    document.title = name ? `${name} — RestoPilote` : 'RestoPilote — Gestion de restaurant';
  }, [dbUser]);

  // 2. Synchronize user with Cloud SQL backend
  const syncUserWithBackend = async (jwtToken: string, chosenRole?: string, ownerEmail?: string) => {
    try {
      setIsAuthLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ role: chosenRole, ownerEmail })
      });

      if (!res.ok) {
        throw new Error('Le serveur a échoué à synchroniser la session.');
      }

      const userData: DbUser = await res.json();
      setDbUser(userData);
      setIsAuthLoading(false);

      // Toutes les données utilisent le propriétaire effectif (partage super admin / gérant).
      const ownerId = userData.dataOwnerId || userData.id;
      initializeSocket(ownerId);
      fetchWorkspaceData(jwtToken, ownerId);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'La synchronisation serveur a échoué.');
      setIsAuthLoading(false);
    }
  };

  // 3. Establish Socket.io connection for real-time events
  const initializeSocket = (userId: number) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket: Socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connecté au serveur de flux d\'événements :', socket.id);
      socket.emit('join', userId);
    });

    // Handle real-time notifications
    socket.on('notification', (newNotif: Notification) => {
      setNotifications((prev) => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
    });

    // Handle real-time user config changes
    socket.on('config_updated', (updatedUser: DbUser) => {
      setDbUser(updatedUser);
    });

    // Handle real-time client updates
    socket.on('client_created', (newC: Client) => {
      setClients((prev) => [newC, ...prev.filter(c => c.id !== newC.id)]);
    });
    socket.on('client_updated', (updC: Client) => {
      setClients((prev) => prev.map((c) => (c.id === updC.id ? updC : c)));
    });
    socket.on('client_deleted', (data: { id: number }) => {
      setClients((prev) => prev.filter((c) => c.id !== data.id));
    });

    // Handle real-time personnel updates
    socket.on('personnel_created', (newP: Personnel) => {
      setPersonnel((prev) => [newP, ...prev.filter(p => p.id !== newP.id)]);
    });
    socket.on('personnel_updated', (updP: Personnel) => {
      setPersonnel((prev) => prev.map((p) => (p.id === updP.id ? updP : p)));
    });
    socket.on('personnel_deleted', (data: { id: number }) => {
      setPersonnel((prev) => prev.filter((p) => p.id !== data.id));
    });

    // Handle real-time menu updates
    socket.on('menu_item_created', (newM: MenuItem) => {
      setMenuItems((prev) => [newM, ...prev.filter(m => m.id !== newM.id)]);
    });
    socket.on('menu_item_updated', (updM: MenuItem) => {
      setMenuItems((prev) => prev.map((m) => (m.id === updM.id ? updM : m)));
    });
    socket.on('menu_item_deleted', (data: { id: number }) => {
      setMenuItems((prev) => prev.filter((m) => m.id !== data.id));
    });

    // Handle real-time order updates
    socket.on('order_created', (newO: Order) => {
      setOrders((prev) => [newO, ...prev.filter(o => o.id !== newO.id)]);
    });
    socket.on('order_updated', (updO: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === updO.id ? updO : o)));
    });
    socket.on('order_deleted', (data: { id: number }) => {
      setOrders((prev) => prev.filter((o) => o.id !== data.id));
    });

    // Handle real-time reservation updates
    socket.on('reservation_created', (newRes: Reservation) => {
      setReservations((prev) => [newRes, ...prev.filter(r => r.id !== newRes.id)]);
    });
    socket.on('reservation_updated', (updRes: Reservation) => {
      setReservations((prev) => prev.map((r) => (r.id === updRes.id ? updRes : r)));
    });
    socket.on('reservation_deleted', (data: { id: number }) => {
      setReservations((prev) => prev.filter((r) => r.id !== data.id));
    });

    // Handle real-time stock updates
    socket.on('stock_created', (newS: Stock) => {
      setStocks((prev) => [newS, ...prev.filter(s => s.id !== newS.id)]);
    });
    socket.on('stock_updated', (updS: Stock) => {
      setStocks((prev) => prev.map((s) => (s.id === updS.id ? updS : s)));
    });
    socket.on('stock_deleted', (data: { id: number }) => {
      setStocks((prev) => prev.filter((s) => s.id !== data.id));
    });
    // Historique d'approvisionnement en temps réel
    socket.on('stock_movement_created', (mv: StockMovement) => {
      setStockMovements((prev) => [mv, ...prev.filter((m) => m.id !== mv.id)]);
    });

    // Handle real-time supplier updates
    socket.on('supplier_created', (newSup: Supplier) => {
      setSuppliers((prev) => [newSup, ...prev.filter(s => s.id !== newSup.id)]);
    });
    socket.on('supplier_updated', (updSup: Supplier) => {
      setSuppliers((prev) => prev.map((s) => (s.id === updSup.id ? updSup : s)));
    });
    socket.on('supplier_deleted', (data: { id: number }) => {
      setSuppliers((prev) => prev.filter((s) => s.id !== data.id));
    });

    // Handle real-time supplier order updates
    socket.on('supplier_order_created', (newO: SupplierOrder) => {
      setSupplierOrders((prev) => [newO, ...prev.filter((o) => o.id !== newO.id)]);
    });
    socket.on('supplier_order_updated', (updO: SupplierOrder) => {
      setSupplierOrders((prev) => prev.map((o) => (o.id === updO.id ? updO : o)));
    });
    socket.on('supplier_order_deleted', (data: { id: number }) => {
      setSupplierOrders((prev) => prev.filter((o) => o.id !== data.id));
    });

    // Handle real-time expense updates
    socket.on('expense_created', (newE: Expense) => {
      setExpenses((prev) => [newE, ...prev.filter((e) => e.id !== newE.id)]);
    });
    socket.on('expense_updated', (updE: Expense) => {
      setExpenses((prev) => prev.map((e) => (e.id === updE.id ? updE : e)));
    });
    socket.on('expense_deleted', (data: { id: number }) => {
      setExpenses((prev) => prev.filter((e) => e.id !== data.id));
    });

    // Handle real-time recurring expense updates (charges récurrentes)
    socket.on('recurring_expense_created', (newR: RecurringExpense) => {
      setRecurringExpenses((prev) => [newR, ...prev.filter((r) => r.id !== newR.id)]);
    });
    socket.on('recurring_expense_updated', (updR: RecurringExpense) => {
      setRecurringExpenses((prev) => prev.map((r) => (r.id === updR.id ? updR : r)));
    });
    socket.on('recurring_expense_deleted', (data: { id: number }) => {
      setRecurringExpenses((prev) => prev.filter((r) => r.id !== data.id));
    });

    // Handle real-time income updates (rentrées d'argent)
    socket.on('income_created', (newI: Income) => {
      setIncomes((prev) => [newI, ...prev.filter((i) => i.id !== newI.id)]);
    });
    socket.on('income_updated', (updI: Income) => {
      setIncomes((prev) => prev.map((i) => (i.id === updI.id ? updI : i)));
    });
    socket.on('income_deleted', (data: { id: number }) => {
      setIncomes((prev) => prev.filter((i) => i.id !== data.id));
    });

    // Handle real-time special event updates (calendrier)
    socket.on('special_event_created', (newE: SpecialEvent) => {
      setSpecialEvents((prev) => [newE, ...prev.filter((e) => e.id !== newE.id)]);
    });
    socket.on('special_event_deleted', (data: { id: number }) => {
      setSpecialEvents((prev) => prev.filter((e) => e.id !== data.id));
    });

    // Handle real-time delivery updates
    socket.on('delivery_created', (newD: Delivery) => {
      setDeliveries((prev) => [newD, ...prev.filter((d) => d.id !== newD.id)]);
    });
    socket.on('delivery_updated', (updD: Delivery) => {
      setDeliveries((prev) => prev.map((d) => (d.id === updD.id ? updD : d)));
    });
    socket.on('delivery_deleted', (data: { id: number }) => {
      setDeliveries((prev) => prev.filter((d) => d.id !== data.id));
    });

    socket.on('disconnect', () => {
      console.log('Déconnecté du socket temps réel.');
    });
  };

  // 4. Fetch All Restaurant Data
  const fetchWorkspaceData = async (jwtToken: string, userId: number) => {
    try {
      setIsDataLoading(true);
      // Matérialise les charges récurrentes du mois en cours AVANT de charger les dépenses.
      await fetch('/api/recurring-expenses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
        body: JSON.stringify({ dbUserId: userId })
      }).catch(() => {});
      const [clientsRes, staffRes, menuRes, ordersRes, notifsRes, resvRes, stocksRes, suppliersRes, expensesRes, deliveriesRes, movementsRes, supplierOrdersRes, incomesRes, recurringRes, specialEventsRes] = await Promise.all([
        fetch(`/api/clients?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/personnel?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/menu-items?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/orders?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/notifications?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/reservations?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/stocks?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/suppliers?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/expenses?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/deliveries?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/stock-movements?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/supplier-orders?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/incomes?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/recurring-expenses?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        }),
        fetch(`/api/special-events?dbUserId=${userId}`, {
          headers: { 'Authorization': `Bearer ${jwtToken}` }
        })
      ]);

      if (clientsRes.ok) setClients(await clientsRes.json());
      if (staffRes.ok) setPersonnel(await staffRes.json());
      if (menuRes.ok) setMenuItems(await menuRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (notifsRes.ok) setNotifications(await notifsRes.json());
      if (resvRes.ok) setReservations(await resvRes.json());
      if (stocksRes.ok) setStocks(await stocksRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (deliveriesRes.ok) setDeliveries(await deliveriesRes.json());
      if (movementsRes.ok) setStockMovements(await movementsRes.json());
      if (supplierOrdersRes.ok) setSupplierOrders(await supplierOrdersRes.json());
      if (incomesRes.ok) setIncomes(await incomesRes.json());
      if (recurringRes.ok) setRecurringExpenses(await recurringRes.json());
      if (specialEventsRes.ok) setSpecialEvents(await specialEventsRes.json());
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Email/Password Signup
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      setErrorMsg(null);
      setIsAuthLoading(true);
      pendingRoleRef.current = selectedRole;
      // Un gérant rejoint le restaurant du super admin via son e-mail.
      pendingOwnerEmailRef.current = selectedRole === 'gerant' ? (authOwnerEmail.trim() || undefined) : undefined;
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      if (authDisplayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName: authDisplayName });
      }
    } catch (err: any) {
      console.error('Email registration failed:', err);
      setIsAuthLoading(false);
      let friendlyMsg = "L'inscription a échoué.";
      if (err.code === 'auth/email-already-in-use') {
        friendlyMsg = 'Cette adresse e-mail est déjà utilisée.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMsg = 'Le mot de passe doit contenir au moins 6 caractères.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMsg = "L'adresse e-mail n'est pas valide.";
      } else {
        friendlyMsg = err.message || friendlyMsg;
      }
      setErrorMsg(friendlyMsg);
    }
  };

  // Email/Password Signin
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setErrorMsg('Veuillez entrer votre e-mail et votre mot de passe.');
      return;
    }
    try {
      setErrorMsg(null);
      setIsAuthLoading(true);
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (err: any) {
      console.error('Email login failed:', err);
      setIsAuthLoading(false);
      let friendlyMsg = 'La connexion a échoué.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMsg = 'E-mail ou mot de passe incorrect.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMsg = "L'adresse e-mail n'est pas valide.";
      } else {
        friendlyMsg = err.message || friendlyMsg;
      }
      setErrorMsg(friendlyMsg);
    }
  };

  // Test/Demo login: accès admin local sans Firebase (gated par ENABLE_TEST_LOGIN côté serveur)
  const handleTestLogin = async () => {
    try {
      setErrorMsg(null);
      setIsAuthLoading(true);
      const res = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Le login de test est indisponible.");
      }
      const { token: testToken, user } = await res.json();
      setToken(testToken);
      setDbUser(user);
      setIsAuthLoading(false);
      initializeSocket(user.id);
      fetchWorkspaceData(testToken, user.id);
    } catch (err: any) {
      console.error('Test login failed:', err);
      setErrorMsg(err.message || 'Le login de test a échoué.');
      setIsAuthLoading(false);
    }
  };

  // Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign Out Failed:', err);
    }
    // Nettoyage manuel de la session (nécessaire pour le login de test qui n'a pas d'utilisateur Firebase)
    setFirebaseUser(null);
    setDbUser(null);
    setToken(null);
    setIsAuthLoading(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // --- CLIENTS MUTATORS ---
  const handleAddClient = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'enregistrer le client.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditClient = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier le client.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/clients/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer le client.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- PERSONNEL MUTATORS ---
  const handleAddStaff = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/personnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de recruter l\'employé.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditStaff = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/personnel/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier l\'employé.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/personnel/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer le membre du personnel.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- MENU MUTATORS ---
  const handleAddMenuItem = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'ajouter au menu.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditMenuItem = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/menu-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier le plat.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteMenuItem = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/menu-items/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de retirer le plat de la carte.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- ORDERS MUTATORS ---
  const handleAddOrder = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'ouvrir le service de table.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditOrder = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier la commande.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/orders/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de clôturer la commande.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- RESERVATIONS MUTATORS ---
  const handleAddReservation = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de créer la réservation.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditReservation = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier la réservation.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteReservation = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/reservations/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer la réservation.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- STOCKS MUTATORS ---
  const handleAddStock = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de créer l\'article de stock.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditStock = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/stocks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier l\'article de stock.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteStock = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/stocks/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer l\'article de stock.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- SUPPLIERS MUTATORS ---
  const handleAddSupplier = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de créer le fournisseur.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditSupplier = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier le fournisseur.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/suppliers/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer le fournisseur.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- SUPPLIER ORDERS MUTATORS (commandes fournisseur) ---
  const handleAddSupplierOrder = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/supplier-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'enregistrer la commande fournisseur.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditSupplierOrder = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/supplier-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier la commande fournisseur.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteSupplierOrder = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/supplier-orders/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer la commande fournisseur.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- EXPENSES MUTATORS (Dépenses diverses) ---
  const handleAddExpense = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'enregistrer la dépense.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditExpense = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier la dépense.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/expenses/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer la dépense.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- RECURRING EXPENSES MUTATORS (charges récurrentes) ---
  const handleAddRecurring = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'enregistrer la charge récurrente.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditRecurring = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier la charge récurrente.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/recurring-expenses/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer la charge récurrente.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- SPECIAL EVENTS MUTATORS (calendrier) ---
  const handleAddSpecialEvent = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/special-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'ajouter l\'événement.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteSpecialEvent = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/special-events/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer l\'événement.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- INCOMES MUTATORS (Rentrées d'argent) ---
  const handleAddIncome = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'enregistrer la rentrée.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditIncome = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/incomes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier la rentrée.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteIncome = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/incomes/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer la rentrée.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- DELIVERIES MUTATORS (Livraisons) ---
  const handleAddDelivery = async (formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible d\'enregistrer la livraison.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEditDelivery = async (id: number, formData: any) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...formData })
      });
      if (!res.ok) throw new Error('Impossible de modifier la livraison.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteDelivery = async (id: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/deliveries/${id}?dbUserId=${dataOwnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Impossible de supprimer la livraison.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // --- BRAND CONFIG UPDATE ---
  const handleUpdateConfig = async (updates: {
    restaurantName: string;
    restaurantLogoUrl: string | null;
    restaurantPhone?: string | null;
    restaurantAddress?: string | null;
    role: string;
  }) => {
    if (!token || !dbUser) return;
    try {
      // L'identité du restaurant appartient au propriétaire effectif des données (dataOwnerId),
      // pour rester cohérente et partagée entre tous les comptes rattachés.
      const res = await fetch('/api/users/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId, ...updates })
      });
      if (!res.ok) throw new Error('Impossible de modifier les paramètres.');
      const updatedOwner = await res.json();
      // On met à jour l'affichage local (nom/logo/tél/adresse) sans écraser l'identité de session (id, rôle, uid).
      setDbUser((prev) => prev ? {
        ...prev,
        restaurantName: updatedOwner.restaurantName,
        restaurantLogoUrl: updatedOwner.restaurantLogoUrl,
        restaurantPhone: updatedOwner.restaurantPhone,
        restaurantAddress: updatedOwner.restaurantAddress,
      } : prev);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notifId: number) => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId })
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to update notification status', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!token || !dbUser) return;
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId })
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  // Simulate a real-time collaborative coworker update!
  const handleTriggerSimulation = async () => {
    if (!token || !dbUser) return;
    setIsSimulatingNotif(true);

    try {
      const res = await fetch('/api/notifications/trigger-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId: dataOwnerId })
      });
      if (!res.ok) {
        throw new Error('Failed to trigger restaurant simulation.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsSimulatingNotif(false);
      }, 750);
    }
  };

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const getCalendarEvents = () => {
    const events: Array<{ type: 'reservation' | 'leave' | 'special' | 'delivery'; title: string; date: string; color: string }> = [];

    // Add reservations to calendar
    reservations.forEach((r) => {
      const dateOnly = r.reservationDate.split('T')[0];
      events.push({
        type: 'reservation',
        title: `Rés. ${r.clientName} (${r.guestsCount} pers)`,
        date: dateOnly,
        color: r.status === 'confirme' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
      });
    });

    // Add personnel leaves to calendar
    personnel.forEach((p) => {
      if (p.leaveStart && p.leaveEnd) {
        events.push({
          type: 'leave',
          title: `Congé : ${p.name}`,
          date: p.leaveStart,
          color: 'bg-red-50 text-red-800 border-red-200'
        });
      }
    });

    // Add special events (concerts, soirées, fermetures...)
    specialEvents.forEach((e) => {
      events.push({
        type: 'special',
        title: e.title,
        date: e.date,
        color: 'bg-indigo-50 text-indigo-800 border-indigo-200'
      });
    });

    // Add deliveries with a planned date
    deliveries.forEach((d) => {
      if (d.deliveryDate) {
        events.push({
          type: 'delivery',
          title: `Livraison : ${d.clientName}`,
          date: d.deliveryDate,
          color: 'bg-blue-50 text-blue-800 border-blue-200'
        });
      }
    });

    // Tri chronologique.
    return events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  };

  // ONBOARDING SCREEN (Signed Out) - Crafted in spectacular Red and Yellow brand accents!
  if (!firebaseUser && !dbUser) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Soft Background Warm Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.06),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(250,204,21,0.06),transparent_60%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-slate-200/50" />

        {/* Top Header Navigation */}
        <header className="px-6 lg:px-12 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-red-600 rounded-xl shadow-md shadow-red-600/20">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-slate-900">
              RestoPilote
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <span className="flex h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            Malagasy Ariary (Ar)
          </div>
        </header>

        {/* Main Hero Card Body */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 z-10 py-12">
          {isAuthLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-red-600" />
                <Database className="w-4 h-4 text-red-600 absolute animate-pulse" />
              </div>
              <p className="text-xs font-semibold text-slate-400 font-mono tracking-widest uppercase mt-2">
                Vérification de la session sécurisée...
              </p>
            </div>
          ) : loginSubView === 'contact' ? (
            <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-left space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-lg text-slate-900">Support &amp; Contact</h2>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">RestoPilote Assistance</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginSubView('login')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Retour
                </button>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                Notre équipe est à votre entière disposition pour vous accompagner dans la prise en main de votre restaurant, la configuration de votre base de données locale PostgreSQL, ou pour toute autre question technique et opérationnelle.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Téléphone Support</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 font-mono">+261 34 56 789 10</p>
                  <p className="text-[9px] text-slate-400">Appel direct &amp; WhatsApp</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <Mail className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Adresse E-mail</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 font-mono">support@chefsuite.mg</p>
                  <p className="text-[9px] text-slate-400">Réponse sous 2 heures max</p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl flex gap-3">
                <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">Horaires d'assistance</h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Notre assistance technique locale est ouverte de <strong>8h à 18h (GMT+3)</strong> du lundi au samedi pour assurer la continuité opérationnelle complète de votre établissement à Madagascar.
                  </p>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setLoginSubView('login')}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-red-600/10"
                >
                  Accéder au portail de connexion
                </button>
              </div>
            </div>
          ) : loginSubView === 'privacy' ? (
            <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-left space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-lg text-slate-900">Charte de Confidentialité</h2>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Sécurité des Données RestoPilote</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginSubView('login')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Retour
                </button>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 text-xs text-slate-600 leading-relaxed">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">1. Propriété Souveraine des Données</h3>
                  <p>
                    Toutes vos données de restauration (ventes, additions en Ariary, état des stocks, fiches de personnel et plannings) vous appartiennent de manière exclusive. Elles sont stockées en toute sécurité sur votre serveur PostgreSQL, que ce soit localement sur votre ordinateur ou sur votre infrastructure Cloud dédiée.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">2. Respect du Personnel &amp; Méritocratie</h3>
                  <p>
                    L'enregistrement des temps de présence, des salaires, des congés et l'indice de mérite calculé par notre module d'analyse IA sont conçus pour assurer une totale équité et transparence. Ces données ne sont jamais partagées à des tiers et servent uniquement à générer des rapports de management internes à votre entreprise.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">3. Sécurité Locale Totale</h3>
                  <p>
                    Lorsque l'application RestoPilote est déployée en local sur votre poste de travail à l'aide de PostgreSQL, vous gardez le contrôle physique et réseau absolu sur votre base de données. Aucune donnée n'est envoyée vers des serveurs distants en dehors de l'authentification sécurisée gérée via Firebase Auth.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">4. Traitement des Analyses par Intelligence Artificielle</h3>
                  <p>
                    Les fonctionnalités IA de RestoPilote s'exécutent au travers de passerelles de sécurité qui anonymisent les noms et informations nominatives de votre équipe avant de solliciter les modèles de langage de pointe de l'IA. Cela garantit un traitement ultra-sécurisé sans fuite d'informations confidentielles.
                  </p>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLoginSubView('login')}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-red-600/10"
                >
                  Compris, Retour
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center w-full">
              <div className="md:col-span-7 text-left space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-xs font-semibold text-red-700">
                  <Sparkles className="w-3.5 h-3.5" /> Gestion de Restaurant en ligne
                </div>

                <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Gérez votre salle, <br />
                  <span className="bg-gradient-to-r from-red-600 via-yellow-500 to-red-800 bg-clip-text text-transparent">
                    votre staff & vos stocks.
                  </span>
                </h1>

                <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-lg">
                  Simplifiez la vie de votre établissement gastronomique à Madagascar. Suivez vos stocks, organisez vos réservations sur le calendrier live, pilotez les salaires et surveillez vos additions en Ariary.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Card 1: Plats & Menu */}
                  <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-3xs hover:border-red-200 transition-all text-left flex flex-col justify-between h-full group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-red-50 text-red-600 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-all">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-mono uppercase">Populaire</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 mb-1 font-display">Plats & Menu</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Cartes interactives, suivi des ventes de plats et suggestions de prix.
                      </p>
                    </div>
                    {/* Visual Illustration */}
                    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-red-100 border border-red-200 flex items-center justify-center font-bold text-[10px] text-red-700">🍜</div>
                        <div className="space-y-0.5">
                          <div className="w-12 h-1.5 bg-slate-200 rounded" />
                          <div className="w-8 h-1 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-600">Ar 18k</span>
                    </div>
                  </div>

                  {/* Card 2: Gestion Personnel */}
                  <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-3xs hover:border-red-200 transition-all text-left flex flex-col justify-between h-full group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-yellow-50 text-yellow-600 rounded-2xl group-hover:bg-yellow-500 group-hover:text-slate-950 transition-all">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full font-mono uppercase">98% Présence</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 mb-1 font-display">Gestion Personnel</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Fiches de présence, salaires, congés et méritocratie en direct.
                      </p>
                    </div>
                    {/* Overlapping avatar stacks for illustration */}
                    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-2 flex items-center justify-between">
                      <div className="flex -space-x-2.5 overflow-hidden">
                        <div className="inline-block h-6 h-6 rounded-full ring-2 ring-white bg-red-100 text-red-700 text-[9px] font-bold flex items-center justify-center">L</div>
                        <div className="inline-block h-6 h-6 rounded-full ring-2 ring-white bg-yellow-100 text-yellow-700 text-[9px] font-bold flex items-center justify-center">M</div>
                        <div className="inline-block h-6 h-6 rounded-full ring-2 ring-white bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center">S</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold font-mono">10 Actifs</span>
                    </div>
                  </div>

                  {/* Card 3: Chiffre d'Affaires & Finances */}
                  <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-3xs hover:border-red-200 transition-all text-left flex flex-col justify-between h-full group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-red-50 text-red-600 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-all">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-700 rounded-full font-mono uppercase">+24% Croiss.</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 mb-1 font-display">Chiffres & Finances</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Suivi en temps réel des additions, dépenses et marge nette.
                      </p>
                    </div>
                    {/* Mini bar chart style illustration */}
                    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-2 flex items-end justify-between h-7.5 gap-1 px-3">
                      <div className="w-full bg-slate-200 rounded-t h-2" />
                      <div className="w-full bg-slate-300 rounded-t h-4" />
                      <div className="w-full bg-yellow-400 rounded-t h-3" />
                      <div className="w-full bg-red-500 rounded-t h-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md relative">
                <div className="absolute top-4 right-4 flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-100" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>

                <div className="space-y-6 py-2 text-center">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-lg text-slate-900">Portail Restaurant</h3>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Contrôle d'accès RestoPilote</p>
                  </div>

                  {/* Tabs */}
                  <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setErrorMsg(null);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        !isRegisterMode ? 'bg-white text-red-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Se connecter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setErrorMsg(null);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        isRegisterMode ? 'bg-white text-red-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      S'inscrire
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-left flex gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-rose-600 leading-normal">{errorMsg}</p>
                    </div>
                  )}

                  {/* Credentials Form */}
                  <form onSubmit={isRegisterMode ? handleEmailRegister : handleEmailLogin} className="space-y-3.5 text-left">
                    {isRegisterMode && (
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Nom du restaurant / Gérant
                        </label>
                        <input
                          type="text"
                          required
                          value={authDisplayName}
                          onChange={(e) => setAuthDisplayName(e.target.value)}
                          placeholder="Ex. Le Gourmet Antananarivo"
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none text-slate-800"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Adresse E-mail
                      </label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="chef@restaurant.mg"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Mot de passe
                      </label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none text-slate-800"
                      />
                    </div>

                    {isRegisterMode && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Type de Compte (Rôle) *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRole('super_admin')}
                            className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              selectedRole === 'super_admin'
                                ? 'border-red-500 bg-red-50/40 text-red-700'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                            }`}
                          >
                            <span className="text-[11px] font-bold">Super Admin</span>
                            <span className="text-[8px] text-slate-400 mt-0.5 leading-normal">
                              Accès complet, finances, audits de méritocratie.
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRole('gerant')}
                            className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              selectedRole === 'gerant'
                                ? 'border-red-500 bg-red-50/40 text-red-700'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                            }`}
                          >
                            <span className="text-[11px] font-bold">Gérant</span>
                            <span className="text-[8px] text-slate-400 mt-0.5 leading-normal">
                              Commandes, réservations, stocks, clients.
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isRegisterMode && selectedRole === 'gerant' && (
                      <div className="text-left">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          E-mail du Super Admin à rejoindre
                        </label>
                        <input
                          type="email"
                          value={authOwnerEmail}
                          onChange={(e) => setAuthOwnerEmail(e.target.value)}
                          placeholder="email.du.super.admin@exemple.com"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-800"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                          Vous partagerez les mêmes données (commandes, stocks, personnel…) que ce restaurant.
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-600/10 cursor-pointer text-center"
                    >
                      {isRegisterMode ? "Créer mon compte" : "Se connecter"}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink mx-3 text-[9px] text-slate-400 uppercase tracking-wider font-mono">OU</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>

                  {/* Accès test / démo — entrer dans l'admin sans mot de passe (local uniquement) */}
                  <button
                    type="button"
                    onClick={handleTestLogin}
                    className="w-full py-2 mt-1 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Accès test (Admin) — sans mot de passe
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-slate-100 px-6 z-10 bg-white">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 font-semibold">
              © 2026 RestoPilote • Madagascar.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => setLoginSubView('contact')}
                className="hover:text-red-600 transition-colors cursor-pointer text-[11px]"
              >
                Contact &amp; Support
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setLoginSubView('privacy')}
                className="hover:text-red-600 transition-colors cursor-pointer text-[11px]"
              >
                Confidentialité
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // APP WORKSPACE (Signed In)
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row font-sans text-slate-800 relative">
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col justify-between transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Sidebar Brand Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {dbUser?.restaurantLogoUrl ? (
                <img
                  src={dbUser.restaurantLogoUrl}
                  alt={dbUser.restaurantName || 'Logo'}
                  className="w-8 h-8 rounded-xl object-cover shadow-2xs border border-slate-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="p-2.5 bg-red-600 text-yellow-400 rounded-xl shadow-md shadow-red-600/10">
                  <Utensils className="w-4 h-4" />
                </div>
              )}
              <div className="text-left">
                <span className="font-display font-extrabold text-sm tracking-tight text-slate-950 block leading-tight">
                  {dbUser?.restaurantName || 'RestoPilote'}
                </span>
                <span className="text-[9px] font-mono font-extrabold text-red-600 block flex items-center gap-1 mt-1">
                  <span className="h-1.5 w-1.5 bg-yellow-400 rounded-full animate-ping" />
                  Postgres Live
                </span>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Navigation Links */}
          <nav className="flex-1 p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
              { id: 'orders', label: 'Tables & Addition', icon: ShoppingBag },
              { id: 'menu', label: 'Carte du Chef', icon: Utensils },
              { id: 'reservations', label: 'Réservations', icon: Calendar },
              { id: 'personnel', label: 'Personnel', icon: Clock },
              { id: 'deliveries', label: 'Livraisons', icon: Truck },
              { id: 'clients', label: 'Clients', icon: Users },
              { id: 'calendar', label: 'Calendrier Live', icon: Calendar },
              { id: 'stocks', label: 'Stocks & Fournisseurs', icon: Package },
              { id: 'finance', label: 'Argent (Finances)', icon: Landmark, roleRestriction: 'super_admin' },
              { id: 'incomes', label: 'Rentrées d\'argent', icon: TrendingUp },
              { id: 'expenses', label: 'Dépenses diverses', icon: Receipt },
              { id: 'ia', label: 'Analyses IA & Mérite', icon: Sparkles },
              { id: 'settings', label: 'Paramètres', icon: Settings },
            ].filter(tab => !tab.roleRestriction || dbUser?.role === tab.roleRestriction).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType);
                    setIsSidebarOpen(false); // Auto-close on mobile
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar User Profile bottom area */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-left">
              {dbUser?.photoUrl ? (
                <img
                  src={dbUser.photoUrl}
                  alt={dbUser.displayName || 'Owner'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center shadow-2xs uppercase">
                  {dbUser?.displayName?.charAt(0) || 'R'}
                </div>
              )}
              <div>
                <span className="block text-[11px] font-bold text-slate-800 leading-tight truncate max-w-[110px]">
                  {dbUser?.displayName}
                </span>
                <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                  {dbUser?.role === 'super_admin' ? 'Super Admin' : 'Gérant'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* App Top Utility Header */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-35 px-4 lg:px-8 shadow-3xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Hamburger Trigger Button on mobile */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-150 transition-colors cursor-pointer"
                title="Ouvrir le menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Active Tab Breadcrumb Page title */}
              <div className="text-left">
                <h2 className="font-display font-black text-slate-900 text-sm md:text-base capitalize">
                  {activeTab === 'dashboard' && 'Tableau de bord'}
                  {activeTab === 'orders' && 'Tables & Additions'}
                  {activeTab === 'deliveries' && 'Livraisons'}
                  {activeTab === 'clients' && 'Fichier Clients'}
                  {activeTab === 'reservations' && 'Réservations & Planning'}
                  {activeTab === 'calendar' && 'Calendrier Live'}
                  {activeTab === 'personnel' && 'Gestion d\'Équipe'}
                  {activeTab === 'stocks' && 'Inventaire & Stocks'}
                  {activeTab === 'finance' && 'Rapports Financiers'}
                  {activeTab === 'incomes' && 'Rentrées d\'argent'}
                  {activeTab === 'expenses' && 'Dépenses diverses'}
                  {activeTab === 'menu' && 'Carte du Chef'}
                  {activeTab === 'settings' && 'Configuration de l\'Établissement'}
                </h2>
                <p className="hidden sm:block text-[10px] text-slate-400 mt-0.5">
                  {activeTab === 'dashboard' && 'Aperçu analytique et activités récentes'}
                  {activeTab === 'orders' && 'Prise de commande, encaissement live en Ariary'}
                  {activeTab === 'deliveries' && 'Suivi des livraisons : client, adresse, heure et livreur'}
                  {activeTab === 'clients' && 'Suivi de la fidélité et carnet d\'adresses'}
                  {activeTab === 'reservations' && 'Calendrier interactif des tables'}
                  {activeTab === 'calendar' && 'Planning centralisé : réservations, congés du staff, événements spéciaux'}
                  {activeTab === 'personnel' && 'Congés, taux horaires et fiches de paie'}
                  {activeTab === 'stocks' && 'Alerte stock bas, commandes fournisseurs'}
                  {activeTab === 'finance' && 'Suivi de chiffre d\'affaires et de dépenses'}
                  {activeTab === 'incomes' && 'Recettes : additions payées (auto) + autres rentrées'}
                  {activeTab === 'expenses' && 'Loyer, charges et factures (photo incluse)'}
                  {activeTab === 'menu' && 'Plats, boissons et gestion des disponibilités'}
                  {activeTab === 'settings' && 'Paramètres généraux du restaurant'}
                </p>
              </div>
            </div>

            {/* Right Side Utility Actions */}
            <div className="flex items-center gap-3">
              {/* Collaborative Simulator Trigger Button */}
              <button
                onClick={handleTriggerSimulation}
                disabled={isSimulatingNotif}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl text-[10px] font-extrabold text-yellow-800 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSimulatingNotif ? 'animate-spin' : ''}`} />
                Simuler Activité
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce border border-white" />
                  )}
                </button>

                {/* Notification Panel Modal overlay */}
                <AnimatePresence>
                  {isNotificationPanelOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-85 z-50 origin-top-right"
                    >
                      <NotificationPanel
                        notifications={notifications}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAllAsRead={handleMarkAllAsRead}
                        onTriggerSimulation={handleTriggerSimulation}
                        isSimulating={isSimulatingNotif}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Main Body Grid Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 md:py-8">
        {/* Connection Notice banner */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <h4 className="text-xs font-bold text-rose-800">Note d'administration</h4>
              <p className="text-[11px] text-rose-600 leading-relaxed mt-0.5">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs font-bold text-rose-400 hover:text-rose-700 font-mono cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {isDataLoading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-600" />
            <p className="text-xs font-medium text-slate-400 font-mono">Synchronisation des données en cours...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
              >
                {/* Left Columns: Charts & Analytics & Calendar */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Dashboard Welcome */}
                  <div className="bg-red-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xs border border-red-800 text-left">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Utensils className="w-48 h-48 rotate-12 text-white" />
                    </div>
                    <div className="relative z-10">
                      <h2 className="font-display text-xl sm:text-2xl font-black text-yellow-400">
                        Manao ahoana, {dbUser?.displayName}!
                      </h2>
                      <p className="text-red-100 text-xs sm:text-sm mt-1 leading-relaxed max-w-xl">
                        Bienvenue dans votre tableau de bord de pilotage restaurant. Surveillez la salle, gérez vos fournisseurs locaux, les fiches de paie et planifiez vos équipes.
                      </p>
                      <div className="flex flex-wrap gap-2.5 mt-4">
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          Plan de Salle <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveTab('reservations')}
                          className="px-4 py-2 bg-red-800 hover:bg-red-900 text-red-50 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Calendrier Réservations
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Core analytical widgets */}
                  <DashboardCharts
                    clients={clients}
                    personnel={personnel}
                    menuItems={menuItems}
                    orders={orders}
                    expenses={expenses}
                    incomes={incomes}
                    userRole={dbUser?.role || 'super_admin'}
                  />

                  {/* Unified Calendar for Reservations and Staff Leaves */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs text-left">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
                      <div>
                        <h3 className="font-display font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <Calendar className="w-4.5 h-4.5 text-red-600" /> Calendrier de l'Établissement
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Planning unifié : Réservations, congés, livraisons & événements</p>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded-lg border border-slate-200">
                        {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Simple Compact Calendar list view grouped by date */}
                    {getCalendarEvents().length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">Aucun événement à venir aujourd'hui ou ce mois-ci.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {getCalendarEvents().slice(0, 8).map((evt, idx) => (
                          <div key={idx} className={`p-3.5 border rounded-2xl flex flex-col justify-between ${evt.color}`}>
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75 font-mono">
                                {evt.type === 'reservation' && '🍽️ Réservation'}
                                {evt.type === 'leave' && '🌴 Congé Personnel'}
                                {evt.type === 'special' && '✨ Événement'}
                                {evt.type === 'delivery' && '🚚 Livraison'}
                              </span>
                              <h4 className="font-bold text-xs mt-1 truncate">{evt.title}</h4>
                            </div>
                            <div className="mt-3.5 text-[10px] font-mono font-bold border-t border-black/5 pt-2 flex items-center gap-1 justify-between">
                              <span>Date planifiée :</span>
                              <span>{new Date(evt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right columns: Sidebar Activity logs */}
                <div className="lg:col-span-4">
                  <NotificationPanel
                    notifications={notifications}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onTriggerSimulation={handleTriggerSimulation}
                    isSimulating={isSimulatingNotif}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <OrdersManager
                  orders={orders}
                  menuItems={menuItems}
                  personnel={personnel}
                  restaurantName={dbUser?.restaurantName}
                  onAddOrder={handleAddOrder}
                  onEditOrder={handleEditOrder}
                  onDeleteOrder={handleDeleteOrder}
                />
              </motion.div>
            )}

            {activeTab === 'clients' && (
              <motion.div
                key="clients-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <ClientsManager
                  clients={clients}
                  onAddClient={handleAddClient}
                  onEditClient={handleEditClient}
                  onDeleteClient={handleDeleteClient}
                />
              </motion.div>
            )}

            {activeTab === 'reservations' && (
              <motion.div
                key="reservations-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <ReservationsManager
                  reservations={reservations}
                  onAddReservation={handleAddReservation}
                  onEditReservation={handleEditReservation}
                  onDeleteReservation={handleDeleteReservation}
                />
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div
                key="calendar-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <CalendarManager
                  reservations={reservations}
                  personnel={personnel}
                  deliveries={deliveries}
                  specialEvents={specialEvents}
                  onAddSpecialEvent={handleAddSpecialEvent}
                  onDeleteSpecialEvent={handleDeleteSpecialEvent}
                  dbUserId={dataOwnerId || 1}
                />
              </motion.div>
            )}

            {activeTab === 'personnel' && (
              <motion.div
                key="personnel-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <PersonnelManager
                  personnel={personnel}
                  userRole={dbUser?.role || 'super_admin'}
                  onAddStaff={handleAddStaff}
                  onEditStaff={handleEditStaff}
                  onDeleteStaff={handleDeleteStaff}
                />
              </motion.div>
            )}

            {activeTab === 'stocks' && (
              <motion.div
                key="stocks-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <InventoryManager
                  stocks={stocks}
                  suppliers={suppliers}
                  menuItems={menuItems}
                  stockMovements={stockMovements}
                  supplierOrders={supplierOrders}
                  onAddStock={handleAddStock}
                  onEditStock={handleEditStock}
                  onDeleteStock={handleDeleteStock}
                  onAddSupplierOrder={handleAddSupplierOrder}
                  onEditSupplierOrder={handleEditSupplierOrder}
                  onDeleteSupplierOrder={handleDeleteSupplierOrder}
                  onAddSupplier={handleAddSupplier}
                  onEditSupplier={handleEditSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                />
              </motion.div>
            )}

            {activeTab === 'finance' && (
              <motion.div
                key="finance-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <FinanceManager
                  orders={orders}
                  personnel={personnel}
                  userRole={dbUser?.role || 'super_admin'}
                />
              </motion.div>
            )}

            {activeTab === 'expenses' && (
              <motion.div
                key="expenses-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <ExpensesManager
                  expenses={expenses}
                  recurringExpenses={recurringExpenses}
                  onAddExpense={handleAddExpense}
                  onEditExpense={handleEditExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onAddRecurring={handleAddRecurring}
                  onEditRecurring={handleEditRecurring}
                  onDeleteRecurring={handleDeleteRecurring}
                />
              </motion.div>
            )}

            {activeTab === 'incomes' && (
              <motion.div
                key="incomes-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <IncomeManager
                  incomes={incomes}
                  orders={orders}
                  onAddIncome={handleAddIncome}
                  onEditIncome={handleEditIncome}
                  onDeleteIncome={handleDeleteIncome}
                />
              </motion.div>
            )}

            {activeTab === 'deliveries' && (
              <motion.div
                key="deliveries-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <DeliveriesManager
                  deliveries={deliveries}
                  personnel={personnel}
                  orders={orders}
                  onAddDelivery={handleAddDelivery}
                  onEditDelivery={handleEditDelivery}
                  onDeleteDelivery={handleDeleteDelivery}
                />
              </motion.div>
            )}

            {activeTab === 'menu' && (
              <motion.div
                key="menu-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <MenuManager
                  menuItems={menuItems}
                  stocks={stocks}
                  onAddMenuItem={handleAddMenuItem}
                  onEditMenuItem={handleEditMenuItem}
                  onDeleteMenuItem={handleDeleteMenuItem}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {dbUser && (
                  <SettingsManager
                    dbUser={dbUser}
                    onUpdateConfig={handleUpdateConfig}
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'ia' && (
              <motion.div
                key="ia-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <AIManager
                  token={token}
                  dbUserId={dataOwnerId || null}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  </div>
  );
}
