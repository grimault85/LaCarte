const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = false;
const log = (...a) => isDev && console.log('[La Carte]', ...a);

// ── Supabase ───────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://eqkpugvccpolkgtnmpxs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxa3B1Z3ZjY3BvbGtndG5tcHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzM5MDgsImV4cCI6MjA5MTg0OTkwOH0.T3nF1N2ivO7oPs67SOAP8AfK3M_f7EHQX6l-surmlBc';
let supabase;

// ── In-memory cache (TTL 60 s) ─────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60_000;
async function cached(key, fn) {
  const e = cache.get(key);
  if (e && Date.now() - e.ts < CACHE_TTL) return e.data;
  const data = await fn();
  cache.set(key, { data, ts: Date.now() });
  return data;
}
function invalidate(...keys) { keys.forEach(k => cache.delete(k)); }
function invalidatePrefix(prefix) { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); }

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
  const settingsPath = path.join(app.getPath('userData'), 'user_settings.json')
  try {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    return data.userName || ''
  } catch { return '' }
}

function setUserName(name) {
  const settingsPath = path.join(app.getPath('userData'), 'user_settings.json')
  fs.writeFileSync(settingsPath, JSON.stringify({ userName: name }), 'utf-8')
  userName = name
}

// ── Init Supabase ──────────────────────────────────────────────────────────
function initSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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
    return cached('clients', async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('id');
      if (error) { console.error(error); return []; }
      return data.map(r => ({ ...r, nextAction: r.next_action }));
    });
  });

  ipcMain.handle('clients:create', async (_, data) => {
    const row = {
      name: data.name,
      company: data.company,
      email: data.email || '',
      phone: data.phone || '',
      stage: data.stage || 'prospection',
      priority: data.priority || 'medium',
      revenue: data.revenue || 0,
      next_action: data.nextAction || data.next_action || '',
      notes: data.notes || '',
      formula: data.formula || 'audit_menu',
      created_at: new Date().toLocaleDateString('fr-FR'),
      tasks: data.tasks || {}
    };
    const { data: inserted, error } = await supabase
      .from('clients')
      .insert(row)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    await supabase.from('history').insert({
      utilisateur: userName,
      client_id: inserted.id,
      action: 'Dossier créé',
      details: `${inserted.name} — ${inserted.company}`
    });
    invalidate('clients', 'stats', 'history_recent');
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
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        stage: data.stage,
        priority: data.priority,
        revenue: data.revenue,
        next_action: data.nextAction,
        notes: data.notes,
        tasks: data.tasks,
        formula: data.formula || 'audit_menu'
      })
      .eq('id', data.id);
    if (error) { console.error(error); return false; }

    // Journal des changements
    if (before) {
      const SL = { prospection: 'Prospection', questionnaire: 'Questionnaire', audit: 'Audit', cloture: 'Clôture' };
      const PL = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
      const changes = [];
      if (before.stage !== data.stage) changes.push(`Étape : ${SL[before.stage]} → ${SL[data.stage]}`);
      if (before.revenue !== data.revenue) changes.push(`Honoraires : ${before.revenue}€ → ${data.revenue}€`);
      if (before.next_action !== data.nextAction) changes.push(`Prochaine action : ${data.nextAction}`);
      if (before.priority !== data.priority) changes.push(`Priorité : ${PL[before.priority]} → ${PL[data.priority]}`);
      await supabase.from('history').insert({
        utilisateur: userName,
        client_id: data.id,
        action: changes.length > 0 ? 'Dossier modifié' : 'Tâches mises à jour',
        details: changes.join(' · ')
      });
    }
    invalidate('clients', 'stats', 'history_recent', `history:${data.id}`);
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
    // Supprimer les données liées
    await supabase.from('history').delete().eq('client_id', id);
    await supabase.from('financial_analyses').delete().eq('client_id', id);
    await supabase.from('menu_analyses').delete().eq('client_id', id);
    await supabase.from('suivis_mensuels').delete().eq('client_id', id);
    // Supprimer le client
    const { error, data } = await supabase.from('clients').delete().eq('id', id).select();
    if (error) {
      console.error('[DELETE CLIENT] Erreur Supabase:', JSON.stringify(error));
      return false;
    }
    if (!data || data.length === 0) {
      console.error('[DELETE CLIENT] Aucune ligne supprimée pour id:', id, '— RLS bloque peut-être encore');
      return false;
    }
    log('[DELETE CLIENT] Supprimé avec succès:', id);
    invalidate('clients', 'stats', 'history_recent', `history:${id}`, `attachments:${id}`, `suivi:${id}`, `menu:${id}`, `financial:${id}`);
    return true;
  });

  // ══ STATS / TABLEAU DE BORD ═══════════════════════════════════════════════

  ipcMain.handle('stats:get', async () => {
    return cached('stats', async () => {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, company, stage, priority, revenue, next_action');
      if (!clients) return { totalRevenue: 0, totalClients: 0, byStage: [], overdue: [], conversionRate: 0 };

      const totalRevenue = clients.reduce((s, c) => s + (c.revenue || 0), 0);
      const totalClients = clients.length;

      const stageMap = {};
      clients.forEach(c => {
        if (!stageMap[c.stage]) stageMap[c.stage] = { stage: c.stage, count: 0, revenue: 0 };
        stageMap[c.stage].count++;
        stageMap[c.stage].revenue += c.revenue || 0;
      });
      const byStage = Object.values(stageMap);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = clients
        .filter(c => { const d = parseNextActionDate(c.next_action); return d && d < today; })
        .map(c => ({ ...c, nextAction: c.next_action }));

      const clotureCount = stageMap['cloture']?.count ?? 0;
      const conversionRate = totalClients > 0 ? Math.round(clotureCount / totalClients * 100) : 0;

      return { totalRevenue, totalClients, byStage, overdue, conversionRate };
    });
  });

  // ══ HISTORIQUE ════════════════════════════════════════════════════════════

  ipcMain.handle('history:get', async (_, clientId) => {
    return cached(`history:${clientId}`, async () => {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('client_id', clientId)
        .order('id', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });

  ipcMain.handle('history:add', async (_, { clientId, action, details }) => {
    await supabase.from('history').insert({ utilisateur: userName, client_id: clientId, action, details: details || '' });
    invalidate('history_recent', `history:${clientId}`);
    return true;
  });

  // ══ PIÈCES JOINTES (Supabase Storage) ════════════════════════════════════

  ipcMain.handle('attachments:get', async (_, clientId) => {
    return cached(`attachments:${clientId}`, async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('client_id', clientId)
        .order('id', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
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
      const filename = path.basename(src);
      const ext = path.extname(filename).toLowerCase().replace('.', '');
      const storagePath = `${clientId}/${Date.now()}_${filename}`;
      const fileBuffer = fs.readFileSync(src);
      const stat = fs.statSync(src);

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

      await supabase.from('history').insert({
        utilisateur: userName,
        client_id: clientId, action: 'Pièce jointe ajoutée', details: filename
      });

      if (row) added.push(row);
    }
    invalidate(`attachments:${clientId}`, 'history_recent');
    return added;
  });

  ipcMain.handle('attachments:delete', async (_, { id, clientId, storage_path }) => {
    const { data: att } = await supabase.from('attachments').select('filename, storage_path').eq('id', id).single();
    const spath = storage_path || att?.storage_path;
    if (spath) await supabase.storage.from('attachments').remove([spath]);
    await supabase.from('attachments').delete().eq('id', id);
    if (att) await supabase.from('history').insert({ utilisateur: userName, client_id: clientId, action: 'Pièce jointe supprimée', details: att.filename });
    invalidate(`attachments:${clientId}`, 'history_recent');
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






  // ══ COMPTABILITÉ ══════════════════════════════════════════════════

  // -- Devis comptabilité --
  ipcMain.handle('compta:getDevis', async () => {
    return cached('compta_devis', async () => {
      const { data } = await supabase.from('compta_devis').select('*').order('date_emission', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('compta:saveDevis', async (_, data) => {
    const row = { numero: data.numero, client_id: data.client_id || null, client_nom: data.client_nom || '', formule: data.formule || '', montant: +data.montant || 0, statut: data.statut || 'envoye', date_emission: data.date_emission || null, storage_path: data.storage_path || '', filename: data.filename || '', filetype: data.filetype || '', size: +data.size || 0, notes: data.notes || '' };
    if (data.id) { await supabase.from('compta_devis').update(row).eq('id', data.id); invalidate('compta_devis'); return { id: data.id }; }
    const { data: ins } = await supabase.from('compta_devis').insert(row).select().single();
    invalidate('compta_devis');
    return ins;
  });
  ipcMain.handle('compta:deleteDevis', async (_, id) => {
    await supabase.from('compta_devis').delete().eq('id', id);
    invalidate('compta_devis');
    return true;
  });

  // -- Factures comptabilité --
  ipcMain.handle('compta:getFactures', async () => {
    return cached('compta_factures', async () => {
      const { data } = await supabase.from('compta_factures').select('*').order('date_emission', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('compta:saveFacture', async (_, data) => {
    const row = { numero: data.numero, client_id: data.client_id || null, client_nom: data.client_nom || '', formule: data.formule || '', montant: +data.montant || 0, statut: data.statut || 'envoyee', date_emission: data.date_emission || null, date_echeance: data.date_echeance || null, storage_path: data.storage_path || '', filename: data.filename || '', filetype: data.filetype || '', size: +data.size || 0, notes: data.notes || '' };
    if (data.id) { await supabase.from('compta_factures').update(row).eq('id', data.id); invalidate('compta_factures'); return { id: data.id }; }
    const { data: ins } = await supabase.from('compta_factures').insert(row).select().single();
    invalidate('compta_factures');
    return ins;
  });
  ipcMain.handle('compta:deleteFacture', async (_, id) => {
    await supabase.from('compta_factures').delete().eq('id', id);
    invalidate('compta_factures');
    return true;
  });

  // -- Charges --
  ipcMain.handle('compta:getCharges', async (_, mois, annee) => {
    return cached(`compta_charges:${mois}:${annee}`, async () => {
      const { data } = await supabase.from('compta_charges').select('*').eq('mois', mois).eq('annee', annee).order('created_at');
      return data || [];
    });
  });
  ipcMain.handle('compta:saveCharge', async (_, data) => {
    const row = { label: data.label, categorie: data.categorie || 'autre', montant: +data.montant || 0, mois: +data.mois, annee: +data.annee, recurrent_id: data.recurrent_id || null, notes: data.notes || '' };
    if (data.id) { await supabase.from('compta_charges').update(row).eq('id', data.id); invalidate(`compta_charges:${data.mois}:${data.annee}`); return { id: data.id }; }
    const { data: ins } = await supabase.from('compta_charges').insert(row).select().single();
    invalidate(`compta_charges:${data.mois}:${data.annee}`);
    return ins;
  });
  ipcMain.handle('compta:deleteCharge', async (_, id) => {
    await supabase.from('compta_charges').delete().eq('id', id);
    invalidatePrefix('compta_charges:');
    return true;
  });

  // -- Charges récurrentes --
  ipcMain.handle('compta:getChargesRec', async () => {
    return cached('compta_charges_rec', async () => {
      const { data } = await supabase.from('compta_charges_recurrentes').select('*').order('label');
      return data || [];
    });
  });
  ipcMain.handle('compta:saveChargeRec', async (_, data) => {
    const row = { label: data.label, categorie: data.categorie || 'autre', montant: +data.montant || 0, notes: data.notes || '' };
    if (data.id) { await supabase.from('compta_charges_recurrentes').update(row).eq('id', data.id); invalidate('compta_charges_rec'); return { id: data.id }; }
    const { data: ins } = await supabase.from('compta_charges_recurrentes').insert(row).select().single();
    invalidate('compta_charges_rec');
    return ins;
  });
  ipcMain.handle('compta:deleteChargeRec', async (_, id) => {
    await supabase.from('compta_charges_recurrentes').delete().eq('id', id);
    invalidate('compta_charges_rec');
    return true;
  });

  // -- Notes de frais --
  ipcMain.handle('compta:getNotesfrais', async () => {
    return cached('compta_notesfrais', async () => {
      const { data } = await supabase.from('compta_notesfrais').select('*').order('date', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('compta:saveNotefrais', async (_, data) => {
    const row = { label: data.label, categorie: data.categorie || 'deplacement', montant: +data.montant || 0, date: data.date || null, storage_path: data.storage_path || '', filename: data.filename || '', filetype: data.filetype || '', size: +data.size || 0, notes: data.notes || '' };
    if (data.id) { await supabase.from('compta_notesfrais').update(row).eq('id', data.id); invalidate('compta_notesfrais'); return { id: data.id }; }
    const { data: ins } = await supabase.from('compta_notesfrais').insert(row).select().single();
    invalidate('compta_notesfrais');
    return ins;
  });
  ipcMain.handle('compta:deleteNotefrais', async (_, id) => {
    await supabase.from('compta_notesfrais').delete().eq('id', id);
    invalidate('compta_notesfrais');
    return true;
  });

  // -- Documents comptables --
  ipcMain.handle('compta:getDocs', async () => {
    return cached('compta_docs', async () => {
      const { data } = await supabase.from('compta_documents').select('*').order('created_at', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('compta:uploadDoc', async (_, { filePath, categorie }) => {
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const storagePath = `compta/${Date.now()}_${filename}`;
    const fileBuffer = fs.readFileSync(filePath);
    const stat = fs.statSync(filePath);
    await supabase.storage.from('attachments').upload(storagePath, fileBuffer, { contentType: 'application/octet-stream', upsert: false });
    const { data: row } = await supabase.from('compta_documents').insert({ filename, storage_path: storagePath, filetype: ext, categorie: categorie || 'autre', size: stat.size }).select().single();
    invalidate('compta_docs');
    return row;
  });
  ipcMain.handle('compta:deleteDoc', async (_, { id, storage_path }) => {
    if (storage_path) await supabase.storage.from('attachments').remove([storage_path]);
    await supabase.from('compta_documents').delete().eq('id', id);
    invalidate('compta_docs');
    return true;
  });

  // -- Upload fichier compta (devis/factures/frais) --
  ipcMain.handle('compta:uploadFile', async (_, { filePath, type }) => {
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const storagePath = `compta/${type}/${Date.now()}_${filename}`;
    const fileBuffer = fs.readFileSync(filePath);
    const stat = fs.statSync(filePath);
    await supabase.storage.from('attachments').upload(storagePath, fileBuffer, { contentType: 'application/octet-stream', upsert: false });
    return { path: storagePath, name: filename, ext, size: stat.size };
  });

  // -- Sélecteur de fichier --
  ipcMain.handle('file:pick', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (canceled || !filePaths.length) return null;
    return filePaths[0];
  });

  // ══ DOSSIER INTERNE ══════════════════════════════════════════════

  // -- Cabinet settings --
  ipcMain.handle('cabinet:getSettings', async () => {
    return cached('cabinet_settings', async () => {
      const { data } = await supabase.from('cabinet_settings').select('*').eq('id', 1).single();
      return data || {};
    });
  });
  ipcMain.handle('cabinet:saveSettings', async (_, data) => {
    const { error } = await supabase.from('cabinet_settings').upsert({ id: 1, ...data });
    if (error) console.error(error);
    invalidate('cabinet_settings', 'settings');
    return true;
  });

  // -- Pipeline --
  ipcMain.handle('pipeline:getAll', async () => {
    return cached('pipeline', async () => {
      const { data, error } = await supabase.from('cabinet_pipeline').select('*').order('id', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });
  ipcMain.handle('pipeline:save', async (_, data) => {
    const row = { nom: data.nom, entreprise: data.entreprise || '', source: data.source || '', formule: data.formule || '', statut: data.statut || 'prospect', budget_estime: +data.budget_estime || 0, next_action: data.next_action || '', notes: data.notes || '' };
    if (data.id) { await supabase.from('cabinet_pipeline').update(row).eq('id', data.id); invalidate('pipeline'); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_pipeline').insert(row).select().single();
    if (error) { console.error(error); return null; }
    invalidate('pipeline');
    return ins;
  });
  ipcMain.handle('pipeline:delete', async (_, id) => {
    await supabase.from('cabinet_pipeline').delete().eq('id', id);
    invalidate('pipeline');
    return true;
  });

  // -- Facturation --
  ipcMain.handle('factures:getAll', async () => {
    return cached('factures', async () => {
      const { data, error } = await supabase.from('cabinet_factures').select('*').order('date_emission', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });
  ipcMain.handle('factures:save', async (_, data) => {
    const row = { numero: data.numero, client_id: data.client_id || null, client_nom: data.client_nom || '', formule: data.formule || '', montant: +data.montant || 0, statut: data.statut || 'brouillon', date_emission: data.date_emission || null, date_echeance: data.date_echeance || null, notes: data.notes || '' };
    if (data.id) { await supabase.from('cabinet_factures').update(row).eq('id', data.id); invalidate('factures'); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_factures').insert(row).select().single();
    if (error) { console.error(error); return null; }
    invalidate('factures');
    return ins;
  });
  ipcMain.handle('factures:delete', async (_, id) => {
    await supabase.from('cabinet_factures').delete().eq('id', id);
    invalidate('factures');
    return true;
  });

  // -- Documents internes --
  ipcMain.handle('cabinet:getDocs', async () => {
    return cached('cabinet_docs', async () => {
      const { data, error } = await supabase.from('cabinet_documents').select('*').order('id', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });
  ipcMain.handle('cabinet:addDocs', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Ajouter des documents internes',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'txt'] }, { name: 'Tous', extensions: ['*'] }]
    });
    if (canceled || !filePaths?.length) return [];
    const added = [];
    for (const src of filePaths) {
      const filename = path.basename(src);
      const ext = path.extname(filename).toLowerCase().replace('.', '');
      const storagePath = `cabinet/${Date.now()}_${filename}`;
      const fileBuffer = fs.readFileSync(src);
      const stat = fs.statSync(src);
      const { error: upErr } = await supabase.storage.from('attachments').upload(storagePath, fileBuffer, { contentType: 'application/octet-stream', upsert: false });
      if (upErr) { console.error('Upload error:', upErr); continue; }
      const { data: row } = await supabase.from('cabinet_documents').insert({ filename, storage_path: storagePath, filetype: ext, size: stat.size }).select().single();
      if (row) added.push(row);
    }
    invalidate('cabinet_docs');
    return added;
  });
  ipcMain.handle('cabinet:deleteDoc', async (_, { id, storage_path }) => {
    if (storage_path) await supabase.storage.from('attachments').remove([storage_path]);
    await supabase.from('cabinet_documents').delete().eq('id', id);
    invalidate('cabinet_docs');
    return true;
  });

  // -- Notes --
  ipcMain.handle('notes:getAll', async () => {
    return cached('notes', async () => {
      const { data, error } = await supabase.from('cabinet_notes').select('*').order('updated_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });
  ipcMain.handle('notes:save', async (_, data) => {
    const row = { titre: data.titre || '', contenu: data.contenu || '', categorie: data.categorie || 'memo', updated_at: new Date().toISOString() };
    if (data.id) { await supabase.from('cabinet_notes').update(row).eq('id', data.id); invalidate('notes'); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_notes').insert(row).select().single();
    if (error) { console.error(error); return null; }
    invalidate('notes');
    return ins;
  });
  ipcMain.handle('notes:delete', async (_, id) => {
    await supabase.from('cabinet_notes').delete().eq('id', id);
    invalidate('notes');
    return true;
  });

  // -- Paramètres cabinet --
  ipcMain.handle('settings:get', async () => {
    return cached('settings', async () => {
      const { data } = await supabase.from('cabinet_settings').select('*').eq('id', 1).single();
      if (!data) return {};
      const { id, created_at, updated_at, userName, darkMode, ...rest } = data;
      return data.parametres_json || rest;
    });
  });
  ipcMain.handle('settings:save', async (_, value) => {
    const { error } = await supabase.from('cabinet_settings').upsert({
      id: 1,
      parametres_json: value,
      updated_at: new Date().toISOString()
    });
    if (error) console.error('[SETTINGS] Save error:', error.message);
    invalidate('settings', 'cabinet_settings');
    return !error;
  });

  // -- Numéro auto-incrémenté --
  ipcMain.handle('numero:getNext', async (_, type) => {
    const year = new Date().getFullYear();
    // Lire le préfixe personnalisé depuis les paramètres
    const { data: settingsRow } = await supabase.from('cabinet_settings').select('parametres_json').eq('id', 1).single();
    const settings = settingsRow?.parametres_json || {};
    const defaultPrefix = type === 'facture' ? 'FA' : 'DEV';
    const prefix = (type === 'facture' ? settings.prefixe_facture : settings.prefixe_devis) || defaultPrefix;
    const fullPrefix = `${prefix}-${year}-`;
    const table = type === 'facture' ? 'cabinet_factures' : 'compta_devis';
    const { data } = await supabase.from(table).select('numero').like('numero', `${fullPrefix}%`).order('numero', { ascending: false }).limit(1);
    if (data?.length) {
      const lastNum = parseInt(data[0].numero.replace(fullPrefix, ''), 10);
      const next = isNaN(lastNum) ? 1 : lastNum + 1;
      return `${fullPrefix}${String(next).padStart(2, '0')}`;
    }
    return `${fullPrefix}01`;
  });

  // -- Agenda --
  ipcMain.handle('agenda:getAll', async () => {
    return cached('agenda', async () => {
      const { data, error } = await supabase.from('cabinet_agenda').select('*').order('date');
      if (error) { console.error(error); return []; }
      return data;
    });
  });
  ipcMain.handle('agenda:save', async (_, data) => {
    const row = { titre: data.titre, date: data.date, type: data.type || 'autre', client_id: data.client_id || null, notes: data.notes || '' };
    if (data.id) { await supabase.from('cabinet_agenda').update(row).eq('id', data.id); invalidate('agenda'); return { id: data.id }; }
    const { data: ins, error } = await supabase.from('cabinet_agenda').insert(row).select().single();
    if (error) { console.error(error); return null; }
    invalidate('agenda');
    return ins;
  });
  ipcMain.handle('agenda:delete', async (_, id) => {
    await supabase.from('cabinet_agenda').delete().eq('id', id);
    invalidate('agenda');
    return true;
  });

  // ══ LIENS EXTERNES ══════════════════════════════════════════════════
  ipcMain.handle('shell:openExternal', async (_, url) => {
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('history:getRecent', async () => {
    return cached('history_recent', async () => {
      const { data } = await supabase.from('history').select('*')
        .order('created_at', { ascending: false }).limit(15);
      return data || [];
    });
  });



  // ══ RÉSEAUX SOCIAUX ════════════════════════════════════════════════

  ipcMain.handle('social:getContenus', async () => {
    return cached('social_contenus', async () => {
      const { data } = await supabase.from('social_contenus').select('*').order('updated_at', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('social:saveContenu', async (_, d) => {
    const row = { titre: d.titre, plateforme: d.plateforme || 'linkedin', theme: d.theme || 'conseil', statut: d.statut || 'idee', contenu: d.contenu || '', visuel_notes: d.visuel_notes || '', date_publi: d.date_publi || null, image_path: d.image_path || '', image_name: d.image_name || '', updated_at: new Date().toISOString() };
    if (d.id) { await supabase.from('social_contenus').update(row).eq('id', d.id); invalidate('social_contenus'); return { id: d.id }; }
    const { data } = await supabase.from('social_contenus').insert(row).select().single();
    invalidate('social_contenus');
    return data;
  });
  ipcMain.handle('social:deleteContenu', async (_, id) => {
    await supabase.from('social_contenus').delete().eq('id', id);
    invalidate('social_contenus');
    return true;
  });

  ipcMain.handle('social:getStats', async () => {
    return cached('social_stats', async () => {
      const { data } = await supabase.from('social_stats').select('*').order('date_publi', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('social:saveStat', async (_, d) => {
    const row = { contenu_id: d.contenu_id || null, plateforme: d.plateforme || 'linkedin', date_publi: d.date_publi, titre: d.titre || '', vues: +d.vues || 0, likes: +d.likes || 0, commentaires: +d.commentaires || 0, partages: +d.partages || 0, nouveaux_abonnes: +d.nouveaux_abonnes || 0, notes: d.notes || '' };
    if (d.id) { await supabase.from('social_stats').update(row).eq('id', d.id); invalidate('social_stats'); return { id: d.id }; }
    const { data } = await supabase.from('social_stats').insert(row).select().single();
    invalidate('social_stats');
    return data;
  });
  ipcMain.handle('social:deleteStat', async (_, id) => {
    await supabase.from('social_stats').delete().eq('id', id);
    invalidate('social_stats');
    return true;
  });

  // ══ RESSOURCES ════════════════════════════════════════════════════

  // Base de connaissances
  ipcMain.handle('ressources:getConnaissances', async () => {
    return cached('ressources_connaissances', async () => {
      const { data } = await supabase.from('ressources_connaissances').select('*').order('favori', { ascending: false }).order('updated_at', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('ressources:saveConnaissance', async (_, d) => {
    const row = { titre: d.titre, categorie: d.categorie || 'general', contenu: d.contenu || '', tags: d.tags || '', lien: d.lien || '', pdf_storage_path: d.pdf_storage_path || null, pdf_filename: d.pdf_filename || null, favori: !!d.favori, updated_at: new Date().toISOString() };
    if (d.id) {
      if (d._old_pdf_storage_path && d._old_pdf_storage_path !== d.pdf_storage_path) {
        await supabase.storage.from('attachments').remove([d._old_pdf_storage_path]);
      }
      await supabase.from('ressources_connaissances').update(row).eq('id', d.id); invalidate('ressources_connaissances'); return { id: d.id };
    }
    const { data } = await supabase.from('ressources_connaissances').insert(row).select().single();
    invalidate('ressources_connaissances');
    return data;
  });
  ipcMain.handle('ressources:deleteConnaissance', async (_, id) => {
    const { data: row } = await supabase.from('ressources_connaissances').select('pdf_storage_path').eq('id', id).single();
    if (row?.pdf_storage_path) await supabase.storage.from('attachments').remove([row.pdf_storage_path]);
    await supabase.from('ressources_connaissances').delete().eq('id', id);
    invalidate('ressources_connaissances');
    return true;
  });
  ipcMain.handle('ressources:uploadConnPDF', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Sélectionner un PDF',
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePaths?.length) return null;
    const src = filePaths[0];
    const filename = path.basename(src);
    const storagePath = `ressources/${Date.now()}_${filename}`;
    const fileBuffer = fs.readFileSync(src);
    const { error } = await supabase.storage.from('attachments').upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: false });
    if (error) { console.error('Upload PDF connaissance error:', error); return null; }
    return { storage_path: storagePath, filename };
  });
  ipcMain.handle('ressources:openConnPDF', async (_, { storage_path, filename }) => {
    const { data, error } = await supabase.storage.from('attachments').download(storage_path);
    if (error || !data) { console.error('Download PDF connaissance error:', error); return false; }
    const tmpPath = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tmpPath, Buffer.from(await data.arrayBuffer()));
    shell.openPath(tmpPath);
    return true;
  });

  // Formations & Veille
  ipcMain.handle('ressources:getFormations', async () => {
    return cached('ressources_formations', async () => {
      const { data } = await supabase.from('ressources_formations').select('*').order('created_at', { ascending: false });
      return data || [];
    });
  });
  ipcMain.handle('ressources:saveFormation', async (_, d) => {
    const row = { titre: d.titre, type: d.type || 'article', source: d.source || '', lien: d.lien || '', statut: d.statut || 'a_lire', notes: d.notes || '', date_ajout: d.date_ajout || null };
    if (d.id) { await supabase.from('ressources_formations').update(row).eq('id', d.id); invalidate('ressources_formations'); return { id: d.id }; }
    const { data } = await supabase.from('ressources_formations').insert(row).select().single();
    invalidate('ressources_formations');
    return data;
  });
  ipcMain.handle('ressources:deleteFormation', async (_, id) => {
    await supabase.from('ressources_formations').delete().eq('id', id);
    invalidate('ressources_formations');
    return true;
  });

  // Réseau & Partenaires
  ipcMain.handle('ressources:getPartenaires', async () => {
    return cached('ressources_partenaires', async () => {
      const { data } = await supabase.from('ressources_partenaires').select('*').order('recommande', { ascending: false }).order('nom', { ascending: true });
      return data || [];
    });
  });
  ipcMain.handle('ressources:savePartenaire', async (_, d) => {
    const row = { nom: d.nom, entreprise: d.entreprise || '', categorie: d.categorie || 'autre', email: d.email || '', telephone: d.telephone || '', notes: d.notes || '', recommande: !!d.recommande };
    if (d.id) { await supabase.from('ressources_partenaires').update(row).eq('id', d.id); invalidate('ressources_partenaires'); return { id: d.id }; }
    const { data } = await supabase.from('ressources_partenaires').insert(row).select().single();
    invalidate('ressources_partenaires');
    return data;
  });
  ipcMain.handle('ressources:deletePartenaire', async (_, id) => {
    await supabase.from('ressources_partenaires').delete().eq('id', id);
    invalidate('ressources_partenaires');
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
    return cached(`suivi:${clientId}`, async () => {
      const { data, error } = await supabase
        .from('suivis_mensuels')
        .select('*')
        .eq('client_id', clientId)
        .order('annee', { ascending: false })
        .order('mois', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });

  ipcMain.handle('suivi:save', async (_, data) => {
    const row = {
      client_id: data.client_id,
      mois: +data.mois || new Date().getMonth() + 1,
      annee: +data.annee || new Date().getFullYear(),
      statut: data.statut || 'attente',
      notes: data.notes || '',
      actions: data.actions || '',
      observations_terrain: data.observations_terrain || '',
      analyse_carte: data.analyse_carte || '',
      recommandations_mois: data.recommandations_mois || '',
      message_client: data.message_client || '',
    };
    if (data.id) {
      const { error } = await supabase.from('suivis_mensuels').update(row).eq('id', data.id);
      if (error) { console.error(error); return false; }
      invalidate(`suivi:${data.client_id}`);
      return { id: data.id };
    } else {
      const { data: ins, error } = await supabase.from('suivis_mensuels').insert(row).select().single();
      if (error) { console.error(error); return false; }
      await supabase.from('history').insert({
        utilisateur: userName,
        client_id: data.client_id,
        action: 'Suivi mensuel créé',
        details: `${ins.mois}/${ins.annee}`,
      });
      invalidate(`suivi:${data.client_id}`, 'history_recent');
      return ins;
    }
  });

  ipcMain.handle('suivi:delete', async (_, id) => {
    const { error } = await supabase.from('suivis_mensuels').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    invalidatePrefix('suivi:');
    return true;
  });

  // ══ ANALYSES MENU ════════════════════════════════════════════════

  ipcMain.handle('menu:getAll', async (_, clientId) => {
    return cached(`menu:${clientId}`, async () => {
      const { data, error } = await supabase.from('menu_analyses').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });

  ipcMain.handle('menu:save', async (_, data) => {
    const row = { client_id: data.client_id, nom: data.nom || 'Analyse carte', notes: data.notes || '', editorial_checks: data.editorial_checks || '{}' };
    if (data.id) {
      await supabase.from('menu_analyses').update(row).eq('id', data.id);
      invalidate(`menu:${data.client_id}`);
      return { id: data.id };
    } else {
      const { data: ins, error } = await supabase.from('menu_analyses').insert(row).select().single();
      if (error) { console.error(error); return null; }
      await supabase.from('history').insert({ utilisateur: userName, client_id: data.client_id, action: 'Analyse menu ajoutée', details: row.nom });
      invalidate(`menu:${data.client_id}`, 'history_recent');
      return ins;
    }
  });

  ipcMain.handle('menu:delete', async (_, id) => {
    await supabase.from('menu_analyses').delete().eq('id', id);
    invalidatePrefix('menu:');
    return true;
  });

  ipcMain.handle('menu:getItems', async (_, analysisId) => {
    return cached(`menu_items:${analysisId}`, async () => {
      const { data, error } = await supabase.from('menu_items').select('*').eq('analysis_id', analysisId).order('id');
      if (error) { console.error(error); return []; }
      return data;
    });
  });

  ipcMain.handle('menu:saveItems', async (_, analysisId, items) => {
    await supabase.from('menu_items').delete().eq('analysis_id', analysisId);
    if (!items?.length) { invalidate(`menu_items:${analysisId}`); return true; }
    const rows = items.map(i => ({
      analysis_id: analysisId,
      nom: i.nom || '',
      categorie: i.categorie || 'plat',
      cout_revient: +i.cout_revient || 0,
      prix_vente_ht: +i.prix_vente_ht || 0,
      quantite_vendue: +i.quantite_vendue || 0,
      description: i.description || '',
    }));
    const { error } = await supabase.from('menu_items').insert(rows);
    if (error) { console.error(error); return false; }
    invalidate(`menu_items:${analysisId}`);
    return true;
  });

  // ══ ANALYSES FINANCIÈRES ══════════════════════════════════════════

  ipcMain.handle('financial:get', async (_, clientId) => {
    return cached(`financial:${clientId}`, async () => {
      const { data, error } = await supabase
        .from('financial_analyses')
        .select('*')
        .eq('client_id', clientId)
        .order('annee', { ascending: false })
        .order('mois', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    });
  });

  ipcMain.handle('financial:save', async (_, data) => {
    const row = {
      client_id: data.client_id,
      periode: data.periode,
      annee: +data.annee || new Date().getFullYear(),
      mois: +data.mois || new Date().getMonth() + 1,
      ca_total: +data.ca_total || 0,
      ca_food: +data.ca_food || 0,
      ca_boissons: +data.ca_boissons || 0,
      nb_couverts: +data.nb_couverts || 0,
      nb_jours: +data.nb_jours || 0,
      achats_food: +data.achats_food || 0,
      achats_boissons: +data.achats_boissons || 0,
      masse_salariale: +data.masse_salariale || 0,
      loyer: +data.loyer || 0,
      charges_fixes_autres: +data.charges_fixes_autres || 0,
      charges_variables_pct: +data.charges_variables_pct || 0,
      surface_m2: +data.surface_m2 || 0,
      nb_tables: +data.nb_tables || 0,
      nb_places: +data.nb_places || 0,
      notes: data.notes || '',
    };
    if (data.id) {
      const { error } = await supabase.from('financial_analyses').update(row).eq('id', data.id);
      if (error) { console.error(error); return false; }
      invalidate(`financial:${data.client_id}`);
      return { id: data.id };
    } else {
      const { data: inserted, error } = await supabase.from('financial_analyses').insert(row).select().single();
      if (error) { console.error(error); return false; }
      await supabase.from('history').insert({
        utilisateur: userName,
        client_id: data.client_id,
        action: 'Analyse financière ajoutée',
        details: row.periode,
      });
      invalidate(`financial:${data.client_id}`, 'history_recent');
      return inserted;
    }
  });

  ipcMain.handle('financial:delete', async (_, id) => {
    const { error } = await supabase.from('financial_analyses').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    invalidatePrefix('financial:');
    return true;
  });

  // ══ EXPORT PDF ════════════════════════════════════════════════════════════


  ipcMain.handle('facture:openEditor', async (_, { html }) => {
    const tmpPath = path.join(app.getPath('temp'), 'lacarte_facture.html');
    fs.writeFileSync(tmpPath, html, 'utf-8');
    const win = new BrowserWindow({
      width: 1060, height: 920, title: 'Facture — La Carte',
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    await win.loadFile(tmpPath);
    win.show();
    return true;
  });

  ipcMain.handle('facture:generateFacturX', async (_, { facture, client }) => {
    try {
      const { PDFDocument } = require('pdf-lib');

      // ── 1. Générer le PDF depuis l'HTML ──────────────────────────
      const html = generateFactureHTMLNode(facture, client);
      const tmpHtml = path.join(app.getPath('temp'), 'lacarte_facturx.html');
      fs.writeFileSync(tmpHtml, html, 'utf-8');

      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
      await win.loadFile(tmpHtml);
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true, pageSize: 'A4',
        margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.6, right: 0.6 }
      });
      win.close();

      // ── 2. Générer le XML Factur-X (profil MINIMUM EN 16931) ─────
      const today = new Date();
      const fmtDate = d => d ? new Date(d).toISOString().slice(0, 10).replace(/-/g, '') : today.toISOString().slice(0, 10).replace(/-/g, '');
      const montantHT = +(facture.montant || 0);
      const montantTTC = montantHT; // TVA non applicable

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${facture.numero || 'FACT-001'}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${fmtDate(facture.date_emission)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Anthony Grimault — La Carte</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">95099846800025</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:DefinedTradeContact>
          <ram:EmailURIUniversalCommunication>
            <ram:URIID>contact@lacarte-conseil.fr</ram:URIID>
          </ram:EmailURIUniversalCommunication>
        </ram:DefinedTradeContact>
        <ram:PostalTradeAddress>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${(client?.name || '') + (client?.company ? ' — ' + client.company : '')}</ram:Name>
        ${client?.email ? `<ram:DefinedTradeContact><ram:EmailURIUniversalCommunication><ram:URIID>${client.email}</ram:URIID></ram:EmailURIUniversalCommunication></ram:DefinedTradeContact>` : ''}
      </ram:BuyerTradeParty>
      <ram:BuyerOrderReferencedDocument>
        <ram:IssuerAssignedID>${facture.numero || ''}</ram:IssuerAssignedID>
      </ram:BuyerOrderReferencedDocument>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${montantHT.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${montantHT.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${montantTTC.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${montantTTC.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

      // ── 3. Embarquer le XML dans le PDF via pdf-lib ──────────────
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      // Métadonnées PDF/A-3b (Factur-X)
      pdfDoc.setTitle(`Facture ${facture.numero || ''} — La Carte`);
      pdfDoc.setAuthor('Anthony Grimault — La Carte');
      pdfDoc.setSubject('Facture Factur-X');
      pdfDoc.setKeywords(['factur-x', 'facture', 'la-carte']);
      pdfDoc.setProducer('La Carte — contact@lacarte-conseil.fr');
      pdfDoc.setCreator('La Carte Desktop App');

      // Attacher le XML Factur-X
      await pdfDoc.attach(Buffer.from(xml, 'utf-8'), 'factur-x.xml', {
        mimeType: 'text/xml',
        description: 'Factur-X XML — Profil MINIMUM',
        creationDate: today,
        modificationDate: today,
      });

      const facturXBytes = await pdfDoc.save();

      // ── 4. Écrire dans un fichier temp et ouvrir ─────────────────
      const defaultName = `Facture_${(facture.numero || 'FACT').replace(/[^a-zA-Z0-9-_]/g, '_')}_${client?.company?.replace(/[^a-zA-Z0-9]/g, '_') || 'client'}.pdf`;
      const tmpPath = path.join(app.getPath('temp'), defaultName);
      fs.writeFileSync(tmpPath, Buffer.from(facturXBytes));
      shell.openPath(tmpPath);

      // ── 5. Uploader dans Supabase Storage ────────────────────────
      const storagePath = `factures/${(facture.numero || 'FACT').replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('attachments')
        .upload(storagePath, Buffer.from(facturXBytes), { contentType: 'application/pdf', upsert: true });

      // ── 6. Mettre à jour ou créer la ligne dans cabinet_factures ──
      if (!upErr) {
        const fileInfo = {
          storage_path: storagePath,
          filename: defaultName,
          filetype: 'pdf',
          size: facturXBytes.length,
        };
        if (facture.id) {
          // Mettre à jour la facture existante avec le PDF
          await supabase.from('cabinet_factures').update(fileInfo).eq('id', facture.id);
          log('[FACTUR-X] PDF attaché à la facture', facture.id);
        } else {
          // Créer une nouvelle entrée si générée depuis un contexte sans id
          const row = {
            numero: facture.numero || defaultName.replace('.pdf', ''),
            client_id: client?.id || null,
            client_nom: client?.name || '',
            formule: facture.formule || '',
            montant: +(facture.montant || 0),
            statut: facture.statut || 'envoyee',
            date_emission: facture.date_emission || new Date().toISOString().split('T')[0],
            ...fileInfo,
          };
          await supabase.from('cabinet_factures').insert(row);
          log('[FACTUR-X] Nouvelle entrée créée dans cabinet_factures');
        }
      } else {
        console.error('[FACTUR-X] Upload storage échoué:', upErr.message);
      }

      invalidate('factures');
      return { saved: true, path: tmpPath };

    } catch (err) {
      console.error('[FACTUR-X] Erreur:', err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle('clients:exportPDF', async (_, { html, filename }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { canceled: true };
    const pdfBuffer = await htmlToPDF(html);
    fs.writeFileSync(filePath, pdfBuffer);
    return { saved: true, path: filePath };
  });

  // ── Devis : générer PDF + enregistrer en compta automatiquement ─────────
  ipcMain.handle('devis:exportAndSave', async (_, { html, filename, devisData }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      title: 'Enregistrer le devis',
    });
    if (canceled || !filePath) return { canceled: true };

    const pdfBuffer = await htmlToPDF(html);
    fs.writeFileSync(filePath, pdfBuffer);

    // 4. Uploader dans Supabase Storage
    const storagePath = `devis/${devisData.numero}_${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from('attachments')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    // 5. Créer l'entrée compta_devis avec le PDF attaché
    const row = {
      numero: devisData.numero,
      client_id: devisData.client_id || null,
      client_nom: devisData.client_nom || '',
      formule: devisData.formule || '',
      montant: +devisData.montant || 0,
      statut: 'envoye',
      date_emission: new Date().toISOString().split('T')[0],
      storage_path: upErr ? '' : storagePath,
      filename: filename,
      filetype: 'pdf',
      size: pdfBuffer.length,
    };
    const { data: ins } = await supabase.from('compta_devis').insert(row).select().single();

    log('[DEVIS] Enregistré en compta :', ins?.id, '— PDF:', upErr ? 'non uploadé' : storagePath);
    invalidate('compta_devis');
    return { saved: true, path: filePath, comptaId: ins?.id };
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function htmlToPDF(html) {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const buf = await win.webContents.printToPDF({
    printBackground: true, pageSize: 'A4',
    margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.6, right: 0.6 }
  });
  win.close();
  return buf;
}

function generateFactureHTMLNode(facture, client) {
  const montant = +facture.montant || 0;
  const fmt = v => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateEmission = facture.date_emission ? new Date(facture.date_emission).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  const dateEcheance = facture.date_echeance ? new Date(facture.date_echeance).toLocaleDateString('fr-FR') : '';
  const isComplet = facture.formule?.toLowerCase().includes('complet') || facture.formule?.toLowerCase().includes('financier');
  const isMenu = !isComplet && (facture.formule?.toLowerCase().includes('menu') || facture.formule?.toLowerCase().includes('audit'));
  const auditLabel = isComplet ? 'Audit Complet — Menu + Financier & CMV' : isMenu ? 'Audit Menu — Ingénierie de carte' : facture.formule || 'Prestation de conseil';
  const isPv = ['brouillon', 'envoyee', 'attente'].includes(facture.statut);
  const montantAffiche = isPv ? montant / 2 : montant;
  const typeLabel = isPv ? 'ACOMPTE (50%)' : 'SOLDE';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
:root { --marine:#0D1B2A; --or:#C9A84C; --creme:#F0E6C8; --creme-light:#FAF5EA; }
body { background:var(--creme-light); font-family:'Space Mono',monospace; color:var(--marine); print-color-adjust:exact; -webkit-print-color-adjust:exact; }
.page { width:210mm; min-height:297mm; margin:0 auto; background:var(--creme-light); position:relative; }
.header { background:var(--marine); padding:36px 40px 28px; display:flex; justify-content:space-between; align-items:flex-end; }
.logo-name { font-family:'Bebas Neue',sans-serif; font-size:34px; letter-spacing:6px; color:var(--creme); }
.logo-name span { color:var(--or); }
.logo-tagline { font-family:'Cormorant Garamond',serif; font-size:11px; font-style:italic; color:rgba(240,230,200,0.5); letter-spacing:3px; margin-top:4px; }
.header-right { text-align:right; }
.facture-num { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:4px; color:var(--or); }
.facture-date { font-size:9px; color:rgba(240,230,200,0.5); margin-top:2px; }
.meta { display:flex; justify-content:space-between; padding:28px 40px 20px; gap:24px; }
.meta-block {}
.meta-label { font-size:8px; font-weight:700; letter-spacing:3px; color:var(--or); text-transform:uppercase; margin-bottom:8px; }
.meta-value { font-size:9.5px; line-height:1.8; color:var(--marine); }
.meta-value strong { font-weight:700; font-size:10.5px; }
.divider { height:1px; background:linear-gradient(90deg,var(--or),transparent); margin:0 40px; opacity:0.4; }
.lines { padding:24px 40px; }
.lines-header { display:grid; grid-template-columns:1fr 60px 80px 80px; gap:8px; padding-bottom:6px; border-bottom:1px solid rgba(201,168,76,0.4); margin-bottom:10px; }
.lines-header span { font-size:8px; font-weight:700; letter-spacing:2px; color:var(--or); text-transform:uppercase; }
.lines-header span:last-child, .lines-header span:nth-child(3), .lines-header span:nth-child(2) { text-align:right; }
.line-row { display:grid; grid-template-columns:1fr 60px 80px 80px; gap:8px; padding:8px 0; border-bottom:1px solid rgba(13,27,42,0.06); }
.line-row span { font-size:9.5px; color:var(--marine); }
.line-row span:last-child, .line-row span:nth-child(3), .line-row span:nth-child(2) { text-align:right; }
.totals { padding:16px 40px 24px; display:flex; justify-content:flex-end; }
.totals-table { width:240px; }
.total-row { display:flex; justify-content:space-between; padding:4px 0; font-size:9px; }
.total-row.grand { border-top:1.5px solid var(--or); margin-top:4px; padding-top:8px; font-size:11px; font-weight:700; }
.total-row.grand span:last-child { color:var(--or); }
.payment { background:var(--marine); margin:0 40px 24px; padding:16px 20px; border-radius:2px; }
.payment-title { font-size:8px; font-weight:700; letter-spacing:3px; color:var(--or); text-transform:uppercase; margin-bottom:8px; }
.payment-row { display:flex; gap:20px; flex-wrap:wrap; }
.payment-item { font-size:8.5px; color:rgba(240,230,200,0.6); }
.payment-item strong { color:var(--creme); display:block; font-size:9px; }
.footer { background:var(--marine); padding:14px 40px; display:flex; justify-content:space-between; align-items:center; position:absolute; bottom:0; left:0; right:0; }
.footer-brand { font-family:'Bebas Neue',sans-serif; font-size:16px; letter-spacing:4px; color:var(--creme); }
.footer-brand span { color:var(--or); }
.footer-legal { font-family:'Space Mono',monospace; font-size:7px; color:rgba(240,230,200,0.3); text-align:right; line-height:1.7; }
</style></head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo-name">LA <span>CARTE</span></div>
      <div class="logo-tagline">Conseil · Analyse · Rentabilité · Tactique · Expertise</div>
    </div>
    <div class="header-right">
      <div class="facture-num">${typeLabel} — ${facture.numero || 'FACT'}</div>
      <div class="facture-date">Émis le ${dateEmission}${dateEcheance ? ' · Échéance ' + dateEcheance : ''}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Émetteur</div>
      <div class="meta-value">
        <strong>Anthony Grimault</strong><br>
        La Carte — Restaurant Advisory<br>
        SIRET : 950 998 468 00025<br>
        contact@lacarte-conseil.fr<br>
        TVA non applicable — Art. 293 B CGI
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Client</div>
      <div class="meta-value">
        <strong>${client?.name || '—'}</strong><br>
        ${client?.company || ''}<br>
        ${client?.email || ''}<br>
        ${client?.phone || ''}
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Référence</div>
      <div class="meta-value">
        Facture N° <strong>${facture.numero || '—'}</strong><br>
        ${facture.formule || '—'}
      </div>
    </div>
  </div>
  <div class="divider"></div>

  <div class="lines">
    <div class="lines-header">
      <span>Description</span>
      <span>Qté</span>
      <span>P.U. HT</span>
      <span>Total HT</span>
    </div>
    <div class="line-row">
      <span>${auditLabel}</span>
      <span>1</span>
      <span>${fmt(montant)} €</span>
      <span>${fmt(montant)} €</span>
    </div>
  </div>

  <div class="totals">
    <div class="totals-table">
      <div class="total-row"><span>Sous-total HT</span><span>${fmt(montant)} €</span></div>
      <div class="total-row"><span>TVA</span><span>Non applicable</span></div>
      ${isPv ? `<div class="total-row"><span>Acompte 50%</span><span>${fmt(montantAffiche)} €</span></div>` : ''}
      <div class="total-row grand"><span>Total TTC</span><span>${fmt(montantAffiche)} €</span></div>
    </div>
  </div>

  <div class="payment">
    <div class="payment-title">Règlement</div>
    <div class="payment-row">
      <div class="payment-item"><strong>Virement bancaire</strong>À réception</div>
      <div class="payment-item"><strong>IBAN</strong>[IBAN]</div>
      <div class="payment-item"><strong>BIC</strong>[BIC]</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-brand">LA <span>CARTE</span></div>
    <div class="footer-legal">
      Anthony Grimault · Auto-entrepreneur · SIRET : 950 998 468 00025<br>
      contact@lacarte-conseil.fr · TVA non applicable — Art. 293 B du CGI
    </div>
  </div>
</div>
</body></html>`;
}
function getMimeType(ext) {
  const map = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' };
  return map[ext] || 'application/octet-stream';
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 620,
    title: 'La Carte',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../public/icon.ico')
      : path.join(__dirname, '../public/icon.png'),
  });
  if (isDev) { win.loadURL('http://localhost:3000'); }
  else { win.loadFile(path.join(__dirname, '../build/index.html')); }
}

// ── Démarrage ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // 0. Charger le nom d'utilisateur (app.getPath disponible ici)
  userName = getUserName();

  // 1. IPC handlers — toujours enregistrés en premier
  try { setupIPC(); } catch (e) { console.error('setupIPC:', e.message); }

  // 2. Fenêtre — toujours ouverte, indépendamment de Supabase
  createWindow();

  // 3. Supabase — connexion en arrière-plan
  try {
    initSupabase();
    await checkReminders();
  } catch (err) {
    console.error('Erreur Supabase:', err.message);
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      wins[0].webContents.executeJavaScript(
        `alert('Erreur Supabase:\n' + ${JSON.stringify(err.message)} + '\n\nLancez : npm install @supabase/supabase-js')`
      ).catch(() => { });
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
