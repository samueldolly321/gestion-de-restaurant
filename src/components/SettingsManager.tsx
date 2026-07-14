import React, { useState } from 'react';
import { Settings, Shield, RefreshCw, Sparkles, Check, Phone, MapPin } from 'lucide-react';
import { DbUser } from '../types.ts';

interface SettingsManagerProps {
  dbUser: DbUser;
  onUpdateConfig: (updates: {
    restaurantName: string;
    restaurantLogoUrl: string | null;
    restaurantPhone: string | null;
    restaurantAddress: string | null;
    role: string;
  }) => Promise<void>;
}

export default function SettingsManager({ dbUser, onUpdateConfig }: SettingsManagerProps) {
  const [restaurantName, setRestaurantName] = useState(dbUser.restaurantName || 'RestoPilote');
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState(dbUser.restaurantLogoUrl || '');
  const [restaurantPhone, setRestaurantPhone] = useState(dbUser.restaurantPhone || '');
  const [restaurantAddress, setRestaurantAddress] = useState(dbUser.restaurantAddress || '');
  const [role, setRole] = useState(dbUser.role || 'super_admin');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Seul le super admin peut modifier les paramètres. Le gérant est en lecture seule.
  const canEdit = dbUser.role === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      await onUpdateConfig({
        restaurantName,
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
    </div>
  );
}
