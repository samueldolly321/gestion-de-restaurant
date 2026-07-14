# 📘 Guide d'installation locale de RestoPilote

Ce guide t'explique **pas à pas** comment installer et lancer l'application **RestoPilote** (gestion de restaurant) sur ton ordinateur, en local. Il est écrit pour un **développeur junior** : chaque étape est détaillée, avec les commandes exactes.

> RestoPilote = application web de gestion de restaurant : commandes & additions (TVA, sur place / à livrer), carte/menu & fiches techniques, stocks (déduction auto, historique), fournisseurs & commandes (réception → stock), livraisons, personnel (CV, salaires, congés), clients, réservations, calendrier, dépenses (charges récurrentes), rentrées d'argent, tableau de bord financier (ratios, trésorerie, meilleures ventes), et analyses IA (optionnel).

---

## 🧱 La stack technique (ce que tu vas installer)

| Élément | Rôle |
|--------|------|
| **React 19** | L'interface (le front) |
| **Express + Socket.io** | Le serveur (le back) + le temps réel |
| **Vite** | Sert le front en développement |
| **PostgreSQL** | La base de données (toutes les données du resto) |
| **Drizzle ORM** | Crée les tables et parle à PostgreSQL |
| **Firebase Auth** | La connexion / les comptes (e-mail + mot de passe) |
| **Gemini (Google AI)** | Analyses IA — **optionnel** |

Le front **et** le back tournent ensemble sur **un seul serveur** : `http://localhost:3000`.

---

## ✅ Prérequis à installer une seule fois

1. **Node.js** version **18 ou 20** (recommandé). Vérifie :
   ```powershell
   node --version
   npm --version
   ```
   Si absent : télécharge sur https://nodejs.org (version LTS).

2. **PostgreSQL** version **14 ou plus**. Télécharge sur https://www.postgresql.org/download/.
   - Pendant l'installation, **note bien le mot de passe** que tu donnes à l'utilisateur `postgres`.
   - Sous Windows, les outils sont installés dans `C:\Program Files\PostgreSQL\16\bin` (adapte le numéro de version).

3. **Un terminal** : PowerShell (Windows), ou Terminal (macOS/Linux).

> 💡 Astuce Windows : `psql` n'est pas toujours dans le `PATH`. Tu peux l'appeler par son chemin complet :
> `& "C:\Program Files\PostgreSQL\16\bin\psql.exe"`

---

## 📥 Étape 1 — Récupérer le projet et installer les dépendances

1. **Cloner le dépôt** depuis GitHub (ou copier le dossier du projet où tu veux) :
   ```powershell
   git clone https://github.com/samueldolly321/gestion-de-restaurant.git
   cd gestion-de-restaurant
   ```
   *(Si tu as déjà le dossier, ouvre simplement un terminal dedans.)*
2. Installe toutes les librairies (React, Express, Drizzle, etc.) :
   ```powershell
   npm install
   ```
   ⏳ Ça prend 1 à 3 minutes la première fois. C'est normal.

> ℹ️ **Deux fichiers de config ne sont PAS dans le dépôt** (ils contiennent des secrets et sont ignorés par git) : `.env` et `firebase-applet-config.json`. Tu vas les **créer toi-même** aux étapes 3 et 4, à partir des modèles fournis `.env.example` et `firebase-applet-config.example.json`.

---

## 🗄️ Étape 2 — Créer la base de données PostgreSQL

On crée une base **`chefsuite`** et un utilisateur qui la possède.

1. Ouvre un terminal PostgreSQL en te connectant avec le compte `postgres` (mot de passe défini à l'installation de PostgreSQL) :
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
   ```
   *(macOS/Linux : `psql -U postgres`)*

2. Dans l'invite `postgres=#`, colle ces commandes SQL (une par une) :
   ```sql
   -- Crée un utilisateur applicatif (change le mot de passe si tu veux)
   CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password' CREATEDB;

   -- Crée la base, possédée par cet utilisateur
   CREATE DATABASE chefsuite OWNER app_user;
   ```
   Puis quitte :
   ```sql
   \q
   ```

3. Vérifie que la connexion fonctionne :
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U app_user -h localhost -d chefsuite -c "SELECT current_user;"
   ```
   (Il te demandera le mot de passe `app_password`.) Si tu vois `app_user`, c'est bon ✅.

> 🧩 Tu peux aussi utiliser un outil graphique (**pgAdmin** livré avec PostgreSQL, ou **DBeaver**) pour créer la base et l'utilisateur à la souris.

Retiens ces 4 infos, tu en as besoin à l'étape suivante :
- **Hôte** : `localhost`  •  **Port** : `5432`
- **Utilisateur** : `app_user`  •  **Mot de passe** : `app_password`  •  **Base** : `chefsuite`

---

## ⚙️ Étape 3 — Créer le fichier de configuration `.env`

À la **racine du projet**, crée un fichier nommé **`.env`** (exactement ce nom). Le plus simple : **copie le modèle** `.env.example` puis modifie-le :
```powershell
Copy-Item .env.example .env
```
Ouvre `.env` et remplace par **tes** valeurs de l'étape 2 (contenu attendu) :

```env
# URL de l'application
APP_URL="http://localhost:3000"

# Connexion PostgreSQL (application)
SQL_HOST="localhost"
SQL_DB_NAME="chefsuite"
SQL_USER="app_user"
SQL_PASSWORD="app_password"

# Connexion PostgreSQL (migrations Drizzle) — mêmes accès, ou un compte admin
SQL_ADMIN_USER="app_user"
SQL_ADMIN_PASSWORD="app_password"

# Bouton "Accès test (Admin)" sans Firebase (pratique en local). Mettre "false" en production.
ENABLE_TEST_LOGIN="true"

# Clé API Gemini pour les analyses IA — OPTIONNEL (laisser vide si non utilisé)
GEMINI_API_KEY=""
```

> ⚠️ Le fichier `.env` contient des secrets : ne le partage pas, ne le mets pas sur GitHub (il est déjà ignoré par `.gitignore`).

---

## 🔥 Étape 4 — Configurer Firebase (les comptes / la connexion)

L'application utilise **Firebase Authentication** pour gérer les connexions **e-mail + mot de passe**. Suis ces étapes **dans l'ordre**.

### 4.1 — Créer un projet Firebase
1. Va sur la **Console Firebase** : https://console.firebase.google.com/
2. Connecte-toi avec un compte **Google**.
3. Clique **« Ajouter un projet »**.
4. Donne un nom, par ex. **`chefsuite-local`**.
5. Google Analytics : tu peux le **désactiver** (pas nécessaire) → **Créer le projet**.
6. Attends ~30 s puis **Continuer**.

### 4.2 — Activer la connexion E-mail/Mot de passe
Dans la **nouvelle console Firebase**, l'authentification est rangée sous **« Sécurité »** :

1. Dans le menu de gauche, sous **« Catégories de produits »**, clique **« Sécurité »**.
   - *(Si tu ne la trouves pas : utilise la **barre de recherche** en haut et tape `Authentication`.)*
2. Clique **« Authentication »**, puis **« Commencer » / « Get started »**.
3. Onglet **« Méthode de connexion » / « Sign-in method »**.
4. Clique **« Ajouter un fournisseur »**, puis, sous **« Fournisseurs natifs »**, choisis **« Adresse e-mail/Mot de passe »**.
5. **Active le premier interrupteur** (« Adresse e-mail/Mot de passe »).
   - ⚠️ Laisse le **deuxième** interrupteur (« Lien e-mail / connexion sans mot de passe ») **désactivé**.
6. Clique **« Enregistrer »**.

   Tu dois maintenant voir, dans le tableau des fournisseurs, la ligne **`Adresse e-mail/Mot de passe` → Activé** ✅.

   👉 *(Optionnel : tu peux aussi activer « Google » de la même façon si tu veux la connexion Google.)*

### 4.3 — Récupérer la configuration de l'application Web
1. En haut à gauche, clique l'**engrenage ⚙️ → « Paramètres du projet »**.
2. Descends jusqu'à la section **« Vos applications »**.
3. Clique l'icône **Web `</>`** (« Ajouter une application »).
4. **Pseudo de l'application** : mets un nom simple (ex. `chefsuite-web`).
   - ⚠️ **Ne coche PAS** la case **« Configurez aussi Firebase Hosting »** — inutile en local.
5. Clique **« Enregistrer l'application »**.
6. À l'étape « Ajouter le SDK Firebase », **ignore les commandes `npm install` / `import`** : tu as seulement besoin des **valeurs de configuration**. Firebase affiche un bloc `firebaseConfig`, du genre :
   ```js
   const firebaseConfig = {
     apiKey: "AIza........",
     authDomain: "chefsuite-local.firebaseapp.com",
     projectId: "chefsuite-local",
     storageBucket: "chefsuite-local.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```
   **Garde cette page ouverte**, tu vas copier ces valeurs.

### 4.4 — Coller la config dans le projet
1. **Crée le fichier** `firebase-applet-config.json` à la racine, en copiant le modèle :
   ```powershell
   Copy-Item firebase-applet-config.example.json firebase-applet-config.json
   ```
2. Ouvre-le et remplace les valeurs par les tiennes, **au format JSON** (guillemets doubles, pas de `const`) :
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
3. Enregistre le fichier.

> ℹ️ **Pas besoin de clé privée (service account).** Le serveur utilise seulement le `projectId` pour vérifier les jetons de connexion. En revanche, la vérification a besoin d'**Internet** (Firebase est un service Google en ligne).

---

## 🏗️ Étape 5 — Créer les tables dans la base

Drizzle crée automatiquement toutes les tables (commandes, menu, personnel, stocks, dépenses, etc.) à partir du schéma.

Dans le terminal, à la racine du projet :
```powershell
npm run db:push
```
Tu devrais voir se terminer par **`[✓] Changes applied`**. ✅

> 🔎 Sous le capot, cette commande lance `drizzle-kit push` avec le bon fichier de config (`src/db/drizzle.config.ts`). Si tu la lançais à la main, il faudrait préciser `--config=src/db/drizzle.config.ts`.

---

## 🚀 Étape 6 — Lancer l'application

```powershell
npm run dev
```
Attends le message **`Server running at http://0.0.0.0:3000`**, puis ouvre ton navigateur sur :

👉 **http://localhost:3000**

Pour **arrêter** le serveur : `Ctrl + C` dans le terminal.

---

## 🔑 Étape 7 — Se connecter

Sur l'écran de connexion, tu as deux options :

- **Accès test (Admin)** : bouton noir en bas. Entre directement dans l'admin **sans Firebase** (utile pour tester tout de suite). Ne fonctionne que si `ENABLE_TEST_LOGIN="true"` dans le `.env`.
- **Créer un compte réel** : onglet « S'inscrire », choisis le rôle, saisis e-mail + mot de passe. Ça utilise **Firebase** (l'étape 4 doit être faite).

### Les deux rôles
- **Super Admin** : accès complet (finances, dépenses, salaires, paramètres, analyses IA).
- **Gérant** : gère la salle/le stock/le personnel, mais **ne voit pas les salaires ni les finances**, et les **paramètres sont en lecture seule**.

### Partager les données entre 2 comptes (super admin + gérant)
Pour que le gérant voie **les mêmes données** que le super admin :
1. Le **super admin** crée son compte en premier.
2. Le **gérant** s'inscrit en choisissant le rôle « Gérant » → un champ **« E-mail du Super Admin à rejoindre »** apparaît : il y met l'e-mail du super admin.
3. Les deux comptes partagent alors le même restaurant et les mêmes données.

---

## 🤖 Étape 8 — Analyses IA (optionnel)

L'onglet **« Analyses IA & Mérite »** (super admin) utilise l'IA de Google (Gemini).
1. Obtiens une clé gratuite sur https://aistudio.google.com/
2. Colle-la dans le `.env` : `GEMINI_API_KEY="ta_cle"`.
3. Redémarre le serveur (`Ctrl+C` puis `npm run dev`).

Sans clé, tout le reste de l'application fonctionne à 100 % ; seul cet onglet affichera un message d'information.

---

## 🐳 Optionnel — Compiler pour la production

```powershell
npm run build   # compile le front (statique) + le back
npm run start   # démarre le serveur de production
```

---

## 🛠️ Dépannage (les erreurs fréquentes)

**« Database credentials missing » ou erreur de connexion PostgreSQL**
- Vérifie que le **service PostgreSQL tourne** (Windows : `Services` → `postgresql-x64-16` doit être « En cours d'exécution »).
- Vérifie les 4 valeurs `SQL_*` dans `.env` (utilisateur, mot de passe, base, hôte).

**`npm run db:push` échoue**
- La base `chefsuite` existe-t-elle ? L'utilisateur a-t-il les droits ? (Étape 2.)
- Les valeurs `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD` du `.env` sont-elles correctes ?

**Erreur `auth/operation-not-allowed` à l'inscription**
- Tu n'as pas activé **Email/Password** dans Firebase (Étape 4.2).

**Erreur `auth/invalid-api-key` ou jeton invalide**
- Le fichier `firebase-applet-config.json` ne correspond pas à ton projet Firebase (Étape 4.4). Revérifie chaque valeur.
- Pense aussi qu'il faut une **connexion Internet** pour Firebase.

**La page ne s'ouvre pas sur `localhost:3000`**
- Le serveur écoute en IPv4. En ligne de commande, teste avec `http://127.0.0.1:3000`.
- Un autre programme utilise-t-il déjà le port 3000 ?

**Le bouton « Accès test » ne fait rien**
- Vérifie `ENABLE_TEST_LOGIN="true"` dans `.env`, puis redémarre le serveur.
- Autorise les fenêtres pop-up pour ce site (nécessaire aussi pour imprimer une addition).

---

## 📁 Fichiers importants (pour t'y retrouver)

| Fichier / dossier | Contenu |
|---|---|
| `.env` | Tes secrets (base de données, options) |
| `firebase-applet-config.json` | Config Firebase (comptes) |
| `server.ts` | Le serveur (API + temps réel) |
| `src/App.tsx` | L'application React (l'interface) |
| `src/components/` | Les écrans (Commandes, Menu, Personnel, Dépenses…) |
| `src/db/schema.ts` | La structure de la base (les tables) |
| `src/db/queries.ts` | Les requêtes vers la base |

---

Bonne installation ! 🍽️ En cas de blocage, relis la section **Dépannage** — 90 % des soucis viennent du `.env` ou de Firebase.

> 📖 **Pour apprendre à utiliser l'application** (tous les écrans, de A à Z), ouvre le guide **`Guide-Utilisation-RestoPilote.docx`** fourni à la racine du projet.
