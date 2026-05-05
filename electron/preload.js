const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Clients ───────────────────────────────────────────
  getClients: () => ipcRenderer.invoke('clients:getAll'),
  createClient: (data) => ipcRenderer.invoke('clients:create', data),
  updateClient: (data) => ipcRenderer.invoke('clients:update', data),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),
  exportPDF: (data) => ipcRenderer.invoke('clients:exportPDF', data),

  // ── Tableau de bord ───────────────────────────────────
  getStats: () => ipcRenderer.invoke('stats:get'),

  // ── Historique ────────────────────────────────────────
  getHistory: (clientId) => ipcRenderer.invoke('history:get', clientId),
  addHistory: (clientId, action, details) => ipcRenderer.invoke('history:add', { clientId, action, details }),

  // ── Pièces jointes ────────────────────────────────────
  getAttachments: (clientId) => ipcRenderer.invoke('attachments:get', clientId),
  addAttachments: (clientId) => ipcRenderer.invoke('attachments:add', clientId),
  // ⚠️ Supabase : on passe { id, clientId, storage_path } au lieu de filepath
  deleteAttachment: (data) => ipcRenderer.invoke('attachments:delete', data),
  // ⚠️ Supabase : on passe { storage_path, filename } pour télécharger puis ouvrir
  openAttachment: (att) => ipcRenderer.invoke('attachments:open', att),

  // ── Facture éditeur ──────────────────────────────────────────────
  openFactureEditor: (html) => ipcRenderer.invoke('facture:openEditor', { html }),
  generateFacturX: (facture, cl) => ipcRenderer.invoke('facture:generateFacturX', { facture, client: cl }),
  devisExportAndSave: (html, fn, data) => ipcRenderer.invoke('devis:exportAndSave', { html, filename: fn, devisData: data }),

  // ── Comptabilité ─────────────────────────────────────────────────
  getComptaDevis: () => ipcRenderer.invoke('compta:getDevis'),
  saveComptaDevis: (data) => ipcRenderer.invoke('compta:saveDevis', data),
  deleteComptaDevis: (id) => ipcRenderer.invoke('compta:deleteDevis', id),
  getComptaFactures: () => ipcRenderer.invoke('compta:getFactures'),
  saveComptaFacture: (data) => ipcRenderer.invoke('compta:saveFacture', data),
  deleteComptaFacture: (id) => ipcRenderer.invoke('compta:deleteFacture', id),
  getCharges: (m, a) => ipcRenderer.invoke('compta:getCharges', m, a),
  saveCharge: (data) => ipcRenderer.invoke('compta:saveCharge', data),
  deleteCharge: (id) => ipcRenderer.invoke('compta:deleteCharge', id),
  getChargesRecurrentes: () => ipcRenderer.invoke('compta:getChargesRec'),
  saveChargeRecurrente: (data) => ipcRenderer.invoke('compta:saveChargeRec', data),
  deleteChargeRecurrente: (id) => ipcRenderer.invoke('compta:deleteChargeRec', id),
  getNotesfrais: () => ipcRenderer.invoke('compta:getNotesfrais'),
  saveNotefrais: (data) => ipcRenderer.invoke('compta:saveNotefrais', data),
  deleteNotefrais: (id) => ipcRenderer.invoke('compta:deleteNotefrais', id),
  getComptaDocs: () => ipcRenderer.invoke('compta:getDocs'),
  uploadComptaDoc: (data) => ipcRenderer.invoke('compta:uploadDoc', data),
  deleteComptaDoc: (data) => ipcRenderer.invoke('compta:deleteDoc', data),
  uploadComptaFile: (data) => ipcRenderer.invoke('compta:uploadFile', data),
  pickFile: () => ipcRenderer.invoke('file:pick'),

  getRecentHistory: () => ipcRenderer.invoke('history:getRecent'),

  // ── Réseaux sociaux ──────────────────────────────────────────────
  getSocialContenus: () => ipcRenderer.invoke('social:getContenus'),
  saveSocialContenu: (data) => ipcRenderer.invoke('social:saveContenu', data),
  deleteSocialContenu: (id) => ipcRenderer.invoke('social:deleteContenu', id),
  getSocialStats: () => ipcRenderer.invoke('social:getStats'),
  saveSocialStat: (data) => ipcRenderer.invoke('social:saveStat', data),
  deleteSocialStat: (id) => ipcRenderer.invoke('social:deleteStat', id),

  // ── Ressources ───────────────────────────────────────────────────
  getConnaissances: () => ipcRenderer.invoke('ressources:getConnaissances'),
  saveConnaissance: (data) => ipcRenderer.invoke('ressources:saveConnaissance', data),
  deleteConnaissance: (id) => ipcRenderer.invoke('ressources:deleteConnaissance', id),
  uploadConnPDF: () => ipcRenderer.invoke('ressources:uploadConnPDF'),
  openConnPDF: (data) => ipcRenderer.invoke('ressources:openConnPDF', data),
  getFormations: () => ipcRenderer.invoke('ressources:getFormations'),
  saveFormation: (data) => ipcRenderer.invoke('ressources:saveFormation', data),
  deleteFormation: (id) => ipcRenderer.invoke('ressources:deleteFormation', id),
  getPartenaires: () => ipcRenderer.invoke('ressources:getPartenaires'),
  savePartenaire: (data) => ipcRenderer.invoke('ressources:savePartenaire', data),
  deletePartenaire: (id) => ipcRenderer.invoke('ressources:deletePartenaire', id),

  // ── Liens externes ───────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // ── Utilisateur ──────────────────────────────────────────────────
  getUserName: () => ipcRenderer.invoke('user:getName'),
  setUserName: (name) => ipcRenderer.invoke('user:setName', name),

  // ── Dossier Interne ──────────────────────────────────────────────
  getCabinetSettings: () => ipcRenderer.invoke('cabinet:getSettings'),
  saveCabinetSettings: (data) => ipcRenderer.invoke('cabinet:saveSettings', data),
  getPipeline: () => ipcRenderer.invoke('pipeline:getAll'),
  savePipeline: (data) => ipcRenderer.invoke('pipeline:save', data),
  deletePipeline: (id) => ipcRenderer.invoke('pipeline:delete', id),
  getFactures: () => ipcRenderer.invoke('factures:getAll'),
  saveFacture: (data) => ipcRenderer.invoke('factures:save', data),
  deleteFacture: (id) => ipcRenderer.invoke('factures:delete', id),
  getCabinetDocs: () => ipcRenderer.invoke('cabinet:getDocs'),
  addCabinetDocs: () => ipcRenderer.invoke('cabinet:addDocs'),
  deleteCabinetDoc: (data) => ipcRenderer.invoke('cabinet:deleteDoc', data),
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  saveNote: (data) => ipcRenderer.invoke('notes:save', data),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
  getAgendaEvents: () => ipcRenderer.invoke('agenda:getAll'),
  saveAgendaEvent: (data) => ipcRenderer.invoke('agenda:save', data),
  deleteAgendaEvent: (id) => ipcRenderer.invoke('agenda:delete', id),

  // ── Suivi mensuel ────────────────────────────────────────────────
  getSuivis: (clientId) => ipcRenderer.invoke('suivi:getAll', clientId),
  saveSuivi: (data) => ipcRenderer.invoke('suivi:save', data),
  deleteSuivi: (id) => ipcRenderer.invoke('suivi:delete', id),

  // ── Analyses menu ────────────────────────────────────────────────
  getMenuAnalyses: (clientId) => ipcRenderer.invoke('menu:getAll', clientId),
  saveMenuAnalysis: (data) => ipcRenderer.invoke('menu:save', data),
  deleteMenuAnalysis: (id) => ipcRenderer.invoke('menu:delete', id),
  getMenuItems: (analysisId) => ipcRenderer.invoke('menu:getItems', analysisId),
  saveMenuItems: (analysisId, items) => ipcRenderer.invoke('menu:saveItems', analysisId, items),

  // ── Analyses financières ──────────────────────────────────────────
  getFinancialAnalyses: (clientId) => ipcRenderer.invoke('financial:get', clientId),
  saveFinancialAnalysis: (data) => ipcRenderer.invoke('financial:save', data),
  deleteFinancialAnalysis: (id) => ipcRenderer.invoke('financial:delete', id),

  // ── Paramètres cabinet ───────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (value) => ipcRenderer.invoke('settings:save', value),

  // ── Numérotation auto ────────────────────────────────────────────
  getNextNumero: (type) => ipcRenderer.invoke('numero:getNext', type),
});
