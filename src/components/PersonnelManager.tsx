import React, { useState } from 'react';
import { Personnel } from '../types.ts';
import { Search, Plus, UserCheck, Shield, Phone, Mail, DollarSign, Clock, CheckCircle2, AlertCircle, Edit2, Trash2, X, Calendar, Lock } from 'lucide-react';

// Rôles prédéfinis ; tout autre valeur est un rôle personnalisé (« Autre »).
const KNOWN_ROLES = ['serveur', 'cuisinier', 'chef_cuisinier', 'femme_menage', 'livreur', 'barman', 'manager'];

interface PersonnelManagerProps {
  personnel: Personnel[];
  userRole: string; // 'super_admin' or 'gerant'
  onAddStaff: (formData: any) => Promise<void>;
  onEditStaff: (id: number, formData: any) => Promise<void>;
  onDeleteStaff: (id: number) => Promise<void>;
}

export default function PersonnelManager({
  personnel,
  userRole,
  onAddStaff,
  onEditStaff,
  onDeleteStaff
}: PersonnelManagerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Personnel | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('serveur');
  const [customRole, setCustomRole] = useState(''); // rôle libre quand « Autre » est choisi
  const [status, setStatus] = useState('actif');
  const [hourlyRate, setHourlyRate] = useState(15.0);
  const [salary, setSalary] = useState(1200000); // Default Ariary salary
  const [hireDate, setHireDate] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const canAccessSalaries = userRole === 'super_admin';

  // Format Ariary helper
  const formatAr = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar').trim();
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('serveur');
    setCustomRole('');
    setStatus('actif');
    setHourlyRate(10000); // 10k Ar/hour
    setSalary(1200000); // 1.2M Ar/month
    setHireDate(new Date().toISOString().split('T')[0]);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setAvatarUrl('');
    setIsOpen(true);
  };

  const openEditModal = (staff: Personnel) => {
    setEditingStaff(staff);
    setName(staff.name);
    setEmail(staff.email || '');
    setPhone(staff.phone || '');
    // Si le rôle n'est pas prédéfini, on bascule sur « Autre » avec le libellé libre.
    if (KNOWN_ROLES.includes(staff.role)) {
      setRole(staff.role);
      setCustomRole('');
    } else {
      setRole('autre');
      setCustomRole(staff.role);
    }
    setStatus(staff.status);
    setHourlyRate(staff.hourlyRate);
    setSalary(staff.salary || 0);
    setHireDate(staff.hireDate || '');
    setLeaveStartDate(staff.leaveStart || '');
    setLeaveEndDate(staff.leaveEnd || '');
    setAvatarUrl(staff.avatarUrl || '');
    setIsOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // « Autre » → on enregistre le rôle libre saisi (retombe sur 'autre' si vide).
    const effectiveRole = role === 'autre' ? (customRole.trim() || 'autre') : role;
    const payload: any = {
      name,
      email: email || null,
      phone: phone || null,
      role: effectiveRole,
      status,
      hourlyRate: Number(hourlyRate),
      hireDate: hireDate || null,
      leaveStartDate: leaveStartDate || null,
      leaveEndDate: leaveEndDate || null,
      avatarUrl: avatarUrl || null,
    };

    // Only update salary if user is Super Admin
    if (canAccessSalaries) {
      payload.salary = Number(salary);
    } else if (editingStaff) {
      // Retain existing salary for editing if manager can't touch it
      payload.salary = editingStaff.salary;
    }

    if (editingStaff) {
      await onEditStaff(editingStaff.id, payload);
    } else {
      await onAddStaff(payload);
    }
    setIsOpen(false);
  };

  const handleStatusChange = async (staff: Personnel, newStatus: string) => {
    await onEditStaff(staff.id, {
      ...staff,
      status: newStatus
    });
  };

  const filteredStaff = personnel.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'serveur': return 'Serveur';
      case 'cuisinier': return 'Cuisinier';
      case 'chef_cuisinier': return 'Chef cuisinier';
      case 'femme_menage': return 'Femme de ménage';
      case 'livreur': return 'Livreur';
      case 'barman': return 'Barman / Barista';
      case 'manager': return 'Manager / Directeur';
      default: return r;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'actif':
        return (
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3" /> En service
          </span>
        );
      case 'pause':
        return (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <Clock className="w-3 h-3" /> En Pause
          </span>
        );
      case 'absent':
        return (
          <span className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <AlertCircle className="w-3 h-3" /> Hors service
          </span>
        );
      default:
        return (
          <span className="bg-slate-50 text-slate-700 border border-slate-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            {s}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search and Action Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un collaborateur (nom, rôle)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Recruter un Collaborateur
        </button>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 shadow-3xs">
          <UserCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs">Aucun membre d'équipe enregistré.</p>
          <p className="text-[10px] text-slate-400 mt-1">Saisissez vos employés pour suivre leur temps de présence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((staff) => (
            <div key={staff.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-3xs flex flex-col justify-between hover:border-red-100 transition-all relative overflow-hidden group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {staff.avatarUrl ? (
                      <img src={staff.avatarUrl} alt={staff.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 text-red-700 flex items-center justify-center font-bold font-display shrink-0 text-xs">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                        {staff.name}
                        {staff.role === 'manager' && <Shield className="w-3.5 h-3.5 text-red-600" />}
                      </h3>
                      <p className="text-[10px] font-semibold text-red-600 font-mono mt-0.5">
                        {getRoleLabel(staff.role)}
                      </p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(staff.status)}
                  </div>
                </div>

                <div className="space-y-2.5 mt-4 text-xs text-slate-500">
                  {staff.phone && <p>📞 {staff.phone}</p>}
                  {staff.email && <p className="truncate">✉️ {staff.email}</p>}
                  
                  {staff.hireDate && (
                    <p className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Embauché(e) le : <span className="font-mono text-slate-700 font-semibold">{staff.hireDate}</span>
                    </p>
                  )}

                  {staff.leaveStart && (
                    <div className="bg-amber-50/40 border border-amber-100 p-2 rounded-xl text-[10px] text-amber-800">
                      <p className="font-semibold flex items-center gap-1">
                        🌴 Congé planifié :
                      </p>
                      <p className="font-mono mt-0.5">
                        Du {staff.leaveStart} au {staff.leaveEnd || 'Indéterminé'}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Taux Horaire</span>
                      <span className="font-mono text-xs font-bold text-slate-700">{formatAr(staff.hourlyRate)}/h</span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50 relative">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Salaire Mensuel</span>
                      {canAccessSalaries ? (
                        <span className="font-mono text-xs font-bold text-red-600">{formatAr(staff.salary || 0)}</span>
                      ) : (
                        <span className="font-mono text-xs font-bold text-slate-400 flex items-center gap-0.5" title="Accès super_admin requis">
                          <Lock className="w-2.5 h-2.5" /> •••••• Ar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action and Presence toggles */}
              <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-100">
                {/* Presence quick toggle */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Présence :</span>
                  <select
                    value={staff.status}
                    onChange={(e) => handleStatusChange(staff, e.target.value)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-[10px] font-bold outline-none cursor-pointer transition-all"
                  >
                    <option value="actif">Service</option>
                    <option value="pause">Pause</option>
                    <option value="absent">Hors-Svc</option>
                  </select>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(staff)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Retirer ${staff.name} de l'équipe ?`)) {
                        onDeleteStaff(staff.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative text-left">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
 
            <h3 className="font-display font-bold text-slate-800 text-base mb-4">
              {editingStaff ? "Modifier la Fiche d'Employé" : "Enregistrer un Nouveau Collaborateur"}
            </h3>
 
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    placeholder="Lucas Martin"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Photo de profil</label>
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Aperçu" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                        Photo
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    placeholder="034 56 789 01"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Taux Horaire (Ar / h) *</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Rôle / Métier</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="serveur">Serveur</option>
                    <option value="cuisinier">Cuisinier</option>
                    <option value="chef_cuisinier">Chef cuisinier</option>
                    <option value="femme_menage">Femme de ménage</option>
                    <option value="livreur">Livreur</option>
                    <option value="barman">Barman / Barista</option>
                    <option value="manager">Manager / Directeur</option>
                    <option value="autre">Autre…</option>
                  </select>
                  {role === 'autre' && (
                    <input
                      type="text"
                      required
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      className="w-full mt-2 px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      placeholder="Précisez le rôle (ex. Plongeur, Caissier, Sécurité…)"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Statut Initial</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="actif">En Service</option>
                    <option value="pause">En Pause</option>
                    <option value="absent">Hors-service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Date d'Embauche *</label>
                  <input
                    type="date"
                    required
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Salaire Mensuel (Ar) *</label>
                  {canAccessSalaries ? (
                    <input
                      type="number"
                      required
                      value={salary}
                      onChange={(e) => setSalary(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                    />
                  ) : (
                    <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 flex items-center gap-1.5 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5" /> Restreint aux admins
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Début Congé</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Fin Congé</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="lucas.martin@email.com"
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
                  {editingStaff ? 'Enregistrer' : 'Embaucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
