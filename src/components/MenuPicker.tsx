import React, { useMemo, useState } from 'react';
import { Search, Utensils, Plus, Minus } from 'lucide-react';
import { MenuItem } from '../types.ts';
import { getCategoryColor, getCategoryLabel, usedCategoriesInOrder } from '../lib/menuCategories.ts';

// Carte en images pour composer une commande : un clic sur un plat l'ajoute à l'addition.
interface MenuPickerProps {
  menuItems: MenuItem[];
  quantities: Record<number, number>; // quantité déjà dans l'addition, par plat
  onAdd: (menuItemId: number) => void;
  onRemoveOne: (menuItemId: number) => void;
  formatAr: (n: number) => string;
}

export default function MenuPicker({ menuItems, quantities, onAdd, onRemoveOne, formatAr }: MenuPickerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const available = useMemo(() => menuItems.filter((m) => m.isAvailable), [menuItems]);
  const categories = useMemo(() => usedCategoriesInOrder(available.map((m) => m.category)), [available]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Ordre d'une vraie carte : entrées → plats → desserts → boissons, puis par nom.
    const rank = (c: string) => categories.indexOf(c);
    return available
      .filter((m) =>
        (category === 'all' || m.category === category) &&
        (!q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q))
      )
      .sort((a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name, 'fr'));
  }, [available, categories, category, search]);

  return (
    <div className="flex flex-col min-h-0">
      {/* Recherche */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un plat ou une boisson…"
          className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-800"
        />
      </div>

      {/* Filtres par catégorie */}
      <div className="flex gap-1.5 overflow-x-auto py-3 shrink-0">
        {['all', ...categories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border cursor-pointer transition-colors ${
              category === c ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c === 'all' ? `Tous (${available.length})` : getCategoryLabel(c)}
          </button>
        ))}
      </div>

      {/* Grille de la carte */}
      {available.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
          Aucun plat disponible. Ajoutez des plats dans la « Carte du Chef ».
        </div>
      ) : shown.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
          Aucun résultat pour cette recherche.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 lg:max-h-[62vh]">
          {shown.map((m) => {
            const qty = quantities[m.id] || 0;
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => onAdd(m.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd(m.id); } }}
                title={`Ajouter « ${m.name} »`}
                className={`group text-left bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  qty > 0 ? 'border-red-400 ring-1 ring-red-400/40' : 'border-slate-100'
                }`}
              >
                <div className="h-24 w-full bg-slate-100 relative overflow-hidden">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Utensils className="w-8 h-8 stroke-[1.25]" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-wide ${getCategoryColor(m.category)}`}>
                    {getCategoryLabel(m.category)}
                  </span>
                  {qty > 0 && (
                    <span className="absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center shadow">
                      {qty}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2 min-h-[2rem]">{m.name}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-black text-slate-900 bg-yellow-400 border border-yellow-500 px-2 py-0.5 rounded-lg font-mono">
                      {formatAr(m.price)}
                    </span>
                    <span className="flex items-center gap-1">
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onRemoveOne(m.id); }}
                          title="Retirer un"
                          className="p-1 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      )}
                      <span className="p-1 rounded-lg bg-red-600 text-white"><Plus className="w-3 h-3" /></span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
