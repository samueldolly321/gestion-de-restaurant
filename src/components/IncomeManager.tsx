import React, { useState } from 'react';
import { Income, Order } from '../types.ts';
import { Search, Plus, Edit2, Trash2, X, TrendingUp, Wallet, Calendar, Image as ImageIcon, ShoppingBag, Lock } from 'lucide-react';
import { usePagination, Pagination } from './Pagination.tsx';

// Catégories de rentrées d'argent.
const INCOME_CATEGORIES: { value: string; label: string }[] = [
  { value: 'vente', label: 'Vente / Addition' },
  { value: 'evenement', label: 'Événement / Location' },
  { value: 'subvention', label: 'Subvention / Aide' },
  { value: 'remboursement', label: 'Remboursement' },
  { value: 'pourboire', label: 'Pourboire' },
  { value: 'autre', label: 'Autre' },
];

// Moyens de paiement (identiques aux additions).
const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'especes', label: '💵 Espèces' },
  { value: 'carte_visa', label: '💳 Carte VISA' },
  { value: 'mvola', label: '🟡 Mvola' },
  { value: 'orange_money', label: '🟠 Orange Money' },
  { value: 'airtel_money', label: '🔴 Airtel Money' },
  { value: 'virement', label: '🏦 Virement' },
  { value: 'autre', label: '📋 Autre' },
];

interface IncomeManagerProps {
  incomes: Income[];
  orders: Order[];
  onAddIncome: (formData: any) => Promise<void>;
  onEditIncome: (id: number, formData: any) => Promise<void>;
  onDeleteIncome: (id: number) => Promise<void>;
}

export default function IncomeManager({ incomes, orders, onAddIncome, onEditIncome, onDeleteIncome }: IncomeManagerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Form states
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('autre');
  const [amount, setAmount] = useState(0);
  const [source, setSource] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [incomeDate, setIncomeDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  const formatAr = (value: number) =>
    new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(value).replace('MGA', 'Ar').trim();

  const todayIso = () => new Date().toISOString().split('T')[0];
  const catLabel = (c: string) => INCOME_CATEGORIES.find((x) => x.value === c)?.label || c;
  const payLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m;

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const openAddModal = () => {
    setEditing(null);
    setLabel('');
    setCategory('autre');
    setAmount(0);
    setSource('');
    setPaymentMethod('especes');
    setIncomeDate(todayIso());
    setImageUrl('');
    setNotes('');
    setIsOpen(true);
  };

  const openEditModal = (inc: Income) => {
    setEditing(inc);
    setLabel(inc.label);
    setCategory(inc.category);
    setAmount(inc.amount);
    setSource(inc.source || '');
    setPaymentMethod(inc.paymentMethod);
    setIncomeDate(inc.incomeDate || todayIso());
    setImageUrl(inc.imageUrl || '');
    setNotes(inc.notes || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      label,
      category,
      amount: Number(amount),
      source: source || null,
      paymentMethod,
      incomeDate: incomeDate || null,
      imageUrl: imageUrl || null,
      notes: notes || null,
    };
    if (editing) await onEditIncome(editing.id, payload);
    else await onAddIncome(payload);
    setIsOpen(false);
  };

  // Additions payées → rentrées automatiques (lecture seule ici).
  const autoRows = orders
    .filter((o) => o.status === 'paye')
    .map((o) => ({
      key: `order_${o.id}`,
      auto: true as const,
      label: `Addition Table #${o.tableNumber}`,
      category: 'vente',
      amount: o.totalAmount || 0,
      source: o.serverName || '—',
      paymentMethod: o.paymentMethod,
      date: (o.createdAt || '').slice(0, 10),
      imageUrl: null as string | null,
      notes: null as string | null,
      raw: null as Income | null,
    }));

  const manualRows = incomes.map((i) => ({
    key: `inc_${i.id}`,
    auto: false as const,
    label: i.label,
    category: i.category,
    amount: i.amount || 0,
    source: i.source || '—',
    paymentMethod: i.paymentMethod,
    date: i.incomeDate || (i.createdAt || '').slice(0, 10),
    imageUrl: i.imageUrl,
    notes: i.notes,
    raw: i,
  }));

  const allRows = [...autoRows, ...manualRows]
    .filter((r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.source.toLowerCase().includes(search.toLowerCase()) ||
      catLabel(r.category).toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Pagination (20 par page).
  const pg = usePagination(allRows, 20);

  // Totaux
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const inMonth = (d: string) => (d || '').slice(0, 7) === monthPrefix;
  const totalMonth = allRows.filter((r) => inMonth(r.date)).reduce((s, r) => s + r.amount, 0);
  const totalAuto = autoRows.reduce((s, r) => s + r.amount, 0);
  const totalManual = manualRows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6 text-left">
      {/* Totaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rentrées — Ce mois</p>
            <h4 className="font-display font-black text-xl text-emerald-700">{formatAr(totalMonth)}</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Additions payées (auto)</p>
            <h4 className="font-display font-black text-xl text-slate-800">{formatAr(totalAuto)}</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Autres rentrées</p>
            <h4 className="font-display font-black text-xl text-slate-800">{formatAr(totalManual)}</h4>
          </div>
        </div>
      </div>

      {/* Recherche + action */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher (libellé, origine, catégorie)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Ajouter une rentrée
        </button>
      </div>

      {/* Liste */}
      {allRows.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 shadow-3xs">
          <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs">Aucune rentrée d'argent pour l'instant.</p>
          <p className="text-[10px] text-slate-400 mt-1">Les additions payées apparaissent ici automatiquement.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Libellé / Origine</th>
                  <th className="py-3 px-6">Catégorie</th>
                  <th className="py-3 px-6">Paiement</th>
                  <th className="py-3 px-6 text-right">Montant</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pg.pageItems.map((r) => (
                  <tr key={r.key} className={`hover:bg-slate-50/60 transition-colors ${r.auto ? 'bg-emerald-50/20' : ''}`}>
                    <td className="py-4 px-6 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.date || '—'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        {r.label}
                        {r.auto && <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold uppercase">Addition auto</span>}
                      </p>
                      {r.source && r.source !== '—' && <p className="text-[10px] text-slate-400 mt-0.5">{r.source}</p>}
                      {r.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic">{r.notes}</p>}
                      {r.imageUrl && (
                        <img src={r.imageUrl} alt="Justificatif" onClick={() => setPreview(r.imageUrl)} className="h-10 w-10 object-cover rounded-lg border border-slate-200 cursor-zoom-in mt-1" />
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold">{catLabel(r.category)}</span>
                    </td>
                    <td className="py-4 px-6 text-[10px] text-slate-600">{payLabel(r.paymentMethod)}</td>
                    <td className="py-4 px-6 text-xs font-mono font-black text-emerald-600 text-right">{formatAr(r.amount)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-1.5">
                        {r.auto ? (
                          <span className="text-slate-300" title="Rentrée automatique (issue d'une addition payée) — modifiable dans l'onglet Tables & Addition">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <>
                            <button onClick={() => r.raw && openEditModal(r.raw)} className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all cursor-pointer" title="Modifier">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { if (r.raw && confirm(`Supprimer la rentrée « ${r.label} » ?`)) onDeleteIncome(r.raw.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4">
            <Pagination page={pg.page} totalPages={pg.totalPages} total={pg.total} rangeStart={pg.rangeStart} rangeEnd={pg.rangeEnd} onPageChange={pg.setPage} />
          </div>
        </div>
      )}

      {/* Aperçu plein écran */}
      {preview && (
        <div onClick={() => setPreview(null)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-[60] cursor-zoom-out">
          <img src={preview} alt="Justificatif" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Modale ajout / édition */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative text-left max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsOpen(false)} className="sticky top-0 float-right -mr-1 p-1.5 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer z-10">
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-black text-slate-800 text-base mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              {editing ? 'Modifier la rentrée' : 'Nouvelle rentrée d\'argent'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Libellé *</label>
                <input type="text" required value={label} onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Ex. Location salle, Événement privé..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Catégorie</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer">
                    {INCOME_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Montant (Ar) *</label>
                  <input type="number" required min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Origine</label>
                  <input type="text" value={source} onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    placeholder="Ex. Client X, Mairie..." />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Moyen de paiement</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer">
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                <input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono" />
              </div>

              {/* Justificatif */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Justificatif / reçu (facultatif)</label>
                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-36 flex items-center justify-center">
                    <img src={imageUrl} alt="Aperçu" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => setImageUrl('')} className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-500 flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> Retirer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => document.getElementById('income-file-input')?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[110px]">
                    <input id="income-file-input" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    <div className="p-3 bg-white rounded-2xl shadow-3xs border border-slate-100 text-slate-400"><ImageIcon className="w-5 h-5" /></div>
                    <span className="text-xs font-semibold text-slate-700">Importer un justificatif</span>
                    <span className="text-[10px] text-slate-400">Cliquez pour parcourir</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes (facultatif)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                  placeholder="Détails..." />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl text-xs transition-colors cursor-pointer border border-slate-100">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer">{editing ? 'Enregistrer' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
