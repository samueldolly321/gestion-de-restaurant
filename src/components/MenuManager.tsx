import React, { useState } from 'react';
import { MenuItem, Ingredient, Stock } from '../types.ts';
import { Search, Plus, Utensils, ToggleLeft, ToggleRight, Trash2, Edit2, X, Image as ImageIcon, Scale, Link2 } from 'lucide-react';

// Catégories prédéfinies de la carte. La catégorie est stockée en texte libre :
// on peut donc aussi en créer des personnalisées via l'option "Autre".
const MENU_CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: 'entree_chaude', label: 'Entrée chaude', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  { value: 'entree_froide', label: 'Entrée froide', color: 'bg-sky-50 text-sky-700 border-sky-100' },
  { value: 'plat', label: 'Plat de résistance', color: 'bg-red-50 text-red-700 border-red-100' },
  { value: 'snack', label: 'Snack', color: 'bg-lime-50 text-lime-700 border-lime-100' },
  { value: 'dessert', label: 'Dessert', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'boisson_chaude', label: 'Boisson chaude', color: 'bg-rose-50 text-rose-700 border-rose-100' },
  { value: 'boisson_fraiche', label: 'Boisson fraîche', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'boisson_alcoolisee', label: 'Boisson alcoolisée', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { value: 'cocktail', label: 'Cocktail', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' },
];

// Anciennes valeurs (compat) pour les articles déjà enregistrés avant l'enrichissement.
const LEGACY_CATEGORY_LABELS: Record<string, string> = { entree: 'Entrée', boisson: 'Boisson' };

const CUSTOM_CATEGORY = '__custom__';

interface MenuManagerProps {
  menuItems: MenuItem[];
  stocks: Stock[];
  onAddMenuItem: (formData: any) => Promise<void>;
  onEditMenuItem: (id: number, formData: any) => Promise<void>;
  onDeleteMenuItem: (id: number) => Promise<void>;
}

export default function MenuManager({
  menuItems,
  stocks,
  onAddMenuItem,
  onEditMenuItem,
  onDeleteMenuItem
}: MenuManagerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(15000); // 15,000 Ar
  const [category, setCategory] = useState('plat'); // valeur prédéfinie OU CUSTOM_CATEGORY
  const [customCategory, setCustomCategory] = useState(''); // texte saisi si catégorie personnalisée
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]); // fiche technique du plat

  // Helpers fiche technique (ingrédients : grammage + coût, + lien vers le stock)
  const addIngredientRow = () => setIngredients((prev) => [...prev, { name: '', grammage: 0, unit: 'g', cost: 0, stockId: null }]);
  const updateIngredient = (idx: number, field: keyof Ingredient, value: string | number) =>
    setIngredients((prev) => prev.map((ing, i) => {
      if (i !== idx) return ing;
      const next = { ...ing, [field]: value } as Ingredient;
      // Si l'ingrédient est lié au stock, le coût suit le grammage × prix unitaire du stock.
      if (field === 'grammage' && next.stockId != null) {
        const st = stocks.find((s) => s.id === next.stockId);
        if (st) next.cost = (Number(value) || 0) * (st.unitCost || 0);
      }
      return next;
    }));
  const removeIngredient = (idx: number) => setIngredients((prev) => prev.filter((_, i) => i !== idx));

  // Lie (ou délie) un ingrédient à un article de stock : reprend son nom/unité et calcule le coût.
  const linkIngredientToStock = (idx: number, stockIdStr: string) => {
    setIngredients((prev) => prev.map((ing, i) => {
      if (i !== idx) return ing;
      if (!stockIdStr) return { ...ing, stockId: null }; // « Libre » : redevient éditable manuellement
      const st = stocks.find((s) => s.id === Number(stockIdStr));
      if (!st) return ing;
      return {
        ...ing,
        stockId: st.id,
        name: st.itemName,
        unit: st.unit,
        cost: (Number(ing.grammage) || 0) * (st.unitCost || 0),
      };
    }));
  };

  const totalIngredientCost = ingredients.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);

  // Format Ariary helper
  const formatAr = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar').trim();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setPrice(18000); // Default price: 18k Ar
    setCategory('plat');
    setCustomCategory('');
    setIsAvailable(true);
    setImageUrl('');
    setIngredients([]);
    setIsOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price);
    // Si la catégorie de l'article n'est pas prédéfinie, on ouvre en mode "personnalisée".
    const isPredefined = MENU_CATEGORIES.some((c) => c.value === item.category);
    setCategory(isPredefined ? item.category : CUSTOM_CATEGORY);
    setCustomCategory(isPredefined ? '' : item.category);
    setIsAvailable(item.isAvailable);
    setImageUrl(item.imageUrl || '');
    setIngredients(Array.isArray(item.ingredients) ? item.ingredients : []);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Catégorie finale : le texte personnalisé si "Autre" est choisi, sinon la valeur prédéfinie.
    const finalCategory = category === CUSTOM_CATEGORY ? (customCategory.trim() || 'autre') : category;
    const payload = {
      name,
      description: description || null,
      price: Number(price),
      category: finalCategory,
      isAvailable,
      imageUrl: imageUrl || null,
      // Fiche technique : on ne garde que les ingrédients nommés.
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), grammage: Number(i.grammage) || 0, unit: i.unit, cost: Number(i.cost) || 0, stockId: i.stockId ?? null })),
    };

    if (editingItem) {
      await onEditMenuItem(editingItem.id, payload);
    } else {
      await onAddMenuItem(payload);
    }
    setIsOpen(false);
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    await onEditMenuItem(item.id, {
      ...item,
      isAvailable: !item.isAvailable
    });
  };

  const getCategoryLabel = (c: string) => {
    const known = MENU_CATEGORIES.find((cat) => cat.value === c);
    if (known) return known.label;
    if (LEGACY_CATEGORY_LABELS[c]) return LEGACY_CATEGORY_LABELS[c];
    return c; // catégorie personnalisée : affichée telle quelle
  };

  const getCategoryColor = (c: string) => {
    const known = MENU_CATEGORIES.find((cat) => cat.value === c);
    if (known) return known.color;
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  // Catégories affichées dans les filtres : "Tous" + celles réellement utilisées (personnalisées incluses).
  const usedCategories = Array.from(new Set(menuItems.map((m) => m.category)));
  const filterCategories = [
    'all',
    ...MENU_CATEGORIES.map((c) => c.value).filter((v) => usedCategories.includes(v)),
    ...usedCategories.filter((c) => !MENU_CATEGORIES.some((mc) => mc.value === c)),
  ];

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Search, Filter and Actions Row */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un plat, une boisson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            {filterCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-3xs border border-slate-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {cat === 'all' ? 'Tous' : getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Ajouter à la Carte
        </button>
      </div>

      {/* Menu list */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 shadow-3xs">
          <Utensils className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs">Aucun élément de menu correspondant.</p>
          <p className="text-[10px] text-slate-400 mt-1">Créez des entrées, plats de résistance, desserts ou boissons.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-3xl border shadow-3xs flex flex-col justify-between hover:border-red-100 transition-all overflow-hidden relative ${
                item.isAvailable ? 'border-slate-100' : 'border-slate-200 bg-slate-50/50 opacity-80'
              }`}
            >
              {/* Dish Image */}
              <div className="h-40 w-full bg-slate-100 relative overflow-hidden group">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1.5">
                    <Utensils className="w-10 h-10 stroke-[1.25]" />
                    <span className="text-[10px] uppercase font-bold tracking-wider font-mono">RestoPilote Cuisine</span>
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide shadow-xs ${getCategoryColor(item.category)}`}>
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
                
                <div className="absolute bottom-3 right-3">
                  <span className="font-display font-black text-xs sm:text-sm text-slate-900 bg-yellow-400 border border-yellow-500 px-3 py-1 rounded-xl shadow-xs">
                    {formatAr(item.price)}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {item.name}
                    {!item.isAvailable && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[8px] font-bold">
                        Épuisé
                      </span>
                    )}
                  </h3>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2 italic">
                      "{item.description}"
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-50">
                  {/* Available toggle */}
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {item.isAvailable ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-500" />
                        <span>Disponible</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        <span>Indisponible</span>
                      </>
                    )}
                  </button>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all cursor-pointer"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer ${item.name} de la carte ?`)) {
                          onDeleteMenuItem(item.id);
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
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="sticky top-0 float-right -mr-1 p-1.5 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-bold text-slate-800 text-base mb-4">
              {editingItem ? 'Modifier le Plat / Boisson' : 'Nouveau Plat ou Boisson'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nom du Plat / Boisson *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  placeholder="Ex. Romazava au boeuf, Sambos..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Prix (Ar TTC) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    {MENU_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                    <option value={CUSTOM_CATEGORY}>➕ Autre (personnalisée)…</option>
                  </select>
                  {category === CUSTOM_CATEGORY && (
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 w-full px-3.5 py-2 bg-white border border-red-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      placeholder="Nom de la catégorie (ex. Tapas, Vins, Jus...)"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Illustration de l'image (Glissez ou cliquez pour importer)
                </label>
                
                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-36 flex items-center justify-center">
                    <img src={imageUrl} alt="Aperçu" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer la photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[144px]"
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="p-3 bg-white rounded-2xl shadow-3xs border border-slate-100 text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Importer une image</span>
                    <span className="text-[10px] text-slate-400">Glissez-déposez ou cliquez pour parcourir vos fichiers</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Description / Ingrédients</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                  placeholder="Ingrédients locaux, épices de Madagascar..."
                />
              </div>

              {/* Fiche technique : ingrédients (grammage + coût) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" /> Fiche technique — Ingrédients
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-[10px] font-bold text-red-600 hover:text-red-500 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>

                {ingredients.length === 0 ? (
                  <p className="text-[10px] text-slate-400 border border-dashed border-slate-200 rounded-xl px-3 py-2.5">
                    Aucun ingrédient. Ajoutez le grammage et le coût de chaque ingrédient pour calculer le coût de revient du plat.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing, idx) => {
                      const isLinked = ing.stockId != null;
                      return (
                        <div key={idx} className="border border-slate-100 rounded-xl p-2 bg-white space-y-1.5">
                          {/* Lien vers un article de stock (déduction auto à la vente) */}
                          <div className="flex items-center gap-1.5">
                            <Link2 className={`w-3.5 h-3.5 shrink-0 ${isLinked ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <select
                              value={isLinked ? String(ing.stockId) : ''}
                              onChange={(e) => linkIngredientToStock(idx, e.target.value)}
                              className="flex-1 min-w-0 px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-[11px] focus:ring-1 focus:ring-red-500 outline-none text-slate-800 cursor-pointer"
                            >
                              <option value="">— Ingrédient libre (non lié au stock) —</option>
                              {stocks.map((s) => (
                                <option key={s.id} value={s.id}>{s.itemName} ({s.unit})</option>
                              ))}
                            </select>
                            {isLinked && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                déduit du stock
                              </span>
                            )}
                          </div>

                          {/* Nom / Quantité / Unité / Coût (auto si lié) */}
                          <div className="flex items-center gap-1.5">
                            <input
                              value={ing.name}
                              onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                              placeholder="Ex. Boeuf"
                              disabled={isLinked}
                              className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ing.grammage}
                              onChange={(e) => updateIngredient(idx, 'grammage', Number(e.target.value) || 0)}
                              title="Quantité consommée par portion"
                              className="w-16 px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-800 font-mono"
                            />
                            <select
                              value={ing.unit}
                              onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                              disabled={isLinked}
                              className="w-14 px-1 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-800 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="piece">pce</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              value={ing.cost}
                              onChange={(e) => updateIngredient(idx, 'cost', Number(e.target.value) || 0)}
                              disabled={isLinked}
                              title={isLinked ? 'Coût calculé automatiquement depuis le prix du stock' : 'Coût de cet ingrédient'}
                              className="w-20 px-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-800 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeIngredient(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Retirer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {ingredients.length > 0 && (
                  <div className="mt-2 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px]">
                    <span className="text-slate-500 font-semibold">
                      Coût de revient : <span className="font-mono font-bold text-slate-800">{formatAr(totalIngredientCost)}</span>
                    </span>
                    <span className="text-slate-500 font-semibold">
                      Marge : <span className={`font-mono font-bold ${Number(price) - totalIngredientCost >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatAr(Number(price) - totalIngredientCost)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="avail-check"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                />
                <label htmlFor="avail-check" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  Disponible à la commande immédiatement
                </label>
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
                  {editingItem ? 'Enregistrer les modifications' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
