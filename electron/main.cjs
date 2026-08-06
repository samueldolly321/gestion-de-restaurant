// Processus principal Electron — application desktop RestoPilote.
// Lance le serveur Node embarqué (dist/server.cjs) en local, attend qu'il réponde,
// puis affiche l'application dans une fenêtre native. Fonctionne 100 % hors-ligne
// (le serveur se connecte au PostgreSQL LOCAL de la machine).
const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork } = require('child_process');

// Port local interne (différent de 3000 pour ne pas gêner un `npm run dev` éventuel).
const PORT = Number(process.env.DESKTOP_PORT) || 34517;

let serverProcess = null;
let mainWindow = null;

// Chemin du bundle serveur : en dev il est à la racine du projet, en prod (packagé) dans resources/app.
function resolveAppRoot() {
  const devRoot = path.join(__dirname, '..');
  if (fs.existsSync(path.join(devRoot, 'dist', 'server.cjs'))) return devRoot;
  // Application packagée (asar désactivé pour dist via electron-builder) : resources/app
  return path.join(process.resourcesPath, 'app');
}

// Charge un fichier .env optionnel placé à côté de l'exécutable (pour personnaliser la connexion DB).
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

function startServer(appRoot) {
  const serverPath = path.join(appRoot, 'dist', 'server.cjs');
  // Valeurs par défaut = configuration locale standard (base chefsuite, user/user).
  // Surchargées par un .env à côté de l'exe si présent.
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    SQL_HOST: process.env.SQL_HOST || 'localhost',
    SQL_DB_NAME: process.env.SQL_DB_NAME || 'chefsuite',
    SQL_USER: process.env.SQL_USER || 'user',
    SQL_PASSWORD: process.env.SQL_PASSWORD || 'user',
    SQL_ADMIN_USER: process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'user',
    SQL_ADMIN_PASSWORD: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || 'user',
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
function waitForServer(timeoutMs = 30000) {
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
  // Ouvre les liens externes dans le navigateur système, pas dans l'app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// Fenêtre d'erreur claire si le serveur ne démarre pas (souvent : PostgreSQL éteint).
function showStartupError() {
  dialog.showErrorBox(
    'RestoPilote — démarrage impossible',
    "Le serveur local n'a pas répondu.\n\n" +
    "Cause la plus fréquente : PostgreSQL n'est pas démarré, ou la base « chefsuite » n'existe pas.\n\n" +
    "Vérifie que le service PostgreSQL tourne, que la base existe (voir installation-projet-maison.md), " +
    "puis relance l'application."
  );
}

app.whenReady().then(async () => {
  loadUserEnv();
  const appRoot = resolveAppRoot();
  startServer(appRoot);
  try {
    await waitForServer();
    createWindow();
  } catch (err) {
    console.error('Le serveur local ne répond pas :', err);
    showStartupError();
    app.quit();
  }
});

function stopServer() {
  if (serverProcess) { try { serverProcess.kill(); } catch (_) {} serverProcess = null; }
}

app.on('window-all-closed', () => { stopServer(); if (process.platform !== 'darwin') app.quit(); });
app.on('quit', stopServer);
app.on('activate', () => { if (mainWindow === null && serverProcess) createWindow(); });
