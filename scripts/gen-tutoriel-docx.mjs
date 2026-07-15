// Génère "tutoriel.docx" (vrai fichier Word) sans dépendance externe :
// construit un ZIP minimal (méthode "stored") contenant du WordprocessingML.
//   Lancer :  node scripts/gen-tutoriel-docx.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'tutoriel.docx');

// ---------- Contenu du tutoriel (blocs) ----------
// Types de bloc : h1, h2, h3, p, b (puce), code
const C = [
  ['h1', 'Tutoriel — Comprendre et modifier RestoPilote'],
  ['p', "Ce document explique comment l'application est construite, à quoi sert chaque fichier, et comment faire tes propres modifications. Il est écrit pour un développeur junior qui ne connaît pas encore React. Lis-le dans l'ordre."],

  ['h1', '1. La vue d\'ensemble'],
  ['p', "RestoPilote est une application web de gestion de restaurant. Elle a deux moitiés :"],
  ['b', "Le FRONT (l'interface) : ce que tu vois dans le navigateur. Écrit en React."],
  ['b', "Le BACK (le serveur) : reçoit les demandes, parle à la base de données, renvoie les données. Écrit en Express (Node.js)."],
  ['p', "Particularité : ici le front ET le back tournent ensemble sur un seul serveur, à l'adresse http://localhost:3000. Le fichier server.ts démarre tout."],
  ['p', "La base de données (PostgreSQL) stocke toutes les informations (commandes, stocks, clients...). On lui parle avec un outil appelé Drizzle (un ORM)."],
  ['p', "Le temps réel : quand une donnée change (ex. une commande payée), tous les écrans ouverts se mettent à jour tout seuls grâce à Socket.io."],

  ['h1', '2. React en 5 minutes (l\'essentiel pour comprendre)'],
  ['p', "React sert à construire l'interface. Quatre mots à retenir :"],
  ['h3', 'Composant'],
  ['p', "Un composant est un morceau d'écran réutilisable, écrit comme une fonction qui renvoie du \"HTML\". Exemple : ExpensesManager est le composant de l'écran Dépenses. Un composant est dans un fichier .tsx."],
  ['h3', 'JSX'],
  ['p', "Le \"HTML dans le JavaScript\" que renvoie un composant s'appelle du JSX. Ex : <button onClick={...}>Ajouter</button>. Ça ressemble à du HTML mais on peut y mettre des variables entre accolades { }."],
  ['h3', 'Props'],
  ['p', "Les props sont les informations qu'un composant reçoit de son parent (comme les arguments d'une fonction). Ex : App.tsx donne la liste des dépenses au composant ExpensesManager via une prop : <ExpensesManager expenses={expenses} />."],
  ['h3', 'State (l\'état) et useState'],
  ['p', "Le state, c'est la mémoire d'un composant : des valeurs qui peuvent changer (ce que l'utilisateur tape, une modale ouverte/fermée...). On le déclare avec useState :"],
  ['code', 'const [search, setSearch] = useState("");  // search = valeur, setSearch = pour la changer'],
  ['p', "Règle d'or de React : quand tu changes le state (avec setSearch), React redessine automatiquement l'écran. Tu ne touches jamais au HTML à la main : tu changes des données, l'écran suit."],
  ['h3', 'Hook'],
  ['p', "Un hook est une fonction spéciale de React dont le nom commence par \"use\" (useState, useEffect...). On peut aussi créer les siens : usePagination (dans Pagination.tsx) est un hook maison. Règle : on appelle les hooks toujours en haut du composant, jamais dans un if ou une boucle."],

  ['h1', '3. Les fichiers importants (qui fait quoi)'],
  ['b', "server.ts — Le serveur. Contient toutes les \"routes\" de l'API (les URL comme /api/expenses) et le temps réel (Socket.io). C'est lui qui reçoit les requêtes du front et appelle la base."],
  ['b', "src/App.tsx — Le cœur du front. Gère l'état global (les listes de données), les onglets, la connexion, les sockets, et distribue les données aux écrans. Contient les \"handlers\" (handleAddExpense...) qui envoient les requêtes au serveur."],
  ['b', "src/components/ — Un fichier par écran : OrdersManager (commandes), InventoryManager (stocks/fournisseurs), ExpensesManager (dépenses), IncomeManager (rentrées), PersonnelManager, DeliveriesManager, ClientsManager, AssetsManager (biens & matériel), DashboardCharts (tableau de bord), Pagination (barre de pagination réutilisable)..."],
  ['b', "src/db/schema.ts — La structure de la base : la liste des tables et de leurs colonnes. C'est LE fichier qui décrit les données."],
  ['b', "src/db/queries.ts — Les requêtes vers la base (getExpenses, createExpense, updateExpense, deleteExpense...). Le serveur les appelle."],
  ['b', "src/types.ts — Les \"formes\" des données (TypeScript). Ex : à quoi ressemble une Expense (id, label, amount...). Sert à éviter les erreurs."],
  ['b', ".env — Tes secrets (accès base de données, options). Jamais sur GitHub."],
  ['b', "package.json — La liste des dépendances et les commandes (scripts) : dev, db:push, lint, build."],

  ['h1', '4. Comment une donnée circule (exemple concret)'],
  ['p', "Suivons ce qui se passe quand tu ajoutes une dépense. C'est le même schéma partout."],
  ['b', "1) Tu remplis le formulaire dans ExpensesManager.tsx et cliques \"Ajouter\". Le composant appelle une fonction reçue en prop : onAddExpense(payload)."],
  ['b', "2) Cette fonction est en réalité handleAddExpense dans App.tsx. Elle envoie une requête HTTP POST à /api/expenses avec les données (fetch)."],
  ['b', "3) Dans server.ts, la route app.post('/api/expenses', ...) reçoit la requête et appelle createExpense(...) de queries.ts."],
  ['b', "4) createExpense insère la ligne dans PostgreSQL et renvoie la dépense créée."],
  ['b', "5) server.ts émet un événement Socket.io (expense_created) à tous les écrans connectés."],
  ['b', "6) Dans App.tsx, le \"listener\" socket.on('expense_created', ...) ajoute la dépense à l'état → React redessine la liste. La dépense apparaît, sans recharger la page."],
  ['p', "À retenir : Front (composant → handler App.tsx) → HTTP → Back (route server.ts → queries.ts) → Base → Socket → l'écran se met à jour."],

  ['h1', '5. La base de données (Drizzle)'],
  ['p', "Dans schema.ts, chaque table est décrite comme un objet. Exemple simplifié d'une table :"],
  ['code', "export const expenses = pgTable('expenses', {\n  id: serial('id').primaryKey(),\n  label: text('label').notNull(),\n  amount: doublePrecision('amount').notNull().default(0),\n  ...\n});"],
  ['p', "Quand tu modifies schema.ts (ajout/suppression de colonne), tu dois appliquer le changement à la vraie base avec :"],
  ['code', 'npm run db:push'],
  ['p', "Drizzle compare ton schéma au contenu de la base et applique les différences. Tu dois voir \"[✓] Changes applied\"."],

  ['h1', '6. Recettes : faire une modification toi-même'],

  ['h2', '6.1 Ajouter un champ à une donnée existante'],
  ['p', "Exemple : ajouter une couleur aux biens (assets). Il faut toucher la même chaîne que d'habitude, dans cet ordre :"],
  ['b', "1) schema.ts : ajoute la colonne dans la table assets → color: text('color')."],
  ['b', "2) Terminal : npm run db:push (crée la colonne dans la base)."],
  ['b', "3) types.ts : ajoute color au type Asset (ex : color?: string | null)."],
  ['b', "4) queries.ts : ajoute color dans createAsset et updateAsset."],
  ['b', "5) server.ts : lis color depuis req.body dans les routes POST/PUT /api/assets et passe-le aux requêtes."],
  ['b', "6) AssetsManager.tsx : ajoute un champ dans le formulaire (un useState + un input) et affiche la couleur dans la liste."],
  ['b', "7) npm run lint pour vérifier qu'il n'y a pas d'erreur."],

  ['h2', '6.2 Ajouter un nouvel onglet complet'],
  ['p', "Comme on l'a fait pour \"Biens & Matériel\". Les étapes :"],
  ['b', "schema.ts : nouvelle table + relation, puis npm run db:push."],
  ['b', "queries.ts : les 4 requêtes get / create / update / delete."],
  ['b', "server.ts : les 4 routes GET/POST/PUT/DELETE + les événements socket (xxx_created/updated/deleted)."],
  ['b', "types.ts : le type de la donnée."],
  ['b', "src/components/MonEcran.tsx : le nouveau composant (liste + formulaire)."],
  ['b', "App.tsx : l'état (useState), le chargement initial (fetch), les listeners socket, les handlers, l'entrée de menu, le titre, et l'affichage du composant."],

  ['h2', '6.3 Changer un texte / un libellé'],
  ['p', "Cherche le texte affiché directement dans le fichier du composant concerné (dossier src/components). Ex : le titre \"Dépenses diverses\" se trouve dans App.tsx (les titres d'onglets) ou dans ExpensesManager.tsx. Astuce : utilise la recherche globale de VS Code (Ctrl+Maj+F) avec le texte exact."],

  ['h2', '6.4 Changer une règle de calcul'],
  ['p', "Les calculs \"officiels\" (totaux, montants) sont faits côté serveur, dans queries.ts (ex : le total d'une commande = somme des lignes + frais de livraison, dans createOrder/updateOrder). L'affichage peut recalculer côté composant pour l'aperçu, mais la valeur enregistrée vient du serveur. Modifie donc queries.ts pour changer la règle réelle."],

  ['h1', '7. Les commandes utiles (mémo)'],
  ['code', 'npm run dev      # lance l\'app (front + back) sur http://localhost:3000\nnpm run db:push  # applique les changements de schema.ts a la base\nnpm run lint     # verifie le TypeScript (0 erreur = tout va bien)\nnpm run build    # compile pour la production'],
  ['p', "Pense à relancer npm run dev (Ctrl+C puis npm run dev) après avoir modifié server.ts, queries.ts ou schema.ts. Les modifications dans src/ (composants) se rechargent toutes seules (Vite)."],

  ['h1', '8. Conseils et pièges à éviter'],
  ['b', "Toujours lancer npm run lint avant de conclure : il attrape la plupart des erreurs."],
  ['b', "Ne mets jamais .env ni firebase-applet-config.json sur GitHub (secrets). Ils sont déjà ignorés."],
  ['b', "Après un changement de schema.ts, n'oublie pas npm run db:push, sinon la base ne connaît pas la nouvelle colonne."],
  ['b', "Un hook (useState, usePagination...) s'appelle toujours en haut du composant, jamais dans un if."],
  ['b', "Le serveur ne se recharge pas seul : redémarre-le après avoir touché server.ts / queries.ts / schema.ts."],
  ['b', "Fais des petits changements et teste souvent, plutôt qu'un gros changement d'un coup."],

  ['h1', '9. Glossaire'],
  ['b', "Composant : morceau d'interface (une fonction React qui renvoie du JSX)."],
  ['b', "Props : données passées à un composant par son parent."],
  ['b', "State / useState : la mémoire d'un composant ; la changer redessine l'écran."],
  ['b', "Hook : fonction React qui commence par \"use\"."],
  ['b', "Route / Endpoint : une URL de l'API côté serveur (ex : /api/expenses)."],
  ['b', "Handler : fonction du front qui envoie une requête au serveur (handleAddExpense...)."],
  ['b', "ORM (Drizzle) : outil qui traduit du code en requêtes SQL."],
  ['b', "Migration / db:push : appliquer les changements du schéma à la base."],
  ['b', "Socket.io : la technologie du temps réel (mise à jour instantanée des écrans)."],
  ['b', "Payload : les données envoyées dans une requête."],

  ['h1', '10. Par où commencer pour explorer'],
  ['b', "Ouvre src/db/schema.ts : tu comprends toutes les données de l'app en un coup d'oeil."],
  ['b', "Ouvre src/App.tsx : tu vois les onglets, l'état, et comment chaque écran est branché."],
  ['b', "Ouvre un composant simple, ex src/components/AssetsManager.tsx : liste + formulaire, c'est le patron type."],
  ['b', "Suis une donnée de bout en bout (section 4) : c'est le meilleur moyen de tout relier."],
  ['p', "Bon courage ! Prends le temps, modifie de petites choses, et relance npm run lint souvent."],
];

// ---------- Génération du WordprocessingML ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function para(text, { bold = false, size, color, font, bullet = false, code = false, space = 120 } = {}) {
  const runs = String(text).split('\n').map((line, i) => {
    const brk = i > 0 ? '<w:br/>' : '';
    const rpr = [];
    if (bold) rpr.push('<w:b/>');
    if (size) rpr.push(`<w:sz w:val="${size}"/>`);
    if (color) rpr.push(`<w:color w:val="${color}"/>`);
    if (font) rpr.push(`<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>`);
    const rprXml = rpr.length ? `<w:rPr>${rpr.join('')}</w:rPr>` : '';
    return `<w:r>${rprXml}${brk}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`;
  }).join('');
  const shd = code ? '<w:shd w:val="clear" w:fill="F1F1F4"/>' : '';
  const ind = bullet ? '<w:ind w:left="360" w:hanging="360"/>' : (code ? '<w:ind w:left="240"/>' : '');
  const pPr = `<w:pPr><w:spacing w:before="${space}" w:after="${space}"/>${ind}${shd}</w:pPr>`;
  const prefix = bullet ? '•  ' : '';
  const runsWithPrefix = bullet
    ? `<w:r><w:t xml:space="preserve">${esc(prefix)}</w:t></w:r>${runs}`
    : runs;
  return `<w:p>${pPr}${runsWithPrefix}</w:p>`;
}

function block([type, text]) {
  switch (type) {
    case 'h1': return para(text, { bold: true, size: 34, color: 'B91C1C', space: 220 });
    case 'h2': return para(text, { bold: true, size: 28, color: '1F2937', space: 180 });
    case 'h3': return para(text, { bold: true, size: 24, color: '374151', space: 140 });
    case 'code': return para(text, { font: 'Consolas', size: 20, code: true });
    case 'b': return para(text, { bullet: true, size: 22 });
    default: return para(text, { size: 22 });
  }
}

const body = C.map(block).join('');
const documentXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  `<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;

const contentTypes =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '</Types>';

const rels =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';

// ---------- Écriture du ZIP (méthode "stored", sans compression) ----------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const data = Buffer.from(f.data, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);   // signature
    local.writeUInt16LE(20, 4);           // version
    local.writeUInt16LE(0, 6);            // flags
    local.writeUInt16LE(0, 8);            // method 0 = stored
    local.writeUInt16LE(0, 10);           // time
    local.writeUInt16LE(0, 12);           // date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const centralOffset = offset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuf, end]);
}

const docx = zip([
  { name: '[Content_Types].xml', data: contentTypes },
  { name: '_rels/.rels', data: rels },
  { name: 'word/document.xml', data: documentXml },
]);

writeFileSync(OUT, docx);
console.log('tutoriel.docx généré :', OUT, `(${docx.length} octets, ${C.length} blocs)`);
