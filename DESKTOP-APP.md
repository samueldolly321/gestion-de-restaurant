# 🖥️ RestoPilote en application Desktop (.exe Windows, hors-ligne)

RestoPilote peut aussi tourner en **application de bureau Windows** — une fenêtre native qui **embarque le serveur** et fonctionne **100 % hors-ligne**, en local. C'est **le même code** que la version web (`npm run dev`) et en ligne (Render) : rien n'est dupliqué.

> **Comment ça marche :** au lancement, l'appli démarre le serveur Node embarqué (`dist/server.cjs`) sur un port local, attend qu'il réponde, puis affiche l'interface. Le serveur se connecte au **PostgreSQL local** de la machine.

---

## ⚙️ Prérequis sur la machine qui UTILISE l'appli (hors-ligne)

L'appli embarque le serveur, mais **pas** la base de données. Sur le poste où tu installes le `.exe`, il faut :

1. **PostgreSQL installé** (comme dans `installation-projet-maison.md`).
2. La base **`chefsuite`** créée + l'utilisateur **`user`** / mot de passe `user`
   (section 3 de `installation-projet-maison.md`).
3. Les **tables créées** dans cette base (une fois) : `npm run db:push`
   *(ou toute autre méthode d'initialisation de la base sur ce poste).*

> 💡 Tu peux personnaliser la connexion à la base en plaçant un fichier **`.env`** **à côté de l'exécutable** (mêmes clés que le `.env` du projet : `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `JWT_SECRET`, `ENABLE_TEST_LOGIN`). Sans `.env`, l'appli utilise la config locale standard (`localhost` / `chefsuite` / `user`).

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
| **Desktop (.exe)** | `npm run desktop:build` → installe le `.exe` | PostgreSQL local | Non (à l'usage) |

---

## Dépannage

| Problème | Solution |
|---|---|
| Fenêtre « démarrage impossible » | PostgreSQL n'est pas démarré, ou la base `chefsuite` n'existe pas / n'a pas ses tables. Vérifie le service PostgreSQL + `npm run db:push`. |
| Le build `desktop:build` échoue au téléchargement d'Electron | Il faut Internet **au moment du build** (une seule fois). Réessaie. |
| L'appli s'ouvre mais page blanche | Le serveur n'a pas fini de démarrer ; attends quelques secondes. Sinon vérifie la connexion à PostgreSQL. |
| Port déjà utilisé | L'appli utilise le port `34517` ; définis `DESKTOP_PORT` dans le `.env` à côté de l'exe pour le changer. |

---

## 🔜 Version « zéro installation » (optionnelle)

Pour un `.exe` **totalement autonome** (sans installer PostgreSQL sur le poste), il faudrait **embarquer un PostgreSQL portable** dans l'appli. C'est faisable (installateur plus lourd, ~250 Mo, binaires Postgres à inclure une fois au build). Dis-le si tu veux cette version.

---

*Fichiers concernés : `electron/main.cjs` (processus principal), `package.json` (section `build` + scripts `desktop`), `dist/` (serveur + front construits).*
