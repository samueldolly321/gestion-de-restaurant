// One-shot : migre les commandes fournisseurs mono-article vers le modèle multi-articles.
// Pour chaque commande existante sans ligne, crée 1 ligne supplier_order_items depuis les
// colonnes plates (label/quantity/unitPrice/amount/stockId/stockApplied), puis recalcule
// le montant de l'en-tête = somme des lignes. Idempotent : relançable sans dupliquer.
//
//   Lancer :  npx tsx scripts/migrate-supplier-orders.ts
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.ts';
import { supplierOrders, supplierOrderItems } from '../src/db/schema.ts';

async function main() {
  const orders = await db.select().from(supplierOrders);
  console.log(`Commandes fournisseurs trouvées : ${orders.length}`);

  let created = 0;
  let skipped = 0;

  for (const o of orders) {
    const existing = await db
      .select()
      .from(supplierOrderItems)
      .where(eq(supplierOrderItems.orderId, o.id));

    if (existing.length > 0) {
      skipped++;
      continue; // déjà migrée
    }

    const quantity = Number((o as any).quantity) || 1;
    const unitPrice = Number((o as any).unitPrice) || 0;
    const amount = Number((o as any).amount) || quantity * unitPrice;

    await db.insert(supplierOrderItems).values({
      userId: o.userId,
      orderId: o.id,
      label: (o as any).label || 'Article',
      quantity,
      unitPrice,
      amount,
      stockId: (o as any).stockId ?? null,
      stockApplied: !!(o as any).stockApplied,
    });

    // L'en-tête garde amount = somme des lignes (ici une seule ligne).
    await db.update(supplierOrders).set({ amount }).where(eq(supplierOrders.id, o.id));
    created++;
  }

  console.log(`Lignes créées : ${created} | Commandes déjà migrées (ignorées) : ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Échec de la migration :', err);
  process.exit(1);
});
