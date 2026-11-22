// Génère une clé d'activation RestoPilote pour un ordinateur donné.
//
// Usage :  node scripts/generer-cle.mjs <CODE-MACHINE> "Nom du client"
// Exemple : node scripts/generer-cle.mjs 1A2B-3C4D-5E6F-7A8B "Restaurant Le Baobab"
//
// - Le CODE MACHINE est affiché au client dans la fenêtre d'activation de l'application.
// - Nécessite la clé privée licence-privee/cle-privee.pem (JAMAIS sur GitHub ni dans le .exe).
//   ⚠️ Sauvegardez-la (clé USB, cloud privé) : sans elle, impossible de générer des clés
//   valables pour les versions déjà distribuées.
// - Chaque clé émise est notée dans licence-privee/cles-emises.csv.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { signKey, verifyKey, parseMachineCode, formatMachineCode } = require('../electron/license.cjs');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const privDir = path.join(root, 'licence-privee');
const privPath = path.join(privDir, 'cle-privee.pem');

const [machineArg, ...nameParts] = process.argv.slice(2);
const client = nameParts.join(' ').trim();

if (!machineArg) {
  console.log('Usage : node scripts/generer-cle.mjs <CODE-MACHINE> "Nom du client"');
  process.exit(1);
}
if (!fs.existsSync(privPath)) {
  console.error(`Clé privée introuvable : ${privPath}`);
  process.exit(1);
}

let machine;
try {
  machine = parseMachineCode(machineArg);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const machineCode = formatMachineCode(machine);
const key = signKey(machineCode, fs.readFileSync(privPath, 'utf8'));
// Contrôle : la clé doit être acceptée pour ce code machine.
const check = verifyKey(key, machine);
if (!check.ok) {
  console.error('Erreur interne : la clé générée ne se vérifie pas (' + check.error + ').');
  console.error("La clé privée ne correspond peut-être plus à la clé publique de electron/license.cjs.");
  process.exit(1);
}

const csv = path.join(privDir, 'cles-emises.csv');
if (!fs.existsSync(csv)) fs.writeFileSync(csv, 'date;client;code_machine;cle\n');
fs.appendFileSync(csv, `${new Date().toISOString().slice(0, 10)};${client.replace(/;/g, ',')};${machineCode};${key}\n`);

console.log('');
console.log(`Client       : ${client || '(non précisé)'}`);
console.log(`Code machine : ${machineCode}`);
console.log('Clé d\'activation (à envoyer au client) :');
console.log('');
console.log(key);
console.log('');
