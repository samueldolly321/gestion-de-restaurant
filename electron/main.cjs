// Processus principal Electron — application desktop RestoPilote.
// Démarre un PostgreSQL PORTABLE embarqué (aucune installation requise), puis lance le
// serveur Node embarqué (dist/server.cjs) qui s'y connecte, attend qu'il réponde, et
// affiche l'application dans une fenêtre native. Fonctionne 100 % hors-ligne.
const { app, BrowserWindow, dialog, shell, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork } = require('child_process');
const license = require('./license.cjs');

// Icône des fenêtres (barre des tâches) — générée par scripts/gen-icon.cjs.
const WINDOW_ICON = path.join(__dirname, 'app-icon.png');

// Nom stable de l'application : détermine le dossier de données utilisateur
// (%APPDATA%/RestoPilote). Sans ça, Electron retombe sur le "name" du package.json
// ("react-example"). Appelé avant tout app.getPath('userData').
app.setName('RestoPilote');

// Une seule instance à la fois : un 2e double-clic remet simplement la fenêtre existante au premier plan
// (deux instances se disputeraient le même PostgreSQL embarqué → « démarrage impossible »).
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
}

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

// Arrête un PostgreSQL embarqué ORPHELIN laissé par une session précédente (app fermée de force,
// plantage, arrêt brutal du PC) : il garde le port 54329 et empêche tout redémarrage.
// Ne vise QUE les postgres.exe / pg_ctl.exe situés dans le dossier de CETTE application
// (jamais un PostgreSQL système ou de développement).
function killOrphanPostgres(appRoot) {
  if (process.platform !== 'win32') return;
  const { execFileSync } = require('child_process');
  const variants = [appRoot, appRoot.replace(/\\/g, '/')].map((s) => s.replace(/'/g, "''"));
  const script =
    "Get-CimInstance Win32_Process -Filter \"Name='postgres.exe' OR Name='pg_ctl.exe'\" | " +
    'Where-Object { $c = [string]$_.CommandLine; $e = [string]$_.ExecutablePath; ' +
    variants.map((v) => `$c -like '*${v}*' -or $e -like '${v}*'`).join(' -or ') +
    ' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }';
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
      { encoding: 'utf8', windowsHide: true, timeout: 20000 }).trim();
    if (out) console.log('[pg] PostgreSQL orphelin arrêté (PID ' + out.split(/\s+/).join(', ') + ').');
  } catch (err) {
    console.error('[pg] Nettoyage des orphelins impossible :', err.message);
  }
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
    title: windowTitle,
    icon: WINDOW_ICON,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  // Garde le titre « RestoPilote — Essai : X jours » (sinon remplacé par le <title> de la page).
  mainWindow.on('page-title-updated', (e) => e.preventDefault());
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

// ---------------- Licence : 7 jours d'essai puis clé d'activation ----------------
let windowTitle = 'RestoPilote';
let licenceState = null;
let startupDone = false; // passe à true une fois la fenêtre principale ouverte

// Fenêtre d'activation. Résout true si l'app peut démarrer (activée ou essai poursuivi), false sinon.
function showActivationWindow() {
  return new Promise((resolve) => {
    let result = false;
    const win = new BrowserWindow({
      width: 620,
      height: 640,
      useContentSize: true,
      resizable: false,
      maximizable: false,
      title: 'RestoPilote — Activation',
      icon: WINDOW_ICON,
      autoHideMenuBar: true,
      backgroundColor: '#f8fafc',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'activation-preload.cjs'),
      },
    });
    const done = (ok) => { result = ok; if (!win.isDestroyed()) win.close(); };
    ipcMain.handle('licence:info', () => licenceState);
    ipcMain.handle('licence:copy', (_e, text) => { clipboard.writeText(String(text || '')); return true; });
    ipcMain.handle('licence:activate', (_e, key) => {
      const res = license.activate(app.getPath('userData'), key);
      if (res.ok) {
        licenceState = license.checkLicense(app.getPath('userData'));
        setTimeout(() => done(true), 1200); // laisse le temps de lire « Activation réussie »
      }
      return res;
    });
    ipcMain.handle('licence:continue', () => { done(licenceState && licenceState.status === 'trial'); return true; });
    ipcMain.handle('licence:quit', () => { done(false); return true; });
    win.on('closed', () => {
      ['licence:info', 'licence:copy', 'licence:activate', 'licence:continue', 'licence:quit'].forEach((c) => ipcMain.removeHandler(c));
      // Fermer la fenêtre pendant l'essai = continuer l'essai.
      resolve(result || (licenceState && (licenceState.status === 'trial' || licenceState.status === 'activated')));
    });
    win.loadFile(path.join(__dirname, 'activation.html'));
  });
}

// Vérifie la licence au démarrage. Renvoie true si l'application peut se lancer.
async function ensureLicence() {
  const dir = app.getPath('userData');
  licenceState = license.checkLicense(dir);
  if (licenceState.status === 'activated') return true;
  if (licenceState.status === 'trial') {
    const n = licenceState.daysLeft;
    windowTitle = `RestoPilote — Version d'essai : ${n} jour${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`;
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: "RestoPilote — Version d'essai",
      message: `Version d'essai : il vous reste ${n} jour${n > 1 ? 's' : ''}.`,
      detail: "Après 7 jours, une clé d'activation sera nécessaire. Vos données sont conservées.",
      buttons: ["Continuer l'essai", 'Activer maintenant'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      icon: WINDOW_ICON,
    });
    if (response === 1) await showActivationWindow();
    if (licenceState.status === 'activated') windowTitle = 'RestoPilote';
    return true;
  }
  // Essai terminé : activation obligatoire.
  const ok = await showActivationWindow();
  if (licenceState.status === 'activated') windowTitle = 'RestoPilote';
  return ok && licenceState.status === 'activated';
}

app.whenReady().then(async () => {
  loadUserEnv();
  const appRoot = resolveAppRoot();

  // 0) Licence (essai de 7 jours / clé d'activation) — avant de démarrer quoi que ce soit.
  if (!(await ensureLicence())) {
    app.quit();
    return;
  }

  // 1) PostgreSQL embarqué (aucune installation requise).
  //    D'abord : on libère le port si un ancien PostgreSQL de RestoPilote est resté bloqué.
  killOrphanPostgres(appRoot);
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
    startupDone = true;
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

// Pendant le démarrage (fenêtre d'activation fermée avant l'ouverture de la fenêtre principale),
// on ne quitte pas : c'est ensureLicence() qui décide.
app.on('window-all-closed', () => {
  if (!mainWindow && !startupDone) return;
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => { if (mainWindow === null && serverProcess) createWindow(); });
