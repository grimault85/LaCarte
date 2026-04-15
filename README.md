# AuditTrack — Guide d'installation et de build

Application de suivi des dossiers clients et d'audit, construite avec React + Electron + SQLite.

---

## Prérequis

- **Node.js** v18 ou supérieur → https://nodejs.org
- **npm** (inclus avec Node.js)

---

## Installation

```bash
# 1. Entrer dans le dossier du projet
cd audittrack

# 2. Installer les dépendances
npm install

# Note : better-sqlite3 se compile nativement.
# Si une erreur apparaît, installer les outils de build :
#   Windows : npm install --global windows-build-tools
#   Mac     : xcode-select --install
#   Linux   : sudo apt-get install build-essential
```

---

## Lancer en développement

```bash
npm run electron:dev
```

Cela démarre React sur `localhost:3000` et Electron en parallèle, avec le DevTools ouvert.

---

## Créer l'exécutable

### Windows (.exe installeur)
```bash
npm run dist:win
```

### macOS (.dmg)
```bash
npm run dist:mac
```

### Linux (.AppImage)
```bash
npm run dist:linux
```

### Toutes les plateformes
```bash
npm run dist
```

L'exécutable final se trouve dans le dossier `dist/`.

---

## Structure du projet

```
audittrack/
├── electron/
│   ├── main.js       → Processus principal Electron + SQLite
│   └── preload.js    → Bridge sécurisé main ↔ renderer
├── src/
│   ├── index.js      → Point d'entrée React
│   └── App.js        → Application complète
├── public/
│   └── index.html    → Template HTML
└── package.json      → Config npm + electron-builder
```

---

## Base de données

Les données sont stockées automatiquement dans :
- **Windows** : `%APPDATA%\audittrack\audittrack.db`
- **macOS**   : `~/Library/Application Support/audittrack/audittrack.db`
- **Linux**   : `~/.config/audittrack/audittrack.db`

Format SQLite — tu peux l'ouvrir avec [DB Browser for SQLite](https://sqlitebrowser.org/).

---

## Fonctionnalités

- ✅ Tableau de bord avec KPIs (dossiers, CA, progression)
- ✅ Pipeline Kanban (Prospection → Questionnaire → Audit → Clôture)
- ✅ Checklists par étape (5–6 tâches chacune)
- ✅ Avancement automatique entre étapes
- ✅ Notes et prochaine action éditables
- ✅ Création / suppression de dossiers
- ✅ Persistance SQLite locale

---

## Ajouter une icône

Placer les fichiers suivants dans `public/` :
- `icon.ico` (Windows, 256×256)
- `icon.icns` (macOS)
- `icon.png` (Linux, 512×512)

Générateur gratuit : https://www.icoconverter.com/
