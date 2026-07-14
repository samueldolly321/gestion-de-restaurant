import React, { useState } from 'react';
import { Clock, Star, Plus, Trash2, X, ChevronLeft, ChevronRight, Filter, Info } from 'lucide-react';
import { Reservation, Personnel, Delivery, SpecialEvent } from '../types.ts';

// Événement affiché dans le calendrier (réservation, congé, livraison ou événement spécial).
interface CalendarEvent {
  id: string;
  type: 'reservation' | 'leave' | 'special' | 'delivery';
  title: string;
  time?: string;
  category?: string;
  color: string;
  borderColor: string;
  textColor: string;
  notes?: string;
  date?: string; // YYYY-MM-DD (renseigné pour la modale de détail)
  details?: { label: string; value: string }[]; // lignes d'info pour la modale
}

interface CalendarManagerProps {
  reservations: Reservation[];
  personnel: Personnel[];
  deliveries: Delivery[];
  specialEvents: SpecialEvent[];
  onAddSpecialEvent: (data: any) => Promise<void>;
  onDeleteSpecialEvent: (id: number) => Promise<void>;
  dbUserId: number;
}

export default function CalendarManager({ reservations, personnel, deliveries, specialEvents, onAddSpecialEvent, onDeleteSpecialEvent, dbUserId }: CalendarManagerProps) {
  void dbUserId;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null); // modale de détail au clic
  const [filterType, setFilterType] = useState<'all' | 'reservation' | 'leave' | 'special' | 'delivery'>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [category, setCategory] = useState<'concert' | 'theme' | 'vip' | 'fermeture' | 'autre'>('theme');
  const [notes, setNotes] = useState('');

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const openAddModal = (date?: string) => {
    setTitle('');
    setDateStr(date || new Date().toISOString().split('T')[0]);
    setTimeStr('');
    setCategory('theme');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateStr) return;
    await onAddSpecialEvent({ title, date: dateStr, time: timeStr || null, category, notes: notes || null });
    setIsModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Supprimer cet événement spécial du calendrier ?")) {
      onDeleteSpecialEvent(Number(id));
    }
  };

  // Helper to format date strings to YYYY-MM-DD
  const formatYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get days in the current month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];

    // Fill days from previous month if starting week doesn't start on Sunday/Monday
    // We'll align with Monday as the first day of the week
    let firstDayIndex = date.getDay() - 1; // 0 for Monday, -1 for Sunday
    if (firstDayIndex === -1) firstDayIndex = 6; // Sunday index

    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDaysCount - i + 1),
        isCurrentMonth: false,
      });
    }

    // Days in current month
    const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Days in next month to complete the grid (usually 42 cells)
    const totalCells = 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Compile and filter all events
  const getEventsForDate = (dateString: string) => {
    const dayEvents: CalendarEvent[] = [];

    // Add reservations
    reservations.forEach(r => {
      const resDateOnly = r.reservationDate.split('T')[0];
      if (resDateOnly === dateString) {
        if (filterType === 'all' || filterType === 'reservation') {
          const time = r.reservationDate.split('T')[1] || '';
          dayEvents.push({
            id: `res_${r.id}`,
            type: 'reservation',
            title: `🍽️ Table ${r.tableNumber || '?'} : ${r.clientName} (${r.guestsCount}p)`,
            time: time,
            date: dateString,
            color: 'bg-emerald-50 hover:bg-emerald-100',
            borderColor: 'border-emerald-200',
            textColor: 'text-emerald-800',
            notes: r.notes || undefined,
            details: [
              { label: 'Client', value: r.clientName },
              { label: 'Téléphone', value: r.clientPhone || '—' },
              { label: 'Table', value: r.tableNumber ? `#${r.tableNumber}` : '—' },
              { label: 'Couverts', value: `${r.guestsCount}` },
              { label: 'Statut', value: r.status },
            ],
          });
        }
      }
    });

    // Add personnel leaves
    personnel.forEach(p => {
      if (p.leaveStart) {
        const start = p.leaveStart;
        const end = p.leaveEnd || p.leaveStart;

        // Check if dateString falls between leaveStart and leaveEnd (inclusive)
        if (dateString >= start && dateString <= end) {
          if (filterType === 'all' || filterType === 'leave') {
            dayEvents.push({
              id: `leave_${p.id}_${dateString}`,
              type: 'leave',
              title: `🌴 ${p.name} (Congé)`,
              date: dateString,
              color: 'bg-amber-50 hover:bg-amber-100',
              borderColor: 'border-amber-200',
              textColor: 'text-amber-800',
              notes: `Congé de l'équipe du ${p.leaveStart} au ${p.leaveEnd || 'indéterminé'}`,
              details: [
                { label: 'Employé', value: p.name },
                { label: 'Rôle', value: p.role },
                { label: 'Début', value: p.leaveStart || '—' },
                { label: 'Fin', value: p.leaveEnd || 'indéterminé' },
              ],
            });
          }
        }
      }
    });

    // Add deliveries (livraisons) — placées sur leur date de livraison
    deliveries.forEach(d => {
      if (d.deliveryDate === dateString) {
        if (filterType === 'all' || filterType === 'delivery') {
          dayEvents.push({
            id: `del_${d.id}`,
            type: 'delivery',
            title: `🚚 ${d.clientName}${d.orderId != null ? ` (#${d.orderId})` : ''}`,
            time: d.deliveryTime || undefined,
            date: dateString,
            color: 'bg-blue-50 hover:bg-blue-100',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-800',
            notes: d.notes || undefined,
            details: [
              { label: 'Client', value: d.clientName },
              { label: 'Téléphone', value: d.clientPhone || '—' },
              { label: 'Adresse', value: d.address },
              { label: 'Commande n°', value: d.orderId != null ? `#${d.orderId}` : '—' },
              { label: 'Heure', value: d.deliveryTime || '—' },
              { label: 'Livreur', value: d.driverName || 'Non assigné' },
              { label: 'Statut', value: d.status },
            ],
          });
        }
      }
    });

    // Add special events
    specialEvents.forEach(e => {
      if (e.date === dateString) {
        if (filterType === 'all' || filterType === 'special') {
          const catEmoji = e.category === 'concert' ? '🎸' : e.category === 'theme' ? '✨' : e.category === 'vip' ? '👑' : e.category === 'fermeture' ? '🛑' : '📌';
          const catColors = {
            concert: { bg: 'bg-indigo-50 hover:bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-800' },
            theme: { bg: 'bg-rose-50 hover:bg-rose-100', border: 'border-rose-200', text: 'text-rose-800' },
            vip: { bg: 'bg-purple-50 hover:bg-purple-100', border: 'border-purple-200', text: 'text-purple-800' },
            fermeture: { bg: 'bg-red-50 hover:bg-red-100', border: 'border-red-200', text: 'text-red-800' },
            autre: { bg: 'bg-slate-100 hover:bg-slate-150', border: 'border-slate-300', text: 'text-slate-800' },
          };

          const style = catColors[e.category as keyof typeof catColors] || catColors.autre;

          dayEvents.push({
            id: String(e.id),
            type: 'special',
            title: `${catEmoji} ${e.title}`,
            time: e.time || undefined,
            category: e.category,
            date: dateString,
            color: style.bg,
            borderColor: style.border,
            textColor: style.text,
            notes: e.notes || undefined,
            details: [
              { label: 'Événement', value: e.title },
              { label: 'Catégorie', value: e.category },
              { label: 'Heure', value: e.time || '—' },
            ],
          });
        }
      }
    });

    return dayEvents;
  };

  const daysGrid = getDaysInMonth();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Flat list of upcoming events for sidebar/mobile
  const allEventsFlat = daysGrid
    .filter(cell => cell.isCurrentMonth)
    .map(cell => {
      const dateStr = formatYYYYMMDD(cell.date);
      const events = getEventsForDate(dateStr);
      return {
        date: cell.date,
        dateStr,
        events,
      };
    })
    .filter(day => day.events.length > 0)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  return (
    <div className="space-y-6 text-left">
      {/* Calendar Header Row */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        {/* Navigation & Month picker */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-display font-black text-slate-800 text-base min-w-[150px] text-center capitalize">
            {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-[11px] cursor-pointer"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-red-600 border-red-700 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tous les événements
          </button>
          <button
            onClick={() => setFilterType('reservation')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              filterType === 'reservation'
                ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                : 'bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            🍽️ Réservations
          </button>
          <button
            onClick={() => setFilterType('delivery')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              filterType === 'delivery'
                ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                : 'bg-white border-slate-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            🚚 Livraisons
          </button>
          <button
            onClick={() => setFilterType('leave')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              filterType === 'leave'
                ? 'bg-amber-600 border-amber-700 text-white shadow-sm'
                : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            🌴 Congés Staff
          </button>
          <button
            onClick={() => setFilterType('special')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              filterType === 'special'
                ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                : 'bg-white border-slate-200 text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            ✨ Spéciaux
          </button>

          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer ml-auto lg:ml-2"
          >
            <Plus className="w-4 h-4" /> Spécial Event
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Monthly Calendar Grid */}
        <div className="lg:col-span-9 bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-3xs overflow-hidden">
          {/* Days of the week header */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {weekDays.map((wd, i) => (
              <div key={i} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1.5">
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {daysGrid.map((cell, idx) => {
              const dayStr = formatYYYYMMDD(cell.date);
              const dayEvents = getEventsForDate(dayStr);
              const isToday = formatYYYYMMDD(new Date()) === dayStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[105px] bg-white border border-slate-100/70 rounded-xl p-1.5 flex flex-col justify-between transition-all group ${
                    cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-300 bg-slate-50/20'
                  } ${isToday ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                >
                  {/* Cell Header with Date Number */}
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[11px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-red-600 text-white font-bold' : ''
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {cell.isCurrentMonth && (
                      <button
                        onClick={() => openAddModal(dayStr)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-50 text-slate-400 hover:text-red-600 rounded transition-opacity cursor-pointer"
                        title="Ajouter un événement spécial"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Day events container */}
                  <div className="flex-1 mt-1.5 space-y-1 overflow-y-auto max-h-[72px] custom-scrollbar scrollbar-none">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold truncate leading-normal flex items-center justify-between gap-1 group/evt cursor-pointer ${evt.color} ${evt.borderColor} ${evt.textColor}`}
                        title={`${evt.title}${evt.time ? ` à ${evt.time}` : ''} — cliquer pour les détails`}
                      >
                        <span className="truncate">
                          {evt.time && <span className="font-mono text-[8px] opacity-75 mr-1 font-bold">{evt.time}</span>}
                          {evt.title}
                        </span>
                        
                        {evt.type === 'special' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(evt.id);
                            }}
                            className="hidden group-hover/evt:block text-slate-400 hover:text-red-600 p-0.5 hover:bg-black/5 rounded cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: List / Agenda view */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs text-left">
            <h4 className="font-display font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400" /> Programme de {currentDate.toLocaleDateString('fr-FR', { month: 'long' })}
            </h4>

            {allEventsFlat.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <Info className="w-5 h-5 text-slate-300" />
                <p className="text-[10px] font-semibold">Aucun événement planifié ce mois-ci.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {allEventsFlat.map((day, dIdx) => (
                  <div key={dIdx} className="space-y-2 border-l-2 border-red-500/20 pl-3">
                    <span className="text-[10px] font-extrabold text-slate-400 block font-mono capitalize">
                      {day.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <div className="space-y-1.5">
                      {day.events.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`p-2.5 rounded-xl border text-[11px] leading-relaxed flex flex-col gap-1 shadow-3xs cursor-pointer ${evt.color} ${evt.borderColor}`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className={`font-bold ${evt.textColor}`}>{evt.title}</span>
                            {evt.type === 'special' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(evt.id); }}
                                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-black/5 cursor-pointer shrink-0"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {evt.time && (
                            <span className="font-mono text-[9px] font-bold text-slate-500">Heure : {evt.time}</span>
                          )}
                          {evt.notes && (
                            <p className="text-[10px] text-slate-500 italic font-medium leading-normal mt-0.5">
                              {evt.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Special Event Modal - Wider Width (max-w-xl) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative text-left">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-black text-slate-800 text-base sm:text-lg mb-1.5 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" /> Planifier un Événement Spécial / Autre
            </h3>
            <p className="text-[10px] text-slate-400 mb-6">Ajoutez des concerts, des soirées thématiques, ou des notes générales de fermeture sur votre calendrier.</p>

            <form onSubmit={handleAddEvent} className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Titre de l'événement *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Ex. Concert acoustique Live, Soirée Gastronomie de l'Est..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Heure (Optionnel)</label>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Catégorie d'événement</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'theme', label: '✨ Thème', color: 'border-rose-200 text-rose-700 bg-rose-50' },
                    { key: 'concert', label: '🎸 Concert', color: 'border-indigo-200 text-indigo-700 bg-indigo-50' },
                    { key: 'vip', label: '👑 VIP', color: 'border-purple-200 text-purple-700 bg-purple-50' },
                    { key: 'fermeture', label: '🛑 Fermé', color: 'border-red-200 text-red-700 bg-red-50' },
                    { key: 'autre', label: '📌 Autre', color: 'border-slate-300 text-slate-700 bg-slate-50' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key as any)}
                      className={`px-3 py-2 border rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer ${
                        category === cat.key
                          ? `${cat.color} ring-2 ring-slate-800/20 shadow-xs scale-[1.02]`
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes de l'événement</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Informations ou exigences d'organisation..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-red-600/10"
                >
                  Ajouter au calendrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de détail d'un événement (au clic) */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-t-4 relative text-left ${selectedEvent.borderColor}`}
          >
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {selectedEvent.type === 'reservation' && 'Réservation'}
              {selectedEvent.type === 'delivery' && 'Livraison'}
              {selectedEvent.type === 'leave' && 'Congé du personnel'}
              {selectedEvent.type === 'special' && 'Événement spécial'}
            </span>
            <h3 className="font-display font-black text-slate-800 text-base mb-1">{selectedEvent.title}</h3>
            {selectedEvent.date && (
              <p className="text-[11px] font-mono text-slate-500 mb-4 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {selectedEvent.date}{selectedEvent.time ? ` — ${selectedEvent.time}` : ''}
              </p>
            )}

            {selectedEvent.details && selectedEvent.details.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                {selectedEvent.details.map((row, i) => (
                  <div key={i} className="flex justify-between items-start gap-3 text-xs">
                    <span className="text-slate-400 font-semibold shrink-0">{row.label}</span>
                    <span className="text-slate-800 font-medium text-right break-words">{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedEvent.notes && (
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-xs text-slate-600 italic leading-relaxed">{selectedEvent.notes}</p>
              </div>
            )}

            {selectedEvent.type === 'special' && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => { handleDeleteEvent(selectedEvent.id); setSelectedEvent(null); }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer l'événement
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
