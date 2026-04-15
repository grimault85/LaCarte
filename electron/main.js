const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

// ── Database setup ─────────────────────────────────────────────────────────
let db;

function initDB() {
  const Database = require('better-sqlite3');
  const dbPath = path.join(app.getPath('userData'), 'audittrack.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      company     TEXT    NOT NULL,
      email       TEXT    DEFAULT '',
      phone       TEXT    DEFAULT '',
      stage       TEXT    DEFAULT 'prospection',
      priority    TEXT    DEFAULT 'medium',
      revenue     INTEGER DEFAULT 0,
      next_action TEXT    DEFAULT 'À définir',
      notes       TEXT    DEFAULT '',
      created_at  TEXT    DEFAULT (date('now','localtime')),
      tasks       TEXT    DEFAULT '{}'
    );
  `);

  // Seed demo data if empty
  const count = db.prepare('SELECT COUNT(*) as n FROM clients').get();
  if (count.n === 0) {
    const demos = [
      {
        name:'Jean Dupont', company:'Dupont & Fils SARL',
        email:'j.dupont@dupont.fr', phone:'06 12 34 56 78',
        stage:'audit', priority:'high', revenue:4500,
        next_action:'Réunion intermédiaire — 22 avr.',
        notes:'Audit processus RH en cours. Client très engagé.',
        created_at:'15/02/2026',
        tasks: JSON.stringify({
          prospection:[true,true,true,true,true],
          questionnaire:[true,true,true,true,true],
          audit:[true,true,true,false,false,false],
          cloture:[false,false,false,false,false]
        })
      },
      {
        name:'Marie Laurent', company:'Laurent Consulting',
        email:'m.laurent@lc.fr', phone:'06 98 76 54 32',
        stage:'questionnaire', priority:'medium', revenue:3200,
        next_action:'Relance questionnaire — 18 avr.',
        notes:'En attente du questionnaire complété.',
        created_at:'01/03/2026',
        tasks: JSON.stringify({
          prospection:[true,true,true,true,true],
          questionnaire:[true,true,false,false,false],
          audit:[false,false,false,false,false,false],
          cloture:[false,false,false,false,false]
        })
      },
      {
        name:'Pierre Martin', company:'Martin Industries',
        email:'p.martin@mi.fr', phone:'06 55 44 33 22',
        stage:'cloture', priority:'low', revenue:6800,
        next_action:'Suivi signature — 16 avr.',
        notes:'Rapport présenté, en attente de signature.',
        created_at:'10/01/2026',
        tasks: JSON.stringify({
          prospection:[true,true,true,true,true],
          questionnaire:[true,true,true,true,true],
          audit:[true,true,true,true,true,true],
          cloture:[true,true,true,false,false]
        })
      }
    ];
    const ins = db.prepare(`
      INSERT INTO clients (name,company,email,phone,stage,priority,revenue,next_action,notes,created_at,tasks)
      VALUES (@name,@company,@email,@phone,@stage,@priority,@revenue,@next_action,@notes,@created_at,@tasks)
    `);
    demos.forEach(d => ins.run(d));
  }
}

// ── IPC handlers ───────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('clients:getAll', () => {
    const rows = db.prepare('SELECT * FROM clients ORDER BY id').all();
    return rows.map(r => ({ ...r, tasks: JSON.parse(r.tasks) }));
  });

  ipcMain.handle('clients:create', (_, data) => {
    const stmt = db.prepare(`
      INSERT INTO clients (name,company,email,phone,stage,priority,revenue,next_action,notes,created_at,tasks)
      VALUES (@name,@company,@email,@phone,@stage,@priority,@revenue,@next_action,@notes,@created_at,@tasks)
    `);
    const result = stmt.run({
      ...data,
      tasks: JSON.stringify(data.tasks),
      created_at: new Date().toLocaleDateString('fr-FR')
    });
    return { id: result.lastInsertRowid, ...data };
  });

  ipcMain.handle('clients:update', (_, data) => {
    db.prepare(`
      UPDATE clients SET
        name=@name, company=@company, email=@email, phone=@phone,
        stage=@stage, priority=@priority, revenue=@revenue,
        next_action=@next_action, notes=@notes, tasks=@tasks
      WHERE id=@id
    `).run({ ...data, tasks: JSON.stringify(data.tasks), next_action: data.nextAction });
    return true;
  });

  ipcMain.handle('clients:delete', (_, id) => {
    db.prepare('DELETE FROM clients WHERE id=?').run(id);
    return true;
  });
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

app.whenReady().then(() => {
  initDB();
  setupIPC();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
