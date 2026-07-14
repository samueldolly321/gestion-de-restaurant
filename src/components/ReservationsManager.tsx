import React, { useState } from 'react';
import { Calendar as CalendarIcon, Users, Phone, MapPin, Tag, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { Reservation } from '../types.ts';

interface ReservationsManagerProps {
  reservations: Reservation[];
  onAddReservation: (data: any) => Promise<void>;
  onEditReservation: (id: number, data: any) => Promise<void>;
  onDeleteReservation: (id: number) => Promise<void>;
}

export default function ReservationsManager({
  reservations,
  onAddReservation,
  onEditReservation,
  onDeleteReservation,
}: ReservationsManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const [tableNumber, setTableNumber] = useState('');
  const [status, setStatus] = useState('confirme');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingRes(null);
    setClientName('');
    setClientPhone('');
    
    // Set default date as today at 19:00
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0] + 'T19:00';
    setReservationDate(todayStr);
    
    setGuestsCount(2);
    setTableNumber('');
    setStatus('confirme');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (res: Reservation) => {
    setEditingRes(res);
    setClientName(res.clientName);
    setClientPhone(res.clientPhone || '');
    setReservationDate(res.reservationDate);
    setGuestsCount(res.guestsCount);
    setTableNumber(res.tableNumber ? String(res.tableNumber) : '');
    setStatus(res.status);
    setNotes(res.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !reservationDate) return;

    setSubmitting(true);
    const payload = {
      clientName,
      clientPhone: clientPhone || null,
      reservationDate,
      guestsCount: Number(guestsCount),
      tableNumber: tableNumber ? Number(tableNumber) : null,
      status,
      notes: notes || null,
    };

    try {
      if (editingRes) {
        await onEditReservation(editingRes.id, payload);
      } else {
        await onAddReservation(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReservations = reservations.filter((res) => {
    const matchesSearch = res.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.clientPhone && res.clientPhone.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || res.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="flex-1 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 w-full sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="confirme">Confirmé</option>
            <option value="en_attente">En attente</option>
            <option value="annule">Annulé</option>
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-red-600/10"
        >
          <Plus className="w-4 h-4" /> Nouvelle Réservation
        </button>
      </div>

      {/* Grid or Table */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white rounded-3xl py-16 px-4 text-center border border-slate-100 shadow-3xs">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Aucune réservation enregistrée</p>
          <p className="text-xs text-slate-400 mt-1">Créez une réservation pour planifier le service en salle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReservations.map((res) => {
            const dateObj = new Date(res.reservationDate);
            const formattedDate = dateObj.toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-3xs text-left relative overflow-hidden group hover:border-red-100 transition-all"
              >
                {/* Accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    res.status === 'confirme'
                      ? 'bg-emerald-500'
                      : res.status === 'annule'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                      {res.clientName}
                    </h4>
                    {res.clientPhone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-300" /> {res.clientPhone}
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      res.status === 'confirme'
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                        : res.status === 'annule'
                        ? 'bg-rose-50 border border-rose-100 text-rose-700'
                        : 'bg-amber-50 border border-amber-100 text-amber-700'
                    }`}
                  >
                    {res.status === 'confirme' ? 'Confirmé' : res.status === 'annule' ? 'Annulé' : 'Attente'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-500 border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-semibold text-slate-800">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-yellow-500" />
                    <span>{res.guestsCount} {res.guestsCount > 1 ? 'personnes' : 'personne'}</span>
                  </div>
                  {res.tableNumber ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Table {res.tableNumber}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 italic">
                      <MapPin className="w-3.5 h-3.5 text-slate-300" />
                      <span>Table non assignée</span>
                    </div>
                  )}

                  {res.notes && (
                    <div className="mt-2 text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg italic">
                      "{res.notes}"
                    </div>
                  )}
                </div>

                {/* Actions overlay/footer */}
                <div className="flex items-center justify-end gap-2 mt-4 border-t border-slate-50 pt-3">
                  <button
                    onClick={() => openEditModal(res)}
                    className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteReservation(res.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation / Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative border border-slate-100 text-left">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900">
                {editingRes ? 'Modifier la réservation' : 'Planifier une réservation'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nom du client *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800"
                  placeholder="Ex. Marc Brunet"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800"
                    placeholder="Ex. 034 12 345 67"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nombre de convives *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Date & Heure *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Numéro de table
                  </label>
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800 font-mono"
                    placeholder="Ex. 5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Statut de la réservation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'confirme', label: 'Confirmé', color: 'border-emerald-200 text-emerald-700 bg-emerald-50/40' },
                    { value: 'en_attente', label: 'En attente', color: 'border-amber-200 text-amber-700 bg-amber-50/40' },
                    { value: 'annule', label: 'Annulé', color: 'border-rose-200 text-rose-700 bg-rose-50/40' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={`py-2 px-1 border rounded-xl text-[11px] font-semibold text-center cursor-pointer transition-all ${
                        status === s.value
                          ? `${s.color} ring-1 ring-offset-1 ring-red-500`
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Notes / Demandes particulières
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-slate-800"
                  rows={2}
                  placeholder="Ex. Allergie au gluten, table près de la fenêtre..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-55 shadow-md shadow-red-600/10"
                >
                  {submitting ? 'Enregistrement...' : editingRes ? 'Enregistrer les modifications' : 'Créer la réservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
