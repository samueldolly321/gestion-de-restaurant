import React, { useState } from 'react';
import { Package, Truck, AlertTriangle, CheckCircle, Search, Plus, Edit2, Trash2, X, Utensils, History, ClipboardList } from 'lucide-react';
import { Supplier, Stock, MenuItem, StockMovement, SupplierOrder } from '../types.ts';

interface InventoryManagerProps {
  stocks: Stock[];
  suppliers: Supplier[];
  menuItems: MenuItem[];
  stockMovements: StockMovement[];
  supplierOrders: SupplierOrder[];
  onAddStock: (data: any) => Promise<void>;
  onEditStock: (id: number, data: any) => Promise<void>;
  onDeleteStock: (id: number) => Promise<void>;
  onAddSupplierOrder: (data: any) => Promise<void>;
  onEditSupplierOrder: (id: number, data: any) => Promise<void>;
  onDeleteSupplierOrder: (id: number) => Promise<void>;
  onAddSupplier: (data: any) => Promise<void>;
  onEditSupplier: (id: number, data: any) => Promise<void>;
  onDeleteSupplier: (id: number) => Promise<void>;
}

export default function InventoryManager({
  stocks,
  suppliers,
  menuItems,
  stockMovements,
  supplierOrders,
  onAddStock,
  onEditStock,
  onDeleteStock,
  onAddSupplierOrder,
  onEditSupplierOrder,
  onDeleteSupplierOrder,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
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
  const [orderLabel, setOrderLabel] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderUnitPrice, setOrderUnitPrice] = useState(0);
  const [orderDate, setOrderDate] = useState('');
  const [orderPaymentStatus, setOrderPaymentStatus] = useState('en_attente');
  const [orderInvoiceNumber, setOrderInvoiceNumber] = useState('');
  const [orderInvoiceImageUrl, setOrderInvoiceImageUrl] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [orderStockId, setOrderStockId] = useState(''); // article de stock alimenté a la reception ('__new__' = créer)
  const [orderNewStockUnit, setOrderNewStockUnit] = useState('pieces'); // unité si nouvel article
  const [orderReceived, setOrderReceived] = useState(false);
  const [orderSupplierFilter, setOrderSupplierFilter] = useState(''); // filtre historique par fournisseur

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
    setOrderLabel('');
    setOrderQuantity(1);
    setOrderUnitPrice(0);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderPaymentStatus('en_attente');
    setOrderInvoiceNumber('');
    setOrderInvoiceImageUrl('');
    setOrderNote('');
    setOrderStockId('');
    setOrderNewStockUnit('pieces');
    setOrderReceived(false);
    setIsOrderModalOpen(true);
  };

  const openEditOrder = (o: SupplierOrder) => {
    setEditingOrder(o);
    setOrderSupplierId(String(o.supplierId));
    setOrderLabel(o.label);
    setOrderQuantity(o.quantity ?? 1);
    setOrderUnitPrice(o.unitPrice ?? 0);
    setOrderDate(o.orderDate || '');
    setOrderPaymentStatus(o.paymentStatus);
    setOrderInvoiceNumber(o.invoiceNumber || '');
    setOrderInvoiceImageUrl(o.invoiceImageUrl || '');
    setOrderNote(o.note || '');
    setOrderStockId(o.stockId != null ? String(o.stockId) : '');
    setOrderNewStockUnit('pieces');
    setOrderReceived(!!o.received);
    setIsOrderModalOpen(true);
  };

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
    if (!orderSupplierId || !orderLabel) return;
    const payload = {
      supplierId: Number(orderSupplierId),
      label: orderLabel,
      quantity: Number(orderQuantity),
      unitPrice: Number(orderUnitPrice),
      orderDate: orderDate || null,
      paymentStatus: orderPaymentStatus,
      invoiceNumber: orderInvoiceNumber || null,
      invoiceImageUrl: orderInvoiceImageUrl || null,
      note: orderNote || null,
      stockId: (orderStockId && orderStockId !== '__new__') ? Number(orderStockId) : null,
      newStockUnit: orderStockId === '__new__' ? orderNewStockUnit : null,
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

  const filteredStocks = stocks.filter((s) =>
    s.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={activeSubTab === 'stocks' ? "Rechercher dans le stock..." : "Rechercher un fournisseur..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-slate-800 text-xs focus:outline-none placeholder-slate-400"
          />
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
                  <button
                    onClick={() => { setOrderSupplierFilter(String(sup.id)); setActiveSubTab('orders'); }}
                    className="text-[10px] font-bold text-red-600 hover:text-red-500 flex items-center gap-1 cursor-pointer"
                  >
                    <ClipboardList className="w-3 h-3" /> Voir les commandes
                  </button>
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
          {/* Filtre par fournisseur */}
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
          </div>

          {(() => {
            const rows = supplierOrders
              .filter((o) => !orderSupplierFilter || o.supplierId === Number(orderSupplierFilter))
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
                        {rows.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-slate-400">{o.orderDate || '—'}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-700">{supplierNameById(o.supplierId)}</td>
                            <td className="py-3.5 px-6">
                              <p className="font-bold text-slate-800">{o.label}</p>
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
                              <span className="block text-[9px] font-normal text-slate-400">{o.quantity} × {formatAr(o.unitPrice || 0)}</span>
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
                                {o.stockId != null && (
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
                        ))}
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Objet de la commande *</label>
                <input
                  type="text"
                  required
                  value={orderLabel}
                  onChange={(e) => setOrderLabel(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                  placeholder="Ex. Filet de calmar 6 kg + crevettes 3 kg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantité *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                    placeholder="Ex. 6"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prix unitaire (Ar) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={orderUnitPrice}
                    onChange={(e) => setOrderUnitPrice(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                    placeholder="Ex. 22000"
                  />
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
              </div>

              {/* Montant total calculé */}
              <div className="flex items-center justify-between bg-red-50/60 border border-red-100 rounded-xl px-4 py-2.5">
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Montant total (auto)</span>
                <span className="text-base font-black text-red-600 font-mono">{formatAr(Number(orderQuantity) * Number(orderUnitPrice))}</span>
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

              {/* Lien vers le stock + réception (Option ①) */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-2">
                <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3 h-3" /> Alimenter le stock (facultatif)
                </label>
                <select
                  value={orderStockId}
                  onChange={(e) => setOrderStockId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="">— Aucun article de stock lié —</option>
                  <option value="__new__">➕ Créer un nouvel article de stock (« {orderLabel || 'objet de la commande'} »)</option>
                  {stocks.map((s) => (
                    <option key={s.id} value={s.id}>{s.itemName} ({s.unit})</option>
                  ))}
                </select>
                {orderStockId === '__new__' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-semibold">Unité du nouvel article :</span>
                    <select value={orderNewStockUnit} onChange={(e) => setOrderNewStockUnit(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer">
                      <option value="pieces">Pièces</option>
                      <option value="bouteilles">Bouteilles</option>
                      <option value="kg">kg</option>
                      <option value="l">Litre (l)</option>
                    </select>
                  </div>
                )}
                {orderStockId && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input type="checkbox" checked={orderReceived} onChange={(e) => setOrderReceived(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                    Marchandise <b>reçue</b> → ajouter <b>{orderQuantity}</b> au stock
                    {editingOrder?.stockApplied && <span className="text-[9px] text-emerald-600 font-bold">(déjà ajouté)</span>}
                  </label>
                )}
                <p className="text-[9px] text-slate-400">À la réception : +quantité au stock, mouvement d'historique daté, et mise à jour du coût unitaire.</p>
              </div>

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
