import React, { useState } from 'react';
import { Order, MenuItem, Personnel } from '../types.ts';
import { Search, Plus, Minus, CreditCard, ChevronLeft, ChevronRight, Edit2, Trash2, X, ShoppingBag, ArrowRight, CheckCircle, Wallet, Smartphone, Coins, UtensilsCrossed, Printer } from 'lucide-react';
import { motion } from 'motion/react';

// Ligne de commande locale (plat/boisson choisi pour la table)
interface OrderLine {
  menuItemId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  category?: string;
}

interface OrdersManagerProps {
  orders: Order[];
  menuItems: MenuItem[];
  personnel: Personnel[];
  restaurantName?: string | null;
  onAddOrder: (formData: any) => Promise<void>;
  onEditOrder: (id: number, formData: any) => Promise<void>;
  onDeleteOrder: (id: number) => Promise<void>;
}

export default function OrdersManager({
  orders,
  menuItems,
  personnel,
  restaurantName,
  onAddOrder,
  onEditOrder,
  onDeleteOrder
}: OrdersManagerProps) {
  const [searchTable, setSearchTable] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Dedicated payment states
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('especes');

  // Form states
  const [tableNumber, setTableNumber] = useState(1);
  const [status, setStatus] = useState('en_attente');
  const [items, setItems] = useState<OrderLine[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [serverName, setServerName] = useState('');
  const [orderType, setOrderType] = useState('sur_place'); // 'sur_place' ou 'a_livrer'
  const [taxRate, setTaxRate] = useState(0); // taux de TVA en % (prix TTC)

  // Seuls les employés au rôle "serveur" peuvent prendre une commande.
  const serverOptions = personnel.filter((p) => p.role === 'serveur');

  // Total de l'addition = somme dynamique de toutes les lignes (plats + boissons)
  const computedTotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

  // Ajoute un plat/boisson (incrémente la quantité s'il est déjà présent)
  const addMenuItem = (menuItemId: number) => {
    const mi = menuItems.find((m) => m.id === menuItemId);
    if (!mi) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId);
      if (existing) {
        return prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { menuItemId: mi.id, name: mi.name, unitPrice: mi.price, quantity: 1, category: mi.category }];
    });
  };

  // Change la quantité d'une ligne (retire la ligne si elle tombe à 0)
  const changeQty = (menuItemId: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (menuItemId: number) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  // Format Ariary helper
  const formatAr = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar').trim();
  };

  // Ventilation TVA à partir d'un total TTC (les prix du menu sont saisis TTC).
  const taxBreakdown = (ttc: number, rate: number) => {
    const r = Number(rate) || 0;
    const ht = r > 0 ? ttc / (1 + r / 100) : ttc;
    return { ht, tva: ttc - ht };
  };

  const getPaymentBadgeStyle = (method: string) => {
    switch (method) {
      case 'especes':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'carte_visa':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'mvola':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'orange_money':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'airtel_money':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'especes':
        return '💵 Espèces';
      case 'carte_visa':
        return '💳 Carte VISA';
      case 'mvola':
        return '🟡 Mvola';
      case 'orange_money':
        return '🟠 Orange Money';
      case 'airtel_money':
        return '🔴 Airtel Money';
      default:
        return '📋 Carte';
    }
  };

  const openAddModal = () => {
    setEditingOrder(null);
    setTableNumber(1);
    setStatus('en_attente');
    setItems([]);
    setSelectedMenuItemId(0);
    setPaymentMethod('especes');
    setServerName('');
    setOrderType('sur_place');
    setTaxRate(0);
    setIsOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setTableNumber(order.tableNumber);
    setStatus(order.status);
    setItems(
      (order.items || []).map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name || 'Article',
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        category: i.category,
      }))
    );
    setSelectedMenuItemId(0);
    setPaymentMethod(order.paymentMethod || 'especes');
    setServerName(order.serverName || '');
    setOrderType(order.orderType || 'sur_place');
    setTaxRate(order.taxRate || 0);
    setIsOpen(true);
  };

  const openPaymentModal = (order: Order) => {
    setPayingOrder(order);
    setSelectedPayMethod(order.paymentMethod || 'especes');
    setIsPaymentOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Règle métier : seule une commande prise par un serveur est valide.
    if (!serverName) {
      alert('Seul un employé au rôle « Serveur » peut prendre la commande. Sélectionnez un serveur (ou ajoutez-en un dans Personnel).');
      return;
    }
    // On envoie les lignes ; le total est recalculé côté serveur à partir de celles-ci.
    const payload = {
      tableNumber,
      status,
      paymentMethod,
      serverName: serverName || null,
      orderType,
      taxRate,
      items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, unitPrice: i.unitPrice })),
    };
    if (editingOrder) {
      await onEditOrder(editingOrder.id, payload);
    } else {
      await onAddOrder(payload);
    }
    setIsOpen(false);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;

    await onEditOrder(payingOrder.id, {
      ...payingOrder,
      status: 'paye',
      paymentMethod: selectedPayMethod
    });

    setIsPaymentOpen(false);
    setPayingOrder(null);
  };

  const handleShiftStatus = async (order: Order, direction: 'left' | 'right') => {
    const statuses = ['en_attente', 'en_preparation', 'servi', 'paye'];
    const currentIndex = statuses.indexOf(order.status);
    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= statuses.length) return;

    await onEditOrder(order.id, {
      ...order,
      status: statuses[nextIndex]
    });
  };

  // Impression de l'addition au format ticket de restaurant (nouvelle fenêtre + impression).
  const printBill = (order: Order) => {
    const win = window.open('', '_blank', 'width=380,height=640');
    if (!win) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer l'addition.");
      return;
    }
    const resto = restaurantName || 'ChefSuite Realtime';
    const dateStr = new Date(order.createdAt).toLocaleString('fr-FR');
    const rows = (order.items || []).map((it) => `
      <tr>
        <td class="l">${it.quantity}× ${(it.name || 'Article').replace(/</g, '&lt;')}</td>
        <td class="r">${formatAr(it.unitPrice * it.quantity)}</td>
      </tr>`).join('') || '<tr><td colspan="2">Aucun article</td></tr>';

    win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Addition — Table ${order.tableNumber}</title>
      <style>
        * { font-family: 'Courier New', Courier, monospace; box-sizing: border-box; }
        body { width: 300px; margin: 0 auto; padding: 14px; color: #000; }
        h1 { font-size: 16px; text-align: center; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
        .sub { text-align: center; font-size: 11px; margin: 3px 0 10px; }
        hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        td { padding: 2px 0; vertical-align: top; }
        td.r { text-align: right; white-space: nowrap; padding-left: 8px; }
        .total td { font-size: 15px; font-weight: bold; padding-top: 4px; }
        .foot { text-align: center; font-size: 11px; margin-top: 14px; }
      </style></head><body>
      <h1>${resto.replace(/</g, '&lt;')}</h1>
      <div class="sub">ADDITION — Reçu client</div>
      <hr/>
      <table>
        <tr><td class="l">Table</td><td class="r">#${order.tableNumber}</td></tr>
        <tr><td class="l">Commande</td><td class="r">#${order.id}</td></tr>
        <tr><td class="l">Serveur</td><td class="r">${(order.serverName || '—').replace(/</g, '&lt;')}</td></tr>
        <tr><td class="l">Date</td><td class="r">${dateStr}</td></tr>
      </table>
      <hr/>
      <table>${rows}</table>
      <hr/>
      <table>
        ${order.taxRate > 0 ? `
        <tr><td class="l">Total HT</td><td class="r">${formatAr(taxBreakdown(order.totalAmount, order.taxRate).ht)}</td></tr>
        <tr><td class="l">TVA (${order.taxRate}%)</td><td class="r">${formatAr(taxBreakdown(order.totalAmount, order.taxRate).tva)}</td></tr>` : ''}
        <tr class="total"><td class="l">TOTAL${order.taxRate > 0 ? ' TTC' : ''}</td><td class="r">${formatAr(order.totalAmount)}</td></tr>
        <tr><td class="l">Paiement</td><td class="r">${getPaymentLabel(order.paymentMethod)}</td></tr>
      </table>
      <hr/>
      <div class="foot">Merci de votre visite&nbsp;!<br/>Misaotra tompoko — À bientôt.</div>
      <script>window.onload = function(){ window.print(); }<\/script>
      </body></html>`);
    win.document.close();
    win.focus();
  };

  const filteredOrders = orders.filter(o =>
    searchTable === '' || String(o.tableNumber).includes(searchTable)
  );

  const columns = [
    { key: 'en_attente', title: 'En attente', color: 'border-t-amber-500 bg-amber-50/20 text-amber-800' },
    { key: 'en_preparation', title: 'En cuisine', color: 'border-t-red-500 bg-red-50/20 text-red-800' },
    { key: 'servi', title: 'Servi / À table', color: 'border-t-yellow-500 bg-yellow-50/20 text-yellow-800' },
    { key: 'paye', title: 'Payé / Archivé', color: 'border-t-emerald-500 bg-emerald-50/20 text-emerald-800' }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Search and Action Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="number"
            placeholder="Filtrer par numéro de Table..."
            value={searchTable}
            onChange={(e) => setSearchTable(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
          />
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Ouvrir une Commande
        </button>
      </div>

      {/* Kanban swimlanes list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colOrders = filteredOrders.filter(o => o.status === col.key);

          return (
            <div key={col.key} className="bg-slate-50/40 rounded-3xl border border-slate-100 p-4 flex flex-col h-[570px] shadow-3xs">
              {/* Column Header */}
              <div className={`p-3 rounded-xl border-t-3 ${col.color} mb-3 flex items-center justify-between shadow-2xs`}>
                <span className="text-xs font-extrabold uppercase tracking-wider">{col.title}</span>
                <span className="text-[11px] font-mono font-bold bg-white/80 border border-slate-100 px-2 py-0.5 rounded-lg text-slate-700">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Orders list */}
              <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                {colOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-300">
                    <ShoppingBag className="w-6 h-6 mx-auto opacity-50 mb-1" />
                    <p className="text-[10px] font-semibold">Aucun service</p>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs flex flex-col justify-between hover:border-red-100 transition-all text-left"
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="font-display font-bold text-xs text-slate-800">
                            Table #{order.tableNumber}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{order.id}
                          </span>
                        </div>
                        {order.serverName && (
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                            Servi par <span className="font-semibold text-slate-700">{order.serverName}</span>
                          </p>
                        )}
                        <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 border rounded-lg font-bold ${
                          order.orderType === 'a_livrer'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {order.orderType === 'a_livrer' ? '🚚 À livrer' : '🍽️ Sur place'}
                        </span>

                        {order.items && order.items.length > 0 && (
                          <div className="mt-3 space-y-0.5 max-h-24 overflow-y-auto pr-0.5">
                            {order.items.map((it) => (
                              <div key={it.id ?? it.menuItemId} className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-500 truncate pr-2">
                                  <span className="font-bold text-slate-700">{it.quantity}×</span> {it.name || 'Article'}
                                </span>
                                <span className="font-mono text-slate-400 shrink-0">{formatAr(it.unitPrice * it.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total {order.taxRate > 0 ? 'TTC' : ''} :</span>
                          <span className="font-mono text-xs font-black text-red-600">
                            {formatAr(order.totalAmount)}
                          </span>
                        </div>
                        {order.taxRate > 0 && (
                          <p className="text-[9px] text-slate-400 mt-1 text-right font-mono">
                            dont TVA {order.taxRate}% : {formatAr(taxBreakdown(order.totalAmount, order.taxRate).tva)}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-slate-400">Paiement :</span>
                          <span className={`text-[9px] px-2 py-0.5 border rounded-lg font-bold ${getPaymentBadgeStyle(order.paymentMethod)}`}>
                            {getPaymentLabel(order.paymentMethod)}
                          </span>
                        </div>

                        {/* Interactive Direct Payment Action */}
                        {order.status !== 'paye' && (
                          <button
                            onClick={() => openPaymentModal(order)}
                            className="w-full mt-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-600/10"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Encaisser l'Addition
                          </button>
                        )}

                        {/* Impression de l'addition (toujours disponible) */}
                        <button
                          onClick={() => printBill(order)}
                          className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimer l'addition
                        </button>
                      </div>

                      {/* Swimlane Shift Controls */}
                      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-50">
                        {/* Quick Shifts */}
                        <div className="flex gap-1">
                          <button
                            disabled={col.key === 'en_attente'}
                            onClick={() => handleShiftStatus(order, 'left')}
                            className="p-1 rounded-md border border-slate-100 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Précédent"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={col.key === 'paye'}
                            onClick={() => handleShiftStatus(order, 'right')}
                            className="p-1 rounded-md border border-slate-100 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Suivant"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Edit Delete */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditModal(order)}
                            className="p-1 text-slate-400 hover:text-yellow-600 rounded hover:bg-yellow-50 cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Clôturer ou supprimer la commande Table ${order.tableNumber} ?`)) {
                                onDeleteOrder(order.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit modal - Wider Width (max-w-xl md:max-w-2xl) */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl md:max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative text-left">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-black text-slate-800 text-base sm:text-lg mb-1.5 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-red-600" />
              {editingOrder ? 'Modifier la Commande' : 'Ouvrir un Service Table'}
            </h3>
            <p className="text-[10px] text-slate-400 mb-6">Saisissez les informations de service de la table pour les commandes en Ariary.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Numéro de Table *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
                    placeholder="Ex. 5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Statut du Service</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer font-bold"
                  >
                    <option value="en_attente">En attente (Nouvelle table)</option>
                    <option value="en_preparation">En cuisine (Préparation)</option>
                    <option value="servi">Servi / À table</option>
                    <option value="paye">Payé / Addition réglée</option>
                  </select>
                </div>
              </div>

              {/* Type de commande : sur place ou à livrer */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type de commande</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'sur_place', label: '🍽️ Sur place' },
                    { key: 'a_livrer', label: '🚚 À livrer' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setOrderType(t.key)}
                      className={`px-3 py-2.5 border rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                        orderType === t.key
                          ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500/30'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Serveur / Serveuse ayant pris la commande — réservé au rôle "serveur" */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Serveur / Serveuse *</label>
                {serverOptions.length > 0 ? (
                  <select
                    required
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="">— Sélectionner un serveur —</option>
                    {serverOptions.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    {/* Conserve un serveur déjà assigné qui aurait changé de rôle depuis */}
                    {serverName && !serverOptions.some((p) => p.name === serverName) && (
                      <option value={serverName}>{serverName} (ancien serveur)</option>
                    )}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700 font-semibold">
                    Aucun employé au rôle « Serveur ». Ajoutez-en un dans l'onglet Personnel pour pouvoir prendre une commande.
                  </div>
                )}
              </div>

              {/* Constructeur d'addition : plats & boissons de la table */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Plats &amp; boissons de la table</label>
                <div className="flex gap-2">
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(parseInt(e.target.value) || 0)}
                    className="flex-1 px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value={0}>— Choisir un plat ou une boisson —</option>
                    {menuItems.filter((m) => m.isAvailable).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {formatAr(m.price)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMenuItemId) {
                        addMenuItem(selectedMenuItemId);
                        setSelectedMenuItemId(0);
                      }
                    }}
                    disabled={!selectedMenuItemId}
                    className="px-3.5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>

                {/* Lignes de commande */}
                <div className="mt-3 space-y-2 max-h-52 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-slate-300 border border-dashed border-slate-200 rounded-xl">
                      <UtensilsCrossed className="w-5 h-5 mx-auto mb-1 opacity-60" />
                      <p className="text-[10px] font-semibold">Aucun plat ajouté — l'addition est à 0 Ar</p>
                    </div>
                  ) : (
                    items.map((it) => (
                      <div key={it.menuItemId} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{it.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{formatAr(it.unitPrice)} / unité</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => changeQty(it.menuItemId, -1)}
                            className="p-1 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-red-600 cursor-pointer transition-colors"
                            title="Retirer un"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-bold text-slate-800">{it.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQty(it.menuItemId, 1)}
                            className="p-1 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-emerald-600 cursor-pointer transition-colors"
                            title="Ajouter un"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="w-24 text-right text-xs font-mono font-black text-slate-800">{formatAr(it.unitPrice * it.quantity)}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(it.menuItemId)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TVA (facultative) — les prix étant TTC, elle sert de ventilation sur l'addition */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">TVA applicable (%)</label>
                <div className="flex flex-wrap gap-2">
                  {[0, 5, 20].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTaxRate(r)}
                      className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        taxRate === r
                          ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500/30'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'
                      }`}
                    >
                      {r === 0 ? 'Aucune' : `${r} %`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="w-24 px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                    title="Taux personnalisé"
                  />
                </div>
              </div>

              {/* Total dynamique de l'addition */}
              <div className="bg-red-50/60 border border-red-100 rounded-2xl px-4 py-3 space-y-1.5">
                {taxRate > 0 && (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>Total HT</span>
                      <span className="font-mono">{formatAr(taxBreakdown(computedTotal, taxRate).ht)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>TVA ({taxRate} %)</span>
                      <span className="font-mono">{formatAr(taxBreakdown(computedTotal, taxRate).tva)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Total Addition {taxRate > 0 ? 'TTC' : ''} (calcul automatique)</span>
                    <span className="text-[9px] text-slate-400 font-semibold">{items.reduce((n, i) => n + i.quantity, 0)} article(s) sur la table</span>
                  </div>
                  <span className="text-lg font-black text-red-600 font-mono">{formatAr(computedTotal)}</span>
                </div>
              </div>

              {/* Mode de paiement */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mode de paiement préférentiel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                >
                  <option value="especes">💵 Espèces</option>
                  <option value="carte_visa">💳 Carte VISA</option>
                  <option value="mvola">🟡 Mvola (Telma)</option>
                  <option value="orange_money">🟠 Orange Money</option>
                  <option value="airtel_money">🔴 Airtel Money</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-red-600/10"
                >
                  {editingOrder ? 'Enregistrer les modifications' : 'Ouvrir la table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Pay Addition Modal - Wider Width (max-w-xl) */}
      {isPaymentOpen && payingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative text-left">
            <button
              onClick={() => setIsPaymentOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-black text-slate-800 text-base sm:text-lg mb-1.5 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Encaisser l'Addition — Table #{payingOrder.tableNumber}
            </h3>
            <p className="text-[10px] text-slate-400 mb-6">Confirmez le règlement immédiat et le mode de transaction pour clore cette table.</p>

            <form onSubmit={handleProcessPayment} className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Montant à encaisser</span>
                  <span className="text-xl font-black text-red-600 font-mono mt-1 block">
                    {formatAr(payingOrder.totalAmount)}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg">
                  MGA (Ariary)
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Sélectionnez le mode de paiement *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'especes', label: '💵 Espèces', desc: 'Règlement liquide direct' },
                    { id: 'carte_visa', label: '💳 Carte VISA', desc: 'Terminal de paiement CB' },
                    { id: 'mvola', label: '🟡 Mvola (Telma)', desc: 'Mobile Money Madagascar' },
                    { id: 'orange_money', label: '🟠 Orange Money', desc: 'Mobile Money Madagascar' },
                    { id: 'airtel_money', label: '🔴 Airtel Money', desc: 'Mobile Money Madagascar' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPayMethod(method.id)}
                      className={`p-3.5 border rounded-2xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                        selectedPayMethod === method.id
                          ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                          : 'border-slate-150 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-extrabold text-slate-800">{method.label}</span>
                      <span className="text-[9px] text-slate-400 font-semibold mt-1">{method.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => printBill(payingOrder)}
                  className="mr-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimer l'addition
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/10 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Enregistrer le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
