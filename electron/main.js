const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');
const isDev = false;

// ── Supabase ───────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://eqkpugvccpolkgtnmpxs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxa3B1Z3ZjY3BvbGtndG5tcHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzM5MDgsImV4cCI6MjA5MTg0OTkwOH0.T3nF1N2ivO7oPs67SOAP8AfK3M_f7EHQX6l-surmlBc';
let supabase;

// ── Date parser ────────────────────────────────────────────────────────────
const MONTHS_MAP = {
  jan: 0, 'fév': 1, mar: 2, avr: 3, mai: 4, juin: 5,
  juil: 6, 'aoû': 7, sep: 8, oct: 9, nov: 10, 'déc': 11
};
function parseNextActionDate(str) {
  if (!str) return null;
  const m = str.match(/(\d{1,2})\s+(jan|fév|mar|avr|mai|juin|juil|aoû|sep|oct|nov|déc)\.?/i);
  if (!m) return null;
  const d = new Date(new Date().getFullYear(), MONTHS_MAP[m[2].toLowerCase()], parseInt(m[1]));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Nom d'utilisateur (stocké localement par poste) ──────────────────
let userName = ''

function getUserName() {
  const settingsPath = require('path').join(app.getPath('userData'), 'user_settings.json')
  try {
    const data = JSON.parse(require('fs').readFileSync(settingsPath, 'utf-8'))
    return data.userName || ''
  } catch { return '' }
}

function setUserName(name) {
  const settingsPath = require('path').join(app.getPath('userData'), 'user_settings.json')
  require('fs').writeFileSync(settingsPath, JSON.stringify({ userName: name }), 'utf-8')
  userName = name
}

// ── Init Supabase + seed ───────────────────────────────────────────────────
async function initSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Seed demo data si la table clients est vide
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  if (count === 0) {
    await seedDemoData();
  }
}

async function seedDemoData() {
  const demos = [
    {
      name: 'Jean Dupont', company: 'Dupont & Fils SARL',
      email: 'j.dupont@dupont.fr', phone: '06 12 34 56 78',
      stage: 'audit', priority: 'high', revenue: 4500,
      next_action: 'Réunion intermédiaire — 22 avr.',
      notes: 'Audit processus RH en cours. Client très engagé.',
      created_at: '15/02/2026',
      tasks: {
        prospection: [true, true, true, true, true],
        questionnaire: [true, true, true, true, true],
        audit: [true, true, true, false, false, false],
        cloture: [false, false, false, false, false]
      }
    },
    {
      name: 'Marie Laurent', company: 'Laurent Consulting',
      email: 'm.laurent@lc.fr', phone: '06 98 76 54 32',
      stage: 'questionnaire', priority: 'medium', revenue: 3200,
      next_action: 'Relance questionnaire — 18 avr.',
      notes: 'En attente du questionnaire complété.',
      created_at: '01/03/2026',
      tasks: {
        prospection: [true, true, true, true, true],
        questionnaire: [true, true, false, false, false],
        audit: [false, false, false, false, false, false],
        cloture: [false, false, false, false, false]
      }
    },
    {
      name: 'Pierre Martin', company: 'Martin Industries',
      email: 'p.martin@mi.fr', phone: '06 55 44 33 22',
      stage: 'cloture', priority: 'low', revenue: 6800,
      next_action: 'Suivi signature — 16 avr.',
      notes: 'Rapport présenté, en attente de signature.',
      created_at: '10/01/2026',
      tasks: {
        prospection: [true, true, true, true, true],
        questionnaire: [true, true, true, true, true],
        audit: [true, true, true, true, true, true],
        cloture: [true, true, true, false, false]
      }
    }
  ];

  const { data: inserted } = await supabase.from('clients').insert(demos).select();
  if (inserted) {
    const historyRows = inserted.map(c => ({ utilisateur: userName,
      client_id: c.id,
      action: 'Dossier créé',
      details: `Étape initiale : ${c.stage}`
    }));
    await supabase.from('history').insert(historyRows);
  }
}

// ── Reminder check ─────────────────────────────────────────────────────────
async function checkReminders() {
  if (!Notification.isSupported()) return;
  const { data: clients } = await supabase.from('clients').select('name, next_action');
  if (!clients) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = [], soon = [];
  clients.forEach(c => {
    const d = parseNextActionDate(c.next_action);
    if (!d) return;
    const diff = Math.floor((d - today) / 86400000);
    if (diff < 0) overdue.push(c.name);
    else if (diff <= 2) soon.push(c.name);
  });
  if (overdue.length > 0) {
    new Notification({ title: `La Carte — ${overdue.length} action(s) en retard`, body: overdue.slice(0, 5).join(', ') }).show();
  } else if (soon.length > 0) {
    new Notification({ title: 'La Carte — Actions imminentes', body: `${soon.length} dossier(s) dans 48 h : ${soon.join(', ')}` }).show();
  }
}

// ── IPC handlers ───────────────────────────────────────────────────────────
function setupIPC() {

  // ══ CLIENTS ══════════════════════════════════════════════════════════════

  ipcMain.handle('clients:getAll', async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('id');
    if (error) { console.error(error); return []; }
    return data.map(r => ({ ...r, nextAction: r.next_action }));
  });

  ipcMain.handle('clients:create', async (_, data) => {
    const row = {
      name:        data.name,
      company:     data.company,
      email:       data.email       || '',
      phone:       data.phone       || '',
      stage:       data.stage       || 'prospection',
      priority:    data.priority    || 'medium',
      revenue:     data.revenue     || 0,
      next_action: data.nextAction  || data.next_action || '',
      notes:       data.notes       || '',
      formula:     data.formula     || 'audit_menu',
      created_at:  new Date().toLocaleDateString('fr-FR'),
      tasks:       data.tasks       || {}
    };
    const { data: inserted, error } = await supabase
      .from('clients')
      .insert(row)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    await supabase.from('history').insert({ utilisateur: userName,
      client_id: inserted.id,
      action:    'Dossier créé',
      details:   `${inserted.name} — ${inserted.company}`
    });
    return { ...inserted, nextAction: inserted.next_action };
  });

  ipcMain.handle('clients:update', async (_, data) => {
    // Récupérer l'état avant pour détecter les changements
    const { data: before } = await supabase
      .from('clients')
      .select('*')
      .eq('id', data.id)
      .single();

    const { error } = await supabase
      .from('clients')
      .update({
        name:        data.name,
        company:     data.company,
        email:       data.email,
        phone:       data.phone,
        stage:       data.stage,
        priority:    data.priority,
        revenue:     data.revenue,
        next_action: data.nextAction,
        notes:       data.notes,
        tasks:       data.tasks,
        formula:     data.formula || 'audit_menu'
      })
      .eq('id', data.id);
    if (error) { console.error(error); return false; }

    // Journal des changements
    if (before) {
      const SL = { prospection: 'Prospection', questionnaire: 'Questionnaire', audit: 'Audit', cloture: 'Clôture' };
      const PL = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
      const changes = [];
      if (before.stage       !== data.stage)      changes.push(`Étape : ${SL[before.stage]} → ${SL[data.stage]}`);
      if (before.revenue     !== data.revenue)    changes.push(`Honoraires : ${before.revenue}€ → ${data.revenue}€`);
      if (before.next_action !== data.nextAction) changes.push(`Prochaine action : ${data.nextAction}`);
      if (before.priority    !== data.priority)   changes.push(`Priorité : ${PL[before.priority]} → ${PL[data.priority]}`);
      await supabase.from('history').insert({ utilisateur: userName,
        client_id: data.id,
        action:    changes.length > 0 ? 'Dossier modifié' : 'Tâches mises à jour',
        details:   changes.join(' · ')
      });
    }
    return true;
  });

  ipcMain.handle('clients:delete', async (_, id) => {
    // Supprimer les fichiers du Storage Supabase
    const { data: atts } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('client_id', id);
    if (atts?.length) {
      const paths = atts.map(a => a.storage_path).filter(Boolean);
      if (paths.length) await supabase.storage.from('attachments').remove(paths);
    }
    // Supprimer le client (history + attachments supprimés en cascade côté Supabase)
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    return true;
  });

  // ══ STATS / TABLEAU DE BORD ═══════════════════════════════════════════════

  ipcMain.handle('stats:get', async () => {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, company, stage, priority, revenue, next_action');
    if (!clients) return { totalRevenue: 0, totalClients: 0, byStage: [], overdue: [], conversionRate: 0 };

    const totalRevenue  = clients.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalClients  = clients.length;

    // Grouper par étape
    const stageMap = {};
    clients.forEach(c => {
      if (!stageMap[c.stage]) stageMap[c.stage] = { stage: c.stage, count: 0, revenue: 0 };
      stageMap[c.stage].count++;
      stageMap[c.stage].revenue += c.revenue || 0;
    });
    const byStage = Object.values(stageMap);

    // Dossiers en retard
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = clients
      .filter(c => { const d = parseNextActionDate(c.next_action); return d && d < today; })
      .map(c => ({ ...c, nextAction: c.next_action }));

    const clotureCount   = stageMap['cloture']?.count ?? 0;
    const conversionRate = totalClients > 0 ? Math.round(clotureCount / totalClients * 100) : 0;

    return { totalRevenue, totalClients, byStage, overdue, conversionRate };
  });

  // ══ HISTORIQUE ════════════════════════════════════════════════════════════

  ipcMain.handle('history:get', async (_, clientId) => {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('client_id', clientId)
      .order('id', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });

  ipcMain.handle('history:add', async (_, { clientId, action, details }) => {
    await supabase.from('history').insert({ utilisateur: userName, client_id: clientId, action, details: details || '' });
    return true;
  });

  // ══ PIÈCES JOINTES (Supabase Storage) ════════════════════════════════════

  ipcMain.handle('attachments:get', async (_, clientId) => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('client_id', clientId)
      .order('id', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });

  ipcMain.handle('attachments:add', async (_, clientId) => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Sélectionner des pièces jointes',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt'] },
        { name: 'Tous les fichiers', extensions: ['*'] }
      ]
    });
    if (canceled || !filePaths?.length) return [];

    const added = [];
    for (const src of filePaths) {
      const filename    = path.basename(src);
      const ext         = path.extname(filename).toLowerCase().replace('.', '');
      const storagePath = `${clientId}/${Date.now()}_${filename}`;
      const fileBuffer  = fs.readFileSync(src);
      const stat        = fs.statSync(src);

      // Upload dans le bucket Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, fileBuffer, { contentType: getMimeType(ext), upsert: false });

      if (uploadError) { console.error('Upload error:', uploadError); continue; }

      // Enregistrer en BDD
      const { data: row } = await supabase
        .from('attachments')
        .insert({ client_id: clientId, filename, storage_path: storagePath, filetype: ext, size: stat.size })
        .select()
        .single();

      await supabase.from('history').insert({ utilisateur: userName,
        client_id: clientId, action: 'Pièce jointe ajoutée', details: filename
      });

      if (row) added.push(row);
    }
    return added;
  });

  ipcMain.handle('attachments:delete', async (_, { id, clientId, storage_path }) => {
    const { data: att } = await supabase.from('attachments').select('filename, storage_path').eq('id', id).single();
    const spath = storage_path || att?.storage_path;
    if (spath) await supabase.storage.from('attachments').remove([spath]);
    await supabase.from('attachments').delete().eq('id', id);
    if (att) await supabase.from('history').insert({ utilisateur: userName, client_id: clientId, action: 'Pièce jointe supprimée', details: att.filename });
    return true;
  });

  ipcMain.handle('attachments:open', async (_, { storage_path, filename }) => {
    // Télécharger dans un dossier temp puis ouvrir
    const { data, error } = await supabase.storage.from('attachments').download(storage_path);
    if (error || !data) { console.error('Download error:', error); return false; }
    const tmpPath = path.join(os.tmpdir(), filename);
    const buf = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(tmpPath, buf);
    shell.openPath(tmpPath);
    return true;
  });





  // ══ DOSSIER INTERNE ══════════════════════════════════════════════

  // -- Cabinet settings --
  ipcMain.handle('cabinet:getSettings', async () => {
    const { data } = await supabase.from('cabinet_settings').select('*').eq('id', 1).single();
    return data || {};
  });
  ipcMain.handle('cabinet:saveSettings', async (_, data) => {
    const { error } = await supabase.from('cabinet_settings').upsert({ id: 1, ...data });
    if (error) console.error(error);
    return true;
  });

  // -- Pipeline --
  ipcMain.handle('pipeline:getAll', async () => {
    const { data, error } = await supabase.from('cabinet_pipeline').select('*').order('id', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });
  ipcMain.handle('pipeline:save', async (_, data) => {
    const row = { nom: data.nom, entreprise: data.entreprise||'', source: data.source||'', formule: data.formule||'', statut: data.statut||'prospect', budget_estime: +data.budget_estime||0, next_action: data.next_action||'', notes: data.notes||'' };
    if (data.id) { await supabase.from('cabinet_pipeline').update(row).eq('id', data.id); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_pipeline').insert(row).select().single();
    if (error) { console.error(error); return null; }
    return ins;
  });
  ipcMain.handle('pipeline:delete', async (_, id) => {
    await supabase.from('cabinet_pipeline').delete().eq('id', id);
    return true;
  });

  // -- Facturation --
  ipcMain.handle('factures:getAll', async () => {
    const { data, error } = await supabase.from('cabinet_factures').select('*').order('date_emission', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });
  ipcMain.handle('factures:save', async (_, data) => {
    const row = { numero: data.numero, client_id: data.client_id||null, client_nom: data.client_nom||'', formule: data.formule||'', montant: +data.montant||0, statut: data.statut||'brouillon', date_emission: data.date_emission||null, date_echeance: data.date_echeance||null, notes: data.notes||'' };
    if (data.id) { await supabase.from('cabinet_factures').update(row).eq('id', data.id); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_factures').insert(row).select().single();
    if (error) { console.error(error); return null; }
    return ins;
  });
  ipcMain.handle('factures:delete', async (_, id) => {
    await supabase.from('cabinet_factures').delete().eq('id', id);
    return true;
  });

  // -- Documents internes --
  ipcMain.handle('cabinet:getDocs', async () => {
    const { data, error } = await supabase.from('cabinet_documents').select('*').order('id', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });
  ipcMain.handle('cabinet:addDocs', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Ajouter des documents internes',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documents', extensions: ['pdf','doc','docx','xls','xlsx','ppt','pptx','png','jpg','txt'] }, { name: 'Tous', extensions: ['*'] }]
    });
    if (canceled || !filePaths?.length) return [];
    const added = [];
    for (const src of filePaths) {
      const filename = path.basename(src);
      const ext = path.extname(filename).toLowerCase().replace('.','');
      const storagePath = `cabinet/${Date.now()}_${filename}`;
      const fileBuffer = fs.readFileSync(src);
      const stat = fs.statSync(src);
      const { error: upErr } = await supabase.storage.from('attachments').upload(storagePath, fileBuffer, { contentType: 'application/octet-stream', upsert: false });
      if (upErr) { console.error('Upload error:', upErr); continue; }
      const { data: row } = await supabase.from('cabinet_documents').insert({ filename, storage_path: storagePath, filetype: ext, size: stat.size }).select().single();
      if (row) added.push(row);
    }
    return added;
  });
  ipcMain.handle('cabinet:deleteDoc', async (_, { id, storage_path }) => {
    if (storage_path) await supabase.storage.from('attachments').remove([storage_path]);
    await supabase.from('cabinet_documents').delete().eq('id', id);
    return true;
  });

  // -- Notes --
  ipcMain.handle('notes:getAll', async () => {
    const { data, error } = await supabase.from('cabinet_notes').select('*').order('updated_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });
  ipcMain.handle('notes:save', async (_, data) => {
    const row = { titre: data.titre||'', contenu: data.contenu||'', categorie: data.categorie||'memo', updated_at: new Date().toISOString() };
    if (data.id) { await supabase.from('cabinet_notes').update(row).eq('id', data.id); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_notes').insert(row).select().single();
    if (error) { console.error(error); return null; }
    return ins;
  });
  ipcMain.handle('notes:delete', async (_, id) => {
    await supabase.from('cabinet_notes').delete().eq('id', id);
    return true;
  });

  // -- Agenda --
  ipcMain.handle('agenda:getAll', async () => {
    const { data, error } = await supabase.from('cabinet_agenda').select('*').order('date');
    if (error) { console.error(error); return []; }
    return data;
  });
  ipcMain.handle('agenda:save', async (_, data) => {
    const row = { titre: data.titre, date: data.date, type: data.type||'autre', client_id: data.client_id||null, notes: data.notes||'' };
    if (data.id) { await supabase.from('cabinet_agenda').update(row).eq('id', data.id); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_agenda').insert(row).select().single();
    if (error) { console.error(error); return null; }
    return ins;
  });
  ipcMain.handle('agenda:delete', async (_, id) => {
    await supabase.from('cabinet_agenda').delete().eq('id', id);
    return true;
  });

  // ══ UTILISATEUR (nom du poste) ══════════════════════════════════════

  ipcMain.handle('user:getName', () => userName)
  ipcMain.handle('user:setName', (_, name) => {
    setUserName(name)
    return true
  })

  // ══ SUIVI MENSUEL ═════════════════════════════════════════════════

  ipcMain.handle('suivi:getAll', async (_, clientId) => {
    const { data, error } = await supabase
      .from('suivis_mensuels')
      .select('*')
      .eq('client_id', clientId)
      .order('annee', { ascending: false })
      .order('mois',  { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });

  ipcMain.handle('suivi:save', async (_, data) => {
    const row = {
      client_id: data.client_id,
      mois:      +data.mois  || new Date().getMonth() + 1,
      annee:     +data.annee || new Date().getFullYear(),
      statut:    data.statut  || 'attente',
      notes:     data.notes   || '',
      actions:   data.actions || '',
    };
    if (data.id) {
      const { error } = await supabase.from('suivis_mensuels').update(row).eq('id', data.id);
      if (error) { console.error(error); return false; }
      return { id: data.id };
    } else {
      const { data: ins, error } = await supabase.from('suivis_mensuels').insert(row).select().single();
      if (error) { console.error(error); return false; }
      await supabase.from('history').insert({ utilisateur: userName,
        client_id: data.client_id,
        action:    'Suivi mensuel créé',
        details:   `${ins.mois}/${ins.annee}`,
      });
      return ins;
    }
  });

  ipcMain.handle('suivi:delete', async (_, id) => {
    const { error } = await supabase.from('suivis_mensuels').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    return true;
  });

  // ══ ANALYSES MENU ════════════════════════════════════════════════

  ipcMain.handle('menu:getAll', async (_, clientId) => {
    const { data, error } = await supabase.from('menu_analyses').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });

  ipcMain.handle('menu:save', async (_, data) => {
    const row = { client_id: data.client_id, nom: data.nom || 'Analyse carte', notes: data.notes || '', editorial_checks: data.editorial_checks || '{}' };
    if (data.id) {
      await supabase.from('menu_analyses').update(row).eq('id', data.id);
      return { id: data.id };
    } else {
      const { data: ins, error } = await supabase.from('menu_analyses').insert(row).select().single();
      if (error) { console.error(error); return null; }
      await supabase.from('history').insert({ utilisateur: userName, client_id: data.client_id, action: 'Analyse menu ajoutée', details: row.nom });
      return ins;
    }
  });

  ipcMain.handle('menu:delete', async (_, id) => {
    await supabase.from('menu_analyses').delete().eq('id', id);
    return true;
  });

  ipcMain.handle('menu:getItems', async (_, analysisId) => {
    const { data, error } = await supabase.from('menu_items').select('*').eq('analysis_id', analysisId).order('id');
    if (error) { console.error(error); return []; }
    return data;
  });

  ipcMain.handle('menu:saveItems', async (_, analysisId, items) => {
    // Supprimer les anciens items
    await supabase.from('menu_items').delete().eq('analysis_id', analysisId);
    if (!items?.length) return true;
    const rows = items.map(i => ({
      analysis_id:      analysisId,
      nom:              i.nom || '',
      categorie:        i.categorie || 'plat',
      cout_revient:     +i.cout_revient  || 0,
      prix_vente_ht:    +i.prix_vente_ht || 0,
      quantite_vendue:  +i.quantite_vendue || 0,
      description:      i.description || '',
    }));
    const { error } = await supabase.from('menu_items').insert(rows);
    if (error) { console.error(error); return false; }
    return true;
  });

  // ══ ANALYSES FINANCIÈRES ══════════════════════════════════════════

  ipcMain.handle('financial:get', async (_, clientId) => {
    const { data, error } = await supabase
      .from('financial_analyses')
      .select('*')
      .eq('client_id', clientId)
      .order('annee', { ascending: false })
      .order('mois',  { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  });

  ipcMain.handle('financial:save', async (_, data) => {
    const row = {
      client_id:              data.client_id,
      periode:                data.periode,
      annee:                  +data.annee  || new Date().getFullYear(),
      mois:                   +data.mois   || new Date().getMonth() + 1,
      ca_total:               +data.ca_total               || 0,
      ca_food:                +data.ca_food                || 0,
      ca_boissons:            +data.ca_boissons            || 0,
      nb_couverts:            +data.nb_couverts            || 0,
      nb_jours:               +data.nb_jours               || 0,
      achats_food:            +data.achats_food            || 0,
      achats_boissons:        +data.achats_boissons        || 0,
      masse_salariale:        +data.masse_salariale        || 0,
      loyer:                  +data.loyer                  || 0,
      charges_fixes_autres:   +data.charges_fixes_autres   || 0,
      charges_variables_pct:  +data.charges_variables_pct  || 0,
      surface_m2:             +data.surface_m2             || 0,
      nb_tables:              +data.nb_tables              || 0,
      nb_places:              +data.nb_places              || 0,
      notes:                   data.notes                  || '',
    };
    if (data.id) {
      const { error } = await supabase.from('financial_analyses').update(row).eq('id', data.id);
      if (error) { console.error(error); return false; }
      return { id: data.id };
    } else {
      const { data: inserted, error } = await supabase.from('financial_analyses').insert(row).select().single();
      if (error) { console.error(error); return false; }
      await supabase.from('history').insert({ utilisateur: userName,
        client_id: data.client_id,
        action:    'Analyse financière ajoutée',
        details:   row.periode,
      });
      return inserted;
    }
  });

  ipcMain.handle('financial:delete', async (_, id) => {
    const { error } = await supabase.from('financial_analyses').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    return true;
  });

  // ══ EXPORT PDF ════════════════════════════════════════════════════════════

  ipcMain.handle('clients:exportPDF', async (_, { html, filename }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { canceled: true };
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true, pageSize: 'A4',
      margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.6, right: 0.6 }
    });
    win.close();
    fs.writeFileSync(filePath, pdfBuffer);
    return { saved: true, path: filePath };
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getMimeType(ext) {
  const map = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' };
  return map[ext] || 'application/octet-stream';
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 620,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    icon: path.join(__dirname, '../public/icon.png')
  });
  if (isDev) { win.loadURL('http://localhost:3000'); }
  else { win.loadFile(path.join(__dirname, '../build/index.html')); }
}

// ── Démarrage ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // 1. IPC handlers — toujours enregistrés en premier
  try { setupIPC(); } catch (e) { console.error('setupIPC:', e.message); }

  // 2. Fenêtre — toujours ouverte, indépendamment de Supabase
  createWindow();

  // 3. Supabase — connexion en arrière-plan
  try {
    await initSupabase();
    await checkReminders();
  } catch (err) {
    console.error('Erreur Supabase:', err.message);
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      wins[0].webContents.executeJavaScript(
        `alert('Erreur Supabase:\n' + ${JSON.stringify(err.message)} + '\n\nLancez : npm install @supabase/supabase-js')`
      ).catch(() => {});
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
