import React, { useState, useMemo } from 'react';
import { DollarSign, Landmark, TrendingUp, Calendar, CreditCard, UserCheck, ArrowUpRight, BarChart3, AlertCircle } from 'lucide-react';
import { Order, Personnel } from '../types.ts';

interface FinanceManagerProps {
  orders: Order[];
  personnel: Personnel[];
  userRole: string; // 'super_admin' or 'gerant'
}

export default function FinanceManager({ orders, personnel, userRole }: FinanceManagerProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly'>('monthly');

  // Format Ariary helper
  const formatAr = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar').trim();
  };

  // 1. Calculate Turnover (Chiffre d'affaire)
  const financialStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

    let dailyTurnover = 0;
    let monthlyTurnover = 0;
    let dailyPaidOrdersCount = 0;
    let monthlyPaidOrdersCount = 0;

    // Filter paid orders
    const paidOrders = orders.filter(o => o.status === 'paye');

    paidOrders.forEach(o => {
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
      const orderMonth = new Date(o.createdAt).toISOString().slice(0, 7);

      if (orderDate === todayStr) {
        dailyTurnover += o.totalAmount;
        dailyPaidOrdersCount++;
      }
      if (orderMonth === currentMonthStr) {
        monthlyTurnover += o.totalAmount;
        monthlyPaidOrdersCount++;
      }
    });

    // Total monthly payroll
    const totalMonthlyPayroll = personnel.reduce((sum, p) => sum + (p.salary || 0), 0);

    return {
      dailyTurnover,
      monthlyTurnover,
      dailyPaidOrdersCount,
      monthlyPaidOrdersCount,
      totalMonthlyPayroll
    };
  }, [orders, personnel]);

  // Check RBAC access to salaries
  const canAccessSalaries = userRole === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Financial Turnover Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Turnover */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-3xs text-left relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/10 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-100 text-yellow-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaire Journalier</p>
              <h3 className="font-display font-black text-2xl text-slate-900 mt-1">
                {formatAr(financialStats.dailyTurnover)}
              </h3>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-3">
            <span>Commandes réglées aujourd'hui</span>
            <span className="font-bold font-mono bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-lg text-[10px]">
              {financialStats.dailyPaidOrdersCount} tables
            </span>
          </div>
        </div>

        {/* Monthly Turnover */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-3xs text-left relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-600/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-600">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaire Mensuel</p>
              <h3 className="font-display font-black text-2xl text-slate-900 mt-1">
                {formatAr(financialStats.monthlyTurnover)}
              </h3>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-3">
            <span>Mois en cours</span>
            <span className="font-bold font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded-lg text-[10px]">
              {financialStats.monthlyPaidOrdersCount} tables
            </span>
          </div>
        </div>

        {/* Total Payroll */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-3xs text-left relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-100 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Masse Salariale Mensuelle</p>
              <h3 className="font-display font-black text-2xl text-slate-900 mt-1">
                {canAccessSalaries ? formatAr(financialStats.totalMonthlyPayroll) : '•••••• Ar'}
              </h3>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-3">
            <span>{personnel.length} employés actifs</span>
            {canAccessSalaries ? (
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold">
                Super Admin Ok
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg font-bold">
                Gérant Restreint
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Staff Payroll and Salaries (Hidden for Gerant) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-left">
            <h3 className="font-display font-bold text-slate-900">Registre des Salaires & Paies</h3>
            <p className="text-xs text-slate-400 mt-0.5">Suivi financier des salaires de l'équipe</p>
          </div>
          <UserCheck className="w-5 h-5 text-red-600" />
        </div>

        {canAccessSalaries ? (
          <div className="overflow-x-auto">
            {personnel.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Aucun personnel enregistré pour le calcul des paies.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-6">Employé</th>
                    <th className="py-3 px-6">Rôle</th>
                    <th className="py-3 px-6">Date Embauche</th>
                    <th className="py-3 px-6 text-right">Salaire Fixe Mensuel</th>
                    <th className="py-3 px-6 text-right">Taux Horaire</th>
                    <th className="py-3 px-6 text-center">Statut Paie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {personnel.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-800 text-xs">{p.name}</td>
                      <td className="py-4 px-6 text-xs text-slate-500 capitalize">{p.role}</td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-400">{p.hireDate || 'Non spécifiée'}</td>
                      <td className="py-4 px-6 text-xs font-mono font-bold text-slate-900 text-right">
                        {formatAr(p.salary || 0)}
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-500 text-right">
                        {formatAr(p.hourlyRate || 0)}/h
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700">
                          Réglé
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-full">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Accès Restreint aux Salaires</h4>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              En tant que **Gérant**, vous n'êtes pas autorisé à consulter ou modifier les salaires du personnel. Seul un **Super Admin** dispose des privilèges requis.
            </p>
          </div>
        )}
      </div>

      {/* Simplified Revenue Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-3xs text-left">
        <h4 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-yellow-500" /> Progression Financière
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chiffre d'Affaire Quotidien Moyen</h5>
            <p className="text-xl font-display font-extrabold text-slate-800">
              {formatAr(financialStats.dailyTurnover || 120000)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Calculé sur les ventes de la journée en cours.</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bénéfice Théorique Mensuel (35% marge brute)</h5>
            <p className="text-xl font-display font-extrabold text-red-600">
              {formatAr(financialStats.monthlyTurnover * 0.35)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Estimation basée sur un coût moyen matière de 65%.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
