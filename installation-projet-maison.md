# 🏠 Installer RestoPilote sur ton ordinateur à la maison

Guide **pas à pas**, écrit pour un **développeur junior** : chaque étape a la commande exacte à taper. À la fin, l'application tournera sur **http://localhost:3000**.

> 📌 **Ce guide est pour le cas « dossier copié sur clé USB »** (copier-coller, pas de `git clone`). Comme tu as copié le dossier, tes fichiers de config (`.env`, Firebase) sont **déjà dedans** — c'est plus rapide que depuis GitHub.
>
> Il utilise **exactement les valeurs de config qu'on utilise déjà** (base `chefsuite`, utilisateur `user` / mot de passe `user`).

---

## 0. Ce que tu vas installer (vue d'ensemble)

| Outil | À quoi ça sert | Obligatoire ? |
|---|---|---|
| **Node.js 20** | Faire tourner l'app (front + back) | ✅ Oui |
| **PostgreSQL 16** | La base de données (toutes les données du resto) | ✅ Oui |
| **Un compte Firebase** | Les connexions (e-mail + mot de passe) | ✅ Oui (sauf si tu utilises seulement le bouton « Accès test ») |
| **Git** | Récupérer les futures mises à jour / pousser tes modifs | ❌ Optionnel (le code est déjà sur la clé) |
| **Une clé Gemini** | L'onglet « Analyses IA » | ❌ Optionnel (déjà dans le `.env` copié) |

Le front (React) **et** le back (Express) tournent **ensemble** sur un seul serveur : `http://localhost:3000`.

---

## 1. Installer les prérequis (une seule fois)

### 1.1 Node.js 20
1. Va sur https://nodejs.org → télécharge la version **LTS (20.x)**.
2. Installe (Suivant → Suivant → Terminer).
3. Ouvre **PowerShell** et vérifie :
   ```powershell
   node --version   # doit afficher v20.x
   npm --version
   ```

### 1.2 Git — *optionnel*
Le code est déjà sur ta clé USB, donc **Git n'est pas nécessaire** pour lancer l'app. Installe-le seulement si tu veux **récupérer les mises à jour** depuis GitHub (`git pull`) ou **pousser tes modifs** plus tard.
1. Va sur https://git-scm.com/download/win → installe.
2. Vérifie :
   ```powershell
   git --version
   ```

### 1.3 PostgreSQL 16
1. Va sur https://www.postgresql.org/download/windows/ → télécharge l'installeur.
2. Pendant l'installation :
   - **Note bien le mot de passe** que tu donnes au super-utilisateur **`postgres`** (tu en auras besoin à l'étape 3).
   - Laisse le **port** sur **`5432`** (par défaut).
   - Coche l'installation de **pgAdmin** (outil graphique, pratique) — optionnel mais utile.
3. Les outils s'installent dans `C:\Program Files\PostgreSQL\16\bin` (adapte le `16` à ta version).

> 💡 `psql` n'est souvent pas dans le `PATH` de Windows. On l'appellera par son chemin complet :
> `& "C:\Program Files\PostgreSQL\16\bin\psql.exe"`

---

## 2. Copier le projet depuis la clé USB

Tu as le dossier du projet sur une **clé USB** (copier-coller). Fais ceci :

1. Branche la clé USB. **Copie** le dossier `gestion-de-restaurant` vers un emplacement de **ton disque dur** (ex. `D:\perso\projet\`).
   > ⚠️ Ne travaille **pas** directement depuis la clé USB (trop lent et peu fiable) : copie-le sur le disque.

2. Ouvre **PowerShell** dans le dossier copié :
   ```powershell
   cd D:\perso\projet\gestion-de-restaurant
   ```

3. **Réinstalle les dépendances proprement.** Le dossier `node_modules` copié d'un autre PC peut être **incompatible** (certaines librairies sont compilées pour une machine précise). On le supprime et on réinstalle :
   ```powershell
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   npm install
   ```
   ⏳ 1 à 3 minutes. C'est normal.

> ✅ **Bonne nouvelle : tes fichiers secrets sont déjà là.** Comme tu as **copié le dossier** (et non cloné depuis GitHub), les fichiers `.env` et `firebase-applet-config.json` — qui contiennent la config base de données, Firebase et la **clé Gemini** — ont été **copiés avec le dossier**. Tu n'as donc **pas à les recréer** : il suffit de **vérifier** leurs valeurs (étapes 4 et 5).
>
> ⚠️ Si tu ne les vois **pas** dans le dossier : soit ils étaient masqués et non copiés (active « Afficher les fichiers cachés » dans l'Explorateur), soit il faut les recréer à partir des modèles `.env.example` / `firebase-applet-config.example.json` (voir étapes 4 et 5 en variante).
>
> ⚠️ La **base de données PostgreSQL n'est PAS dans le dossier** (elle vit ailleurs sur l'ordinateur). Tu dois quand même faire l'**étape 3** (installer Postgres + créer la base) sur cette machine.

---

## 3. Créer la base de données

On crée la base **`chefsuite`** et l'utilisateur **`user`** (mot de passe `user`).

1. Ouvre une invite PostgreSQL avec le compte `postgres` (mot de passe défini à l'installation) :
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
   ```

2. Dans l'invite `postgres=#`, tape ces 2 commandes (une par une, valide avec Entrée) :
   ```sql
   CREATE ROLE "user" WITH LOGIN PASSWORD 'user' CREATEDB;
   CREATE DATABASE chefsuite OWNER "user";
   ```
   > ⚠️ `user` est un mot réservé en SQL → il **faut** les guillemets doubles `"user"` autour du nom du rôle.

3. Quitte :
   ```sql
   \q
   ```

4. Vérifie que la connexion marche (il demandera le mot de passe `user`) :
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U user -h localhost -d chefsuite -c "SELECT current_user;"
   ```
   Si tu vois `user`, c'est bon ✅.

**Récapitulatif des 4 infos de connexion** (pour l'étape suivante) :
- Hôte : `localhost` • Port : `5432`
- Utilisateur : `user` • Mot de passe : `user` • Base : `chefsuite`

---

## 4. Vérifier le fichier `.env` (déjà copié)

Le fichier **`.env`** a été copié avec le dossier. **Ouvre-le** pour vérifier que ses valeurs correspondent à la base créée à l'étape 3 :
```powershell
notepad .env
```

Il doit contenir (ce sont les valeurs maison) :
```env
# URL de l'application
APP_URL="http://localhost:3000"

# Connexion PostgreSQL (application)
SQL_HOST="localhost"
SQL_DB_NAME="chefsuite"
SQL_USER="user"
SQL_PASSWORD="user"

# Connexion PostgreSQL (migrations Drizzle) — mêmes accès
SQL_ADMIN_USER="user"
SQL_ADMIN_PASSWORD="user"

# Bouton "Accès test (Admin)" sans Firebase (pratique en local)
ENABLE_TEST_LOGIN="true"

# Clé API Gemini pour les analyses IA (déjà présente si tu as copié le dossier)
GEMINI_API_KEY="..."
```

- ✅ Si les 4 lignes `SQL_*` correspondent bien à la base de l'étape 3 (`chefsuite`, `user`/`user`) → rien à changer.
- 🔑 La **clé Gemini** est déjà là (elle était dans le `.env` copié) → l'IA marchera directement.
- ⚠️ **Si le fichier `.env` est absent** (pas copié) : crée-le avec `Copy-Item .env.example .env`, puis colle le contenu ci-dessus (et remets ta clé Gemini si tu veux l'IA).

> Le `.env` contient des secrets : ne le mets jamais sur GitHub (il est déjà dans `.gitignore`).

---

## 5. Vérifier la config Firebase (déjà copiée)

Le fichier **`firebase-applet-config.json`** a été copié avec le dossier → **normalement, rien à faire**. Vérifie juste qu'il est bien présent à la racine :
```powershell
Get-Content firebase-applet-config.json
```
S'il affiche un bloc JSON avec `apiKey`, `projectId`, etc. → ✅ c'est bon, passe à l'étape 6.

> ℹ️ Le même projet Firebase est utilisé (c'est un service **en ligne** de Google) : ta config copiée continue de marcher depuis n'importe quel ordinateur. Il faut juste **Internet**.
>
> 💡 Pour juste tester sans créer de comptes, tu peux même ignorer Firebase et utiliser le bouton **« Accès test (Admin) »** à l'étape 7 (grâce à `ENABLE_TEST_LOGIN="true"`).

### ⚠️ Variante — si le fichier `firebase-applet-config.json` est **absent**
Il n'a pas été copié : recrée-le.
1. Va sur https://console.firebase.google.com/ → ton projet **`chefsuite-local`** (ou crée-en un).
2. **Authentication** → active **Adresse e-mail/Mot de passe** (1er interrupteur) → Enregistrer.
3. Engrenage ⚙️ → **Paramètres du projet** → section **Vos applications** → app **Web `</>`** → copie le bloc `firebaseConfig`.
4. Crée le fichier et colle tes valeurs (format JSON, guillemets doubles) :
   ```powershell
   Copy-Item firebase-applet-config.example.json firebase-applet-config.json
   notepad firebase-applet-config.json
   ```
   ```json
   {
     "apiKey": "AIza........",
     "authDomain": "chefsuite-local.firebaseapp.com",
     "projectId": "chefsuite-local",
     "storageBucket": "chefsuite-local.firebasestorage.app",
     "messagingSenderId": "1234567890",
     "appId": "1:1234567890:web:abcdef123456"
   }
   ```

> Pas besoin de clé privée. Le serveur vérifie les jetons via le `projectId` → **Internet requis**.

---

## 6. Créer les tables dans la base

Drizzle crée **toutes** les tables automatiquement (commandes, menu, stocks, fournisseurs, biens & matériel, livraisons, etc.) :
```powershell
npm run db:push
```
Tu dois finir par **`[✓] Changes applied`** ✅.

> 🔎 Sur une **base neuve**, c'est tout : pas besoin du script de migration (`scripts/migrate-supplier-orders.ts` ne sert qu'aux anciennes bases mono-article). Ta base est vide → tables créées directement au bon format.

---

## 7. Lancer l'application

```powershell
npm run dev
```
Attends le message **`Server running at http://0.0.0.0:3000`**, puis ouvre :

👉 **http://localhost:3000**

- Pour **arrêter** : `Ctrl + C` dans le terminal.
- Si `localhost` ne répond pas, essaie **http://127.0.0.1:3000** (souci IPv6).

### Se connecter
- **Accès test (Admin)** (bouton noir) : entre direct sans Firebase (marche car `ENABLE_TEST_LOGIN="true"`).
- **Créer un compte réel** : onglet « S'inscrire » (nécessite l'étape 5 faite).

**Partager les données super admin ↔ gérant** : le super admin crée son compte d'abord ; le gérant s'inscrit en rôle « Gérant » et met **l'e-mail du super admin** dans le champ prévu → les deux voient le même restaurant.

---

## 8. Analyses IA (optionnel)

1. Récupère une clé gratuite sur https://aistudio.google.com/.
2. Mets-la dans `.env` : `GEMINI_API_KEY="ta_cle"`.
3. Redémarre : `Ctrl + C` puis `npm run dev`.

Sans clé, tout le reste fonctionne à 100 % ; seul l'onglet IA affiche un message.

---

## 9. Vérifications rapides (tout est OK ?)

```powershell
node --version        # v20.x
npm run lint          # vérifie le TypeScript, doit finir sans erreur
```

---

## 10. Dépannage (erreurs fréquentes)

| Symptôme | Cause probable → solution |
|---|---|
| `Database credentials missing` / connexion refusée | Service PostgreSQL arrêté (Windows → `Services` → `postgresql-x64-16` doit tourner) **ou** mauvaises valeurs `SQL_*` dans `.env`. |
| `npm run db:push` échoue | La base `chefsuite` n'existe pas / droits manquants (étape 3) ; vérifie `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD`. |
| `password authentication failed for user "user"` | Le mot de passe du rôle `user` n'est pas `user`. Recrée-le : `ALTER ROLE "user" WITH PASSWORD 'user';` dans `psql -U postgres`. |
| `auth/operation-not-allowed` à l'inscription | E-mail/Mot de passe pas activé dans Firebase (étape 5.2). |
| `auth/invalid-api-key` ou jeton invalide | `firebase-applet-config.json` ne correspond pas au projet (étape 5.4) ; vérifie aussi ta connexion Internet. |
| La page ne s'ouvre pas | Essaie `http://127.0.0.1:3000` ; vérifie qu'aucun autre programme n'utilise le port 3000. |
| Le bouton « Accès test » ne fait rien | `ENABLE_TEST_LOGIN="true"` dans `.env` puis redémarrer ; autorise les pop-ups (aussi pour imprimer une addition). |

---

## 11. Commandes utiles (mémo)

```powershell
npm install          # installer/mettre à jour les dépendances
npm run dev          # lancer l'app (front + back) sur :3000
npm run db:push      # (re)créer / synchroniser les tables depuis le schéma
npm run lint         # vérifier le TypeScript (0 erreur attendu)
npm run build        # compiler pour la production
npm run start        # lancer la version de production

git pull             # récupérer les dernières modifs depuis GitHub
git status           # voir ce qui a changé
```

---

## 12. Fichiers importants (pour t'y retrouver)

| Fichier / dossier | Contenu |
|---|---|
| `.env` | Tes secrets (base de données, options) — **à créer** |
| `firebase-applet-config.json` | Config Firebase (comptes) — **à créer** |
| `server.ts` | Le serveur (API REST + Socket.io temps réel) |
| `src/App.tsx` | L'application React (état, onglets, dashboard) |
| `src/components/` | Les écrans (Commandes, Menu, Stocks, Personnel, Biens & Matériel, Livraisons…) |
| `src/db/schema.ts` | La structure de la base (les tables) |
| `src/db/queries.ts` | Les requêtes vers la base |
| `scripts/migrate-supplier-orders.ts` | Migration one-shot (anciennes bases uniquement) |

---

Bonne installation ! 🍽️ 90 % des soucis viennent du `.env` ou de Firebase — en cas de blocage, relis la section **Dépannage**.

> 📖 Pour **apprendre à utiliser** l'application (tous les écrans), ouvre **`Guide-Utilisation-RestoPilote.md`** à la racine.
