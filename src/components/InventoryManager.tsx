import React, { useState } from 'react';
import { Package, Truck, AlertTriangle, CheckCircle, Search, Plus, Edit2, Trash2, X, ShoppingBag } from 'lucide-react';
import { Supplier, Stock } from '../types.ts';

interface InventoryManagerProps {
  stocks: Stock[];
  suppliers: Supplier[];
  onAddStock: (data: any) => Promise<void>;
  onEditStock: (id: number, data: any) => Promise<void>;
  onDeleteStock: (id: number) => Promise<void>;
  onAddSupplier: (data: any) => Promise<void>;
  onEditSupplier: (id: number, data: any) => Promise<void>;
  onDeleteSupplier: (id: number) => Promise<void>;
}

export default function InventoryManager({
  stocks,
  suppliers,
  onAddStock,
  onEditStock,
  onDeleteStock,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
}: InventoryManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stocks' | 'suppliers'>('stocks');
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Edit references
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Stock Form States
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('kg');
  const [minStock, setMinStock] = useState(10);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceImageUrl, setInvoiceImageUrl] = useState('');

  // Supplier Form States
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('en_attente');
  const [contractDate, setContractDate] = useState('');
  const [amountDue, setAmountDue] = useState(0);

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
    setUnit('kg');
    setMinStock(10);
    setSupplierId('');
    setInvoiceImageUrl('');
    setIsStockModalOpen(true);
  };

  const openEditStock = (stk: Stock) => {
    setEditingStock(stk);
    setItemName(stk.itemName);
    setQuantity(stk.quantity);
    setUnit(stk.unit);
    setMinStock(stk.minStock);
    setSupplierId(stk.supplierId ? String(stk.supplierId) : '');
    setInvoiceImageUrl(stk.invoiceImageUrl || '');
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

    const payload = {
      itemName,
      quantity: Number(quantity),
      unit,
      minStock: Number(minStock),
      supplierId: supplierId ? Number(supplierId) : null,
      invoiceImageUrl: invoiceImageUrl || null,
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
    setIsSupplierModalOpen(true);
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
    };

    if (editingSupplier) {
      await onEditSupplier(editingSupplier.id, payload);
    } else {
      await onAddSupplier(payload);
    }
    setIsSupplierModalOpen(false);
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
            <Truck className="w-4 h-4" /> Fournisseurs & Commandes
          </button>
        </div>

        {/* Action Button */}
        {activeSubTab === 'stocks' ? (
          <button
            onClick={openAddStock}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter un Article
          </button>
        ) : (
          <button
            onClick={openAddSupplier}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau Fournisseur
          </button>
        )}
      </div>

      {/* Filter and Search Box */}
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

      {/* SUB-TAB 1: STOCKS */}
      {activeSubTab === 'stocks' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            {filteredStocks.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">Aucun ingrédient ou article de stock enregistré.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-6">Ingrédient / Article</th>
                    <th className="py-3 px-6 text-center">Quantité Actuelle</th>
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
                        </td>
                        <td className="py-3.5 px-6 text-center font-mono font-bold text-slate-900">
                          {s.quantity} {s.unit}
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
      )}

      {/* SUB-TAB 2: SUPPLIERS */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-3xs">
              Aucun fournisseur enregistré.
            </div>
          ) : (
            filteredSuppliers.map((sup) => (
              <div key={sup.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-3xs text-left relative overflow-hidden group">
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${sup.paymentStatus === 'paye' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">{sup.name}</h4>
                    {sup.contactName && <p className="text-xs text-slate-400">Contact: {sup.contactName}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    sup.paymentStatus === 'paye'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {sup.paymentStatus === 'paye' ? 'Payé' : 'À payer'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-50 pt-3 mt-3">
                  {sup.phone && <p>📞 {sup.phone}</p>}
                  {sup.email && <p>✉️ {sup.email}</p>}
                  {sup.contractDate && <p>📅 Échéance: <span className="font-mono text-slate-700 font-semibold">{sup.contractDate}</span></p>}
                  
                  <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-2 text-slate-800">
                    <span className="font-medium text-slate-400">Montant dû :</span>
                    <span className="font-mono font-black text-red-600">{formatAr(sup.amountDue)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 mt-4 border-t border-slate-50 pt-2">
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
            ))
          )}
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
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Quantité Initiale
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Montant dû
                  </label>
                  <input
                    type="number"
                    value={amountDue}
                    onChange={(e) => setAmountDue(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Date d'Échéance / Contrat
                  </label>
                  <input
                    type="date"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Statut du paiement
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'paye', label: 'Déjà payé', color: 'border-emerald-200 text-emerald-700 bg-emerald-50/40' },
                    { value: 'en_attente', label: 'En attente / Dû', color: 'border-rose-200 text-rose-700 bg-rose-50/40' },
                  ].map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setPaymentStatus(st.value)}
                      className={`py-2 px-1 border rounded-xl text-xs font-semibold text-center cursor-pointer transition-all ${
                        paymentStatus === st.value
                          ? `${st.color} ring-1 ring-offset-1 ring-red-500`
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

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
    </div>
  );
}
