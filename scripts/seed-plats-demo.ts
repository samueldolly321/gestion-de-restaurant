// Ajoute des PLATS D'EXEMPLE (avec fiche technique) + les articles de stock correspondants,
// pour tester la carte, les additions, le coût de revient et la déduction de stock.
//
// Usage :  npx tsx scripts/seed-plats-demo.ts <id du compte>
//   ex.    npx tsx scripts/seed-plats-demo.ts 2
// Base ciblée : celle du .env (base locale). Pour l'application .exe (PostgreSQL embarqué,
// appli OUVERTE), lancer avec : SQL_HOST=127.0.0.1 SQL_PORT=54329 SQL_USER=user SQL_PASSWORD=user ...
//
// Sans doublon : un article de stock / un plat qui existe déjà (même nom) est réutilisé / ignoré.
import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { stocks, menuItems } from '../src/db/schema.ts';
import { and, eq } from 'drizzle-orm';

type StockDef = { name: string; unit: string; unitCost: number; quantity: number; minStock: number };
// Unités alignées sur la fiche technique (g, ml, pieces, bouteilles) : coût = quantité × coût unitaire.
const STOCKS: StockDef[] = [
  { name: 'Riz', unit: 'g', unitCost: 4, quantity: 25000, minStock: 5000 },
  { name: 'Viande de zébu', unit: 'g', unitCost: 28, quantity: 8000, minStock: 2000 },
  { name: 'Poulet', unit: 'g', unitCost: 18, quantity: 10000, minStock: 2000 },
  { name: 'Porc', unit: 'g', unitCost: 22, quantity: 6000, minStock: 1500 },
  { name: 'Crevettes', unit: 'g', unitCost: 45, quantity: 3000, minStock: 500 },
  { name: 'Brèdes mafana', unit: 'g', unitCost: 4, quantity: 3000, minStock: 500 },
  { name: 'Ravitoto (feuilles de manioc pilées)', unit: 'g', unitCost: 5, quantity: 4000, minStock: 1000 },
  { name: 'Lait de coco', unit: 'ml', unitCost: 8, quantity: 4000, minStock: 1000 },
  { name: 'Oignon', unit: 'g', unitCost: 6, quantity: 5000, minStock: 1000 },
  { name: 'Tomate', unit: 'g', unitCost: 5, quantity: 5000, minStock: 1000 },
  { name: 'Ail', unit: 'g', unitCost: 20, quantity: 1000, minStock: 200 },
  { name: 'Gingembre', unit: 'g', unitCost: 15, quantity: 800, minStock: 200 },
  { name: 'Carotte', unit: 'g', unitCost: 4, quantity: 4000, minStock: 800 },
  { name: 'Pomme de terre', unit: 'g', unitCost: 3, quantity: 8000, minStock: 2000 },
  { name: 'Huile', unit: 'ml', unitCost: 9, quantity: 5000, minStock: 1000 },
  { name: 'Nouilles (mi)', unit: 'g', unitCost: 8, quantity: 5000, minStock: 1000 },
  { name: 'Oeuf', unit: 'pieces', unitCost: 700, quantity: 60, minStock: 10 },
  { name: 'Banane', unit: 'pieces', unitCost: 300, quantity: 40, minStock: 10 },
  { name: 'Sucre', unit: 'g', unitCost: 5, quantity: 5000, minStock: 1000 },
  { name: 'Farine', unit: 'g', unitCost: 4, quantity: 5000, minStock: 1000 },
  { name: 'Lait', unit: 'ml', unitCost: 5, quantity: 5000, minStock: 1000 },
  { name: 'Café moulu', unit: 'g', unitCost: 30, quantity: 2000, minStock: 300 },
  { name: 'Fruit de la passion', unit: 'pieces', unitCost: 300, quantity: 50, minStock: 10 },
  { name: 'Coca-Cola 33cl', unit: 'bouteilles', unitCost: 2000, quantity: 48, minStock: 12 },
  { name: 'Rhum arrangé', unit: 'ml', unitCost: 40, quantity: 3000, minStock: 500 },
];

type DishDef = { name: string; category: string; price: number; description: string; ingredients: [string, number][] };
const DISHES: DishDef[] = [
  { name: 'Romazava', category: 'plat', price: 22000, description: 'Bouillon de zébu aux brèdes mafana, servi avec du riz.',
    ingredients: [['Viande de zébu', 200], ['Brèdes mafana', 150], ['Tomate', 80], ['Oignon', 50], ['Gingembre', 10], ['Ail', 5], ['Huile', 15], ['Riz', 250]] },
  { name: 'Ravitoto sy henakisoa', category: 'plat', price: 24000, description: 'Feuilles de manioc pilées mijotées au porc, riz blanc.',
    ingredients: [['Ravitoto (feuilles de manioc pilées)', 200], ['Porc', 200], ['Ail', 10], ['Oignon', 40], ['Lait de coco', 50], ['Huile', 10], ['Riz', 250]] },
  { name: 'Akoho sy voanio', category: 'plat', price: 25000, description: 'Poulet au lait de coco, tomate et gingembre, riz blanc.',
    ingredients: [['Poulet', 300], ['Lait de coco', 150], ['Tomate', 80], ['Oignon', 50], ['Ail', 5], ['Gingembre', 5], ['Huile', 15], ['Riz', 250]] },
  { name: 'Henomby ritra', category: 'plat', price: 26000, description: 'Zébu mijoté jusqu\'à caramélisation, ail et gingembre, riz.',
    ingredients: [['Viande de zébu', 250], ['Oignon', 60], ['Ail', 10], ['Gingembre', 10], ['Huile', 15], ['Riz', 250]] },
  { name: 'Mi sao crevettes', category: 'plat', price: 20000, description: 'Nouilles sautées aux crevettes, légumes et œuf.',
    ingredients: [['Nouilles (mi)', 200], ['Crevettes', 100], ['Carotte', 60], ['Brèdes mafana', 50], ['Oignon', 40], ['Ail', 5], ['Huile', 20], ['Oeuf', 1]] },
  { name: 'Soupe chinoise', category: 'entree_chaude', price: 15000, description: 'Bouillon de poulet, nouilles, légumes et œuf.',
    ingredients: [['Nouilles (mi)', 80], ['Poulet', 80], ['Carotte', 30], ['Oignon', 20], ['Ail', 3], ['Oeuf', 1]] },
  { name: 'Salade composée', category: 'entree_froide', price: 12000, description: 'Tomate, carotte, pomme de terre, œuf dur, vinaigrette.',
    ingredients: [['Tomate', 100], ['Carotte', 60], ['Pomme de terre', 120], ['Oeuf', 1], ['Oignon', 20], ['Huile', 10]] },
  { name: 'Frites maison', category: 'snack', price: 8000, description: 'Pommes de terre fraîches frites.',
    ingredients: [['Pomme de terre', 300], ['Huile', 40]] },
  { name: 'Banane flambée au rhum', category: 'dessert', price: 10000, description: 'Bananes caramélisées flambées au rhum arrangé.',
    ingredients: [['Banane', 2], ['Sucre', 30], ['Rhum arrangé', 30]] },
  { name: 'Crêpe au sucre', category: 'dessert', price: 7000, description: 'Crêpe maison, sucre.',
    ingredients: [['Farine', 60], ['Lait', 120], ['Oeuf', 1], ['Sucre', 20]] },
  { name: 'Café', category: 'boisson_chaude', price: 3000, description: 'Café local.',
    ingredients: [['Café moulu', 10], ['Sucre', 10]] },
  { name: 'Jus de fruit de la passion', category: 'boisson_fraiche', price: 5000, description: 'Jus frais pressé.',
    ingredients: [['Fruit de la passion', 3], ['Sucre', 25]] },
  { name: 'Coca-Cola 33cl', category: 'boisson_fraiche', price: 4000, description: 'Bouteille 33 cl.',
    ingredients: [['Coca-Cola 33cl', 1]] },
  { name: 'Rhum arrangé (verre)', category: 'boisson_alcoolisee', price: 6000, description: 'Verre de 4 cl.',
    ingredients: [['Rhum arrangé', 40]] },
];

const norm = (s: string) => s.trim().toLowerCase();

async function main() {
  const userId = Number(process.argv[2]);
  if (!Number.isInteger(userId) || userId <= 0) {
    console.log('Usage : npx tsx scripts/seed-plats-demo.ts <id du compte>');
    process.exit(1);
  }

  // 1) Articles de stock (réutilisés si le nom existe déjà).
  const existingStocks = await db.select().from(stocks).where(eq(stocks.userId, userId));
  const stockByName = new Map(existingStocks.map((s) => [norm(s.itemName), s]));
  let createdStocks = 0;
  for (const def of STOCKS) {
    if (stockByName.has(norm(def.name))) continue;
    const [row] = await db.insert(stocks).values({
      userId, itemName: def.name, unit: def.unit, unitCost: def.unitCost,
      quantity: def.quantity, initialQuantity: def.quantity, minStock: def.minStock,
    }).returning();
    stockByName.set(norm(def.name), row);
    createdStocks++;
  }

  // 2) Plats avec fiche technique reliée au stock.
  const existingMenu = await db.select().from(menuItems).where(eq(menuItems.userId, userId));
  const menuNames = new Set(existingMenu.map((m) => norm(m.name)));
  let createdDishes = 0;
  for (const dish of DISHES) {
    if (menuNames.has(norm(dish.name))) { console.log(`- « ${dish.name} » existe déjà : ignoré`); continue; }
    const ingredients = dish.ingredients.map(([name, qty]) => {
      const st = stockByName.get(norm(name))!;
      // Unité du stock (la fiche technique utilise la même unité → coût = quantité × coût unitaire).
      return { name: st.itemName, grammage: qty, unit: st.unit, cost: Math.round(qty * (st.unitCost || 0)), stockId: st.id };
    });
    const cost = ingredients.reduce((s, i) => s + i.cost, 0);
    await db.insert(menuItems).values({
      userId, name: dish.name, category: dish.category, price: dish.price,
      description: dish.description, isAvailable: true, ingredients,
    });
    createdDishes++;
    console.log(`+ ${dish.name.padEnd(28)} prix ${String(dish.price).padStart(6)} Ar | coût matière ${String(cost).padStart(5)} Ar | marge ${Math.round((1 - cost / dish.price) * 100)} %`);
  }
  console.log(`\nTerminé : ${createdDishes} plat(s) et ${createdStocks} article(s) de stock ajoutés pour le compte ${userId}.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
