import React, { useEffect, useMemo, useState } from 'react';
import { PiggyBank, Target, CalendarClock, TrendingUp, TrendingDown, Save, Info, CheckCircle2, AlertTriangle, Armchair, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Order, Expense, Income, Personnel, Asset, InvestmentItem } from '../types.ts';

interface AmortizationManagerProps {
  orders: Order[];
  expenses: Expense[];
  incomes: Income[];
  personnel: Personnel[];
  assets: Asset[];
  investmentItems: InvestmentItem[];
  openingDate: string | null;
  canEdit: boolean; // super admin / gérant
  onSaveOpeningDate: (openingDate: string | null) => Promise<boolean>;
  onAddItem: (data: Partial<InvestmentItem>) => Promise<boolean>;
  onEditItem: (id: number, data: Partial<InvestmentItem>) => Promise<boolean>;
  onDeleteItem: (id: number) => Promise<boolean>;
}

type Basis = 'all' | 'last3' | 'manual';

export const INVESTMENT_CATEGORY_LABELS: Record<string, string> = {
  travaux: 'Travaux & aménagement',
  equipement: 'Équipement de cuisine',
  mobilier: 'Mobilier',
  stock_initial: 'Stock initial',
  caution_loyer: 'Caution & loyers d\'avance',
  administratif: 'Frais administratifs & licences',
  decoration: 'Décoration & enseigne',
  vehicule: 'Véhicule',
  tresorerie: 'Trésorerie de départ',
  autre: 'Autre',
};

type ItemForm = { label: string; category: string; amount: string; investDate: string; notes: string };
const EMPTY_FORM: ItemForm = { label: '', category: 'travaux', amount: '', investDate: '', notes: '' };

const MONTH_NAMES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const formatAr = (amount: number) =>
  new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(Math.round(amount)).replace('MGA', 'Ar').trim();

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};
const toMonth = (s: string | null | undefined) => {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : null;
  return monthKey(d);
};
const addMonths = (key: string, n: number) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
};

export default function AmortizationManager({
  orders, expenses, incomes, personnel, assets, investmentItems, openingDate, canEdit,
  onSaveOpeningDate, onAddItem, onEditItem, onDeleteItem,
}: AmortizationManagerProps) {
  const [dateInput, setDateInput] = useState(openingDate || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [basis, setBasis] = useState<Basis>('all');
  const [manualProfit, setManualProfit] = useState('');
  // Formulaire poste : null = fermé, 'new' = ajout, sinon id du poste modifié
  const [editing, setEditing] = useState<null | 'new' | number>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => { setDateInput(openingDate || ''); }, [openingDate]);

  const investment = investmentItems.reduce((s, it) => s + (it.amount || 0), 0);
  const sortedItems = useMemo(
    () => [...investmentItems].sort((a, b) => (a.investDate || a.createdAt || '').localeCompare(b.investDate || b.createdAt || '')),
    [investmentItems]
  );
  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    investmentItems.forEach((it) => { m[it.category] = (m[it.category] || 0) + (it.amount || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [investmentItems]);

  const openNew = (prefill?: Partial<ItemForm>) => {
    setForm({ ...EMPTY_FORM, ...prefill });
    setFormError(null);
    setEditing('new');
  };
  const openEdit = (it: InvestmentItem) => {
    setForm({ label: it.label, category: it.category, amount: String(it.amount), investDate: it.investDate || '', notes: it.notes || '' });
    setFormError(null);
    setEditing(it.id);
  };
  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) return setFormError('Le libellé est obligatoire.');
    const amount = Number(form.amount);
    if (form.amount.trim() === '' || !Number.isFinite(amount) || amount < 0) return setFormError('Montant invalide.');
    const payload = { label: form.label.trim(), category: form.category, amount, investDate: form.investDate || null, notes: form.notes.trim() || null };
    setSubmitting(true);
    const ok = editing === 'new' ? await onAddItem(payload) : await onEditItem(editing as number, payload);
    setSubmitting(false);
    if (ok) setEditing(null);
  };
  const assetsValue = assets.reduce((s, a) => s + (a.purchaseValue || 0) * (a.quantity || 1), 0);

  // --- Bénéfice net mois par mois depuis l'ouverture ---
  // Bénéfice = (additions payées + rentrées) − (dépenses diverses + salaires). Même logique que le tableau de bord.
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = monthKey(now);

    const paidOrders = orders.filter((o) => o.status === 'paye');
    let startMonth = toMonth(openingDate);
    if (!startMonth) {
      // Pas de date d'ouverture : on part de la plus ancienne donnée financière.
      const all = [
        ...paidOrders.map((o) => toMonth(o.createdAt)),
        ...expenses.map((e) => toMonth(e.expenseDate || e.createdAt)),
        ...incomes.map((i) => toMonth(i.incomeDate || i.createdAt)),
      ].filter(Boolean) as string[];
      startMonth = all.length ? all.sort()[0] : currentMonth;
    }
    if (startMonth > currentMonth) startMonth = currentMonth;

    const daysInCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentFraction = now.getDate() / daysInCurrent;

    const rows: { key: string; revenue: number; outflow: number; payroll: number; net: number; cumulative: number; partial: boolean }[] = [];
    let cumulative = 0;
    for (let key = startMonth; key <= currentMonth; key = addMonths(key, 1)) {
      const partial = key === currentMonth;
      const revenue =
        paidOrders.filter((o) => toMonth(o.createdAt) === key).reduce((s, o) => s + (o.totalAmount || 0), 0) +
        incomes.filter((i) => toMonth(i.incomeDate || i.createdAt) === key).reduce((s, i) => s + (i.amount || 0), 0);
      const misc = expenses.filter((e) => toMonth(e.expenseDate || e.createdAt) === key).reduce((s, e) => s + (e.amount || 0), 0);
      // Salaires : employés déjà embauchés ce mois-là ; mois en cours au prorata des jours écoulés.
      const fullPayroll = personnel
        .filter((p) => { const h = toMonth(p.hireDate); return !h || h <= key; })
        .reduce((s, p) => s + (p.salary || 0), 0);
      const payroll = partial ? fullPayroll * currentFraction : fullPayroll;
      const outflow = misc + payroll;
      const net = revenue - outflow;
      cumulative += net;
      rows.push({ key, revenue, outflow, payroll, net, cumulative, partial });
    }

    const completed = rows.filter((r) => !r.partial);
    const avgAll = completed.length
      ? completed.reduce((s, r) => s + r.net, 0) / completed.length
      : (rows.length ? rows[rows.length - 1].net / Math.max(currentFraction, 0.01) : 0); // extrapolation du mois en cours
    const last3 = completed.slice(-3);
    const avgLast3 = last3.length ? last3.reduce((s, r) => s + r.net, 0) / last3.length : avgAll;

    // Mois où le cumul a dépassé le fond de base (si déjà atteint).
    const breakEvenIdx = investment > 0 ? rows.findIndex((r) => r.cumulative >= investment) : -1;
    const monthsElapsed = completed.length + currentFraction;

    return { rows, cumulative, avgAll, avgLast3, breakEvenIdx, monthsElapsed, completedCount: completed.length, currentMonth };
  }, [orders, expenses, incomes, personnel, openingDate, investment]);

  const monthlyProfit = basis === 'manual'
    ? (Number(manualProfit) || 0)
    : basis === 'last3' ? stats.avgLast3 : stats.avgAll;

  const remaining = Math.max(0, investment - stats.cumulative);
  const progress = investment > 0 ? Math.min(100, Math.max(0, (stats.cumulative / investment) * 100)) : 0;
  const alreadyAmortized = investment > 0 && stats.cumulative >= investment;
  const monthsRemaining = !alreadyAmortized && monthlyProfit > 0 ? remaining / monthlyProfit : null;
  const totalMonths = alreadyAmortized
    ? stats.breakEvenIdx + 1
    : monthsRemaining != null ? stats.monthsElapsed + monthsRemaining : null;
  const estimatedDate = monthsRemaining != null ? addMonths(stats.currentMonth, Math.ceil(monthsRemaining)) : null;

  const handleSaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSaveOpeningDate(dateInput || null);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const fmtMonths = (n: number) => {
    const m = Math.ceil(n);
    const years = Math.floor(m / 12);
    const rest = m % 12;
    const parts = [];
    if (years) parts.push(`${years} an${years > 1 ? 's' : ''}`);
    if (rest) parts.push(`${rest} mois`);
    return `${m} mois${years ? ` (${parts.join(' ')})` : ''}`;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Fond de base : liste des postes d'investissement */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600"><PiggyBank className="w-5 h-5" /></div>
            <div>
              <h3 className="font-display font-bold text-slate-900">Fond de base investi</h3>
              <p className="text-xs text-slate-400">Détail de l'investissement de départ (travaux, équipement, stock initial, caution…)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
              <p className="font-display font-black text-xl text-emerald-700">{formatAr(investment)}</p>
            </div>
            {canEdit && (
              <button type="button" onClick={() => openNew()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" /> Ajouter un poste
              </button>
            )}
          </div>
        </div>

        {/* Formulaire ajout / modification */}
        {editing !== null && (
          <form onSubmit={submitItem} className="px-6 py-5 border-b border-slate-100 bg-emerald-50/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-slate-800">{editing === 'new' ? 'Nouveau poste' : 'Modifier le poste'}</h4>
              <button type="button" onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Fermer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="block md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Libellé *</span>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} autoFocus
                  placeholder="ex. Travaux de la cuisine"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catégorie</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
                  {Object.entries(INVESTMENT_CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant (Ar) *</span>
                <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="ex. 12000000"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono bg-white" />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</span>
                <input type="date" value={form.investDate} onChange={(e) => setForm({ ...form, investDate: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
              </label>
              <label className="block md:col-span-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</span>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Fournisseur, n° de facture, détail…"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
              </label>
            </div>
            {formError && <p className="mt-2 text-xs font-semibold text-rose-600">{formError}</p>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 cursor-pointer">Annuler</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60">
                <Save className="w-4 h-4" /> {submitting ? 'Enregistrement…' : editing === 'new' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        {/* Liste des postes */}
        {sortedItems.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Aucun poste pour l'instant.{canEdit ? ' Cliquez sur « Ajouter un poste » pour détailler votre fond de base.' : ''}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Poste</th>
                  <th className="py-3 px-6">Catégorie</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6 text-right">Montant</th>
                  <th className="py-3 px-6 text-right">Part</th>
                  {canEdit && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/60 text-xs">
                    <td className="py-3 px-6">
                      <p className="font-bold text-slate-800">{it.label}</p>
                      {it.notes && <p className="text-[11px] text-slate-400 mt-0.5">{it.notes}</p>}
                    </td>
                    <td className="py-3 px-6 text-slate-500">{INVESTMENT_CATEGORY_LABELS[it.category] || it.category}</td>
                    <td className="py-3 px-6 font-mono text-slate-400">{it.investDate ? it.investDate.split('-').reverse().join('/') : '—'}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-slate-900">{formatAr(it.amount)}</td>
                    <td className="py-3 px-6 text-right font-mono text-slate-400">{investment > 0 ? ((it.amount / investment) * 100).toFixed(1) : '0.0'} %</td>
                    {canEdit && (
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        {confirmDeleteId === it.id ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[11px] text-rose-600 font-semibold mr-1">Supprimer ?</span>
                            <button type="button" onClick={async () => { await onDeleteItem(it.id); setConfirmDeleteId(null); }}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer">Oui</button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer">Non</button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-1">
                            <button type="button" onClick={() => openEdit(it)} title="Modifier"
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setConfirmDeleteId(it.id)} title="Supprimer"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {byCategory.length > 1 && (
                <tfoot>
                  <tr className="bg-slate-50/60 border-t border-slate-100">
                    <td colSpan={canEdit ? 6 : 5} className="py-3 px-6">
                      <div className="flex flex-wrap gap-2">
                        {byCategory.map(([cat, total]) => (
                          <span key={cat} className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600">
                            {INVESTMENT_CATEGORY_LABELS[cat] || cat} : <b className="font-mono">{formatAr(total)}</b>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {canEdit && assetsValue > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Armchair className="w-3.5 h-3.5 text-lime-600" />
            Biens & matériel enregistrés : <span className="font-bold font-mono">{formatAr(assetsValue)}</span>
            <button type="button" onClick={() => openNew({ label: 'Biens & matériel', category: 'equipement', amount: String(Math.round(assetsValue)) })}
              className="ml-1 px-2 py-0.5 rounded-lg bg-lime-50 border border-lime-100 text-lime-700 font-bold cursor-pointer">
              Ajouter comme poste
            </button>
          </div>
        )}
      </div>

      {/* Date d'ouverture */}
      <form onSubmit={handleSaveDate} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-3xs flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date d'ouverture du restaurant</span>
          <input type="date" disabled={!canEdit} value={dateInput} onChange={(e) => setDateInput(e.target.value)}
            className="mt-1 block px-3 py-2 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50" />
        </label>
        {canEdit && (
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer la date'}
          </button>
        )}
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-1 min-w-[220px]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {openingDate
            ? 'Le bénéfice est cumulé à partir de ce mois-ci.'
            : "Sans date d'ouverture, le calcul démarre au mois de la plus ancienne donnée financière."}
          {!canEdit && ' Seuls le Super Admin et le Gérant peuvent modifier le fond de base.'}
        </p>
      </form>

      {investment <= 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center text-sm text-slate-400">
          Ajoutez les postes de votre fond de base pour calculer en combien de mois il sera amorti.
        </div>
      ) : (
        <>
          {/* Résultat principal */}
          <div className={`rounded-3xl p-6 border ${alreadyAmortized ? 'bg-emerald-50 border-emerald-200' : monthsRemaining == null ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${alreadyAmortized ? 'bg-emerald-100 text-emerald-700' : monthsRemaining == null ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-600'}`}>
                {alreadyAmortized ? <CheckCircle2 className="w-6 h-6" /> : monthsRemaining == null ? <AlertTriangle className="w-6 h-6" /> : <Target className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Durée d'amortissement du fond de base</p>
                {alreadyAmortized ? (
                  <h2 className="font-display font-black text-2xl text-emerald-700 mt-1">
                    Amorti en {fmtMonths(totalMonths!)} — atteint en {monthLabel(stats.rows[stats.breakEvenIdx].key)} 🎉
                  </h2>
                ) : monthsRemaining != null ? (
                  <>
                    <h2 className="font-display font-black text-2xl text-slate-900 mt-1">
                      ≈ {fmtMonths(totalMonths!)} au total
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Encore <b>{fmtMonths(monthsRemaining)}</b> — amortissement estimé vers <b>{monthLabel(estimatedDate!)}</b>
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="font-display font-black text-2xl text-rose-700 mt-1">Non amortissable au rythme actuel</h2>
                    <p className="text-sm text-rose-700/80 mt-1">Le bénéfice mensuel retenu est nul ou négatif : les dépenses dépassent les entrées.</p>
                  </>
                )}
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Récupéré : <b className="font-mono">{formatAr(Math.max(0, stats.cumulative))}</b></span>
                <span className="font-bold">{progress.toFixed(1)} %</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* Indicateurs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Fond de base', value: formatAr(investment), icon: PiggyBank, tint: 'text-emerald-600 bg-emerald-50' },
              { label: 'Bénéfice cumulé', value: formatAr(stats.cumulative), icon: stats.cumulative >= 0 ? TrendingUp : TrendingDown, tint: stats.cumulative >= 0 ? 'text-green-600 bg-green-50' : 'text-rose-600 bg-rose-50' },
              { label: 'Reste à récupérer', value: formatAr(remaining), icon: Target, tint: 'text-amber-600 bg-amber-50' },
              { label: 'Bénéfice mensuel retenu', value: formatAr(monthlyProfit), icon: CalendarClock, tint: 'text-indigo-600 bg-indigo-50' },
            ].map(({ label, value, icon: Icon, tint }) => (
              <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${tint}`}><Icon className="w-4 h-4" /></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
                <p className="font-display font-black text-lg text-slate-900 mt-2 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Base de calcul de la projection */}
          {!alreadyAmortized && (
            <div className="bg-white rounded-3xl p-5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Projection basée sur</p>
              <div className="flex flex-wrap gap-2 items-center">
                {([
                  ['all', `Moyenne de tous les mois (${formatAr(stats.avgAll)})`],
                  ['last3', `Moyenne des 3 derniers mois (${formatAr(stats.avgLast3)})`],
                  ['manual', 'Montant estimé manuellement'],
                ] as [Basis, string][]).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setBasis(id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${basis === id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
                {basis === 'manual' && (
                  <input type="number" min="0" value={manualProfit} onChange={(e) => setManualProfit(e.target.value)}
                    placeholder="Bénéfice / mois (Ar)"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono w-48" />
                )}
              </div>
              {stats.completedCount === 0 && basis !== 'manual' && (
                <p className="text-[11px] text-slate-400 mt-2">Aucun mois complet encore : la moyenne est extrapolée à partir du mois en cours.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Détail mensuel */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-display font-bold text-slate-900">Bénéfice net mois par mois</h3>
          <p className="text-xs text-slate-400 mt-0.5">Entrées (additions payées + rentrées) − Sorties (dépenses diverses + salaires). Mois en cours : salaires au prorata.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">Mois</th>
                <th className="py-3 px-6 text-right">Entrées</th>
                <th className="py-3 px-6 text-right">Sorties</th>
                <th className="py-3 px-6 text-right">Bénéfice net</th>
                <th className="py-3 px-6 text-right">Cumul</th>
                {investment > 0 && <th className="py-3 px-6 text-right">Amorti</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...stats.rows].reverse().map((r) => (
                <tr key={r.key} className="hover:bg-slate-50/60 text-xs">
                  <td className="py-3 px-6 font-bold text-slate-800">
                    {monthLabel(r.key)} {r.partial && <span className="ml-1 text-[10px] font-semibold text-amber-600">(en cours)</span>}
                  </td>
                  <td className="py-3 px-6 text-right font-mono text-green-700">{formatAr(r.revenue)}</td>
                  <td className="py-3 px-6 text-right font-mono text-rose-700">{formatAr(r.outflow)}</td>
                  <td className={`py-3 px-6 text-right font-mono font-bold ${r.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatAr(r.net)}</td>
                  <td className="py-3 px-6 text-right font-mono text-slate-700">{formatAr(r.cumulative)}</td>
                  {investment > 0 && (
                    <td className="py-3 px-6 text-right font-mono text-slate-500">
                      {Math.min(100, Math.max(0, (r.cumulative / investment) * 100)).toFixed(1)} %
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
