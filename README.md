# La Carte — Application de gestion cabinet conseil restauration

Application desktop (Windows / macOS / Linux) + version web, conçue pour le cabinet **La Carte Advisory** — suivi des missions d'audit et de conseil en restauration.

---

## Stack technique

| Composant | Technologie |
|---|---|
| Desktop | Electron + React |
| Base de données | Supabase (PostgreSQL cloud) |
| Synchronisation | Temps réel multi-postes via Supabase |
| Version web | React + Vite → déployé sur Vercel |
| URL web | `app.lacarte-conseil.fr` |

---

## Installation (desktop)

### Prérequis
- [Node.js](https://nodejs.org) v18 ou supérieur
- npm

### Première installation

```powershell
cd C:\Users\GRIMAULT\documents\consulting\la_carte
npm install
```

### Lancer en développement

```powershell
npm run build       # Compiler React
npx electron .      # Lancer l'app Electron
```

### Générer l'exécutable (.exe)

```powershell
npm run dist
```

Le fichier `.exe` sera dans le dossier `dist/`.

---

## Structure du projet

```
la_carte/
├── src/
│   └── App.js              # Application React (~9000 lignes)
├── electron/
│   ├── main.js             # Processus principal Electron + handlers IPC
│   └── preload.js          # Pont contextBridge (sécurité)
├── public/
├── package.json
└── .gitignore
```

---

## Sections de l'application

### 🗂 Dossiers clients
Suivi complet des clients avec 8 onglets par fiche :
- Informations · Tâches · Analyse financière · Analyse Menu
- Suivi mensuel · Tally · Historique · Pièces jointes

**Boutons disponibles sur chaque fiche :**
- 📧 Email — 12 templates pré-rédigés, ouvre Gmail
- 📋 Devis — génération PDF 8 pages
- 🖨️ Fiche RDV — page de garde A4 complète pour les rendez-vous
- 📄 PDF — export fiche technique

**3 formules :**
- `audit_menu` — Audit Menu
- `audit_menu_financier` — Audit Complet
- `suivi_mensuel` — Retainer mensuel

**Pipeline :** Prospection → Questionnaire → Audit → Clôture

---

### 📊 Tableau de bord
Cockpit d'action quotidien (aucun CA affiché) :
- ⚠️ Actions en retard
- 🎯 Missions en cours avec barre de progression
- 📅 Agenda 7 prochains jours
- 📧 Devis sans réponse
- 📋 Pipeline prospects bloqués
- 💬 Relances à planifier (clôturés +60j)
- 🕐 Dernière activité globale

---

### 🏢 Dossier Interne
6 onglets de gestion interne du cabinet :
- **Cabinet** — KPIs, objectif CA, graphe 6 mois
- **Pipeline** — prospects en cours de conversion
- **Facturation** — statuts : Brouillon / Envoyée / 1er versement / Payée / En retard
- **Documents** — archivage interne
- **Notes** — notes internes cabinet
- **Agenda** — calendrier des événements

---

### 💰 Comptabilité
7 onglets :
- Devis émis · Factures · Charges · Notes de frais
- Documents · Échéances fiscales auto-entrepreneur
- **Résultats** — CA - Charges = Résultat net, graphe 12 mois

---

### 📚 Ressources
3 onglets :
- **Base de connaissances** — fiches conseil par catégorie, tags, favoris
- **Formations & Veille** — articles, livres, formations avec statut À lire / En cours / Lu
- **Réseau & Partenaires** — annuaire pro avec contacts recommandables

---

### 📱 Réseaux Sociaux
2 onglets :
- **Banque de contenus** — pipeline Idée → Brouillon → Programmé → Publié, compteur de caractères LinkedIn/Instagram, upload de visuels
- **Suivi performance** — KPIs globaux, taux d'engagement, liaison contenu ↔ stats

---

## Base de données Supabase

**URL :** `https://eqkpugvccpolkgtnmpxs.supabase.co`

### Tables principales

| Table | Usage |
|---|---|
| `clients` | Dossiers clients |
| `history` | Historique des actions |
| `attachments` | Pièces jointes (Storage bucket : `attachments`) |
| `financial_analyses` | Analyses financières mensuelles |
| `menu_analyses` / `menu_items` | Analyses de menu |
| `suivis_mensuels` | Rapports retainer |
| `cabinet_settings` | Paramètres cabinet |
| `cabinet_factures` | Facturation interne |
| `pipeline` | Prospects pipeline |
| `agenda` | Événements agenda |
| `notes` | Notes internes |
| `compta_devis` | Devis comptabilité |
| `compta_factures` | Factures comptabilité |
| `compta_charges` | Charges mensuelles |
| `compta_charges_recurrentes` | Charges fixes récurrentes |
| `compta_notesfrais` | Notes de frais |
| `ressources_connaissances` | Base de connaissances |
| `ressources_formations` | Formations & veille |
| `ressources_partenaires` | Réseau & partenaires |
| `social_contenus` | Banque de contenus sociaux |
| `social_stats` | Statistiques publications |

### SQL d'initialisation
Les fichiers SQL sont dans la racine du projet :
- `supabase_tables.sql`
- `create_financial_table.sql`
- `create_menu_tables.sql`
- `create_cabinet_tables.sql`
- `create_compta_tables.sql`
- `create_ressources_tables.sql`
- `create_social_tables.sql`

---

## Version web

### Projet
```
C:\Users\GRIMAULT\documents\consulting\lacarte-web
```

### Déploiement
```powershell
cd C:\Users\GRIMAULT\documents\consulting\lacarte-web
git add .
git commit -m "description des changements"
git push
```
Vercel redéploie automatiquement sur `app.lacarte-conseil.fr`.

### Pages disponibles
- `/dashboard` — Tableau de bord cockpit
- `/clients` — Liste des clients
- `/clients/:id` — Fiche client
- `/pipeline` — Pipeline prospects
- `/facturation` — Suivi facturation
- `/social` — Réseaux sociaux

---

## Charte graphique

| Élément | Valeur |
|---|---|
| Navy | `#0D1520` |
| Or | `#C9A84C` |
| Crème | `#EEE6C9` |
| Police titres | DM Serif Display |
| Police corps | DM Sans |
| Tailles | 22 / 17 / 14 / 11px |

---

## Configuration multi-postes

L'application est synchronisée en temps réel via Supabase. Chaque poste utilise un prénom distinct configuré au premier lancement (stocké localement dans `userData/user_settings.json`).

---

## .gitignore

```
node_modules/
build/
dist/
*.db
.env
```

---

## Auteur

**Anthony Grimault** — Fondateur La Carte Advisory  
📧 lacarte.advisory@gmail.com
