// Licence de l'application desktop RestoPilote : 7 jours d'essai, puis clé d'activation.
//
// - La clé est LIÉE AU PC : elle contient le « code machine » (empreinte du MachineGuid Windows)
//   et une signature Ed25519. Seule la clé PRIVÉE (licence-privee/cle-privee.pem, jamais livrée)
//   permet d'en fabriquer ; l'application ne contient que la clé PUBLIQUE ci-dessous.
// - Génération d'une clé : node scripts/generer-cle.mjs <CODE-MACHINE> "Nom du client"
// - Début de l'essai mémorisé à 2 endroits (fichier dans AppData + registre HKCU) : supprimer
//   l'un des deux ne relance pas l'essai. Un recul de l'horloge système est détecté.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAPHJg7lAe8AS9XZD1Iu98z+yqVRjcNrhxl0NQYtNPtlw=
-----END PUBLIC KEY-----`;

const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const CLOCK_TOLERANCE_MS = 2 * DAY_MS; // tolérance (fuseau, réglage manuel de l'heure)
const KEY_VERSION = 1;
const KEY_PREFIX = 'RP';
const REG_PATH = 'HKCU\\Software\\RestoPilote';
const STATE_FILE = 'licence.json';
// Clé d'intégrité du fichier d'état (dissuade la modification manuelle des dates).
const STATE_HMAC_KEY = 'restopilote-etat-licence-v1';
const EPOCH = Date.UTC(2026, 0, 1); // jour 0 des dates d'émission

// ---------- Base32 (RFC 4648, sans « = ») — insensible à la casse, facile à recopier ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
// Décodage STRICT : refuse tout caractère hors alphabet et tout bit résiduel non nul
// (sinon un caractère ajouté en fin de clé serait ignoré silencieusement).
function base32Decode(str) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of str) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('caractère invalide');
    value = ((value << 5) | idx) & 0xffff; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  if (bits >= 5 || (value & ((1 << bits) - 1)) !== 0) throw new Error('longueur invalide');
  return Buffer.from(out);
}

// Nombre exact de caractères base32 d'une clé : (11 + 64) octets × 8 / 5 = 120.
const KEY_B32_LENGTH = 120;

// ---------- Code machine ----------
function readMachineGuid() {
  try {
    const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
      { encoding: 'utf8', windowsHide: true });
    const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-f-]+)/i);
    if (m) return m[1].toLowerCase();
  } catch (_) { /* hors Windows / accès refusé */ }
  // Repli : nom d'hôte + utilisateur (stable sur un même poste).
  const os = require('os');
  return `fallback:${os.hostname()}:${os.userInfo().username}`;
}

// 8 octets d'empreinte → affiché « ABCD-EF12-3456-7890 ».
function machineBytes(guid = readMachineGuid()) {
  return crypto.createHash('sha256').update('restopilote-machine:' + guid).digest().subarray(0, 8);
}
function formatMachineCode(bytes) {
  return bytes.toString('hex').toUpperCase().match(/.{4}/g).join('-');
}
function parseMachineCode(code) {
  const hex = String(code || '').replace(/[^0-9a-f]/gi, '');
  if (hex.length !== 16) throw new Error('Code machine invalide (16 caractères attendus).');
  return Buffer.from(hex, 'hex');
}
function getMachineCode() {
  return formatMachineCode(machineBytes());
}

// ---------- Clés ----------
// Contenu signé : version (1) + code machine (8) + jour d'émission (2).
function buildPayload(machine, issuedAt = Date.now()) {
  const day = Math.max(0, Math.floor((issuedAt - EPOCH) / DAY_MS));
  const p = Buffer.alloc(11);
  p.writeUInt8(KEY_VERSION, 0);
  machine.copy(p, 1);
  p.writeUInt16BE(Math.min(day, 65535), 9);
  return p;
}

function formatKey(raw) {
  return KEY_PREFIX + '-' + base32Encode(raw).match(/.{1,6}/g).join('-');
}

// Signe une clé (utilisé UNIQUEMENT par le générateur, avec la clé privée).
function signKey(machineCode, privateKeyPem, issuedAt = Date.now()) {
  const payload = buildPayload(parseMachineCode(machineCode), issuedAt);
  const sig = crypto.sign(null, payload, crypto.createPrivateKey(privateKeyPem));
  return formatKey(Buffer.concat([payload, sig]));
}

// Vérifie une clé pour CE poste. Renvoie { ok, error?, issuedOn? }.
function verifyKey(key, machine = machineBytes()) {
  try {
    // Seules les différences de MISE EN FORME sont tolérées : majuscules/minuscules, espaces,
    // retours à la ligne et tirets. Tout autre écart (caractère ajouté, retiré, modifié) = refus.
    const s = String(key || '').toUpperCase().replace(/[\s-]/g, '');
    if (!s.startsWith(KEY_PREFIX)) return { ok: false, error: 'Clé invalide : elle doit commencer par « RP- ».' };
    const body = s.slice(KEY_PREFIX.length);
    if (body.length !== KEY_B32_LENGTH || !/^[A-Z2-7]+$/.test(body)) {
      return { ok: false, error: 'Clé invalide ou mal recopiée (caractère en trop, en moins ou incorrect).' };
    }
    const raw = base32Decode(body);
    if (raw.length !== 11 + 64) return { ok: false, error: 'Clé incomplète ou mal recopiée.' };
    const payload = raw.subarray(0, 11);
    const sig = raw.subarray(11);
    if (payload.readUInt8(0) !== KEY_VERSION) return { ok: false, error: 'Version de clé non reconnue.' };
    if (!crypto.verify(null, payload, crypto.createPublicKey(PUBLIC_KEY_PEM), sig)) {
      return { ok: false, error: 'Clé invalide.' };
    }
    if (!payload.subarray(1, 9).equals(machine)) {
      return { ok: false, error: "Cette clé a été générée pour un autre ordinateur." };
    }
    const issuedOn = new Date(EPOCH + payload.readUInt16BE(9) * DAY_MS).toISOString().slice(0, 10);
    return { ok: true, issuedOn };
  } catch (_) {
    return { ok: false, error: 'Clé invalide ou mal recopiée.' };
  }
}

// ---------- Stockage de l'état (fichier + registre) ----------
function hmac(obj) {
  return crypto.createHmac('sha256', STATE_HMAC_KEY).update(JSON.stringify(obj)).digest('hex');
}

function readFileState(dir) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, STATE_FILE), 'utf8'));
    const { mac, ...data } = raw;
    if (mac !== hmac(data)) return { tampered: true, key: data.key }; // dates non fiables, clé gardée
    return data;
  } catch (_) {
    return null;
  }
}

function writeFileState(dir, data) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, STATE_FILE), JSON.stringify({ ...data, mac: hmac(data) }, null, 2));
  } catch (_) { /* disque en lecture seule : ignoré */ }
}

function regRead(name) {
  try {
    const out = execFileSync('reg', ['query', REG_PATH, '/v', name], { encoding: 'utf8', windowsHide: true });
    const m = out.match(new RegExp(name + '\\s+REG_SZ\\s+(\\S+)'));
    return m ? m[1] : null;
  } catch (_) { return null; }
}
function regWrite(name, value) {
  try {
    execFileSync('reg', ['add', REG_PATH, '/v', name, '/t', 'REG_SZ', '/d', String(value), '/f'], { windowsHide: true, stdio: 'ignore' });
  } catch (_) { /* ignoré */ }
}

const toMs = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

// État courant de la licence. `dir` = dossier de données (AppData/RestoPilote).
// Renvoie { status: 'activated' | 'trial' | 'expired', daysLeft, trialEndsAt, machineCode, reason? }
function checkLicense(dir, now = Date.now(), io = { regRead, regWrite }) {
  const machineCode = getMachineCode();
  const file = readFileState(dir) || {};

  // 1) Clé déjà enregistrée et valide pour ce poste ?
  if (file.key) {
    const v = verifyKey(file.key);
    if (v.ok) return { status: 'activated', machineCode, key: file.key, issuedOn: v.issuedOn };
  }

  // 2) Période d'essai : date de 1er lancement = la plus ancienne connue (fichier, registre).
  const firsts = [file.tampered ? null : toMs(file.first), toMs(io.regRead('FirstRun'))].filter(Boolean);
  const lasts = [file.tampered ? null : toMs(file.last), toMs(io.regRead('LastSeen'))].filter(Boolean);
  const first = firsts.length ? Math.min(...firsts) : now;
  const lastSeen = lasts.length ? Math.max(...lasts) : now;

  // Fichier modifié à la main alors que le registre est vide → essai considéré terminé.
  const tamperedWithoutBackup = file.tampered && !toMs(io.regRead('FirstRun'));
  const clockBack = now < lastSeen - CLOCK_TOLERANCE_MS;

  const newState = { first, last: Math.max(lastSeen, now) };
  if (file.key) newState.key = file.key;
  writeFileState(dir, newState);
  io.regWrite('FirstRun', first);
  io.regWrite('LastSeen', newState.last);

  const trialEndsAt = first + TRIAL_DAYS * DAY_MS;
  const daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / DAY_MS));
  if (clockBack) return { status: 'expired', daysLeft: 0, trialEndsAt, machineCode, reason: "L'horloge de l'ordinateur a été reculée." };
  if (tamperedWithoutBackup) return { status: 'expired', daysLeft: 0, trialEndsAt, machineCode, reason: 'Fichier de licence modifié.' };
  if (now >= trialEndsAt) return { status: 'expired', daysLeft: 0, trialEndsAt, machineCode };
  return { status: 'trial', daysLeft, trialEndsAt, machineCode };
}

// Enregistre une clé si elle est valide pour ce poste.
function activate(dir, key) {
  const res = verifyKey(key);
  if (!res.ok) return res;
  const file = readFileState(dir) || {};
  const data = { first: toMs(file.first) || Date.now(), last: Math.max(toMs(file.last) || 0, Date.now()), key: String(key).trim() };
  writeFileState(dir, data);
  regWrite('Activated', '1');
  return { ok: true, issuedOn: res.issuedOn };
}

module.exports = {
  TRIAL_DAYS, checkLicense, activate, verifyKey, signKey, getMachineCode,
  machineBytes, formatMachineCode, parseMachineCode,
};
