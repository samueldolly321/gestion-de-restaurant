import React, { useState } from 'react';
import { UserPlus, Pencil, Trash2, X, Eye, EyeOff, ShieldCheck, Check, KeyRound } from 'lucide-react';
import { DbUser } from '../types.ts';
import { ROLE_LABELS, ASSIGNABLE_ROLES, TAB_IDS, TAB_LABELS, DEFAULT_ROLE_TABS, AppRole } from '../lib/permissions.ts';

interface UsersManagerProps {
  users: DbUser[];
  currentUserId?: number;
  ownerId?: number;
  onAddUser: (payload: any) => Promise<void>;
  onUpdateUser: (id: number, payload: any) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
}

const emptyForm = {
  email: '',
  password: '',
  displayName: '',
  role: 'serveur' as AppRole,
  allowedTabs: [...DEFAULT_ROLE_TABS.serveur] as string[],
};

export default function UsersManager({ users, currentUserId, ownerId, onAddUser, onUpdateUser, onDeleteUser }: UsersManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // null = création
  const [form, setForm] = useState({ ...emptyForm });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowPassword(false);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (u: DbUser) => {
    setEditingId(u.id);
    setForm({
      email: u.email,
      password: '',
      displayName: u.displayName || '',
      role: (u.role as AppRole),
      allowedTabs: u.allowedTabs && u.allowedTabs.length ? [...u.allowedTabs] : [...(DEFAULT_ROLE_TABS[u.role as AppRole] || DEFAULT_ROLE_TABS.serveur)],
    });
    setShowPassword(false);
    setError(null);
    setShowModal(true);
  };

  // Change de rôle : on réaligne les onglets sur le défaut du rôle choisi (l'admin peut ensuite ajuster).
  const handleRoleChange = (role: AppRole) => {
    setForm((f) => ({ ...f, role, allowedTabs: [...(DEFAULT_ROLE_TABS[role] || [])] }));
  };

  const toggleTab = (tab: string) => {
    setForm((f) => ({
      ...f,
      allowedTabs: f.allowedTabs.includes(tab) ? f.allowedTabs.filter((t) => t !== tab) : [...f.allowedTabs, tab],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editingId && (!form.email || !form.password)) {
      setError('E-mail et mot de passe sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const payload: any = { role: form.role, displayName: form.displayName, allowedTabs: form.allowedTabs };
        if (form.password) payload.password = form.password; // réinitialisation optionnelle
        await onUpdateUser(editingId, payload);
      } else {
        await onAddUser({
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          role: form.role,
          allowedTabs: form.allowedTabs,
        });
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDeleteUser(id);
      setConfirmDelete(null);
    } catch (err: any) {
      setError(err.message || 'La suppression a échoué.');
    }
  };

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-50 text-red-700 border-red-100';
      case 'gerant': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'comptable': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'chef_caisse': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-5 text-left">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-black text-slate-900 text-base">Comptes & Accès</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Seul le super admin peut créer des comptes et choisir les onglets visibles de chacun.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm shadow-red-600/10 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Ajouter un utilisateur
        </button>
      </div>

      {error && !showModal && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-600">{error}</div>
      )}

      {/* Liste des comptes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {users.map((u) => {
          const isOwner = u.id === ownerId;
          const isSelf = u.id === currentUserId;
          const tabsCount = u.allowedTabs?.length || 0;
          return (
            <div key={u.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-3xs flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{u.displayName || u.email.split('@')[0]}</p>
                  <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded-full border ${roleBadgeClass(u.role)}`}>
                  {ROLE_LABELS[u.role] || u.role}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                {u.role === 'super_admin' || u.role === 'gerant'
                  ? <span>Accès à tous les onglets</span>
                  : <span>{tabsCount} onglet{tabsCount > 1 ? 's' : ''} visible{tabsCount > 1 ? 's' : ''}</span>}
              </div>

              {isOwner ? (
                <div className="text-[10px] font-semibold text-slate-400 bg-slate-50 rounded-lg py-1.5 text-center">
                  {isSelf ? 'Vous (propriétaire)' : 'Propriétaire'}
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEdit(u)}
                    className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                  {confirmDelete === u.id ? (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirmer
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(u.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modale création / édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h4 className="font-display font-black text-slate-900 text-sm">
                {editingId ? 'Modifier le compte' : 'Nouvel utilisateur'}
              </h4>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-600">{error}</div>}

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nom affiché</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Ex. Hery (serveur)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Adresse e-mail</label>
                <input
                  type="email"
                  value={form.email}
                  disabled={!!editingId}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="membre@restaurant.mg"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {editingId && <p className="text-[9px] text-slate-400 mt-1">L'e-mail ne peut pas être modifié.</p>}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {editingId ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={editingId ? 'Laisser vide pour ne pas changer' : '6 caractères minimum'}
                    className="w-full px-3.5 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editingId && (
                  <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Renseigner ce champ réinitialise le mot de passe du membre.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rôle</label>
                <div className="grid grid-cols-2 gap-2">
                  {ASSIGNABLE_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`px-3 py-2 rounded-xl border text-[11px] font-bold text-left transition-all ${
                        form.role === r ? 'border-red-500 bg-red-50/50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Onglets visibles</label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, allowedTabs: [...(DEFAULT_ROLE_TABS[f.role] || [])] }))}
                    className="text-[10px] font-bold text-red-600 hover:text-red-500 cursor-pointer"
                  >
                    Réinitialiser selon le rôle
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto p-1">
                  {TAB_IDS.map((tab) => {
                    const checked = form.allowedTabs.includes(tab);
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => toggleTab(tab)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-left transition-all ${
                          checked ? 'border-red-400 bg-red-50/40 text-slate-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-red-600 text-white' : 'bg-slate-100'}`}>
                          {checked && <Check className="w-2.5 h-2.5" />}
                        </span>
                        {TAB_LABELS[tab]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-400 mt-1">L'onglet « Utilisateurs » reste réservé au super admin.</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60">
                  {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
