import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';

// Liste utilitaire des comptes (pour l'admin). Usage : npx tsx scripts/list-users.ts
async function main() {
  const rows = await db.select().from(users);
  console.table(rows.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    ownerId: u.ownerId,
    hasPassword: !!u.passwordHash,
  })));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
