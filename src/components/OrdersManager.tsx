import React, { useState } from 'react';
import { Order, MenuItem, Personnel, Client } from '../types.ts';
import { Search, Plus, Minus, CreditCard, ChevronLeft, ChevronRight, Edit2, Trash2, X, ShoppingBag, ArrowRight, CheckCircle, Wallet, Smartphone, Coins, UtensilsCrossed, Printer, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';
import MenuPicker from './MenuPicker.tsx';

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
  clients: Client[];
  restaurantName?: string | null;
  restaurantLogoUrl?: string | null;
  restaurantAddress?: string | null; // imprimés en en-tête de la facture
  restaurantPhone?: string | null;
  restaurantNif?: string | null;
  restaurantStat?: string | null;
  ticketFormat?: string | null; // '58mm' | '80mm' | 'A4' (Paramètres)
  defaultTaxRate?: number; // TVA par défaut (%) des nouvelles commandes (Paramètres)
  onAddOrder: (formData: any) => Promise<void>;
  onEditOrder: (id: number, formData: any) => Promise<void>;
  onDeleteOrder: (id: number) => Promise<void>;
}

export default function OrdersManager({
  orders,
  menuItems,
  personnel,
  clients,
  restaurantName,
  restaurantLogoUrl,
  restaurantAddress,
  restaurantPhone,
  restaurantNif,
  restaurantStat,
  ticketFormat,
  defaultTaxRate = 20,
  onAddOrder,
  onEditOrder,
  onDeleteOrder
}: OrdersManagerProps) {
  const [search, setSearch] = useState(''); // recherche : n° table, serveur, plat, paiement
  const [filterDate, setFilterDate] = useState(''); // filtre par date de commande (YYYY-MM-DD)
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null); // vue plein écran d'un statut
  const [isOpen, setIsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Dedicated payment states
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('especes');

  // Form states
  const [tableNumber, setTableNumber] = useState(''); // saisi au clavier (texte), converti en nombre à l'envoi
  const [status, setStatus] = useState('en_attente');
  const [items, setItems] = useState<OrderLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [serverName, setServerName] = useState('');
  const [orderType, setOrderType] = useState('sur_place'); // 'sur_place' ou 'a_livrer'
  const [taxRate, setTaxRate] = useState(0); // taux de TVA en % (prix TTC)
  const [clientId, setClientId] = useState(''); // client fidélité rattaché ('' = client de passage)
  const [deliveryFee, setDeliveryFee] = useState(0); // frais de livraison (commande à livrer)
  const [deliveryAddress, setDeliveryAddress] = useState(''); // adresse (client de passage)
  const [deliveryPhone, setDeliveryPhone] = useState(''); // téléphone (client de passage)

  // Client enregistré sélectionné dans le formulaire (ses coordonnées sont reprises automatiquement).
  const selectedClient = clientId ? clients.find((c) => String(c.id) === clientId) : undefined;

  // Frais de livraison proposés (Ar).
  const DELIVERY_FEES = [3000, 4000, 5000, 6000, 7000, 8000];

  // Seuls les employés au rôle "serveur" peuvent prendre une commande.
  const serverOptions = personnel.filter((p) => p.role === 'serveur');

  // Total de l'addition = somme dynamique de toutes les lignes (plats + boissons)
  const computedTotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  // Total à payer TTC = plats + frais de livraison (même calcul que le serveur).
  const grandTotal = computedTotal + (orderType === 'a_livrer' ? Number(deliveryFee) || 0 : 0);

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

  // Saisie directe de la quantité (clavier). Minimum 1 pour ne pas faire disparaître la ligne en tapant.
  const setQty = (menuItemId: number, value: string) => {
    const q = Math.max(1, Math.floor(Number(value) || 1));
    setItems((prev) => prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: q } : i)));
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
  // Base = total TTC complet (plats + frais de livraison). HT arrondi à l'Ariary, TVA = TTC − HT,
  // pour que HT + TVA retombe toujours exactement sur le TTC imprimé.
  const taxBreakdown = (ttc: number, rate: number) => {
    const r = Number(rate) || 0;
    const ht = r > 0 ? Math.round(ttc / (1 + r / 100)) : ttc;
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
    setTableNumber(''); // vide : le serveur tape directement le numéro
    setStatus('en_attente');
    setItems([]);
    setPaymentMethod('especes');
    setServerName('');
    setOrderType('sur_place');
    setTaxRate(defaultTaxRate); // TVA par défaut (Paramètres)
    setClientId('');
    setDeliveryFee(0);
    setDeliveryAddress('');
    setDeliveryPhone('');
    setIsOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setTableNumber(String(order.tableNumber));
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
    setPaymentMethod(order.paymentMethod || 'especes');
    setServerName(order.serverName || '');
    setOrderType(order.orderType || 'sur_place');
    setTaxRate(order.taxRate || 0);
    setClientId(order.clientId != null ? String(order.clientId) : '');
    setDeliveryFee(order.deliveryFee || 0);
    setDeliveryAddress(order.deliveryAddress || '');
    setDeliveryPhone(order.deliveryPhone || '');
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
    const tableNum = parseInt(tableNumber, 10);
    if (!tableNum || tableNum < 1) {
      alert('Saisissez un numéro de table (1 ou plus).');
      return;
    }
    // Coordonnées de livraison : saisies pour un client de passage ; pour un client enregistré,
    // reprises de sa fiche (on ne garde une saisie que si la fiche ne contient pas l'information).
    const isDelivery = orderType === 'a_livrer';
    const addr = isDelivery && !selectedClient?.address ? deliveryAddress.trim() : '';
    const tel = isDelivery && !selectedClient?.phone ? deliveryPhone.trim() : '';
    if (isDelivery && !selectedClient && (!addr || !tel)) {
      alert("Commande à livrer : renseignez l'adresse et le numéro de téléphone du client de passage.");
      return;
    }
    // On envoie les lignes ; le total est recalculé côté serveur à partir de celles-ci.
    const payload = {
      tableNumber: tableNum,
      status,
      paymentMethod,
      serverName: serverName || null,
      orderType,
      taxRate,
      clientId: clientId ? Number(clientId) : null,
      deliveryFee: orderType === 'a_livrer' ? Number(deliveryFee) || 0 : 0,
      deliveryAddress: addr || null,
      deliveryPhone: tel || null,
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
    // Format choisi dans Paramètres : ticket 58 mm, ticket 80 mm (défaut) ou page A4.
    const fmt = ticketFormat === '58mm' || ticketFormat === 'A4' ? ticketFormat : '80mm';
    const win = window.open('', '_blank', fmt === 'A4' ? 'width=820,height=900' : 'width=380,height=640');
    if (!win) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer l'addition.");
      return;
    }
    const resto = restaurantName || 'RestoPilote';
    const dateStr = new Date(order.createdAt).toLocaleString('fr-FR');
    // Logo du restaurant en haut, en noir & blanc (grayscale) pour l'impression thermique.
    const logoHtml = restaurantLogoUrl
      ? `<img class="logo" src="${restaurantLogoUrl}" alt="${resto.replace(/</g, '&lt;')}" />`
      : '';
    // En-tête légal : adresse, téléphone, NIF, STAT (renseignés dans Paramètres ; lignes vides omises).
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const infoLines = [
      restaurantAddress ? esc(restaurantAddress) : '',
      restaurantPhone ? `Tél : ${esc(restaurantPhone)}` : '',
      restaurantNif ? `NIF : ${esc(restaurantNif)}` : '',
      restaurantStat ? `STAT : ${esc(restaurantStat)}` : '',
    ].filter(Boolean);
    const infoHtml = infoLines.length ? `<div class="info">${infoLines.join('<br/>')}</div>` : '';
    // Bloc client : client enregistré → sa fiche (nom, tél., adresse) ; client de passage → saisie de la commande.
    const cli = order.clientId != null ? clients.find((c) => c.id === order.clientId) : undefined;
    const isDelivery = order.orderType === 'a_livrer';
    const cliName = cli?.name || '';
    const cliPhone = cli?.phone || order.deliveryPhone || '';
    const cliAddr = isDelivery ? (cli?.address || order.deliveryAddress || '') : '';
    const clientRows = [
      cliName ? `<tr><td class="l">Client</td><td class="r">${esc(cliName)}</td></tr>` : '',
      cliPhone ? `<tr><td class="l">Tél.</td><td class="r">${esc(cliPhone)}</td></tr>` : '',
      cliAddr ? `<tr><td class="l" colspan="2">Adresse : ${esc(cliAddr)}</td></tr>` : '',
    ].filter(Boolean).join('');
    const clientHtml = clientRows
      ? `<hr/><div class="sub" style="margin:4px 0">${isDelivery ? 'LIVRAISON' : 'CLIENT'}</div><table>${clientRows}</table>`
      : '';
    const fee = isDelivery ? Number(order.deliveryFee) || 0 : 0;
    // Prix TTC par plat ; si une TVA s'applique, on indique la TVA incluse sous chaque ligne.
    const rate = Number(order.taxRate) || 0;
    const tvaNote = (ttc: number) =>
      rate > 0 ? `<tr class="tva"><td class="l" colspan="2">&nbsp;&nbsp;dont TVA ${rate}% : ${formatAr(taxBreakdown(ttc, rate).tva)}</td></tr>` : '';
    const rows = (order.items || []).map((it) => `
      <tr>
        <td class="l">${it.quantity}× ${(it.name || 'Article').replace(/</g, '&lt;')}</td>
        <td class="r">${formatAr(it.unitPrice * it.quantity)}</td>
      </tr>${tvaNote(it.unitPrice * it.quantity)}`).join('') || '<tr><td colspan="2">Aucun article</td></tr>';

    win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>Addition — Table ${order.tableNumber}</title>
      <style>
        /* Format ticket 80 mm par défaut (imprimantes thermiques / petits appareils) */
        @page { size: 80mm auto; margin: 0; }
        * { font-family: 'Courier New', Courier, monospace; box-sizing: border-box; }
        body { width: 80mm; margin: 0 auto; padding: 4mm 3mm; color: #000; }
        ${fmt === '58mm' ? `
        /* Ticket 58 mm : zone imprimable ~48 mm, police plus petite */
        @page { size: 58mm auto; margin: 0; }
        body { width: 58mm; padding: 3mm 2mm; }
        .logo { max-width: 40mm !important; max-height: 16mm !important; }
        h1 { font-size: 13px !important; letter-spacing: 0 !important; }
        .info, .sub, .foot { font-size: 9.5px !important; }
        table { font-size: 10.5px !important; }
        td.r { padding-left: 4px !important; }
        .total td { font-size: 12.5px !important; }` : ''}
        ${fmt === 'A4' ? `
        /* Page A4 : marges classiques, texte plus grand, centré sur 150 mm */
        @page { size: A4; margin: 15mm; }
        body { width: auto; max-width: 150mm; padding: 0; }
        .logo { max-width: 70mm !important; max-height: 30mm !important; }
        h1 { font-size: 22px !important; }
        .info, .sub, .foot { font-size: 13px !important; }
        table { font-size: 14px !important; }
        .total td { font-size: 18px !important; }` : ''}
        .logo { display: block; margin: 0 auto 6px; max-width: 55mm; max-height: 22mm; object-fit: contain;
          filter: grayscale(1) contrast(1.15); -webkit-filter: grayscale(1) contrast(1.15);
          print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        h1 { font-size: 16px; text-align: center; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
        .info { text-align: center; font-size: 10.5px; line-height: 1.35; margin-top: 4px; word-wrap: break-word; }
        .sub { text-align: center; font-size: 11px; margin: 8px 0 10px; font-weight: bold; }
        hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        td { padding: 2px 0; vertical-align: top; }
        td.r { text-align: right; white-space: nowrap; padding-left: 8px; }
        tr.tva td { font-size: 0.85em; padding-top: 0; color: #333; }
        .total td { font-size: 15px; font-weight: bold; padding-top: 4px; }
        .foot { text-align: center; font-size: 11px; margin-top: 14px; }
      </style></head><body>
      ${logoHtml}
      <h1>${resto.replace(/</g, '&lt;')}</h1>
      ${infoHtml}
      <div class="sub">ADDITION — Reçu client</div>
      <hr/>
      <table>
        <tr><td class="l">Table</td><td class="r">#${order.tableNumber}</td></tr>
        <tr><td class="l">Commande</td><td class="r">#${order.id}</td></tr>
        <tr><td class="l">Serveur</td><td class="r">${(order.serverName || '—').replace(/</g, '&lt;')}</td></tr>
        <tr><td class="l">Date</td><td class="r">${dateStr}</td></tr>
      </table>
      ${clientHtml}
      <hr/>
      <table>${rows}</table>
      <hr/>
      <table>
        ${fee > 0 ? `
        <tr><td class="l">Sous-total plats</td><td class="r">${formatAr(order.totalAmount - fee)}</td></tr>
        <tr><td class="l">Frais de livraison</td><td class="r">${formatAr(fee)}</td></tr>${tvaNote(fee)}` : ''}
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

  // Filtre : recherche texte (n° table, serveur, plat, moyen de paiement) + date de commande.
  const q = search.trim().toLowerCase();
  const filteredOrders = orders.filter((o) => {
    const matchText =
      q === '' ||
      String(o.tableNumber).includes(q) ||
      (o.serverName || '').toLowerCase().includes(q) ||
      (o.paymentMethod || '').toLowerCase().includes(q) ||
      getPaymentLabel(o.paymentMethod).toLowerCase().includes(q) ||
      (o.items || []).some((it) => (it.name || '').toLowerCase().includes(q));
    const d = (o.createdAt || '').slice(0, 10);
    const matchDate = !filterDate || d === filterDate;
    return matchText && matchDate;
  });

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
        <div className="flex flex-1 flex-col sm:flex-row gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher : n° table, serveur, plat, paiement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-700 font-mono"
              title="Filtrer par date de commande"
            />
            {(search || filterDate) && (
              <button type="button" onClick={() => { setSearch(''); setFilterDate(''); }} className="p-1.5 text-slate-300 hover:text-red-600 cursor-pointer" title="Réinitialiser les filtres">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Ouvrir une Commande
        </button>
      </div>

      {/* Kanban swimlanes list (ou vue plein écran d'un statut au clic sur son titre) */}
      <div className={expandedStatus ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start'}>
        {(expandedStatus ? columns.filter((c) => c.key === expandedStatus) : columns).map((col) => {
          const colOrders = filteredOrders.filter(o => o.status === col.key);
          const isExpanded = expandedStatus === col.key;

          return (
            <div key={col.key} className={`bg-slate-50/40 rounded-3xl border border-slate-100 p-4 flex flex-col ${isExpanded ? '' : 'h-[570px]'} shadow-3xs`}>
              {/* Column Header (cliquable : plein écran / réduire) */}
              <button
                type="button"
                onClick={() => setExpandedStatus(isExpanded ? null : col.key)}
                className={`p-3 rounded-xl border-t-3 ${col.color} mb-3 flex items-center justify-between shadow-2xs w-full cursor-pointer hover:brightness-95 transition-all`}
                title={isExpanded ? 'Revenir au tableau' : 'Voir toutes ces commandes en plein écran'}
              >
                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 opacity-60" />}
                  {col.title}
                </span>
                <span className="text-[11px] font-mono font-bold bg-white/80 border border-slate-100 px-2 py-0.5 rounded-lg text-slate-700">
                  {colOrders.length}
                </span>
              </button>

              {/* Column Orders list */}
              <div className={isExpanded ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start' : 'flex-1 overflow-y-auto space-y-3 min-h-0'}>
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
                            {order.reference ? `Réf. ${order.reference}` : `#${order.id}`}
                          </span>
                        </div>
                        {order.serverName && (
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                            Servi par <span className="font-semibold text-slate-700">{order.serverName}</span>
                          </p>
                        )}
                        {order.clientId != null && (
                          <p className="text-[10px] text-emerald-600 mt-0.5 truncate font-semibold">
                            ⭐ {clients.find((c) => c.id === order.clientId)?.name || 'Client'}
                          </p>
                        )}
                        <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 border rounded-lg font-bold ${
                          order.orderType === 'a_livrer'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {order.orderType === 'a_livrer' ? '🚚 À livrer' : '🍽️ Sur place'}
                        </span>
                        {order.orderType === 'a_livrer' && (() => {
                          const c = order.clientId != null ? clients.find((x) => x.id === order.clientId) : undefined;
                          const addr = c?.address || order.deliveryAddress;
                          const tel = c?.phone || order.deliveryPhone;
                          return (addr || tel) ? (
                            <div className="mt-1 text-[10px] text-blue-700 space-y-0.5">
                              {addr && <p className="truncate" title={addr}>📍 {addr}</p>}
                              {tel && <p className="truncate">📞 {tel}</p>}
                            </div>
                          ) : null;
                        })()}

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
          {/* Petit écran : toute la fenêtre défile. Grand écran (lg) : hauteur fixe, en-tête fixe,
              et CHAQUE colonne défile indépendamment (carte à gauche, addition à droite). */}
          <div className="bg-white rounded-3xl max-w-xl md:max-w-2xl lg:max-w-6xl w-full shadow-2xl border border-slate-100 relative text-left max-h-[92vh] overflow-y-auto lg:h-[92vh] lg:overflow-hidden lg:flex lg:flex-col">
            <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
              <div>
                <h3 className="font-display font-black text-slate-800 text-base sm:text-lg mb-1 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-red-600" />
                  {editingOrder ? 'Modifier la Commande' : 'Ouvrir un Service Table'}
                </h3>
                <p className="text-[10px] text-slate-400">Cliquez sur les plats et boissons de la carte pour les ajouter à l'addition.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:flex-1 lg:min-h-0">
            {/* Gauche : la carte en images (clic = ajout à l'addition) */}
            <div className="px-6 sm:px-8 pt-5 pb-2 lg:pb-6 lg:border-r lg:border-slate-100 lg:flex lg:flex-col lg:min-h-0">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 shrink-0">
                <UtensilsCrossed className="w-3.5 h-3.5 text-red-600" /> La carte
              </h4>
              <MenuPicker
                menuItems={menuItems}
                quantities={Object.fromEntries(items.map((i) => [i.menuItemId, i.quantity]))}
                onAdd={addMenuItem}
                onRemoveOne={(id) => changeQty(id, -1)}
                formatAr={formatAr}
              />
            </div>

            {/* Droite : informations de la table + addition (défile seule ; boutons collés en bas) */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 pt-5 space-y-5 lg:min-h-0 lg:overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Numéro de Table *</label>
                  {/* Saisie directe au clavier (pas de flèches +/−) : chiffres uniquement, le champ peut être vidé. */}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onFocus={(e) => e.target.select()}
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

              {/* Client (fidélité) — facultatif : +1 point à la création de la commande */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Client (fidélité)</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                >
                  <option value="">— Client de passage (aucun) —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.loyaltyPoints} pt{c.loyaltyPoints > 1 ? 's' : ''}</option>
                  ))}
                </select>
                {!editingOrder && clientId && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">⭐ +1 point de fidélité sera attribué à ce client.</p>
                )}
              </div>

              {/* Constructeur d'addition : plats & boissons de la table */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Addition de la table</label>

                {/* Lignes de commande */}
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-slate-300 border border-dashed border-slate-200 rounded-xl">
                      <UtensilsCrossed className="w-5 h-5 mx-auto mb-1 opacity-60" />
                      <p className="text-[10px] font-semibold">Cliquez sur un plat de la carte pour l'ajouter</p>
                    </div>
                  ) : (
                    items.map((it) => (
                      <div key={it.menuItemId} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{it.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {formatAr(it.unitPrice)} / unité{taxRate > 0 ? ` · dont TVA ${formatAr(taxBreakdown(it.unitPrice * it.quantity, taxRate).tva)}` : ''}
                          </p>
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
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) => setQty(it.menuItemId, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-11 text-center text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-md py-0.5 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                            title="Saisir la quantité"
                          />
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
                  {[0, 20].map((r) => (
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

              {/* Frais de livraison — uniquement pour une commande à livrer */}
              {orderType === 'a_livrer' && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl px-4 py-3">
                  <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    🚚 Frais de livraison
                  </label>
                  <select
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 cursor-pointer font-mono"
                  >
                    <option value={0}>— Aucun —</option>
                    {DELIVERY_FEES.map((f) => (
                      <option key={f} value={f}>{formatAr(f)}</option>
                    ))}
                  </select>

                  {/* Coordonnées du client à livrer (imprimées sur la facture) */}
                  <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wider mt-3 mb-1.5">
                    📍 Coordonnées de livraison
                  </label>
                  {selectedClient && (
                    <div className="mb-2 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-[11px] text-slate-700 space-y-0.5">
                      <p className="font-bold text-emerald-700">⭐ {selectedClient.name} (client enregistré)</p>
                      {selectedClient.phone && <p>📞 {selectedClient.phone}</p>}
                      {selectedClient.address && <p>📍 {selectedClient.address}</p>}
                      <p className="text-[9px] text-slate-400">Repris automatiquement de la fiche client sur la facture.</p>
                    </div>
                  )}
                  {(!selectedClient || !selectedClient.address) && (
                    <input
                      type="text"
                      required={!selectedClient}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full mb-2 px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 placeholder:text-slate-400"
                      placeholder={selectedClient ? 'Adresse (absente de la fiche client)' : 'Adresse de livraison *'}
                    />
                  )}
                  {(!selectedClient || !selectedClient.phone) && (
                    <input
                      type="tel"
                      required={!selectedClient}
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-blue-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 placeholder:text-slate-400 font-mono"
                      placeholder={selectedClient ? 'Téléphone (absent de la fiche client)' : 'Numéro de téléphone *'}
                    />
                  )}
                </div>
              )}

              {/* Total dynamique de l'addition */}
              <div className="bg-red-50/60 border border-red-100 rounded-2xl px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Addition (plats {taxRate > 0 ? 'TTC' : ''})</span>
                  <span className="font-mono">{formatAr(computedTotal)}</span>
                </div>
                {orderType === 'a_livrer' && Number(deliveryFee) > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-blue-600 font-semibold">
                    <span>+ Livraison</span>
                    <span className="font-mono">{formatAr(Number(deliveryFee))}</span>
                  </div>
                )}
                {/* Ventilation TVA sur le total à payer (plats + livraison), identique à la facture */}
                {taxRate > 0 && (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>Total HT</span>
                      <span className="font-mono">{formatAr(taxBreakdown(grandTotal, taxRate).ht)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>TVA ({taxRate} %)</span>
                      <span className="font-mono">{formatAr(taxBreakdown(grandTotal, taxRate).tva)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-red-100">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Total à payer</span>
                    <span className="text-[9px] text-slate-400 font-semibold">{items.reduce((n, i) => n + i.quantity, 0)} article(s){orderType === 'a_livrer' && Number(deliveryFee) > 0 ? ' + livraison' : ''}</span>
                  </div>
                  <span className="text-lg font-black text-red-600 font-mono">{formatAr(grandTotal)}</span>
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

              <div className="sticky bottom-0 -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 bg-white/95 backdrop-blur flex justify-end gap-2.5 border-t border-slate-100">
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
