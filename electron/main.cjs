// Processus principal Electron — application desktop RestoPilote.
// Démarre un PostgreSQL PORTABLE embarqué (aucune installation requise), puis lance le
// serveur Node embarqué (dist/server.cjs) qui s'y connecte, attend qu'il réponde, et
// affiche l'application dans une fenêtre native. Fonctionne 100 % hors-ligne.
const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork } = require('child_process');

// Nom stable de l'application : détermine le dossier de données utilisateur
// (%APPDATA%/RestoPilote). Sans ça, Electron retombe sur le "name" du package.json
// ("react-example"). Appelé avant tout app.getPath('userData').
app.setName('RestoPilote');

// Port du serveur web local (différent de 3000 pour ne pas gêner un `npm run dev` éventuel).
const PORT = Number(process.env.DESKTOP_PORT) || 34517;
// Port du PostgreSQL embarqué (≠ 5432 pour ne pas entrer en conflit avec un Postgres système).
const PG_PORT = Number(process.env.DESKTOP_PG_PORT) || 54329;

let serverProcess = null;
let pgInstance = null;
let mainWindow = null;

// Chemin du bundle serveur : en dev il est à la racine du projet, en prod (packagé) dans resources/app.
function resolveAppRoot() {
  const devRoot = path.join(__dirname, '..');
  if (fs.existsSync(path.join(devRoot, 'dist', 'server.cjs'))) return devRoot;
  // Application packagée (asar désactivé pour dist via electron-builder) : resources/app
  return path.join(process.resourcesPath, 'app');
}

// Charge un fichier .env optionnel placé à côté de l'exécutable (pour personnaliser la config).
function loadUserEnv() {
  try {
    const candidates = [
      path.join(path.dirname(app.getPath('exe')), '.env'),
      path.join(resolveAppRoot(), '.env'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        require('dotenv').config({ path: p });
        return;
      }
    }
  } catch (_) { /* dotenv absent en dev : ignore */ }
}

// Démarre le PostgreSQL portable embarqué. Les données sont stockées dans le dossier
// utilisateur (AppData/Roaming/RestoPilote/pgdata) et persistent entre les lancements.
async function startEmbeddedPostgres() {
  const EmbeddedPostgres = (await import('embedded-postgres')).default;
  const dataDir = path.join(app.getPath('userData'), 'pgdata');
  const firstRun = !fs.existsSync(dataDir);

  pgInstance = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: PG_PORT,
    user: 'user',
    password: 'user',
    authMethod: 'password',
    persistent: true, // conserve les données au redémarrage / à l'arrêt
    onLog: (m) => console.log('[pg]', m),
    onError: (m) => console.error('[pg]', m),
  });

  // Première fois : on initialise le cluster (crée le dossier de données).
  if (firstRun) {
    console.log('[pg] Initialisation du cluster PostgreSQL embarqué…');
    await pgInstance.initialise();
  }
  console.log('[pg] Démarrage de PostgreSQL embarqué…');
  await pgInstance.start();

  // S'assure que la base « chefsuite » existe (idempotent : ignore l'erreur « existe déjà »).
  try {
    await pgInstance.createDatabase('chefsuite');
    console.log('[pg] Base « chefsuite » créée.');
  } catch (_) {
    // La base existe déjà (lancements suivants) → rien à faire.
  }
}

function startServer(appRoot) {
  const serverPath = path.join(appRoot, 'dist', 'server.cjs');
  // Connexion au PostgreSQL embarqué (surchargée par un .env à côté de l'exe si présent).
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    // Cible le Postgres embarqué (port dédié).
    SQL_HOST: process.env.SQL_HOST || '127.0.0.1',
    SQL_PORT: process.env.SQL_PORT || String(PG_PORT),
    SQL_DB_NAME: process.env.SQL_DB_NAME || 'chefsuite',
    SQL_USER: process.env.SQL_USER || 'user',
    SQL_PASSWORD: process.env.SQL_PASSWORD || 'user',
    SQL_ADMIN_USER: process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'user',
    SQL_ADMIN_PASSWORD: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || 'user',
    // Applique les migrations Drizzle au démarrage (crée les tables au 1er lancement).
    RUN_MIGRATIONS: 'true',
    MIGRATIONS_DIR: path.join(appRoot, 'drizzle'),
    EMBEDDED_PG: 'true',
    // Secret de session stable (à personnaliser via .env pour la prod).
    JWT_SECRET: process.env.JWT_SECRET || 'restopilote-desktop-secret-a-changer',
    // Accès test pratique en desktop local ; mettre "false" dans un .env pour l'exiger.
    ENABLE_TEST_LOGIN: process.env.ENABLE_TEST_LOGIN || 'true',
  };

  serverProcess = fork(serverPath, [], { env, cwd: appRoot, silent: false });
  serverProcess.on('exit', (code) => {
    if (code && code !== 0) console.error(`Serveur arrêté (code ${code}).`);
  });
}

// Attend que le serveur réponde sur /api/health avant d'afficher la fenêtre.
// Timeout large : au 1er lancement, les migrations créent toutes les tables.
function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
      setTimeout(tick, 500);
    };
    tick();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'RestoPilote',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  // Gestion des window.open() :
  //  - Fenêtre d'impression de l'addition : window.open('', '_blank', ...) → url vide/about:blank.
  //    On l'AUTORISE à s'ouvrir dans Electron (sinon Windows cherche une app → dialogue Microsoft Store).
  //  - Pages locales de l'app (http://127.0.0.1:PORT/…) : idem, on ouvre dans une fenêtre interne.
  //  - Vrais liens externes (http/https vers un autre hôte) : navigateur système.
  const localOrigin = `http://127.0.0.1:${PORT}`;
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isBlank = !url || url === 'about:blank';
    const isLocal = url.startsWith(localOrigin) || url.startsWith('http://localhost:' + PORT);
    if (isBlank || isLocal) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 380,
          height: 640,
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// Fenêtre d'erreur claire si le démarrage échoue.
function showStartupError(err) {
  dialog.showErrorBox(
    'RestoPilote — démarrage impossible',
    "L'application n'a pas pu démarrer.\n\n" +
    "Détail technique : " + (err && err.message ? err.message : String(err)) + "\n\n" +
    "Astuce : ferme toute autre instance de RestoPilote puis relance. " +
    "Si le problème persiste, redémarre l'ordinateur (un ancien processus PostgreSQL peut rester bloqué)."
  );
}

app.whenReady().then(async () => {
  loadUserEnv();
  const appRoot = resolveAppRoot();

  // 1) PostgreSQL embarqué (aucune installation requise).
  try {
    await startEmbeddedPostgres();
  } catch (err) {
    console.error('Impossible de démarrer PostgreSQL embarqué :', err);
    showStartupError(err);
    app.quit();
    return;
  }

  // 2) Serveur Node embarqué (migrations + API + front).
  startServer(appRoot);
  try {
    await waitForServer();
    createWindow();
  } catch (err) {
    console.error('Le serveur local ne répond pas :', err);
    showStartupError(err);
    await stopAll();
    app.quit();
  }
});

async function stopAll() {
  if (serverProcess) { try { serverProcess.kill(); } catch (_) {} serverProcess = null; }
  if (pgInstance) {
    try { await pgInstance.stop(); } catch (_) {}
    pgInstance = null;
  }
}

// Arrêt propre de PostgreSQL avant la fermeture de l'app.
let quitting = false;
app.on('before-quit', async (e) => {
  if (quitting) return;
  e.preventDefault();
  quitting = true;
  await stopAll();
  app.quit();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null && serverProcess) createWindow(); });
