# 🖥️ RestoPilote en application Desktop (.exe Windows, hors-ligne, ZÉRO installation)

RestoPilote tourne en **application de bureau Windows** — une fenêtre native qui **embarque le serveur ET la base de données PostgreSQL**, et fonctionne **100 % hors-ligne**. C'est **le même code** que la version web (`npm run dev`) et en ligne (Render) : rien n'est dupliqué.

> **Comment ça marche :** au lancement, l'appli
> 1. démarre un **PostgreSQL portable embarqué** (aucune installation, binaires inclus dans le `.exe`) sur un port local dédié (`54329`), avec les données stockées dans `AppData/Roaming/RestoPilote/pgdata` (elles **persistent** entre les lancements) ;
> 2. démarre le serveur Node embarqué (`dist/server.cjs`) qui **applique les migrations Drizzle** (crée toutes les tables au 1er lancement) ;
> 3. attend que le serveur réponde, puis affiche l'interface.

**➡️ L'utilisateur final n'a RIEN à installer : il double-clique sur le `.exe`, et ça marche.**

---

## ⚙️ Prérequis sur la machine qui UTILISE l'appli (hors-ligne)

**Aucun.** PostgreSQL est embarqué dans l'application. Pas d'installation de base de données, pas de configuration. Au tout premier lancement, l'appli crée la base et les tables automatiquement (quelques secondes de plus la 1re fois).

> 💡 Optionnel : tu peux placer un fichier **`.env`** **à côté de l'exécutable** pour surcharger la config (`JWT_SECRET`, `ENABLE_TEST_LOGIN`, `DESKTOP_PORT`, `DESKTOP_PG_PORT`, ou même pointer `SQL_HOST`/`SQL_PORT`/`SQL_DB_NAME`/`SQL_USER`/`SQL_PASSWORD` vers un autre PostgreSQL). Sans `.env`, l'appli utilise le PostgreSQL embarqué (`127.0.0.1:54329`, base `chefsuite`, `user`/`user`).

---

## 🏗️ Construire l'installateur `.exe` (sur ta machine de dev, avec Internet la 1re fois)

```powershell
npm install            # installe aussi electron / electron-builder (déjà fait)
npm run desktop:build  # construit le front + le serveur, puis génère l'installateur Windows
```

- Résultat dans le dossier **`release/`** : un installateur **`RestoPilote Setup x.x.x.exe`**.
- La 1re fois, `electron-builder` télécharge l'exécutable Electron (Internet requis **uniquement au build**, pas à l'usage).

Puis **copie ce `.exe`** sur une clé USB → installe-le sur le poste hors-ligne (double-clic → suivant → terminer). Un raccourci **RestoPilote** est créé sur le bureau.

### Tester l'appli desktop en local (sans générer l'installateur)
```powershell
npm run desktop        # construit puis ouvre directement la fenêtre de l'appli
```

---

## 🔁 Récap des 3 façons de faire tourner le MÊME projet

| Mode | Commande / usage | Base de données | Internet |
|---|---|---|---|
| **Web local (dev)** | `npm run dev` → http://localhost:3000 | PostgreSQL local | Non |
| **En ligne** | Déployé sur Render (voir `RENDER-DEPLOY.md`) | Neon (en ligne) | Oui |
| **Desktop (.exe)** | `npm run desktop:build` → installe le `.exe` | **PostgreSQL embarqué** (aucune install) | Non (à l'usage) |

---

## Dépannage

| Problème | Solution |
|---|---|
| Fenêtre « démarrage impossible » | Ferme toute autre instance de RestoPilote (un ancien PostgreSQL embarqué peut rester bloqué sur le port `54329`) puis relance. En dernier recours, redémarre l'ordinateur. Le détail technique est affiché dans la fenêtre d'erreur. |
| Le build `desktop:build` échoue au téléchargement d'Electron | Il faut Internet **au moment du build** (une seule fois). Réessaie. |
| Erreur **`EPERM: operation not permitted, rename 'release\win-unpacked.tmp'`** | **Verrou de fichier Windows** (souvent l'antivirus **Windows Defender** qui scanne le dossier pendant l'empaquetage). Solutions : 1) ajoute une **exclusion Defender** sur le dossier du projet (Sécurité Windows → Protection contre les virus → Gérer les paramètres → Exclusions → Ajouter le dossier `gestion-de-restaurant`) ; 2) **ferme** toute fenêtre de l'Explorateur ouverte sur `release/` ; 3) lance le terminal **en administrateur** ; 4) supprime le dossier `release/` puis relance `npm run desktop:build`. |
| L'appli s'ouvre mais page blanche | Le serveur n'a pas fini de démarrer (au 1er lancement, la création de la base + migrations prend quelques secondes). Patiente, sinon relance. |
| Port déjà utilisé | Serveur web = `34517` (`DESKTOP_PORT`) ; PostgreSQL embarqué = `54329` (`DESKTOP_PG_PORT`). Surcharge-les dans le `.env` à côté de l'exe si besoin. |
| Réinitialiser complètement la base embarquée | Ferme l'appli et supprime le dossier `%APPDATA%\RestoPilote\pgdata`. Au prochain lancement, une base vierge est recréée. |

---

## 🧩 PostgreSQL embarqué — détails techniques

- L'appli utilise le paquet **`embedded-postgres`** (binaires Windows dans `@embedded-postgres/windows-x64`, inclus dans le `.exe` car `asar:false`).
- Les **données** vivent dans `%APPDATA%\RestoPilote\pgdata` (persistantes, propres à chaque utilisateur Windows).
- Les **tables** sont créées/mises à jour au démarrage par les **migrations Drizzle** du dossier `drizzle/` (variable `RUN_MIGRATIONS=true` posée par Electron ; le serveur web Render/dev n'est **pas** affecté).
- ⚠️ **Après tout changement de schéma** (`src/db/schema.ts`), régénère la migration avant de rebâtir le `.exe` :
  ```powershell
  npm run db:generate   # crée un nouveau fichier dans drizzle/
  npm run desktop:build
  ```

---

*Fichiers concernés : `electron/main.cjs` (Postgres embarqué + serveur), `server.ts` (migrations au boot si `RUN_MIGRATIONS`), `src/db/index.ts` (port `SQL_PORT`), `package.json` (section `build` + scripts `desktop`/`db:generate`), `drizzle/` (migrations), `dist/` (serveur + front construits).*
