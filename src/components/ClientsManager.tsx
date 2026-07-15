import React, { useState } from 'react';
import { Client } from '../types.ts';
import { Search, Plus, Award, Mail, Phone, FileText, Trash2, Edit2, X, Users } from 'lucide-react';
import { usePagination, Pagination } from './Pagination.tsx';

interface ClientsManagerProps {
  clients: Client[];
  onAddClient: (formData: any) => Promise<void>;
  onEditClient: (id: number, formData: any) => Promise<void>;
  onDeleteClient: (id: number) => Promise<void>;
}

export default function ClientsManager({
  clients,
  onAddClient,
  onEditClient,
  onDeleteClient
}: ClientsManagerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setEmail('');
    setPhone('');
    setLoyaltyPoints(0);
    setNotes('');
    setIsOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setLoyaltyPoints(client.loyaltyPoints);
    setNotes(client.notes || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, email, phone, loyaltyPoints, notes };
    if (editingClient) {
      await onEditClient(editingClient.id, payload);
    } else {
      await onAddClient(payload);
    }
    setIsOpen(false);
  };

  const handleQuickAddPoints = async (client: Client) => {
    await onEditClient(client.id, {
      ...client,
      loyaltyPoints: client.loyaltyPoints + 10
    });
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );
  const pg = usePagination(filteredClients, 20);

  return (
    <div className="space-y-6 text-left">
      {/* Search and Action Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un client (nom, tél, email)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Enregistrer un Client
        </button>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 shadow-3xs">
          <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs">Aucun client trouvé.</p>
          <p className="text-[10px] text-slate-400 mt-1">Commencez par ajouter votre premier client ci-dessus.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pg.pageItems.map((client) => (
            <div key={client.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-3xs flex flex-col justify-between hover:border-red-100 transition-all text-left relative overflow-hidden group">
              {/* Decorative background circle */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50/20 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
              
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-sm">{client.name}</h3>
                    <p className="text-[9px] text-slate-400 font-mono font-semibold">Client ID: #{client.id}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-100 border border-yellow-200 text-yellow-800 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                    <Award className="w-3.5 h-3.5" />
                    {client.loyaltyPoints} Pts
                  </div>
                </div>

                <div className="space-y-2 mt-4 text-xs text-slate-500">
                  {client.phone && (
                    <p className="flex items-center gap-2">
                      <span>📞</span>
                      <span>{client.phone}</span>
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-2">
                      <span>✉️</span>
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}
                  {client.notes && (
                    <p className="flex items-start gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 mt-2 text-[11px] leading-relaxed">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{client.notes}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleQuickAddPoints(client)}
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  title="Ajouter 10 points de fidélité"
                >
                  +10 Pts
                </button>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEditModal(client)}
                    className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer le client ${client.name} ?`)) {
                        onDeleteClient(client.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={pg.page} totalPages={pg.totalPages} total={pg.total} rangeStart={pg.rangeStart} rangeEnd={pg.rangeEnd} onPageChange={pg.setPage} />
        </>
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
              {editingClient ? 'Modifier la Fiche Client' : 'Nouvelle Fiche Client'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    placeholder="034 12 345 67"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Points Fidélité</label>
                  <input
                    type="number"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
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
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes / Préférences</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                  placeholder="Allergies, table préférée (table 4), etc..."
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
                  {editingClient ? 'Enregistrer les modifications' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
