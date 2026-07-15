# 📖 Guide d'utilisation — RestoPilote

Guide complet, écran par écran, de l'application de gestion de restaurant **RestoPilote**.
Mis à jour le **15/07/2026**.

> Version Markdown du guide (lisible dans VS Code, sur GitHub, ou ouvrable dans Word via « Fichier → Ouvrir »).
> Pour installer l'app, voir **`installation-projet-maison.md`**.

---

## 1. Se connecter

Deux façons d'entrer :
- **Accès test (Admin)** : bouton noir, entre directement sans compte (si activé en local).
- **Compte réel** : onglet « S'inscrire » (Firebase), choisis ton rôle.

**Les rôles :**
- **Super Admin** : tout voir (finances, salaires, dépenses, paramètres, IA).
- **Gérant** : gère salle / stock / personnel, mais **ne voit pas** les salaires ni les finances ; paramètres en lecture seule.

Super admin et gérant peuvent **partager le même restaurant** : le gérant met l'e-mail du super admin à l'inscription.

---

## 2. Tableau de bord

Vue d'ensemble analytique, mise à jour en temps réel.

- **Bilan financier du mois** : 3 blocs.
  - **Entrées d'argent** — *cliquable* 👆 : ouvre le **détail des entrées d'aujourd'hui** (additions payées + rentrées manuelles du jour, avec le total).
  - **Dépenses (sorties)** — *cliquable* 👆 : ouvre le **détail des dépenses d'aujourd'hui** (dépenses datées + quote-part salaires du jour).
  - **Bénéfice** = Entrées − Dépenses.
- **Ratios clés** : food cost, masse salariale, marge brute.
- **Trésorerie — 6 derniers mois** : graphique Entrées vs Sorties. Les **salaires sont comptés par mois selon la date d'embauche** de chaque employé (historique fidèle).
- **Meilleures ventes** : plats et boissons les plus vendus.
- **Calendrier de l'Établissement** : réservations, congés, livraisons et événements réunis.

---

## 3. Tables & Additions (prise de commande)

Tableau **Kanban** à 4 colonnes : **En attente → En cuisine → Servi → Payé**.

### Ouvrir / modifier une commande
Clique **« Ouvrir une Commande »** :
- **Table**, **statut**, **type** : 🍽️ Sur place ou 🚚 À livrer.
- **Serveur** (obligatoire, rôle « Serveur »).
- **Client (fidélité)** — facultatif : rattache un client → **+1 point de fidélité** à la création.
- **Plats & boissons** : ajoute les articles de la carte ; le total se calcule tout seul.
- **TVA** : si un taux est mis, l'addition affiche HT / TVA / TTC.
- **Frais de livraison** *(si « À livrer »)* : liste déroulante 3000 → 8000 Ar. Le total devient **Addition (plats) + Livraison**.
- La fenêtre **défile** ; les boutons « Enregistrer / Annuler » et la croix ✕ restent accessibles.

### Sur chaque carte de commande
- **Référence auto** de la commande (ex. **Réf. 15-04** = 4ᵉ commande du 15).
- Serveur, client (⭐), type, articles, total, TVA, moyen de paiement.
- **Encaisser l'Addition**, **Imprimer l'addition**, flèches pour changer de statut, modifier, supprimer.

### Recherche & affichage
- **Filtre** : par n° de table, **serveur**, **plat**, **paiement**, et par **date**.
- **Vue plein écran par statut** : clique le **titre** d'une colonne (En attente, En cuisine, Servi, Payé) → toutes ses commandes s'affichent en grand ; re-clique pour revenir au tableau.

### Commande « À livrer » → Livraison automatique
Dès qu'une commande est **À livrer**, une **livraison est créée automatiquement** dans l'onglet Livraisons (tracée par la référence). Tu y complètes l'adresse et **attribues le livreur** ensuite.

---

## 4. Carte du Chef (menu)

- Ajoute plats / boissons / desserts : nom, prix, catégorie, disponibilité, photo.
- **Fiche technique** (modale scrollable) : ingrédients **liés au stock** → le coût du plat se calcule depuis le prix du stock, et le stock se **déduit automatiquement** quand un plat passe à « servi ».

---

## 5. Réservations

Calendrier interactif : nom du client, date/heure, nombre de couverts, table. Apparaît aussi dans le Calendrier de l'Établissement.

---

## 6. Personnel

- Fiches employés : nom, contact, **rôle**, statut, **taux horaire**, **salaire** (super admin seulement), **date d'embauche**, **congés**, **photo**, **import CV** (PDF/image).
- **Rôle Livreur** : un champ **« Véhicule attaché »** apparaît → choisis un véhicule (parmi les Biens & Matériel de catégorie Véhicule). Il s'affiche sur la fiche.
- Rôles : serveur, cuisinier, chef, femme de ménage, **livreur**, barman, manager, **Autre** (libre).

---

## 7. Livraisons

Tableau des livraisons : client, adresse, date/heure, **commande liée**, **livreur**, **véhicule**, statut.

- **Nouvelle livraison** : client, adresse, date/heure, **commande à livrer**, **livreur**, **véhicule**.
  - 💡 En choisissant un livreur qui a un véhicule attaché, **son véhicule se remplit automatiquement**.
- Les commandes « à livrer » y arrivent **automatiquement** (à compléter : adresse + livreur).
- **Référence de commande cliquable** : clique la référence (ex. « Réf. 15-04 ») → une modale montre le **détail de la commande** (plats, addition, frais, total).

---

## 8. Clients

- Carnet d'adresses : nom, e-mail, téléphone, notes.
- **Points de fidélité** : affichés sur chaque fiche (« X Pts »). **+1 point à chaque commande** rattachée au client. Bouton « +10 » pour un bonus manuel.

---

## 9. Calendrier Live

Planning centralisé : réservations, congés du staff, livraisons et **événements spéciaux** (concerts, soirées, fermetures). Les événements sont **enregistrés en base** (persistants).

---

## 10. Stocks & Fournisseurs

Trois sous-onglets.

### 10.1 Stocks
- Chaque article : quantité **initiale vs restante**, unité, **coût unitaire**, seuil d'alerte, fournisseur, photo de facture.
- **Réapprovisionnement** (s'additionne) + **historique d'appro daté**.
- **Résumé** : compteurs + **valeur totale du stock**. **Alerte stock bas**.
- **Recherche** : par nom d'article **ou par fournisseur** (tape « Star » → tous ses articles).
- **Filtre date** : par **activité** (article créé **ou** approvisionné dans la période).

### 10.2 Fournisseurs (annuaire)
- Fiches fournisseurs : contact, téléphone, e-mail, facture, totaux (commandé / dû).
- **Catalogue produits** (bouton « Catalogue ») : liste des produits d'un fournisseur avec leur **prix courant**, unité, stock lié.
  - Le prix catalogue sert au **pré-remplissage**. Le modifier **n'affecte pas** les commandes déjà passées.
  - Option **« Autre »** dans le lien stock → crée un nouvel article de stock à la volée.

### 10.3 Commandes (historique)
Commande fournisseur **multi-articles** : une commande = **plusieurs lignes** (produits), une facture, un paiement.
- Chaque ligne : produit, quantité, prix unitaire, article de stock lié.
  - **Catalogue** : en choisissant le fournisseur, ses produits s'affichent en **puces cliquables** qui pré-remplissent une ligne (prix modifiable).
- **Total** = somme des lignes. **Facture** (n° + photo).
- **Payée** → crée une **dépense auto** (catégorie Ingrédients) du total.
- **Reçue** (bouton global) → **alimente le stock** de chaque ligne liée (+ mouvement d'historique + coût unitaire). Idempotent (une fois par ligne).
- **Corriger une quantité déjà reçue** : le stock **s'ajuste automatiquement** du delta (+ mouvement de correction).
- Dépliant « N art. » pour voir le détail des lignes ; **filtre par fournisseur et par date**.

---

## 11. Biens & Matériel *(nouvel onglet)*

Inventaire du matériel du restaurant.

- **Ajouter un bien** : nom, **catégorie**, quantité, **état** (Bon / Moyen / À réparer), **valeur unitaire**, **photo**, note.
- **Catégories** : 🪑 Mobilier · 📺 Électronique · 🏍️ Véhicule · 🧑‍🍳 Équipement · 📦 Autre.
- **Photo** (import de fichier) — surtout utile pour les **véhicules** (moto, voiture, camionnette).
- **Recherche** + **filtres par catégorie**. Résumé en haut : nombre de biens, unités, **valeur estimée totale**.
- Les **véhicules** ici alimentent les listes déroulantes du **Personnel** (livreur) et des **Livraisons**.

---

## 12. Argent (Finances) — *super admin*

Rapports : chiffre d'affaires, dépenses, ratios. Les commandes fournisseurs payées sont comptées **une seule fois** (via la dépense auto).

---

## 13. Rentrées d'argent

- **Automatique** : additions payées.
- **Manuel** : autres rentrées (origine, moyen de paiement, justificatif…).

---

## 14. Dépenses diverses

- Dépenses : loyer, charges, achats, factures (photo). Catégorie **Ingrédients** pour le food cost.
- **Charges récurrentes** mensuelles (génération automatique).

---

## 15. Analyses IA & Mérite — *optionnel, super admin*

Analyses générées par l'IA (Gemini). Nécessite une clé `GEMINI_API_KEY`. Sans clé, le reste de l'app fonctionne normalement.

---

## 16. Paramètres — *super admin*

Nom, **téléphone**, **adresse** du restaurant. En lecture seule pour le gérant.

---

## Astuces
- **Temps réel** : toute modification (commande, stock, points, livraison…) apparaît instantanément sur les autres écrans/comptes du même restaurant.
- **Impression d'addition** : autorise les fenêtres pop-up du navigateur.
- **Référence de commande** : format `JJ-NN` (jour + n° du jour), pratique pour tracer une commande de la salle jusqu'à la livraison.

---

Bon pilotage ! 🍽️
