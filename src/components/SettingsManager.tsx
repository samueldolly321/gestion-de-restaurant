import React, { useState, useEffect } from 'react';
import { Settings, Shield, RefreshCw, Sparkles, Check, Phone, Mail, MapPin, AlertTriangle, Trash2, LifeBuoy } from 'lucide-react';
import { DbUser } from '../types.ts';

interface SettingsManagerProps {
  dbUser: DbUser;
  onUpdateConfig: (updates: {
    restaurantName: string;
    restaurantSlogan: string | null;
    restaurantLogoUrl: string | null;
    restaurantPhone: string | null;
    restaurantAddress: string | null;
    role: string;
  }) => Promise<void>;
  onResetFinancial?: (scope: 'financial' | 'all') => Promise<any>;
  // Contact support affiché sur la page de connexion (réglage global, super admin).
  supportPhone?: string;
  supportEmail?: string;
  onUpdateSupport?: (phone: string, email: string) => Promise<any>;
}

const RESET_KEYWORD = 'REINITIALISER';

export default function SettingsManager({ dbUser, onUpdateConfig, onResetFinancial, supportPhone, supportEmail, onUpdateSupport }: SettingsManagerProps) {
  const [restaurantName, setRestaurantName] = useState(dbUser.restaurantName || 'RestoPilote');
  const [restaurantSlogan, setRestaurantSlogan] = useState(dbUser.restaurantSlogan || '');
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState(dbUser.restaurantLogoUrl || '');
  const [restaurantPhone, setRestaurantPhone] = useState(dbUser.restaurantPhone || '');
  const [restaurantAddress, setRestaurantAddress] = useState(dbUser.restaurantAddress || '');
  const [role, setRole] = useState(dbUser.role || 'super_admin');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Contact support (page de connexion) — réglage global édité par le super admin.
  const [sPhone, setSPhone] = useState(supportPhone || '');
  const [sEmail, setSEmail] = useState(supportEmail || '');
  const [savingSupport, setSavingSupport] = useState(false);
  const [supportSaved, setSupportSaved] = useState(false);
  // Synchronise les champs quand les valeurs (chargées en asynchrone) arrivent.
  useEffect(() => { if (supportPhone !== undefined) setSPhone(supportPhone); }, [supportPhone]);
  useEffect(() => { if (supportEmail !== undefined) setSEmail(supportEmail); }, [supportEmail]);

  const doSaveSupport = async () => {
    if (!onUpdateSupport) return;
    setSavingSupport(true);
    setSupportSaved(false);
    try {
      await onUpdateSupport(sPhone.trim(), sEmail.trim());
      setSupportSaved(true);
      setTimeout(() => setSupportSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSupport(false);
    }
  };

  // Zone de danger : réinitialisation des données.
  const [resetScope, setResetScope] = useState<'financial' | 'all'>('financial'); // financier seul ou toutes les données
  const [resetText, setResetText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetIsError, setResetIsError] = useState(false);

  // Seul le super admin peut modifier les paramètres. Le gérant est en lecture seule.
  const canEdit = dbUser.role === 'super_admin';

  const doReset = async () => {
    if (!onResetFinancial || resetText !== RESET_KEYWORD) return;
    setResetting(true);
    setResetMsg(null);
    setResetIsError(false);
    try {
      const r = await onResetFinancial(resetScope);
      if (resetScope === 'all') {
        const total =
          (r?.orders || 0) + (r?.reservations || 0) + (r?.clients || 0) + (r?.personnel || 0) +
          (r?.menuItems || 0) + (r?.stocks || 0) + (r?.suppliers || 0) + (r?.supplierOrders || 0) +
          (r?.supplierProducts || 0) + (r?.stockMovements || 0) + (r?.deliveries || 0) +
          (r?.expenses || 0) + (r?.incomes || 0) + (r?.recurringExpenses || 0) +
          (r?.assets || 0) + (r?.specialEvents || 0) + (r?.notifications || 0);
        setResetMsg(`Toutes les données ont été réinitialisées : ${total} enregistrement(s) supprimé(s) (commandes, clients, personnel, carte, stocks, fournisseurs, dépenses, rentrées, biens…). Les comptes utilisateurs sont conservés.`);
      } else {
        setResetMsg(`Réinitialisé : ${r?.orders || 0} additions, ${r?.expenses || 0} dépenses, ${r?.incomes || 0} rentrées et ${r?.recurringExpenses || 0} dépenses récurrentes supprimées.`);
      }
      setResetText('');
    } catch (err: any) {
      setResetIsError(true);
      setResetMsg('Erreur : ' + (err?.message || 'la réinitialisation a échoué.'));
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      await onUpdateConfig({
        restaurantName,
        restaurantSlogan: restaurantSlogan || null,
        restaurantLogoUrl: restaurantLogoUrl || null,
        restaurantPhone: restaurantPhone || null,
        restaurantAddress: restaurantAddress || null,
        role,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRestaurantLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden text-left">
      <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-slate-900">Paramètres de l'Application</h3>
          <p className="text-xs text-slate-400 mt-0.5">Personnalisez le nom, le logo et testez les rôles de sécurité (RBAC)</p>
        </div>
        <Settings className="w-5 h-5 text-red-600" />
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {!canEdit && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-semibold">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" /> Lecture seule — la modification des paramètres est réservée au Super Admin.
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Configuration enregistrée et synchronisée en temps réel !
          </div>
        )}

        {/* Section 1: Branding */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Identité du Restaurant
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nom du Restaurant / Application
              </label>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Ex. Le Gourmet d'Antananarivo"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Slogan du Restaurant
              </label>
              <input
                type="text"
                value={restaurantSlogan}
                onChange={(e) => setRestaurantSlogan(e.target.value)}
                disabled={!canEdit}
                maxLength={60}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Ex. La cuisine malgache authentique"
              />
              <p className="text-[9px] text-slate-400 mt-1">Affiché sous le nom du restaurant dans la barre latérale.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Téléphone
                </label>
                <input
                  type="tel"
                  value={restaurantPhone}
                  onChange={(e) => setRestaurantPhone(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  placeholder="Ex. 034 12 345 67"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Adresse
                </label>
                <input
                  type="text"
                  value={restaurantAddress}
                  onChange={(e) => setRestaurantAddress(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Ex. Lot II M 45 Analakely, Antananarivo"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Logo du Restaurant
              </label>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                {restaurantLogoUrl ? (
                  <img src={restaurantLogoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white border border-slate-100 rounded-lg shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-white border border-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0 rounded-lg">
                    Logo
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={!canEdit}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Importez une image pour personnaliser le haut de la barre latérale.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Role Management */}
        <div className="space-y-4 border-t border-slate-50 pt-5">
          <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Contrôle d'Accès de Sécurité (RBAC)
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Rôle Actif de test
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  value: 'super_admin',
                  title: 'Super Administrateur',
                  desc: 'Accès complet absolu à toutes les données, incluant la visibilité et modification des salaires du staff.'
                },
                {
                  value: 'gerant',
                  title: 'Gérant Réseau',
                  desc: 'Accès total à la gestion de la salle, du stock et des réservations, mais RESTREINT sur les salaires.'
                }
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => canEdit && setRole(r.value)}
                  disabled={!canEdit}
                  className={`p-4 border rounded-2xl text-left transition-all flex flex-col justify-between h-full ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'} ${
                    role === r.value
                      ? 'border-yellow-500 bg-yellow-50/20 ring-1 ring-yellow-500'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <h5 className={`text-xs font-bold ${role === r.value ? 'text-slate-900' : 'text-slate-700'}`}>
                      {r.title}
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                  
                  {role === r.value && (
                    <span className="self-end mt-3 px-2 py-0.5 rounded-full text-[8px] font-bold bg-yellow-400 text-slate-950 uppercase tracking-wider">
                      Actif
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit (super admin uniquement) */}
        {canEdit && (
          <div className="pt-5 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-red-600/10 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enregistrement...
                </>
              ) : (
                'Enregistrer la configuration'
              )}
            </button>
          </div>
        )}
      </form>

      {/* Contact & Support — valeurs affichées sur la page de connexion (super admin uniquement) */}
      {canEdit && onUpdateSupport && (
        <div className="mx-6 mb-6 p-5 border border-slate-200 bg-slate-50/40 rounded-2xl">
          <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
            <LifeBuoy className="w-3.5 h-3.5" /> Contact &amp; Support (page de connexion)
          </h4>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            Ces coordonnées s'affichent sur la page <strong>« Contact &amp; Support »</strong> de l'écran de connexion (visible avant de se connecter).
          </p>

          {supportSaved && (
            <div className="mt-3 p-2.5 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-2">
              <Check className="w-3.5 h-3.5" /> Coordonnées de support enregistrées.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Téléphone support
              </label>
              <input
                type="text"
                value={sPhone}
                onChange={(e) => setSPhone(e.target.value)}
                placeholder="+261 34 56 789 10"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> E-mail support
              </label>
              <input
                type="email"
                value={sEmail}
                onChange={(e) => setSEmail(e.target.value)}
                placeholder="support@restaurant.mg"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={doSaveSupport}
              disabled={savingSupport}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {savingSupport ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enregistrement...</> : 'Enregistrer le contact support'}
            </button>
          </div>
        </div>
      )}

      {/* Zone de danger — réinitialisation des données financières (super admin uniquement) */}
      {canEdit && onResetFinancial && (
        <div className="mx-6 mb-6 p-5 border border-rose-200 bg-rose-50/40 rounded-2xl">
          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Zone de danger
          </h4>

          {/* Choix de la portée de la remise à zéro */}
          <div className="mt-3 space-y-2">
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                resetScope === 'financial' ? 'border-rose-300 bg-white' : 'border-slate-200 bg-white/50 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="resetScope"
                checked={resetScope === 'financial'}
                onChange={() => { setResetScope('financial'); setResetText(''); setResetMsg(null); }}
                className="mt-0.5 accent-rose-600"
              />
              <span className="text-[11px] text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Données financières uniquement.</strong> Supprime les
                <strong> additions/commandes</strong>, <strong>dépenses</strong> (y compris récurrentes) et
                <strong> rentrées d'argent</strong>. Les clients, le personnel, la carte et les stocks sont <strong>conservés</strong>.
              </span>
            </label>

            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                resetScope === 'all' ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white/50 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="resetScope"
                checked={resetScope === 'all'}
                onChange={() => { setResetScope('all'); setResetText(''); setResetMsg(null); }}
                className="mt-0.5 accent-rose-600"
              />
              <span className="text-[11px] text-slate-600 leading-relaxed">
                <strong className="text-rose-700">Toutes les données stockées.</strong> Supprime <strong>tout</strong> :
                commandes, clients, personnel, carte, stocks, fournisseurs, livraisons, dépenses, rentrées, biens &amp;
                matériel, événements… Seuls les <strong>comptes utilisateurs</strong> (connexions) sont conservés.
              </span>
            </label>
          </div>

          <p className="text-[11px] text-rose-600 mt-3 font-semibold">
            ⚠️ Cette action est <strong>irréversible</strong>.
          </p>

          {resetMsg && (
            <div className={`mt-3 p-2.5 rounded-xl text-[11px] font-semibold ${resetIsError ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
              {resetMsg}
            </div>
          )}

          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-4 mb-1">
            Pour confirmer, tapez <span className="font-mono text-rose-700">{RESET_KEYWORD}</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={resetText}
              onChange={(e) => setResetText(e.target.value.toUpperCase())}
              placeholder={RESET_KEYWORD}
              className="flex-1 px-3.5 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500 outline-none text-slate-800 font-mono"
            />
            <button
              type="button"
              onClick={doReset}
              disabled={resetText !== RESET_KEYWORD || resetting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {resetScope === 'all' ? 'Tout supprimer' : 'Remettre à zéro'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
