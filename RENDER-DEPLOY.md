# 🚀 Mettre RestoPilote en ligne sur Render

Guide pas à pas. À la fin, l'application sera accessible sur une URL publique `https://…onrender.com`.

> **Prérequis :** le code est déjà sur GitHub (`samueldolly321/gestion-de-restaurant`, branche `main`) et un compte gratuit sur https://render.com.

---

## Option A — Déploiement automatique (Blueprint, recommandé)

Le fichier **`render.yaml`** (à la racine) décrit tout : le serveur web **et** la base PostgreSQL.

1. Va sur https://dashboard.render.com → **New +** → **Blueprint**.
2. Connecte ton compte GitHub et choisis le dépôt **`gestion-de-restaurant`**.
3. Render lit `render.yaml` et propose de créer :
   - un **service web** `restopilote` (Node) ;
   - une **base PostgreSQL** `restopilote-db`.
4. Clique **Apply**. Render va :
   - installer les dépendances, **construire** le front + le serveur (`npm run build`) ;
   - **créer les tables** dans la base (`npm run db:push`) ;
   - démarrer le serveur (`npm run start`).
5. (Optionnel) Pour l'onglet **Analyses IA**, ajoute la clé Gemini : service `restopilote` → **Environment** → `GEMINI_API_KEY` → colle ta clé → **Save** (redéploie).

⏳ Le premier déploiement prend ~3-5 min. Quand le statut est **Live**, ouvre l'URL affichée.

---

## Option B — Déploiement manuel (sans Blueprint)

1. **Base de données** : **New +** → **PostgreSQL** → plan **Free**, région **Frankfurt** → **Create**. Note la **Internal Database URL**.
2. **Service web** : **New +** → **Web Service** → dépôt `gestion-de-restaurant` → :
   - **Runtime** : Node
   - **Build Command** : `npm install --include=dev && npm run build && npm run db:push`
   - **Start Command** : `npm run start`
   - **Health Check Path** : `/api/health`
3. **Environment** (variables) :
   | Clé | Valeur |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(colle l'Internal Database URL de l'étape 1)* |
   | `JWT_SECRET` | *(une longue chaîne aléatoire — bouton « Generate »)* |
   | `ENABLE_TEST_LOGIN` | `false` |
   | `GEMINI_API_KEY` | *(optionnel)* |
4. **Create Web Service**.

---

## Première connexion (base vide)

La base en ligne est **neuve et vide** (tes données locales ne sont **pas** transférées).

1. Ouvre l'URL de l'app → écran de connexion.
2. Onglet **« S'inscrire »** → crée le **premier compte Super Admin** (e-mail + mot de passe, rôle Super Admin).
3. Connecte-toi, puis via l'onglet **Utilisateurs** ajoute le gérant et le personnel.
4. Renseigne le **nom, logo, slogan** du restaurant dans **Paramètres**.

> `ENABLE_TEST_LOGIN` est à `false` en production : pas de bouton « Accès test ». On passe donc par l'inscription.

---

## ⚠️ À savoir sur le plan gratuit

- **Le serveur s'endort** après ~15 min sans visite → le 1er accès suivant met ~30-50 s à répondre (démarrage à froid). Normal.
- **La base PostgreSQL gratuite expire au bout d'environ 30 jours** (Render la supprime). Pour un usage réel/durable, passe la base en plan payant (≈ 7 $/mois) — les données sont alors conservées et sauvegardées.
- Sur plan payant, tu peux aussi ajouter un **domaine personnalisé** (Settings → Custom Domains).

## Dépannage

| Problème | Solution |
|---|---|
| Build échoue sur `esbuild`/`tailwind` introuvable | Vérifie que la build command contient bien `--include=dev`. |
| `db:push` bloque/échoue pendant le build | Lance-le à la main : service → **Shell** → `npm run db:push`. |
| Page blanche / 502 après déploiement | Regarde les **Logs** du service ; vérifie `DATABASE_URL` et `NODE_ENV=production`. |
| Connexion DB refusée | La `DATABASE_URL` doit être celle de la base Render (SSL est géré automatiquement par le code). |
| « Session expirée » en boucle | `JWT_SECRET` a changé entre deux déploiements — reconnecte-toi. Garde un `JWT_SECRET` stable. |

---

*Config technique : port fourni par `PORT` (Render), front statique servi depuis `dist/`, connexion via `DATABASE_URL` (SSL). Voir `render.yaml`, `server.ts`, `src/db/index.ts`.*
