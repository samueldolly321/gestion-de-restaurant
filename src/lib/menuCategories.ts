// Catégories de la carte (partagées : Carte du Chef + sélection des plats dans « Ouvrir une commande »).
// La catégorie est stockée en texte libre : on peut aussi en créer des personnalisées.
export const MENU_CATEGORIES: { value: string; label: string; color: string }[] = [
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

// Anciennes valeurs (compat) pour les articles enregistrés avant l'enrichissement.
export const LEGACY_CATEGORY_LABELS: Record<string, string> = { entree: 'Entrée', boisson: 'Boisson' };

export const getCategoryLabel = (c: string) => {
  const known = MENU_CATEGORIES.find((cat) => cat.value === c);
  if (known) return known.label;
  if (LEGACY_CATEGORY_LABELS[c]) return LEGACY_CATEGORY_LABELS[c];
  return c; // catégorie personnalisée : affichée telle quelle
};

export const getCategoryColor = (c: string) =>
  MENU_CATEGORIES.find((cat) => cat.value === c)?.color || 'bg-slate-50 text-slate-700 border-slate-100';

// Catégories effectivement utilisées, dans l'ordre de la carte (personnalisées à la fin).
export const usedCategoriesInOrder = (categories: string[]) => {
  const used = Array.from(new Set(categories));
  return [
    ...MENU_CATEGORIES.map((c) => c.value).filter((v) => used.includes(v)),
    ...used.filter((c) => !MENU_CATEGORIES.some((mc) => mc.value === c)),
  ];
};
