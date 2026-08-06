# 🚀 Mettre RestoPilote en ligne sur Render

Guide pas à pas. À la fin, l'application sera accessible sur une URL publique `https://…onrender.com`.

> **Prérequis :** le code est déjà sur GitHub (`samueldolly321/gestion-de-restaurant`, branche `main`) et un compte gratuit sur https://render.com.

> **Architecture :** le **serveur web** est hébergé sur **Render** ; la **base PostgreSQL** est hébergée sur **Neon** (https://neon.tech, Postgres gratuit qui n'expire pas). Raison : Render ne permet qu'**une seule base gratuite par compte**. Le serveur se connecte à la base via la variable **`DATABASE_URL`**.

---

## Étape 1 — Créer la base PostgreSQL (Neon)

1. Va sur **https://neon.tech** → inscris-toi (avec GitHub, c'est le plus simple).
2. **Create project** → nom `restopilote`, région **Europe (Frankfurt)** de préférence → Create.
3. Neon affiche une **Connection string** du type :
   `postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. **Copie cette chaîne** (bouton copier). C'est ta `DATABASE_URL`. Garde-la sous la main.

*(Alternative : Supabase → Project Settings → Database → Connection string « URI ». Même principe.)*

---

## Étape 2 — Déployer le service web (Blueprint Render)

Le fichier **`render.yaml`** (à la racine) décrit le service web.

1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Choisis le dépôt **`gestion-de-restaurant`** → **Connect** → laisse la branche `main`.
3. Render lit `render.yaml` et va créer le service web **`restopilote`**. Il demande la valeur des variables marquées « manuelles » :
   - **`DATABASE_URL`** → colle la chaîne de connexion Neon de l'étape 1.
   - **`GEMINI_API_KEY`** → (optionnel, pour l'onglet Analyses IA) colle ta clé, ou laisse vide.
4. Clique **Apply**.

Render va alors : installer les dépendances → **construire** le front + le serveur → **créer les tables** dans la base Neon (`db:push`) → démarrer le serveur.

⏳ ~3-5 min. Quand le statut est **Live**, ouvre l'URL affichée (`https://restopilote.onrender.com`).

---

## Étape 3 — Première connexion (base vide)

La base est **neuve et vide** (aucune donnée locale transférée).

1. Ouvre l'URL de l'app → écran de connexion.
2. Onglet **« S'inscrire »** → crée le **premier compte Super Admin** (e-mail + mot de passe, rôle Super Admin).
3. Connecte-toi, puis via l'onglet **Utilisateurs** ajoute le gérant et le personnel.
4. Renseigne le **nom, logo, slogan** du restaurant dans **Paramètres**.

> `ENABLE_TEST_LOGIN=false` en production : pas de bouton « Accès test ». On passe par l'inscription.

---

## ⚠️ À savoir sur le plan gratuit

- **Le serveur Render s'endort** après ~15 min sans visite → le 1er accès suivant met ~30-50 s à répondre (démarrage à froid). Normal.
- **La base Neon gratuite** se met en veille après inactivité mais **ne s'expire pas** ; elle se réveille en quelques secondes.
- Pour un usage réel/pro : passer le web Render et/ou la base Neon en plan payant (meilleures perfs, pas de mise en veille).

## Dépannage

| Problème | Solution |
|---|---|
| Build échoue sur `esbuild`/`tailwind` introuvable | Vérifie que la build command contient bien `--include=dev`. |
| `db:push` échoue : `DATABASE_URL` manquant | Renseigne `DATABASE_URL` (service → **Environment**) puis **Manual Deploy → Deploy latest commit**. |
| `db:push` bloque pendant le build | Lance-le à la main : service → **Shell** → `npm run db:push`. |
| Connexion DB refusée / SSL | Vérifie que la chaîne Neon est complète (avec `?sslmode=require`). Le SSL est géré par le code. |
| Page blanche / 502 après déploiement | Regarde les **Logs** ; vérifie `DATABASE_URL` et `NODE_ENV=production`. |
| « Session expirée » en boucle | `JWT_SECRET` a changé entre deux déploiements — reconnecte-toi. Garde-le stable. |

---

*Config technique : port fourni par `PORT` (Render), front statique servi depuis `dist/`, connexion via `DATABASE_URL` (SSL). Voir `render.yaml`, `server.ts`, `src/db/index.ts`.*
