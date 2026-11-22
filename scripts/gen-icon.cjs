// Génère l'icône de l'application desktop à partir de build/icon.svg :
//   build/icon.png (512 px) et build/icon.ico (16 → 256 px, PNG intégrés).
// Usage : npx electron scripts/gen-icon.cjs
// (Electron sert de moteur de rendu SVG → PNG ; aucun paquet supplémentaire.)
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'build', 'icon.svg');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// Assemble un .ico contenant des images PNG (format accepté par Windows depuis Vista).
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type : icône
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // largeur (0 = 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // hauteur
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // réservé
    e.writeUInt16LE(1, 4); // plans
    e.writeUInt16LE(32, 6); // bits par pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const win = new BrowserWindow({
    width: 512, height: 512, show: false, frame: false, transparent: true,
    webPreferences: { offscreen: true },
  });
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 400));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  const big = img.resize({ width: 512, height: 512, quality: 'best' });
  fs.writeFileSync(path.join(root, 'build', 'icon.png'), big.toPNG());
  const pngs = SIZES.map((size) => ({ size, data: big.resize({ width: size, height: size, quality: 'best' }).toPNG() }));
  fs.writeFileSync(path.join(root, 'build', 'icon.ico'), buildIco(pngs));
  // Icône des fenêtres (barre des tâches, fenêtre d'activation) — embarquée dans l'app.
  fs.writeFileSync(path.join(root, 'electron', 'app-icon.png'), big.resize({ width: 256, height: 256, quality: 'best' }).toPNG());
  console.log('Icônes générées : build/icon.png, build/icon.ico (' + SIZES.join(', ') + ' px), electron/app-icon.png');
  app.exit(0);
});
void nativeImage;
