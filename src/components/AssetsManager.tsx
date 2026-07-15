import React, { useState } from 'react';
import { Asset } from '../types.ts';
import { Package, Armchair, Tv, Bike, Shirt, Plus, Search, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';

interface AssetsManagerProps {
  assets: Asset[];
  onAddAsset: (data: any) => Promise<void>;
  onEditAsset: (id: number, data: any) => Promise<void>;
  onDeleteAsset: (id: number) => Promise<void>;
}

// Catégories de biens matériels.
const CATEGORIES = [
  { key: 'mobilier', label: 'Mobilier', icon: Armchair, emoji: '🪑' },
  { key: 'electronique', label: 'Électronique', icon: Tv, emoji: '📺' },
  { key: 'vehicule', label: 'Véhicule', icon: Bike, emoji: '🏍️' },
  { key: 'equipement', label: 'Équipement', icon: Shirt, emoji: '🧑‍🍳' },
  { key: 'autre', label: 'Autre', icon: Package, emoji: '📦' },
];
const categoryMeta = (key: string) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[4];

const CONDITIONS = [
  { key: 'bon', label: 'Bon état', style: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { key: 'moyen', label: 'Moyen', style: 'bg-amber-50 text-amber-700 border-amber-100' },
  { key: 'a_reparer', label: 'À réparer', style: 'bg-rose-50 text-rose-700 border-rose-100' },
];
const conditionMeta = (key: string) => CONDITIONS.find((c) => c.key === key) || CONDITIONS[0];

export default function AssetsManager({ assets, onAddAsset, onEditAsset, onDeleteAsset }: AssetsManagerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(''); // '' = toutes
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('mobilier');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('bon');
  const [purchaseValue, setPurchaseValue] = useState(0);
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');

  const formatAr = (amount: number) =>
    new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(amount).replace('MGA', 'Ar').trim();

  const openAdd = () => {
    setEditing(null);
    setName('');
    setCategory('mobilier');
    setQuantity(1);
    setCondition('bon');
    setPurchaseValue(0);
    setPhotoUrl('');
    setNotes('');
    setIsOpen(true);
  };

  const openEdit = (a: Asset) => {
    setEditing(a);
    setName(a.name);
    setCategory(a.category);
    setQuantity(a.quantity);
    setCondition(a.condition);
    setPurchaseValue(a.purchaseValue || 0);
    setPhotoUrl(a.photoUrl || '');
    setNotes(a.notes || '');
    setIsOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      category,
      quantity: Number(quantity) || 1,
      condition,
      purchaseValue: Number(purchaseValue) || 0,
      photoUrl: photoUrl || null,
      notes: notes || null,
    };
    if (editing) await onEditAsset(editing.id, payload);
    else await onAddAsset(payload);
    setIsOpen(false);
  };

  const isVehicle = category === 'vehicule';

  // Filtrage.
  const q = search.trim().toLowerCase();
  const filtered = assets.filter((a) => {
    const matchText = !q || a.name.toLowerCase().includes(q) || (a.notes || '').toLowerCase().includes(q);
    const matchCat = !categoryFilter || a.category === categoryFilter;
    return matchText && matchCat;
  });

  const totalUnits = assets.reduce((s, a) => s + (a.quantity || 0), 0);
  const totalValue = assets.reduce((s, a) => s + (a.purchaseValue || 0) * (a.quantity || 1), 0);
  const countByCategory = (key: string) => assets.filter((a) => a.category === key).length;

  return (
    <div className="space-y-6 text-left">
      {/* En-tête : résumé + bouton ajouter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Types de biens</p>
          <h4 className="font-display font-black text-xl text-slate-800 mt-0.5">{assets.length}</h4>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unités au total</p>
          <h4 className="font-display font-black text-xl text-slate-800 mt-0.5">{totalUnits}</h4>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs col-span-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valeur estimée totale</p>
          <h4 className="font-display font-black text-xl text-emerald-700 mt-0.5 truncate">{formatAr(totalValue)}</h4>
        </div>
      </div>

      {/* Recherche + filtres catégorie + bouton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un bien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 outline-none text-slate-800"
            />
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajouter un bien
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${!categoryFilter ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            Tout ({assets.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${categoryFilter === c.key ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            >
              {c.emoji} {c.label} ({countByCategory(c.key)})
            </button>
          ))}
        </div>
      </div>

      {/* Grille des biens */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 shadow-3xs">
          <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-xs">Aucun bien enregistré{categoryFilter || search ? ' pour ce filtre' : ''}.</p>
          <p className="text-[10px] text-slate-400 mt-1">Cliquez sur « Ajouter un bien » pour commencer votre inventaire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const cat = categoryMeta(a.category);
            const cond = conditionMeta(a.condition);
            const CatIcon = cat.icon;
            return (
              <div key={a.id} className="bg-white rounded-3xl border border-slate-100 p-4 shadow-3xs flex flex-col group">
                {/* Photo ou placeholder */}
                <div className="relative h-32 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 mb-3 flex items-center justify-center">
                  {a.photoUrl ? (
                    <img src={a.photoUrl} alt={a.name} onClick={() => setPreview(a.photoUrl)} className="w-full h-full object-cover cursor-zoom-in" />
                  ) : (
                    <CatIcon className="w-10 h-10 text-slate-200" />
                  )}
                  <span className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded-full bg-white/90 border border-slate-100 font-bold text-slate-600">
                    {cat.emoji} {cat.label}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">{a.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Quantité : <span className="font-bold text-slate-700">{a.quantity}</span></p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase shrink-0 ${cond.style}`}>{cond.label}</span>
                </div>

                {a.purchaseValue > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Valeur : <span className="font-mono font-bold text-emerald-700">{formatAr(a.purchaseValue)}</span>
                    {a.quantity > 1 && <span className="text-slate-400"> /unité</span>}
                  </p>
                )}
                {a.notes && <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-2">{a.notes}</p>}

                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-50">
                  <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg cursor-pointer" title="Modifier">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm(`Supprimer « ${a.name} » de l'inventaire ?`)) onDeleteAsset(a.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale ajout / édition */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 text-left max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-red-600" />
                {editing ? 'Modifier le bien' : 'Ajouter un bien'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nom du bien *</label>
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                  placeholder="Ex. Table ronde, Moto livraison, Télé Samsung"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catégorie</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={`px-2 py-2 border rounded-xl text-[11px] font-bold text-center cursor-pointer transition-all ${category === c.key ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500/30' : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'}`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantité</label>
                  <input
                    type="number" min="1" value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valeur unitaire (Ar)</label>
                  <input
                    type="number" min="0" value={purchaseValue}
                    onChange={(e) => setPurchaseValue(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 font-mono"
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">État</label>
                <div className="grid grid-cols-3 gap-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCondition(c.key)}
                      className={`px-2 py-2 border rounded-xl text-[11px] font-bold text-center cursor-pointer transition-all ${condition === c.key ? `${c.style} ring-1 ring-offset-1 ring-red-500` : 'border-slate-200 hover:bg-slate-50 text-slate-500 bg-white'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo — utile surtout pour les véhicules (moto, voiture, camionnette) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Photo {isVehicle && <span className="text-red-600">(recommandé pour un véhicule)</span>}
                </label>
                <div className="flex items-center gap-3">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Aperçu" onClick={() => setPreview(photoUrl)} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 cursor-zoom-in" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-[9px] font-semibold shrink-0">Vide</div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-all cursor-pointer"
                  />
                  {photoUrl && (
                    <button type="button" onClick={() => setPhotoUrl('')} className="p-1.5 text-slate-300 hover:text-red-600 cursor-pointer shrink-0" title="Retirer la photo">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note (facultatif)</label>
                <textarea
                  rows={2} value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500 resize-none"
                  placeholder="N° d'immatriculation, marque, date d'achat, détails…"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold">
                  {editing ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aperçu plein écran d'une photo */}
      {preview && (
        <div onClick={() => setPreview(null)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 z-[60] cursor-zoom-out">
          <img src={preview} alt="Aperçu" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
