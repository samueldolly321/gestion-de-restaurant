import React, { useState } from 'react';
import { Delivery, Personnel, Order, Asset } from '../types.ts';
import { Search, Plus, Edit2, Trash2, X, Truck, MapPin, Phone, Clock, User, Package, Calendar, Hash, Bike } from 'lucide-react';

// Statuts de livraison (workflow simple).
const DELIVERY_STATUSES: { value: string; label: string; badge: string }[] = [
  { value: 'en_preparation', label: 'En préparation', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'en_route', label: 'En route', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'livree', label: 'Livrée', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'annulee', label: 'Annulée', badge: 'bg-rose-50 text-rose-700 border-rose-100' },
];

interface DeliveriesManagerProps {
  deliveries: Delivery[];
  personnel: Personnel[];
  orders: Order[];
  assets: Asset[];
  onAddDelivery: (formData: any) => Promise<void>;
  onEditDelivery: (id: number, formData: any) => Promise<void>;
  onDeleteDelivery: (id: number) => Promise<void>;
}

export default function DeliveriesManager({
  deliveries,
  personnel,
  orders,
  assets,
  onAddDelivery,
  onEditDelivery,
  onDeleteDelivery,
}: DeliveriesManagerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [orderId, setOrderId] = useState<string>(''); // numéro de la commande à livrer
  const [driverName, setDriverName] = useState('');
  const [status, setStatus] = useState('en_preparation');
  const [notes, setNotes] = useState('');
  const [vehicleId, setVehicleId] = useState(''); // véhicule ayant fait la livraison
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null); // détail de la commande liée

  const formatAr = (amount: number) =>
    new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(amount || 0).replace('MGA', 'Ar').trim();

  // Seuls les employés de rôle « livreur » peuvent être assignés à une livraison.
  const drivers = personnel.filter((p) => p.role === 'livreur');
  // Véhicules disponibles (biens de catégorie « Véhicule »).
  const vehicles = assets.filter((a) => a.category === 'vehicule');

  // Quand on choisit un livreur, on propose automatiquement son véhicule attaché (s'il en a un).
  const handleDriverChange = (name: string) => {
    setDriverName(name);
    const driver = drivers.find((p) => p.name === name);
    if (driver?.vehicleId != null) setVehicleId(String(driver.vehicleId));
  };

  // Commandes marquées « à livrer » — proposées comme numéro de commande à livrer.
  const deliverableOrders = orders.filter((o) => o.orderType === 'a_livrer');

  const todayIso = () => new Date().toISOString().split('T')[0];

  const getStatus = (s: string) => DELIVERY_STATUSES.find((x) => x.value === s) || DELIVERY_STATUSES[0];

  const openAddModal = () => {
    setEditing(null);
    setClientName('');
    setClientPhone('');
    setAddress('');
    setDeliveryDate(todayIso());
    setDeliveryTime('');
    setOrderId('');
    setDriverName('');
    setStatus('en_preparation');
    setNotes('');
    setVehicleId('');
    setIsOpen(true);
  };

  const openEditModal = (d: Delivery) => {
    setEditing(d);
    setClientName(d.clientName);
    setClientPhone(d.clientPhone || '');
    setAddress(d.address);
    setDeliveryDate(d.deliveryDate || '');
    setDeliveryTime(d.deliveryTime || '');
    setOrderId(d.orderId != null ? String(d.orderId) : '');
    setDriverName(d.driverName || '');
    setStatus(d.status);
    setNotes(d.notes || '');
    setVehicleId(d.vehicleId != null ? String(d.vehicleId) : '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clientName,
      clientPhone: clientPhone || null,
      address,
      deliveryDate: deliveryDate || null,
      deliveryTime: deliveryTime || null,
      orderId: orderId ? Number(orderId) : null,
      driverName: driverName || null,
      status,
      notes: notes || null,
      vehicleId: vehicleId ? Number(vehicleId) : null,
    };
    if (editing) {
      await onEditDelivery(editing.id, payload);
    } else {
      await onAddDelivery(payload);
    }
    setIsOpen(false);
  };

  const filtered = deliveries.filter(
    (d) =>
      d.clientName.toLowerCase().includes(search.toLowerCase()) ||
      d.address.toLowerCase().includes(search.toLowerCase()) ||
      (d.clientPhone || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.driverName || '').toLowerCase().includes(search.toLowerCase())
  );

  // Totaux (livraisons en cours = ni livrées, ni annulées)
  const enCours = deliveries.filter((d) => d.status === 'en_preparation' || d.status === 'en_route').length;

  return (
    <div className="space-y-6 text-left">
      {/* Totaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Livraisons en cours</p>
            <h4 className="font-display font-black text-xl text-blue-700">{enCours}</h4>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total affiché ({filtered.length})</p>
            <h4 className="font-display font-black text-xl text-slate-800">{deliveries.length} au total</h4>
          </div>
        </div>
      </div>

      {/* Recherche + action */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher (client, adresse, téléphone, livreur)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nouvelle livraison
        </button>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 shadow-3xs">
          <Truck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs">Aucune livraison enregistrée.</p>
          <p className="text-[10px] text-slate-400 mt-1">Client, téléphone, adresse, heure et livreur assigné.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Client</th>
                  <th className="py-3 px-6">Adresse</th>
                  <th className="py-3 px-6">Commande</th>
                  <th className="py-3 px-6">Date / Heure</th>
                  <th className="py-3 px-6">Livreur</th>
                  <th className="py-3 px-6">Statut</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((d) => {
                  const st = getStatus(d.status);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-800 text-xs">{d.clientName}</p>
                        {d.clientPhone && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {d.clientPhone}
                          </p>
                        )}
                        {d.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic">{d.notes}</p>}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-xs text-slate-700 flex items-start gap-1 max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /> {d.address}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-700">
                        {d.orderId != null ? (() => {
                          const linkedOrder = orders.find((o) => o.id === d.orderId);
                          return linkedOrder ? (
                            <button
                              type="button"
                              onClick={() => setViewingOrder(linkedOrder)}
                              className="flex items-center gap-1 font-mono font-bold text-red-600 hover:text-red-500 hover:underline cursor-pointer"
                              title="Voir le détail de la commande"
                            >
                              <Hash className="w-3 h-3" />{linkedOrder.reference || `#${d.orderId}`}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 font-mono font-bold text-slate-700"><Hash className="w-3 h-3 text-slate-400" />#{d.orderId}</span>
                          );
                        })() : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {d.deliveryDate || '—'}</span>
                        <span className="flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {d.deliveryTime || '—'}</span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-700">
                        {d.driverName ? (
                          <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {d.driverName}</span>
                        ) : (
                          <span className="text-slate-300">Non assigné</span>
                        )}
                        {d.vehicleId != null && (
                          <span className="flex items-center gap-1 mt-0.5 text-[10px] text-blue-700"><Bike className="w-3 h-3" /> {assets.find((a) => a.id === d.vehicleId)?.name || 'Véhicule'}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${st.badge}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(d)}
                            className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer la livraison pour « ${d.clientName} » ?`)) onDeleteDelivery(d.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modale ajout / édition */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-black text-slate-800 text-base mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-red-600" />
              {editing ? 'Modifier la livraison' : 'Nouvelle livraison'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nom du client *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    placeholder="Ex. Rakoto Jean"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
                    placeholder="Ex. 034 12 345 67"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Adresse de livraison *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Ex. Lot II M 45 Ambatomena, Antananarivo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Date de livraison</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Heure de livraison</label>
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Commande à livrer (n°)</label>
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="">— Aucune —</option>
                    {deliverableOrders.map((o) => (
                      <option key={o.id} value={o.id}>{o.reference ? `Réf. ${o.reference}` : `#${o.id}`} — Table {o.tableNumber}</option>
                    ))}
                    {/* Conserve une commande liée qui ne serait plus « à livrer » */}
                    {orderId && !deliverableOrders.some((o) => String(o.id) === orderId) && (
                      <option value={orderId}>#{orderId}</option>
                    )}
                  </select>
                  {deliverableOrders.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Aucune commande « À livrer ». Marquez une commande comme « À livrer » dans l'onglet Tables &amp; Addition.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Statut</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    {DELIVERY_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Livreur</label>
                  <select
                    value={driverName}
                    onChange={(e) => handleDriverChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="">— Non assigné —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  {drivers.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Aucun employé de rôle « Livreur ». Ajoutez-en un dans l'onglet Personnel.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-slate-400" /> Véhicule
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="">— Aucun véhicule —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">Ajoutez un véhicule dans « Biens &amp; Matériel ».</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes (facultatif)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                  placeholder="Détails, points de repère, instructions..."
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
                  {editing ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale : détail de la commande liée à la livraison */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setViewingOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-red-600" />
                Commande {viewingOrder.reference ? `Réf. ${viewingOrder.reference}` : `#${viewingOrder.id}`}
              </h3>
              <button onClick={() => setViewingOrder(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Infos générales */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Table</p>
                  <p className="font-semibold text-slate-700">#{viewingOrder.tableNumber}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Type</p>
                  <p className="font-semibold text-slate-700">{viewingOrder.orderType === 'a_livrer' ? '🚚 À livrer' : '🍽️ Sur place'}</p>
                </div>
                {viewingOrder.serverName && (
                  <div className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Serveur</p>
                    <p className="font-semibold text-slate-700">{viewingOrder.serverName}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Statut</p>
                  <p className="font-semibold text-slate-700">{viewingOrder.status === 'paye' ? '✅ Payé' : viewingOrder.status}</p>
                </div>
              </div>

              {/* Liste des plats */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Plats &amp; boissons</p>
                {viewingOrder.items && viewingOrder.items.length > 0 ? (
                  <div className="rounded-xl border border-slate-100 divide-y divide-slate-50">
                    {viewingOrder.items.map((it) => (
                      <div key={it.id ?? it.menuItemId} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-slate-600"><span className="font-bold text-slate-800">{it.quantity}×</span> {it.name || 'Article'}</span>
                        <span className="font-mono text-slate-500">{formatAr(it.unitPrice * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Aucun plat enregistré.</p>
                )}
              </div>

              {/* Totaux */}
              <div className="bg-red-50/60 border border-red-100 rounded-2xl px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Addition (plats)</span>
                  <span className="font-mono">{formatAr((viewingOrder.totalAmount || 0) - (viewingOrder.deliveryFee || 0))}</span>
                </div>
                {viewingOrder.orderType === 'a_livrer' && (viewingOrder.deliveryFee || 0) > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-blue-600 font-semibold">
                    <span>+ Livraison</span>
                    <span className="font-mono">{formatAr(viewingOrder.deliveryFee || 0)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-red-100">
                  <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Total</span>
                  <span className="text-lg font-black text-red-600 font-mono">{formatAr(viewingOrder.totalAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
