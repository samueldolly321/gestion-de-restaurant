import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Client, Personnel, MenuItem, Order, Expense, Income } from '../types.ts';
import { Landmark, ShoppingBag, Users, Clock, ClipboardList, Utensils, TrendingUp, TrendingDown, Wine } from 'lucide-react';

interface DashboardChartsProps {
  clients: Client[];
  personnel: Personnel[];
  menuItems: MenuItem[];
  orders: Order[];
  expenses: Expense[];
  incomes: Income[];
  userRole: string; // 'super_admin' ou 'gerant'
}

export default function DashboardCharts({ clients, personnel, menuItems, orders, expenses, incomes, userRole }: DashboardChartsProps) {
  // Format Ariary helper
  const formatAr = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar').trim();
  };

  // 1. Calculate Analytics
  const totalRevenue = orders
    .filter((o) => o.status === 'paye')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const activeOrdersCount = orders.filter((o) => o.status !== 'paye').length;
  const totalClientsCount = clients.length;
  const activeStaffCount = personnel.filter((p) => p.status === 'actif').length;

  // --- Sorties d'argent (dépenses) : masse salariale + montants dus aux fournisseurs ---
  // Les chiffres du tableau de bord sont visibles par tous les rôles (super admin ET gérant).
  const canSeeFinances = true;
  void userRole; // le rôle n'est plus utilisé pour masquer les chiffres du dashboard
  const todayStr = new Date().toISOString().split('T')[0];

  const monthlyPayroll = personnel.reduce((sum, p) => sum + (p.salary || 0), 0);

  // Dépenses diverses (loyer, charges, achats, ET commandes fournisseurs payées via la dépense auto) : ce mois-ci et aujourd'hui.
  // NB : les fournisseurs ne sont plus comptés séparément — une commande fournisseur payée devient une dépense diverse (pas de double compte).
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthlyMiscExpenses = expenses
    .filter((e) => (e.expenseDate || e.createdAt || '').slice(0, 7) === currentMonthPrefix)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const dailyMiscExpenses = expenses
    .filter((e) => (e.expenseDate || '').startsWith(todayStr))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Sortie mensuelle = salaires du mois + dépenses diverses (fournisseurs inclus via la dépense auto).
  const monthlyOutflow = monthlyPayroll + monthlyMiscExpenses;
  // Sortie journalière = quote-part quotidienne des salaires (/30) + dépenses diverses du jour.
  const dailyOutflow = Math.round(monthlyPayroll / 30) + dailyMiscExpenses;

  // Entrées d'argent du mois = additions payées ce mois + autres rentrées manuelles ce mois. Bénéfice = entrées − dépenses.
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyOrderRevenue = orders
    .filter((o) => o.status === 'paye' && new Date(o.createdAt).toISOString().slice(0, 7) === currentMonthStr)
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const monthlyOtherIncome = incomes
    .filter((i) => (i.incomeDate || i.createdAt || '').slice(0, 7) === currentMonthStr)
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const monthlyRevenue = monthlyOrderRevenue + monthlyOtherIncome;
  const monthlyProfit = monthlyRevenue - monthlyOutflow;

  // --- Ratios clés (mois en cours) ---
  // Food cost = achats matières = dépenses de catégorie « ingredients » (dont commandes fournisseurs payées).
  const foodCostMonth = expenses
    .filter((e) => e.category === 'ingredients' && (e.expenseDate || e.createdAt || '').slice(0, 7) === currentMonthStr)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const foodCostRatio = monthlyRevenue > 0 ? (foodCostMonth / monthlyRevenue) * 100 : 0;
  const payrollRatio = monthlyRevenue > 0 ? (monthlyPayroll / monthlyRevenue) * 100 : 0;
  const grossMargin = monthlyRevenue - foodCostMonth; // marge brute (après matières)

  // --- Trésorerie : entrées vs sorties sur les 6 derniers mois ---
  const cashflowBase = new Date();
  const cashflowData = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(cashflowBase.getFullYear(), cashflowBase.getMonth() - (5 - idx), 1);
    const key = d.toISOString().slice(0, 7);
    const entrees =
      orders.filter((o) => o.status === 'paye' && new Date(o.createdAt).toISOString().slice(0, 7) === key).reduce((s, o) => s + o.totalAmount, 0) +
      incomes.filter((i) => (i.incomeDate || i.createdAt || '').slice(0, 7) === key).reduce((s, i) => s + (i.amount || 0), 0);
    const sorties =
      expenses.filter((e) => (e.expenseDate || e.createdAt || '').slice(0, 7) === key).reduce((s, e) => s + (e.amount || 0), 0) +
      monthlyPayroll; // salaires : charge mensuelle récurrente estimée
    return { name: d.toLocaleDateString('fr-FR', { month: 'short' }), Entrées: Math.round(entrees), Sorties: Math.round(sorties) };
  });

  const maskAr = (amount: number) => (canSeeFinances ? formatAr(amount) : '•••••• Ar');

  // 2. Order status distribution
  const pendingOrders = orders.filter((o) => o.status === 'en_attente').length;
  const preparingOrders = orders.filter((o) => o.status === 'en_preparation').length;
  const servedOrders = orders.filter((o) => o.status === 'servi').length;
  const paidOrders = orders.filter((o) => o.status === 'paye').length;

  const orderStatusData = [
    { name: 'En attente', value: pendingOrders, color: '#facc15' }, // Yellow
    { name: 'En cuisine', value: preparingOrders, color: '#dc2626' }, // Red
    { name: 'Servi', value: servedOrders, color: '#3b82f6' }, // Blue
    { name: 'Payé', value: paidOrders, color: '#10b981' }, // Green
  ].filter(item => item.value > 0);

  const displayOrderStatusData = orderStatusData.length > 0 ? orderStatusData : [
    { name: 'Aucune commande', value: 1, color: '#e2e8f0' }
  ];

  // 3. Menu categories distribution (regroupe les catégories fines + valeurs legacy)
  const appetizers = menuItems.filter((m) => ['entree', 'entree_chaude', 'entree_froide'].includes(m.category)).length;
  const mainCourses = menuItems.filter((m) => ['plat', 'snack'].includes(m.category)).length;
  const desserts = menuItems.filter((m) => m.category === 'dessert').length;
  const drinks = menuItems.filter((m) => ['boisson', 'boisson_chaude', 'boisson_fraiche', 'boisson_alcoolisee', 'cocktail'].includes(m.category)).length;

  const categoryData = [
    { name: 'Entrées', count: appetizers, color: '#ec4899' }, 
    { name: 'Plats', count: mainCourses, color: '#dc2626' }, // Red
    { name: 'Desserts', count: desserts, color: '#facc15' }, // Yellow
    { name: 'Boissons', count: drinks, color: '#10b981' }, 
  ];

  // --- Meilleures ventes : plats & boissons les plus commandés (toutes commandes) ---
  const isDrinkCat = (c: string) => ['boisson', 'boisson_chaude', 'boisson_fraiche', 'boisson_alcoolisee', 'cocktail'].includes(c);
  const itemStats = new Map<number, { name: string; category: string; qty: number; revenue: number }>();
  orders.forEach((o) => (o.items || []).forEach((it) => {
    const key = it.menuItemId;
    const cur = itemStats.get(key) || { name: it.name || 'Article', category: it.category || '', qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += (it.unitPrice || 0) * it.quantity;
    itemStats.set(key, cur);
  }));
  const allSold = Array.from(itemStats.values());
  const topDishes = allSold.filter((x) => !isDrinkCat(x.category)).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topDrinks = allSold.filter((x) => isDrinkCat(x.category)).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxDishQty = Math.max(1, ...topDishes.map((x) => x.qty));
  const maxDrinkQty = Math.max(1, ...topDrinks.map((x) => x.qty));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono shadow-md">
          <p className="font-semibold">{`${payload[0].name} : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</p>
            <h4 className="font-display font-bold text-base sm:text-lg text-slate-800 truncate">
              {formatAr(totalRevenue)}
            </h4>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-100 shrink-0">
            <ShoppingBag className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tables Actives</p>
            <h4 className="font-display font-bold text-lg text-slate-800">{activeOrdersCount}</h4>
          </div>
        </div>

        {/* Regular Clients */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fidélité Clients</p>
            <h4 className="font-display font-bold text-lg text-slate-800">{totalClientsCount}</h4>
          </div>
        </div>

        {/* Staff on Shift */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-100 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Staff Actif</p>
            <h4 className="font-display font-bold text-lg text-slate-800">{activeStaffCount}</h4>
          </div>
        </div>
      </div>

      {/* Bilan financier du mois : Entrées − Dépenses = Bénéfice */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs text-left">
        <h3 className="font-display font-semibold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
          <Landmark className="w-4 h-4 text-red-600" /> Bilan financier — Mois en cours
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Entrées d'argent */}
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
            <div className="flex items-center gap-2 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Entrées d'argent</span>
            </div>
            <h4 className="font-display font-black text-lg sm:text-xl text-emerald-700 mt-1.5 truncate">{formatAr(monthlyRevenue)}</h4>
            <p className="text-[9px] text-slate-400 mt-0.5">Additions {formatAr(monthlyOrderRevenue)} + autres {formatAr(monthlyOtherIncome)}</p>
          </div>

          {/* Dépenses (sorties d'argent) */}
          <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40">
            <div className="flex items-center gap-2 text-rose-700">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Dépenses (sorties)</span>
            </div>
            <h4 className="font-display font-black text-lg sm:text-xl text-rose-700 mt-1.5 truncate">{maskAr(monthlyOutflow)}</h4>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {canSeeFinances
                ? `Salaires ${formatAr(monthlyPayroll)} + dépenses diverses ${formatAr(monthlyMiscExpenses)} · dont auj. ${formatAr(dailyOutflow)}`
                : 'Salaires + dépenses diverses (réservé au Super Admin)'}
            </p>
          </div>

          {/* Bénéfice = Entrées − Dépenses */}
          <div className={`p-4 rounded-2xl border ${monthlyProfit >= 0 ? 'border-emerald-100 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
            <div className={`flex items-center gap-2 ${monthlyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              <Landmark className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Bénéfice</span>
            </div>
            <h4 className={`font-display font-black text-lg sm:text-xl mt-1.5 truncate ${monthlyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {maskAr(monthlyProfit)}
            </h4>
            <p className="text-[9px] text-slate-400 mt-0.5">Entrées − Dépenses</p>
          </div>
        </div>
      </div>

      {/* Ratios clés + Trésorerie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ratios */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs text-left lg:col-span-1">
          <h3 className="font-display font-semibold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-red-600" /> Ratios clés — Mois
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-semibold">Food cost (matières)</span>
                <span className={`font-mono font-black ${foodCostRatio > 35 ? 'text-rose-600' : 'text-emerald-600'}`}>{foodCostRatio.toFixed(1)} %</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${foodCostRatio > 35 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, foodCostRatio)}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">Cible restauration : ≤ 30-35 %</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-semibold">Masse salariale</span>
                <span className={`font-mono font-black ${payrollRatio > 35 ? 'text-rose-600' : 'text-emerald-600'}`}>{payrollRatio.toFixed(1)} %</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${payrollRatio > 35 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, payrollRatio)}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">Cible : ≤ 30-35 %</p>
            </div>
            <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-semibold">Marge brute (après matières)</span>
              <span className="font-mono font-black text-sm text-emerald-700">{maskAr(grossMargin)}</span>
            </div>
          </div>
        </div>

        {/* Courbe de trésorerie */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col h-[280px] lg:col-span-2">
          <h3 className="font-display font-semibold text-slate-800 text-sm mb-4 text-left flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-red-600" /> Trésorerie — 6 derniers mois (Entrées vs Sorties)
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                  formatter={(value: any) => formatAr(Number(value))}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace', color: '#fff' }}
                />
                <Bar dataKey="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sorties" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Graphical Breakdown Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown Pie */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col h-[280px]">
          <h3 className="font-display font-semibold text-slate-800 text-sm mb-4 text-left flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-red-600" /> État des Commandes
          </h3>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayOrderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {displayOrderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="w-1/2 pl-4 flex flex-col gap-2 justify-center text-left">
              {displayOrderStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                    {item.name !== 'Aucune commande' && (
                      <p className="text-[10px] text-slate-400 font-mono font-medium">
                        {item.value} ({orders.length > 0 ? Math.round((item.value / orders.length) * 100) : 0}%)
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Menu category Bar Chart */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col h-[280px]">
          <h3 className="font-display font-semibold text-slate-800 text-sm mb-4 text-left flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-yellow-500" /> Distribution de la Carte
          </h3>
          <div className="flex-1 min-h-0">
            {menuItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                <Utensils className="w-8 h-8 text-slate-200" />
                <p className="text-xs">Aucun plat enregistré pour l'instant.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Meilleures ventes : plats & boissons les plus commandés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top plats */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs text-left">
          <h3 className="font-display font-semibold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-red-600" /> Plats les plus vendus
          </h3>
          {topDishes.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Aucune vente de plat pour l'instant.</p>
          ) : (
            <div className="space-y-3">
              {topDishes.map((it, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-yellow-400 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">{it.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{it.qty}× · {formatAr(it.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-red-500" style={{ width: `${(it.qty / maxDishQty) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top boissons */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs text-left">
          <h3 className="font-display font-semibold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <Wine className="w-4 h-4 text-yellow-500" /> Boissons les plus vendues
          </h3>
          {topDrinks.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Aucune vente de boisson pour l'instant.</p>
          ) : (
            <div className="space-y-3">
              {topDrinks.map((it, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-yellow-400 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">{it.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{it.qty}× · {formatAr(it.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-yellow-500" style={{ width: `${(it.qty / maxDrinkQty) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
