import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { setUserPasswordByEmail, getUserByEmail } from '../src/db/queries.ts';

// Définit (ou réinitialise) le mot de passe d'un compte existant.
// Usage : npx tsx scripts/set-password.ts <email> <motdepasse>
async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage : npx tsx scripts/set-password.ts <email> <motdepasse>');
    process.exit(1);
  }
  const normalizedEmail = email.trim().toLowerCase();

  const user = await getUserByEmail(normalizedEmail);
  if (!user) {
    console.error(`Aucun utilisateur trouvé avec l'e-mail "${normalizedEmail}".`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await setUserPasswordByEmail(normalizedEmail, passwordHash);
  console.log(`✅ Mot de passe défini pour ${normalizedEmail} (id ${user.id}, rôle ${user.role}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
