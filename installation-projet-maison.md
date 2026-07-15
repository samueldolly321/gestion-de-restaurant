# 🏠 Installer RestoPilote sur ton ordinateur à la maison

Guide **pas à pas**, écrit pour un **développeur junior** : chaque étape a la commande exacte à taper. À la fin, l'application tournera sur **http://localhost:3000**.

> Ce fichier utilise **exactement les valeurs de config qu'on utilise déjà** (base `chefsuite`, utilisateur `user` / mot de passe `user`). Si tu recopies tout tel quel, ça marche. Tu pourras changer les mots de passe plus tard si tu veux.

---

## 0. Ce que tu vas installer (vue d'ensemble)

| Outil | À quoi ça sert | Obligatoire ? |
|---|---|---|
| **Git** | Récupérer le code depuis GitHub | ✅ Oui |
| **Node.js 20** | Faire tourner l'app (front + back) | ✅ Oui |
| **PostgreSQL 16** | La base de données (toutes les données du resto) | ✅ Oui |
| **Un compte Firebase** | Les connexions (e-mail + mot de passe) | ✅ Oui (sauf si tu utilises seulement le bouton « Accès test ») |
| **Une clé Gemini** | L'onglet « Analyses IA » | ❌ Optionnel |

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

### 1.2 Git
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

## 2. Récupérer le projet

Choisis un dossier où mettre le projet (ex. `D:\perso\projet`), puis :

```powershell
cd D:\perso\projet
git clone https://github.com/samueldolly321/gestion-de-restaurant.git
cd gestion-de-restaurant
```

Installe les librairies (React, Express, Drizzle, etc.) :
```powershell
npm install
```
⏳ 1 à 3 minutes la première fois. C'est normal.

> ℹ️ **Deux fichiers de secrets ne sont PAS sur GitHub** (ils sont ignorés par git) : `.env` et `firebase-applet-config.json`. Tu vas les **créer toi-même** aux étapes 4 et 5.

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

## 4. Créer le fichier `.env`

À la **racine du projet** (`gestion-de-restaurant`), crée un fichier nommé **`.env`**.
Le plus simple, copier le modèle puis l'éditer :
```powershell
Copy-Item .env.example .env
notepad .env
```

Remplace **tout** le contenu par ceci (valeurs maison) :
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

# Clé API Gemini pour les analyses IA — OPTIONNEL (laisser vide si non utilisé)
GEMINI_API_KEY=""
```
Enregistre et ferme.

> ⚠️ Le `.env` contient des secrets : ne le mets jamais sur GitHub (il est déjà dans `.gitignore`).
> 🔑 **La clé Gemini n'est pas sur GitHub** : si tu veux l'IA, remets ta clé ici (voir étape 8).

---

## 5. Configurer Firebase (les comptes / la connexion)

L'app utilise **Firebase Authentication** (e-mail + mot de passe). Si tu veux seulement tester vite fait, tu peux **sauter cette étape** et utiliser le bouton **« Accès test (Admin) »** à l'étape 7 (grâce à `ENABLE_TEST_LOGIN="true"`). Mais pour créer de vrais comptes, fais ceci :

### 5.1 Créer le projet Firebase
1. Va sur https://console.firebase.google.com/ (connecte-toi avec un compte Google).
2. **« Ajouter un projet »** → nom `chefsuite-local` → tu peux désactiver Google Analytics → **Créer**.

### 5.2 Activer E-mail / Mot de passe
1. Menu de gauche → **Authentication** (ou cherche `Authentication` dans la barre de recherche).
2. **« Commencer »** → onglet **« Sign-in method »**.
3. **« Ajouter un fournisseur »** → **« Adresse e-mail/Mot de passe »**.
4. **Active le premier interrupteur** (laisse le 2ᵉ « lien e-mail » désactivé) → **Enregistrer**.

### 5.3 Récupérer la config Web
1. Engrenage ⚙️ (en haut à gauche) → **« Paramètres du projet »**.
2. Section **« Vos applications »** → icône **Web `</>`**.
3. Pseudo `chefsuite-web` → **ne coche pas** « Firebase Hosting » → **Enregistrer**.
4. Firebase affiche un bloc `firebaseConfig` : garde-le ouvert, tu vas copier ces valeurs.

### 5.4 Coller la config dans le projet
```powershell
Copy-Item firebase-applet-config.example.json firebase-applet-config.json
notepad firebase-applet-config.json
```
Remplace par **tes** valeurs (format JSON, guillemets doubles, pas de `const`) :
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
Enregistre.

> ℹ️ Pas besoin de clé privée. Le serveur vérifie juste les jetons via le `projectId` → **Internet requis** pour Firebase.

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
