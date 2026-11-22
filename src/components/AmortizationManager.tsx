import React, { useEffect, useMemo, useState } from 'react';
import { PiggyBank, Target, CalendarClock, TrendingUp, TrendingDown, Save, Info, CheckCircle2, AlertTriangle, Armchair } from 'lucide-react';
import { Order, Expense, Income, Personnel, Asset } from '../types.ts';

interface AmortizationManagerProps {
  orders: Order[];
  expenses: Expense[];
  incomes: Income[];
  personnel: Personnel[];
  assets: Asset[];
  initialInvestment: number | null;
  openingDate: string | null;
  canEdit: boolean; // super admin / gérant
  onSave: (data: { initialInvestment: number | null; openingDate: string | null }) => Promise<void>;
}

type Basis = 'all' | 'last3' | 'manual';

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
  orders, expenses, incomes, personnel, assets, initialInvestment, openingDate, canEdit, onSave,
}: AmortizationManagerProps) {
  const [investmentInput, setInvestmentInput] = useState(initialInvestment != null ? String(initialInvestment) : '');
  const [dateInput, setDateInput] = useState(openingDate || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [basis, setBasis] = useState<Basis>('all');
  const [manualProfit, setManualProfit] = useState('');

  useEffect(() => { setInvestmentInput(initialInvestment != null ? String(initialInvestment) : ''); }, [initialInvestment]);
  useEffect(() => { setDateInput(openingDate || ''); }, [openingDate]);

  const investment = initialInvestment || 0;
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        initialInvestment: investmentInput.trim() === '' ? null : Number(investmentInput),
        openingDate: dateInput || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
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
      {/* Paramètres : fond de base + date d'ouverture */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-3xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600"><PiggyBank className="w-5 h-5" /></div>
          <div>
            <h3 className="font-display font-bold text-slate-900">Fond de base investi</h3>
            <p className="text-xs text-slate-400">Montant de départ pour créer le restaurant (travaux, matériel, stock initial, caution…)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <label className="block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fond de base (Ar)</span>
            <input
              type="number" min="0" step="1" disabled={!canEdit}
              value={investmentInput} onChange={(e) => setInvestmentInput(e.target.value)}
              placeholder="ex. 50000000"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date d'ouverture</span>
            <input
              type="date" disabled={!canEdit}
              value={dateInput} onChange={(e) => setDateInput(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50"
            />
          </label>
          {canEdit ? (
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
            </button>
          ) : (
            <p className="text-xs text-slate-400">Seuls le Super Admin et le Gérant peuvent modifier ces valeurs.</p>
          )}
        </div>
        {assetsValue > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Armchair className="w-3.5 h-3.5 text-lime-600" />
            Valeur des biens & matériel enregistrés : <span className="font-bold font-mono">{formatAr(assetsValue)}</span>
            {canEdit && (
              <button type="button" onClick={() => setInvestmentInput(String(Math.round(assetsValue)))}
                className="ml-1 px-2 py-0.5 rounded-lg bg-lime-50 border border-lime-100 text-lime-700 font-bold cursor-pointer">
                Utiliser ce montant
              </button>
            )}
          </div>
        )}
        {!openingDate && (
          <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Sans date d'ouverture, le calcul démarre au mois de la plus ancienne donnée financière.
          </p>
        )}
      </form>

      {investment <= 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center text-sm text-slate-400">
          Renseignez le fond de base investi pour calculer en combien de mois il sera amorti.
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
