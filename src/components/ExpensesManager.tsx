import React, { useState } from 'react';
import { Expense } from '../types.ts';
import { Search, Plus, Edit2, Trash2, X, Receipt, TrendingDown, Calendar, FileText, Image as ImageIcon } from 'lucide-react';

// Catégories de dépenses diverses (loyer, charges, achats...).
const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'loyer', label: 'Loyer' },
  { value: 'electricite', label: 'Électricité (JIRAMA)' },
  { value: 'eau', label: 'Eau (JIRAMA)' },
  { value: 'telecom', label: 'Internet / Télécom' },
  { value: 'entretien', label: 'Entretien / Réparations' },
  { value: 'fournitures', label: 'Fournitures / Achats divers' },
  { value: 'taxes', label: 'Taxes & Impôts' },
  { value: 'transport', label: 'Transport / Carburant' },
  { value: 'divers', label: 'Divers' },
];

interface ExpensesManagerProps {
  expenses: Expense[];
  onAddExpense: (formData: any) => Promise<void>;
  onEditExpense: (id: number, formData: any) => Promise<void>;
  onDeleteExpense: (id: number) => Promise<void>;
}

export default function ExpensesManager({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: ExpensesManagerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // aperçu plein écran de la facture

  // Form states
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('loyer');
  const [amount, setAmount] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  const formatAr = (value: number) =>
    new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace('MGA', 'Ar')
      .trim();

  const todayIso = () => new Date().toISOString().split('T')[0];

  const getCategoryLabel = (c: string) => EXPENSE_CATEGORIES.find((x) => x.value === c)?.label || c;

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) readFile(file);
  };

  const openAddModal = () => {
    setEditing(null);
    setLabel('');
    setCategory('loyer');
    setAmount(0);
    setInvoiceNumber('');
    setOrigin('');
    setExpenseDate(todayIso());
    setImageUrl('');
    setNotes('');
    setIsOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditing(exp);
    setLabel(exp.label);
    setCategory(exp.category);
    setAmount(exp.amount);
    setInvoiceNumber(exp.invoiceNumber || '');
    setOrigin(exp.origin || '');
    setExpenseDate(exp.expenseDate || todayIso());
    setImageUrl(exp.imageUrl || '');
    setNotes(exp.notes || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      label,
      category,
      amount: Number(amount),
      invoiceNumber: invoiceNumber || null,
      origin: origin || null,
      expenseDate: expenseDate || null,
      imageUrl: imageUrl || null,
      notes: notes || null,
    };
    if (editing) {
      await onEditExpense(editing.id, payload);
    } else {
      await onAddExpense(payload);
    }
    setIsOpen(false);
  };

  const filtered = expenses.filter(
    (e) =>
      e.label.toLowerCase().includes(search.toLowerCase()) ||
      (e.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.origin || '').toLowerCase().includes(search.toLowerCase()) ||
      getCategoryLabel(e.category).toLowerCase().includes(search.toLowerCase())
  );

  // Totaux
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const totalAll = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const totalMonth = expenses
    .filter((e) => (e.expenseDate || e.createdAt || '').slice(0, 7) === currentMonthStr)
    .reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Totaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dépenses diverses — Ce mois</p>
            <h4 className="font-display font-black text-xl text-rose-700">{formatAr(totalMonth)}</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total affiché ({filtered.length})</p>
            <h4 className="font-display font-black text-xl text-slate-800">{formatAr(totalAll)}</h4>
          </div>
        </div>
      </div>

      {/* Recherche + action */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher (libellé, n° facture, origine)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Ajouter une dépense
        </button>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 shadow-3xs">
          <Receipt className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs">Aucune dépense enregistrée.</p>
          <p className="text-[10px] text-slate-400 mt-1">Loyer, électricité, eau, achats divers... avec photo de la facture.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Facture</th>
                  <th className="py-3 px-6">Libellé / Origine</th>
                  <th className="py-3 px-6">Catégorie</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6 text-right">Montant</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      {exp.imageUrl ? (
                        <img
                          src={exp.imageUrl}
                          alt="Facture"
                          onClick={() => setPreview(exp.imageUrl)}
                          className="h-12 w-12 object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-800 text-xs">{exp.label}</p>
                      {exp.invoiceNumber && <p className="text-[10px] text-slate-500 font-mono mt-0.5">Facture n° {exp.invoiceNumber}</p>}
                      {exp.origin && <p className="text-[10px] text-slate-400 mt-0.5">{exp.origin}</p>}
                      {exp.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic">{exp.notes}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold">
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {exp.expenseDate || '—'}</span>
                    </td>
                    <td className="py-4 px-6 text-xs font-mono font-black text-rose-600 text-right">
                      {formatAr(exp.amount || 0)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer la dépense « ${exp.label} » ?`)) onDeleteExpense(exp.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Supprimer"
                        >
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
      )}

      {/* Aperçu plein écran de la facture */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-[60] cursor-zoom-out"
        >
          <img src={preview} alt="Facture" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* Modale ajout / édition */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-black text-slate-800 text-base mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-600" />
              {editing ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Libellé *</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Ex. Loyer juillet, Facture JIRAMA..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Montant (Ar) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">N° de facture</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
                    placeholder="Ex. FAC-2026-014"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Origine facture</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    placeholder="Ex. JIRAMA, Boucherie..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Date de la dépense</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                />
              </div>

              {/* Photo de la facture */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Photo de la facture (glissez ou cliquez)</label>
                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-40 flex items-center justify-center">
                    <img src={imageUrl} alt="Aperçu facture" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Retirer la photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('expense-file-input')?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[120px]"
                  >
                    <input id="expense-file-input" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    <div className="p-3 bg-white rounded-2xl shadow-3xs border border-slate-100 text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Importer la photo de la facture</span>
                    <span className="text-[10px] text-slate-400">Glissez-déposez ou cliquez pour parcourir</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes (facultatif)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                  placeholder="Détails, référence..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl text-xs transition-colors cursor-pointer border border-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {editing ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
