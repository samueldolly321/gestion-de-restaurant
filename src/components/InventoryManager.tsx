import React, { useState } from 'react';
import { Package, Truck, AlertTriangle, CheckCircle, Search, Plus, Edit2, Trash2, X, Utensils, History, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';
import { Supplier, Stock, MenuItem, StockMovement, SupplierOrder, SupplierProduct } from '../types.ts';

// Une ligne du formulaire de commande fournisseur (modèle multi-articles).
// stockId : id de l'article de stock lié, '' = aucun, '__new__' = créer un nouvel article.
type OrderLine = { id?: number; label: string; quantity: number; unitPrice: number; stockId: string; newStockUnit: string };
const emptyOrderLine = (): OrderLine => ({ label: '', quantity: 1, unitPrice: 0, stockId: '', newStockUnit: 'pieces' });

interface InventoryManagerProps {
  stocks: Stock[];
  suppliers: Supplier[];
  menuItems: MenuItem[];
  stockMovements: StockMovement[];
  supplierOrders: SupplierOrder[];
  supplierProducts: SupplierProduct[];
  onAddStock: (data: any) => Promise<void>;
  onEditStock: (id: number, data: any) => Promise<void>;
  onDeleteStock: (id: number) => Promise<void>;
  onAddSupplierOrder: (data: any) => Promise<void>;
  onEditSupplierOrder: (id: number, data: any) => Promise<void>;
  onDeleteSupplierOrder: (id: number) => Promise<void>;
  onAddSupplier: (data: any) => Promise<void>;
  onEditSupplier: (id: number, data: any) => Promise<void>;
  onDeleteSupplier: (id: number) => Promise<void>;
  onAddSupplierProduct: (data: any) => Promise<void>;
  onEditSupplierProduct: (id: number, data: any) => Promise<void>;
  onDeleteSupplierProduct: (id: number) => Promise<void>;
}

export default function InventoryManager({
  stocks,
  suppliers,
  menuItems,
  stockMovements,
  supplierOrders,
  supplierProducts,
  onAddStock,
  onEditStock,
  onDeleteStock,
  onAddSupplierOrder,
  onEditSupplierOrder,
  onDeleteSupplierOrder,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onAddSupplierProduct,
  onEditSupplierProduct,
  onDeleteSupplierProduct,
}: InventoryManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stocks' | 'suppliers' | 'orders'>('stocks');
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Edit references
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [preview, setPreview] = useState<string | null>(null); // aperçu plein écran d'une facture

  // Stock Form States
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(0); // restante
  const [initialQuantity, setInitialQuantity] = useState(0); // achat de référence
  const [unit, setUnit] = useState('kg');
  const [minStock, setMinStock] = useState(10);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceImageUrl, setInvoiceImageUrl] = useState('');
  const [unitCost, setUnitCost] = useState(0);

  // Plats dont la fiche technique utilise cet article de stock (lien inverse).
  const dishesUsingStock = (stockId: number) =>
    menuItems.filter((m) => Array.isArray(m.ingredients) && m.ingredients.some((ing) => ing.stockId === stockId));

  // Supplier Form States
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('en_attente');
  const [contractDate, setContractDate] = useState('');
  const [amountDue, setAmountDue] = useState(0);
  const [supInvoiceNumber, setSupInvoiceNumber] = useState('');
  const [supInvoiceImageUrl, setSupInvoiceImageUrl] = useState('');

  // Réapprovisionnement : quantité à AJOUTER au stock restant (édition uniquement).
  const [restockAmount, setRestockAmount] = useState(0);
  const [restockNote, setRestockNote] = useState('');

  // Modale historique des approvisionnements d'un article.
  const [historyStock, setHistoryStock] = useState<Stock | null>(null);

  // Sous-onglet Commandes : formulaire de commande fournisseur.
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderPaymentStatus, setOrderPaymentStatus] = useState('en_attente');
  const [orderInvoiceNumber, setOrderInvoiceNumber] = useState('');
  const [orderInvoiceImageUrl, setOrderInvoiceImageUrl] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [orderReceived, setOrderReceived] = useState(false);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState(''); // filtre historique par fournisseur
  const [stockDateFrom, setStockDateFrom] = useState(''); // filtre date d'ajout (stocks)
  const [stockDateTo, setStockDateTo] = useState('');
  const [orderDateFrom, setOrderDateFrom] = useState(''); // filtre date de commande
  const [orderDateTo, setOrderDateTo] = useState('');

  // Catalogue produits d'un fournisseur (Étape 1).
  const [catalogSupplier, setCatalogSupplier] = useState<Supplier | null>(null);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodUnit, setProdUnit] = useState('pieces');
  const [prodStockId, setProdStockId] = useState('');
  // Lignes de la commande (modèle multi-articles). stockId/newStockUnit gérés par ligne.
  const [orderLines, setOrderLines] = useState<OrderLine[]>([emptyOrderLine()]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null); // dépliant détail des lignes

  const supplierNameById = (id: number) => suppliers.find((s) => s.id === id)?.name || 'Fournisseur supprimé';

  // Totaux par fournisseur calculés depuis ses commandes.
  const supplierTotals = (supplierId: number) => {
    const orders = supplierOrders.filter((o) => o.supplierId === supplierId);
    const totalOrdered = orders.reduce((s, o) => s + (o.amount || 0), 0);
    const totalDue = orders.filter((o) => o.paymentStatus !== 'paye').reduce((s, o) => s + (o.amount || 0), 0);
    return { count: orders.length, totalOrdered, totalDue };
  };

  const formatAr = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar').trim();
  };

  // Stock operations
  const openAddStock = () => {
    setEditingStock(null);
    setItemName('');
    setQuantity(0);
    setInitialQuantity(0);
    setUnit('kg');
    setMinStock(10);
    setSupplierId('');
    setInvoiceImageUrl('');
    setUnitCost(0);
    setRestockAmount(0);
    setRestockNote('');
    setIsStockModalOpen(true);
  };

  const openEditStock = (stk: Stock) => {
    setEditingStock(stk);
    setItemName(stk.itemName);
    setQuantity(stk.quantity);
    setInitialQuantity(stk.initialQuantity ?? stk.quantity);
    setUnit(stk.unit);
    setMinStock(stk.minStock);
    setSupplierId(stk.supplierId ? String(stk.supplierId) : '');
    setInvoiceImageUrl(stk.invoiceImageUrl || '');
    setUnitCost(stk.unitCost || 0);
    setRestockAmount(0);
    setRestockNote('');
    setIsStockModalOpen(true);
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;

    // Réapprovisionnement : la quantité ajoutée s'additionne au restant ET à l'initiale de référence.
    const restock = Number(restockAmount) || 0;
    const payload = {
      itemName,
      quantity: Number(quantity) + restock,
      initialQuantity: Number(initialQuantity) + restock,
      unit,
      minStock: Number(minStock),
      supplierId: supplierId ? Number(supplierId) : null,
      invoiceImageUrl: invoiceImageUrl || null,
      unitCost: Number(unitCost),
      // Transmis au serveur pour enregistrer le mouvement daté (historique d'appro).
      restockAmount: restock,
      restockNote: restock > 0 ? (restockNote || null) : null,
    };

    if (editingStock) {
      await onEditStock(editingStock.id, payload);
    } else {
      await onAddStock(payload);
    }
    setIsStockModalOpen(false);
  };

  // Supplier operations
  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setPaymentStatus('en_attente');
    setContractDate(new Date().toISOString().split('T')[0]);
    setAmountDue(0);
    setSupInvoiceNumber('');
    setSupInvoiceImageUrl('');
    setIsSupplierModalOpen(true);
  };

  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierName(sup.name);
    setContactName(sup.contactName || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setPaymentStatus(sup.paymentStatus);
    setContractDate(sup.contractDate || '');
    setAmountDue(sup.amountDue);
    setSupInvoiceNumber(sup.invoiceNumber || '');
    setSupInvoiceImageUrl(sup.invoiceImageUrl || '');
    setIsSupplierModalOpen(true);
  };

  const handleSupplierInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSupInvoiceImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName) return;

    const payload = {
      name: supplierName,
      contactName: contactName || null,
      phone: phone || null,
      email: email || null,
      paymentStatus,
      contractDate: contractDate || null,
      amountDue: Number(amountDue),
      invoiceNumber: supInvoiceNumber || null,
      invoiceImageUrl: supInvoiceImageUrl || null,
    };

    if (editingSupplier) {
      await onEditSupplier(editingSupplier.id, payload);
    } else {
      await onAddSupplier(payload);
    }
    setIsSupplierModalOpen(false);
  };

  // --- Commandes fournisseur ---
  const openAddOrder = () => {
    setEditingOrder(null);
    setOrderSupplierId(suppliers[0] ? String(suppliers[0].id) : '');
    setOrderLines([emptyOrderLine()]);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderPaymentStatus('en_attente');
    setOrderInvoiceNumber('');
    setOrderInvoiceImageUrl('');
    setOrderNote('');
    setOrderReceived(false);
    setIsOrderModalOpen(true);
  };

  const openEditOrder = (o: SupplierOrder) => {
    setEditingOrder(o);
    setOrderSupplierId(String(o.supplierId));
    const lines: OrderLine[] = (o.items || []).map((it) => ({
      id: it.id,
      label: it.label,
      quantity: it.quantity ?? 1,
      unitPrice: it.unitPrice ?? 0,
      stockId: it.stockId != null ? String(it.stockId) : '',
      newStockUnit: 'pieces',
    }));
    setOrderLines(lines.length ? lines : [emptyOrderLine()]);
    setOrderDate(o.orderDate || '');
    setOrderPaymentStatus(o.paymentStatus);
    setOrderInvoiceNumber(o.invoiceNumber || '');
    setOrderInvoiceImageUrl(o.invoiceImageUrl || '');
    setOrderNote(o.note || '');
    setOrderReceived(!!o.received);
    setIsOrderModalOpen(true);
  };

  // Helpers de manipulation des lignes du formulaire.
  const updateOrderLine = (index: number, patch: Partial<OrderLine>) =>
    setOrderLines((lines) => lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const addOrderLine = () => setOrderLines((lines) => [...lines, emptyOrderLine()]);
  // Ajoute une ligne pré-remplie depuis un produit du catalogue (prix figé = snapshot, modifiable).
  const addProductLine = (p: SupplierProduct) => {
    const newLine: OrderLine = {
      label: p.name,
      quantity: 1,
      unitPrice: p.unitPrice,
      stockId: p.stockId != null ? String(p.stockId) : '',
      newStockUnit: p.unit || 'pieces',
    };
    setOrderLines((lines) => (lines.length === 1 && !lines[0].label.trim() ? [newLine] : [...lines, newLine]));
  };
  const removeOrderLine = (index: number) =>
    setOrderLines((lines) => (lines.length > 1 ? lines.filter((_, i) => i !== index) : lines));
  const orderLinesTotal = orderLines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const handleOrderInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setOrderInvoiceImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = orderLines.filter((l) => l.label.trim());
    if (!orderSupplierId || validLines.length === 0) return;
    const items = validLines.map((l) => ({
      id: l.id, // présent pour les lignes existantes (préserve le garde-fou stock côté serveur)
      label: l.label.trim(),
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      stockId: (l.stockId && l.stockId !== '__new__') ? Number(l.stockId) : null,
      newStockUnit: l.stockId === '__new__' ? l.newStockUnit : null,
    }));
    const payload = {
      supplierId: Number(orderSupplierId),
      items,
      orderDate: orderDate || null,
      paymentStatus: orderPaymentStatus,
      invoiceNumber: orderInvoiceNumber || null,
      invoiceImageUrl: orderInvoiceImageUrl || null,
      note: orderNote || null,
      received: orderReceived,
    };
    if (editingOrder) {
      await onEditSupplierOrder(editingOrder.id, payload);
    } else {
      await onAddSupplierOrder(payload);
    }
    setIsOrderModalOpen(false);
  };

  // Marquer une commande comme reçue (alimente le stock lié) depuis la liste.
  const markOrderReceived = async (o: SupplierOrder) => {
    await onEditSupplierOrder(o.id, { received: true });
  };

  // --- Catalogue produits d'un fournisseur ---
  const productsBySupplier = (supplierId: number) =>
    supplierProducts.filter((p) => p.supplierId === supplierId);

  const resetProdForm = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice(0);
    setProdUnit('pieces');
    setProdStockId('');
  };

  const openCatalog = (sup: Supplier) => {
    setCatalogSupplier(sup);
    resetProdForm();
  };

  const startEditProduct = (p: SupplierProduct) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.unitPrice);
    setProdUnit(p.unit);
    setProdStockId(p.stockId != null ? String(p.stockId) : '');
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogSupplier || !prodName.trim()) return;
    const payload = {
      supplierId: catalogSupplier.id,
      name: prodName.trim(),
      unitPrice: Number(prodPrice) || 0,
      unit: prodUnit,
      stockId: (prodStockId && prodStockId !== '__new__') ? Number(prodStockId) : null,
      // Option « Autre » : crée un nouvel article de stock (unité = celle du produit) et le lie.
      newStockUnit: prodStockId === '__new__' ? prodUnit : null,
    };
    if (editingProduct) {
      await onEditSupplierProduct(editingProduct.id, payload);
    } else {
      await onAddSupplierProduct(payload);
    }
    resetProdForm();
  };

  // Ensemble des articles ayant eu un mouvement (appro/correction) dans la période choisie.
  // Permet de filtrer par « activité » et pas seulement par date de création de l'article.
  const stockIdsWithMovementInRange = new Set(
    (stockDateFrom || stockDateTo)
      ? stockMovements
          .filter((m) => {
            const d = (m.createdAt || '').slice(0, 10);
            return (!stockDateFrom || d >= stockDateFrom) && (!stockDateTo || d <= stockDateTo);
          })
          .map((m) => m.stockId)
      : []
  );

  // Recherche stock : par nom d'article OU par nom du fournisseur (ex. « Star »),
  // + filtre date = création de l'article OU approvisionnement dans la période.
  const filteredStocks = stocks.filter((s) => {
    const q = searchQuery.toLowerCase();
    const supName = s.supplierId != null ? supplierNameById(s.supplierId).toLowerCase() : '';
    const matchText = !q || s.itemName.toLowerCase().includes(q) || supName.includes(q);
    const created = (s.createdAt || '').slice(0, 10);
    const createdInRange = (!stockDateFrom || created >= stockDateFrom) && (!stockDateTo || created <= stockDateTo);
    const hasDateFilter = !!(stockDateFrom || stockDateTo);
    const matchDate = !hasDateFilter || createdInRange || stockIdsWithMovementInRange.has(s.id);
    return matchText && matchDate;
  });

  const filteredSuppliers = suppliers.filter((sup) =>
    sup.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub-tab selection */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveSubTab('stocks'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'stocks'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" /> Gestion des Stocks
          </button>
          <button
            onClick={() => { setActiveSubTab('suppliers'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'suppliers'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" /> Fournisseurs
          </button>
          <button
            onClick={() => { setActiveSubTab('orders'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'orders'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Commandes
          </button>
        </div>

        {/* Action Button */}
        {activeSubTab === 'stocks' && (
          <button
            onClick={openAddStock}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter un Article
          </button>
        )}
        {activeSubTab === 'suppliers' && (
          <button
            onClick={openAddSupplier}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau Fournisseur
          </button>
        )}
        {activeSubTab === 'orders' && (
          <button
            onClick={openAddOrder}
            disabled={suppliers.length === 0}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={suppliers.length === 0 ? 'Créez d\'abord un fournisseur' : 'Passer une commande'}
          >
            <Plus className="w-4 h-4" /> Nouvelle Commande
          </button>
        )}
      </div>

      {/* Filter and Search Box (stocks & fournisseurs) */}
      {activeSubTab !== 'orders' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs flex flex-wrap items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={activeSubTab === 'stocks' ? "Rechercher un article ou un fournisseur (ex. Star)..." : "Rechercher un fournisseur..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[180px] bg-transparent text-slate-800 text-xs focus:outline-none placeholder-slate-400"
          />
          {activeSubTab === 'stocks' && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
              <span className="uppercase tracking-wider">Activité du</span>
              <input type="date" value={stockDateFrom} onChange={(e) => setStockDateFrom(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-red-500 font-mono" />
              <span className="uppercase tracking-wider">au</span>
              <input type="date" value={stockDateTo} onChange={(e) => setStockDateTo(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-red-500 font-mono" />
              {(stockDateFrom || stockDateTo) && (
                <button type="button" onClick={() => { setStockDateFrom(''); setStockDateTo(''); }}
                  className="p-1 text-slate-300 hover:text-red-600 cursor-pointer" title="Réinitialiser les dates">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: STOCKS */}
      {activeSubTab === 'stocks' && (
        <>
        {/* Résumé du stock */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Articles en stock</p>
            <h4 className="font-display font-black text-xl text-slate-800 mt-0.5">{stocks.length}</h4>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">En alerte (stock bas)</p>
            <h4 className={`font-display font-black text-xl mt-0.5 ${stocks.filter((s) => s.quantity < s.minStock).length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stocks.filter((s) => s.quantity < s.minStock).length}
            </h4>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quantité totale restante</p>
            <h4 className="font-display font-black text-xl text-slate-800 mt-0.5 font-mono">
              {Math.round(stocks.reduce((sum, s) => sum + (s.quantity || 0), 0) * 100) / 100}
            </h4>
            <p className="text-[9px] text-slate-400">toutes unités confondues</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valeur totale du stock</p>
            <h4 className="font-display font-black text-xl text-red-600 mt-0.5">
              {formatAr(stocks.reduce((sum, s) => sum + (s.quantity || 0) * (s.unitCost || 0), 0))}
            </h4>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            {filteredStocks.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">Aucun ingrédient ou article de stock enregistré.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-6">Ingrédient / Article</th>
                    <th className="py-3 px-6 text-center">Quantité Initiale</th>
                    <th className="py-3 px-6 text-center">Quantité Restante</th>
                    <th className="py-3 px-6 text-center">Alerte Min</th>
                    <th className="py-3 px-6">Fournisseur Attitré</th>
                    <th className="py-3 px-6 text-center">Statut Alerte</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                  {filteredStocks.map((s) => {
                    const isBelowMin = s.quantity < s.minStock;
                    const matchedSup = suppliers.find((sup) => sup.id === s.supplierId);

                    return (
                      <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${isBelowMin ? 'bg-rose-50/10' : ''}`}>
                        <td className="py-3.5 px-6 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{s.itemName}</span>
                            {s.invoiceImageUrl && (
                              <a
                                href={s.invoiceImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9px] font-bold hover:bg-red-100 transition-colors"
                                title="Voir la facture"
                              >
                                Facture 📄
                              </a>
                            )}
                          </div>
                          {(() => {
                            const dishes = dishesUsingStock(s.id);
                            return dishes.length > 0 ? (
                              <p className="text-[9px] text-slate-400 font-normal mt-0.5 flex items-center gap-1" title={dishes.map((d) => d.name).join(', ')}>
                                <Utensils className="w-2.5 h-2.5" /> Utilisé par {dishes.length} plat{dishes.length > 1 ? 's' : ''}
                              </p>
                            ) : null;
                          })()}
                          {s.unitCost > 0 && (
                            <p className="text-[9px] text-slate-400 font-normal mt-0.5 font-mono">{formatAr(s.unitCost)} / {s.unit}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center font-mono text-slate-500">
                          {(s.initialQuantity ?? s.quantity)} {s.unit}
                        </td>
                        <td className="py-3.5 px-6 text-center font-mono font-bold text-slate-900">
                          {s.quantity} {s.unit}
                          {(s.initialQuantity ?? 0) > s.quantity && (
                            <span className="block text-[9px] font-normal text-rose-500 mt-0.5">
                              −{Math.round(((s.initialQuantity ?? s.quantity) - s.quantity) * 100) / 100} {s.unit} consommé
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center font-mono text-slate-400">
                          {s.minStock} {s.unit}
                        </td>
                        <td className="py-3.5 px-6 text-slate-600 font-semibold">
                          {matchedSup ? matchedSup.name : <span className="text-slate-400 italic font-normal">Aucun</span>}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          {isBelowMin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-700 uppercase tracking-wide">
                              <AlertTriangle className="w-3 h-3" /> Alerte Stock Bas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 uppercase tracking-wide">
                              <CheckCircle className="w-3 h-3" /> Correct
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setHistoryStock(s)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Historique des approvisionnements"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditStock(s)}
                              className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteStock(s.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </>
      )}

      {/* SUB-TAB 2: SUPPLIERS */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-3xs">
              Aucun fournisseur enregistré.
            </div>
          ) : (
            filteredSuppliers.map((sup) => {
              const t = supplierTotals(sup.id);
              return (
              <div key={sup.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-3xs text-left relative overflow-hidden group">
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${t.totalDue > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />

                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">{sup.name}</h4>
                    {sup.contactName && <p className="text-xs text-slate-400">Contact: {sup.contactName}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-50 text-slate-500 border border-slate-100">
                    {t.count} cmd
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-50 pt-3 mt-3">
                  {sup.phone && <p>📞 {sup.phone}</p>}
                  {sup.email && <p>✉️ {sup.email}</p>}

                  <div className="flex items-center justify-between pt-2 text-slate-800">
                    <span className="font-medium text-slate-400">Total commandé :</span>
                    <span className="font-mono font-bold text-slate-700">{formatAr(t.totalOrdered)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-slate-800">
                    <span className="font-medium text-slate-400">Reste à payer :</span>
                    <span className={`font-mono font-black ${t.totalDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatAr(t.totalDue)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 border-t border-slate-50 pt-2">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => { setOrderSupplierFilter(String(sup.id)); setActiveSubTab('orders'); }}
                      className="text-[10px] font-bold text-red-600 hover:text-red-500 flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardList className="w-3 h-3" /> Voir les commandes
                    </button>
                    <button
                      onClick={() => openCatalog(sup)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                    >
                      <Package className="w-3 h-3" /> Catalogue ({productsBySupplier(sup.id).length})
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditSupplier(sup)}
                      className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSupplier(sup.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 3: COMMANDES FOURNISSEUR (historique) */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Filtres : fournisseur + date de commande */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fournisseur :</span>
            <select
              value={orderSupplierFilter}
              onChange={(e) => setOrderSupplierFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800 cursor-pointer"
            >
              <option value="">Tous les fournisseurs</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2">Du</span>
            <input type="date" value={orderDateFrom} onChange={(e) => setOrderDateFrom(e.target.value)}
              className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-1 focus:ring-red-500 font-mono" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">au</span>
            <input type="date" value={orderDateTo} onChange={(e) => setOrderDateTo(e.target.value)}
              className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-1 focus:ring-red-500 font-mono" />
            {(orderDateFrom || orderDateTo) && (
              <button type="button" onClick={() => { setOrderDateFrom(''); setOrderDateTo(''); }}
                className="p-1 text-slate-300 hover:text-red-600 cursor-pointer" title="Réinitialiser les dates">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(() => {
            const rows = supplierOrders
              .filter((o) => !orderSupplierFilter || o.supplierId === Number(orderSupplierFilter))
              .filter((o) => {
                const d = o.orderDate || (o.createdAt || '').slice(0, 10);
                return (!orderDateFrom || d >= orderDateFrom) && (!orderDateTo || d <= orderDateTo);
              })
              .sort((a, b) => (b.orderDate || b.createdAt || '').localeCompare(a.orderDate || a.createdAt || ''));
            const totalOrdered = rows.reduce((s, o) => s + (o.amount || 0), 0);
            const totalDue = rows.filter((o) => o.paymentStatus !== 'paye').reduce((s, o) => s + (o.amount || 0), 0);

            if (rows.length === 0) {
              return (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 shadow-3xs">
                  <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs">Aucune commande fournisseur enregistrée.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Cliquez sur « Nouvelle Commande » pour en ajouter une.</p>
                </div>
              );
            }
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Commandes</p>
                    <h4 className="font-display font-black text-xl text-slate-800 mt-0.5">{rows.length}</h4>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total commandé</p>
                    <h4 className="font-display font-black text-xl text-slate-800 mt-0.5">{formatAr(totalOrdered)}</h4>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reste à payer</p>
                    <h4 className={`font-display font-black text-xl mt-0.5 ${totalDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatAr(totalDue)}</h4>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="py-3 px-6">Date</th>
                          <th className="py-3 px-6">Fournisseur</th>
                          <th className="py-3 px-6">Commande</th>
                          <th className="py-3 px-6">Facture</th>
                          <th className="py-3 px-6 text-right">Montant</th>
                          <th className="py-3 px-6 text-center">Paiement</th>
                          <th className="py-3 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                        {rows.map((o) => {
                          const items = o.items || [];
                          const hasStockLink = items.some((it) => it.stockId != null);
                          const isExpanded = expandedOrderId === o.id;
                          return (
                          <React.Fragment key={o.id}>
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-slate-400">{o.orderDate || '—'}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-700">{supplierNameById(o.supplierId)}</td>
                            <td className="py-3.5 px-6">
                              <button
                                type="button"
                                onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                                className="flex items-center gap-1 font-bold text-slate-800 hover:text-red-600 cursor-pointer text-left"
                                title={isExpanded ? 'Masquer le détail' : 'Voir le détail des articles'}
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                <span>{o.label}</span>
                                <span className="ml-1 text-[9px] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">{items.length} art.</span>
                              </button>
                              {o.note && <p className="text-[10px] text-slate-400 italic mt-0.5">{o.note}</p>}
                            </td>
                            <td className="py-3.5 px-6">
                              {o.invoiceImageUrl ? (
                                <img src={o.invoiceImageUrl} alt="Facture" onClick={() => setPreview(o.invoiceImageUrl)} className="h-9 w-9 object-cover rounded-lg border border-slate-200 cursor-zoom-in" />
                              ) : o.invoiceNumber ? (
                                <span className="text-[10px] font-mono text-slate-500">n° {o.invoiceNumber}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-6 text-right font-mono font-black text-slate-900">
                              {formatAr(o.amount || 0)}
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                                o.paymentStatus === 'paye'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {o.paymentStatus === 'paye' ? 'Payé' : 'À payer'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex items-center justify-center gap-1">
                                {hasStockLink && (
                                  o.received ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold uppercase mr-1" title="Marchandise reçue, stock alimenté">
                                      <CheckCircle className="w-2.5 h-2.5" /> Reçue
                                    </span>
                                  ) : (
                                    <button onClick={() => markOrderReceived(o)} className="text-[9px] px-1.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold uppercase mr-1 hover:bg-blue-100 cursor-pointer" title="Marquer comme reçue et ajouter au stock">
                                      Marquer reçue
                                    </button>
                                  )
                                )}
                                <button onClick={() => openEditOrder(o)} className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg cursor-pointer" title="Modifier">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { if (confirm('Supprimer cette commande ?')) onDeleteSupplierOrder(o.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" title="Supprimer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/60">
                              <td colSpan={6} className="px-6 py-3">
                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                  <table className="w-full text-[11px]">
                                    <thead className="bg-slate-100 text-slate-500 uppercase text-[9px]">
                                      <tr>
                                        <th className="py-1.5 px-3 text-left">Article</th>
                                        <th className="py-1.5 px-3 text-center">Qté</th>
                                        <th className="py-1.5 px-3 text-right">P.U.</th>
                                        <th className="py-1.5 px-3 text-right">Total</th>
                                        <th className="py-1.5 px-3 text-center">Stock lié</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {items.map((it) => (
                                        <tr key={it.id}>
                                          <td className="py-1.5 px-3 font-semibold text-slate-700">{it.label}</td>
                                          <td className="py-1.5 px-3 text-center font-mono">{it.quantity}</td>
                                          <td className="py-1.5 px-3 text-right font-mono">{formatAr(it.unitPrice || 0)}</td>
                                          <td className="py-1.5 px-3 text-right font-mono font-bold">{formatAr(it.amount || 0)}</td>
                                          <td className="py-1.5 px-3 text-center">
                                            {it.stockId != null ? (
                                              <span className="text-[9px] text-slate-600">{stocks.find((s) => s.id === it.stockId)?.itemName || `#${it.stockId}`}{it.stockApplied ? ' ✓' : ''}</span>
                                            ) : (
                                              <span className="text-slate-300">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* MODAL 1: STOCK FORM */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative border border-slate-100 text-left">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900">
                {editingStock ? "Modifier l'article" : 'Ajouter un nouvel article de stock'}
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nom de l'article *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                    placeholder="Ex. Filet de Boeuf, Fromage..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Image de la Facture
                  </label>
                  <div className="flex items-center gap-3">
                    {invoiceImageUrl ? (
                      <img src={invoiceImageUrl} alt="Facture" className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-[9px] text-center font-semibold shrink-0">
                        Vide
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInvoiceFileChange}
                      className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Quantité initiale (achat)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialQuantity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setInitialQuantity(v);
                      // À la création, la quantité restante démarre égale à l'initiale.
                      if (!editingStock) setQuantity(v);
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Quantité restante
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={!editingStock}
                    title={editingStock ? 'Quantité actuellement en stock' : 'À la création, égale à la quantité initiale'}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Unité
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800"
                  >
                    <option value="kg">kg</option>
                    <option value="l">Litre (l)</option>
                    <option value="pieces">Pièces</option>
                    <option value="bouteilles">Bouteilles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Quantité d'alerte Minimum
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Coût unitaire (Ar / {unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                    placeholder="Ex. 22000"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Sert au coût de revient des plats liés.</p>
                </div>
              </div>

              {/* Réapprovisionnement (édition uniquement) : ajoute au stock restant */}
              {editingStock && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                  <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Réapprovisionner (ajouter au stock)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={restockAmount}
                      onChange={(e) => setRestockAmount(Number(e.target.value))}
                      className="w-32 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 font-mono"
                      placeholder="Ex. 6"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">{unit}</span>
                    {restockAmount > 0 && (
                      <span className="text-[11px] text-emerald-700 font-bold ml-auto font-mono">
                        {quantity} → {Math.round((Number(quantity) + Number(restockAmount)) * 100) / 100} {unit}
                      </span>
                    )}
                  </div>
                  {restockAmount > 0 && (
                    <input
                      type="text"
                      value={restockNote}
                      onChange={(e) => setRestockNote(e.target.value)}
                      className="w-full mt-2 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-[11px] focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="Note (ex. Reçu de Les délices de mimi, n° facture...)"
                    />
                  )}
                  <p className="text-[9px] text-slate-400 mt-1">S'ajoute au stock et enregistre un mouvement daté dans l'historique.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Fournisseur associé
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800"
                >
                  <option value="">Aucun fournisseur</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUPPLIER FORM */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative border border-slate-100 text-left">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900">
                {editingSupplier ? 'Modifier le Fournisseur' : 'Créer un Fournisseur'}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nom d'Entreprise *
                </label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                  placeholder="Ex. Socolait, Madabio..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Contact physique
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                    placeholder="Ex. Mr. Jean"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                    placeholder="Ex. 034 45 678 90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Email du Fournisseur
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                  placeholder="fournisseur@madagascar.com"
                />
              </div>

              <p className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                💡 Les montants, factures et paiements se gèrent maintenant dans l'onglet <span className="font-bold text-slate-600">Commandes</span> (une commande = une facture datée).
              </p>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COMMANDE FOURNISSEUR */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-red-600" />
                {editingOrder ? 'Modifier la commande' : 'Nouvelle commande fournisseur'}
              </h3>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fournisseur *</label>
                <select
                  required
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800 cursor-pointer"
                >
                  <option value="">— Choisir un fournisseur —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>

              {/* Catalogue du fournisseur : puces cliquables pour pré-remplir une ligne (Étape 2) */}
              {orderSupplierId && productsBySupplier(Number(orderSupplierId)).length > 0 && (
                <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3">
                  <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Catalogue — cliquer pour ajouter
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {productsBySupplier(Number(orderSupplierId)).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductLine(p)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-[11px] text-slate-700 hover:bg-blue-100 hover:border-blue-300 cursor-pointer transition-colors"
                        title={`Ajouter ${p.name} (${formatAr(p.unitPrice)}/${p.unit})`}
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span className="font-semibold">{p.name}</span>
                        <span className="font-mono text-slate-400">{formatAr(p.unitPrice)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lignes de la commande (multi-articles) */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Articles commandés *</label>
                {orderLines.map((line, i) => {
                  const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-300 w-4 shrink-0">#{i + 1}</span>
                        <input
                          type="text"
                          value={line.label}
                          onChange={(e) => updateOrderLine(i, { label: e.target.value })}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500"
                          placeholder="Article (ex. Filet de calmar)"
                        />
                        {orderLines.length > 1 && (
                          <button type="button" onClick={() => removeOrderLine(i)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer shrink-0" title="Retirer cet article">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Quantité</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateOrderLine(i, { quantity: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500 font-mono"
                            placeholder="Ex. 6"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Prix unitaire (Ar)</label>
                          <input
                            type="number" min="0"
                            value={line.unitPrice}
                            onChange={(e) => updateOrderLine(i, { unitPrice: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500 font-mono"
                            placeholder="Ex. 22000"
                          />
                        </div>
                      </div>
                      <div className="pl-6 space-y-2">
                        <select
                          value={line.stockId}
                          onChange={(e) => updateOrderLine(i, { stockId: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
                        >
                          <option value="">— Aucun stock lié —</option>
                          <option value="__new__">➕ Créer un article de stock (« {line.label || 'cet article'} »)</option>
                          {stocks.map((s) => (
                            <option key={s.id} value={s.id}>{s.itemName} ({s.unit})</option>
                          ))}
                        </select>
                        {line.stockId === '__new__' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-semibold">Unité :</span>
                            <select value={line.newStockUnit} onChange={(e) => updateOrderLine(i, { newStockUnit: e.target.value })}
                              className="px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer">
                              <option value="pieces">Pièces</option>
                              <option value="bouteilles">Bouteilles</option>
                              <option value="kg">kg</option>
                              <option value="l">Litre (l)</option>
                            </select>
                          </div>
                        )}
                        <div className="text-right text-[10px] text-slate-500 font-mono">Sous-total : <b className="text-slate-700">{formatAr(lineTotal)}</b></div>
                      </div>
                    </div>
                  );
                })}
                <button type="button" onClick={addOrderLine} className="w-full py-2 border border-dashed border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 cursor-pointer flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un article
                </button>
              </div>

              {/* Montant total calculé */}
              <div className="flex items-center justify-between bg-red-50/60 border border-red-100 rounded-xl px-4 py-2.5">
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Montant total (auto)</span>
                <span className="text-base font-black text-red-600 font-mono">{formatAr(orderLinesTotal)}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Statut du paiement</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'paye', label: 'Déjà payé', color: 'border-emerald-200 text-emerald-700 bg-emerald-50/40' },
                    { value: 'en_attente', label: 'En attente / Dû', color: 'border-rose-200 text-rose-700 bg-rose-50/40' },
                  ].map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setOrderPaymentStatus(st.value)}
                      className={`py-2 px-1 border rounded-xl text-xs font-semibold text-center cursor-pointer transition-all ${
                        orderPaymentStatus === st.value ? `${st.color} ring-1 ring-offset-1 ring-red-500` : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">N° de facture</label>
                  <input
                    type="text"
                    value={orderInvoiceNumber}
                    onChange={(e) => setOrderInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                    placeholder="Ex. FAC-2026-099"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Photo de la facture</label>
                  <div className="flex items-center gap-3">
                    {orderInvoiceImageUrl ? (
                      <img src={orderInvoiceImageUrl} alt="Facture" onClick={() => setPreview(orderInvoiceImageUrl)} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 cursor-zoom-in" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-[9px] font-semibold shrink-0">Vide</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOrderInvoiceFileChange}
                      className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note (facultatif)</label>
                <textarea
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 resize-none"
                  placeholder="Détails, livraison prévue..."
                />
              </div>

              {/* Réception globale : alimente le stock de toutes les lignes liées */}
              {orderLines.some((l) => l.stockId) && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" checked={orderReceived} onChange={(e) => setOrderReceived(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    Marchandise <b>reçue</b> → alimenter le stock de toutes les lignes liées
                  </label>
                  <p className="text-[9px] text-slate-400 pl-6">À la réception : +quantité au stock de chaque ligne liée, mouvement d'historique daté, mise à jour du coût unitaire. Idempotent (une seule fois par ligne).</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600">
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold">
                  {editingOrder ? 'Enregistrer' : 'Ajouter la commande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale historique des approvisionnements */}
      {historyStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setHistoryStock(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 text-left max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" /> Historique des approvisionnements
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{historyStock.itemName}</p>
              </div>
              <button onClick={() => setHistoryStock(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {(() => {
                const rows = stockMovements
                  .filter((m) => m.stockId === historyStock.id)
                  .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                if (rows.length === 0) {
                  return <p className="py-10 text-center text-xs text-slate-400">Aucun approvisionnement enregistré pour cet article.</p>;
                }
                const totalAppro = rows.reduce((s, m) => s + (m.quantity || 0), 0);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-[11px]">
                      <span className="font-semibold text-emerald-700">{rows.length} approvisionnement(s)</span>
                      <span className="font-mono font-bold text-emerald-800">Total : {Math.round(totalAppro * 100) / 100} {historyStock.unit}</span>
                    </div>
                    {rows.map((m) => (
                      <div key={m.id} className="flex items-start justify-between gap-3 border border-slate-100 rounded-xl px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 font-mono">+{m.quantity} {m.unit}</p>
                          {m.note && <p className="text-[10px] text-slate-500 mt-0.5 italic truncate">{m.note}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 text-right">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CATALOGUE PRODUITS D'UN FOURNISSEUR (Étape 1) */}
      {catalogSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Catalogue — {catalogSupplier.name}
              </h3>
              <button onClick={() => { setCatalogSupplier(null); resetProdForm(); }} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Formulaire ajout / édition produit */}
              <form onSubmit={handleProductSubmit} className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {editingProduct ? 'Modifier le produit' : 'Ajouter un produit au catalogue'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                  <input
                    type="text" required value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Nom du produit (ex. Coca 1,5L)"
                    className="sm:col-span-3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number" min="0" value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    placeholder="Prix (Ar)"
                    className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <select value={prodUnit} onChange={(e) => setProdUnit(e.target.value)}
                    className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer">
                    <option value="pieces">Pièces</option>
                    <option value="bouteilles">Bouteille</option>
                    <option value="kg">kg</option>
                    <option value="l">Litre</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-semibold shrink-0">Stock lié (option) :</span>
                  <select value={prodStockId} onChange={(e) => setProdStockId(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer">
                    <option value="">— Aucun —</option>
                    <option value="__new__">➕ Autre : créer un nouvel article de stock (« {prodName || 'ce produit'} »)</option>
                    {stocks.map((s) => (
                      <option key={s.id} value={s.id}>{s.itemName} ({s.unit})</option>
                    ))}
                  </select>
                  <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shrink-0">
                    {editingProduct ? 'Enregistrer' : 'Ajouter'}
                  </button>
                  {editingProduct && (
                    <button type="button" onClick={resetProdForm} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-500 shrink-0">
                      Annuler
                    </button>
                  )}
                </div>
                {prodStockId === '__new__' && (
                  <p className="text-[9px] text-blue-600">Un article de stock « {prodName || 'ce produit'} » sera créé (unité : <b>{prodUnit}</b>, quantité 0) et lié à ce produit.</p>
                )}
              </form>

              {/* Liste des produits du fournisseur */}
              {productsBySupplier(catalogSupplier.id).length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Aucun produit dans ce catalogue. Ajoutes-en un ci-dessus.</p>
              ) : (
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[9px]">
                      <tr>
                        <th className="py-2 px-3 text-left">Produit</th>
                        <th className="py-2 px-3 text-right">Prix courant</th>
                        <th className="py-2 px-3 text-center">Unité</th>
                        <th className="py-2 px-3 text-left">Stock lié</th>
                        <th className="py-2 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {productsBySupplier(catalogSupplier.id).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{p.name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatAr(p.unitPrice || 0)}</td>
                          <td className="py-2 px-3 text-center text-slate-500">{p.unit}</td>
                          <td className="py-2 px-3 text-slate-500">
                            {p.stockId != null ? (stocks.find((s) => s.id === p.stockId)?.itemName || `#${p.stockId}`) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEditProduct(p)} className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg cursor-pointer" title="Modifier">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { if (confirm('Retirer ce produit du catalogue ?')) onDeleteSupplierProduct(p.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" title="Supprimer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[9px] text-slate-400">💡 Le prix ici est le <b>prix courant</b> (pré-remplissage). Le modifier n'affecte <b>pas</b> les commandes déjà passées (chaque commande garde son prix figé).</p>
            </div>
          </div>
        </div>
      )}

      {/* Aperçu plein écran d'une facture */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-[60] cursor-zoom-out"
        >
          <img src={preview} alt="Facture" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
