const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Clients ───────────────────────────────────────────
  getClients:   ()     => ipcRenderer.invoke('clients:getAll'),
  createClient: (data) => ipcRenderer.invoke('clients:create', data),
  updateClient: (data) => ipcRenderer.invoke('clients:update', data),
  deleteClient: (id)   => ipcRenderer.invoke('clients:delete', id),
  exportPDF:    (data) => ipcRenderer.invoke('clients:exportPDF', data),

  // ── Tableau de bord ───────────────────────────────────
  getStats: () => ipcRenderer.invoke('stats:get'),

  // ── Historique ────────────────────────────────────────
  getHistory: (clientId)                   => ipcRenderer.invoke('history:get', clientId),
  addHistory: (clientId, action, details)  => ipcRenderer.invoke('history:add', { clientId, action, details }),

  // ── Pièces jointes ────────────────────────────────────
  getAttachments:   (clientId) => ipcRenderer.invoke('attachments:get', clientId),
  addAttachments:   (clientId) => ipcRenderer.invoke('attachments:add', clientId),
  // ⚠️ Supabase : on passe { id, clientId, storage_path } au lieu de filepath
  deleteAttachment: (data)     => ipcRenderer.invoke('attachments:delete', data),
  // ⚠️ Supabase : on passe { storage_path, filename } pour télécharger puis ouvrir
  openAttachment:   (att)      => ipcRenderer.invoke('attachments:open', att),

  // ── Facture éditeur ──────────────────────────────────────────────
  openFactureEditor: (html) => ipcRenderer.invoke('facture:openEditor', { html }),

  // ── Liens externes ───────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // ── Utilisateur ──────────────────────────────────────────────────
  getUserName: ()     => ipcRenderer.invoke('user:getName'),
  setUserName: (name) => ipcRenderer.invoke('user:setName', name),

  // ── Dossier Interne ──────────────────────────────────────────────
  getCabinetSettings: ()     => ipcRenderer.invoke('cabinet:getSettings'),
  saveCabinetSettings:(data) => ipcRenderer.invoke('cabinet:saveSettings', data),
  getPipeline:        ()     => ipcRenderer.invoke('pipeline:getAll'),
  savePipeline:       (data) => ipcRenderer.invoke('pipeline:save', data),
  deletePipeline:     (id)   => ipcRenderer.invoke('pipeline:delete', id),
  getFactures:        ()     => ipcRenderer.invoke('factures:getAll'),
  saveFacture:        (data) => ipcRenderer.invoke('factures:save', data),
  deleteFacture:      (id)   => ipcRenderer.invoke('factures:delete', id),
  getCabinetDocs:     ()     => ipcRenderer.invoke('cabinet:getDocs'),
  addCabinetDocs:     ()     => ipcRenderer.invoke('cabinet:addDocs'),
  deleteCabinetDoc:   (data) => ipcRenderer.invoke('cabinet:deleteDoc', data),
  getNotes:           ()     => ipcRenderer.invoke('notes:getAll'),
  saveNote:           (data) => ipcRenderer.invoke('notes:save', data),
  deleteNote:         (id)   => ipcRenderer.invoke('notes:delete', id),
  getAgendaEvents:    ()     => ipcRenderer.invoke('agenda:getAll'),
  saveAgendaEvent:    (data) => ipcRenderer.invoke('agenda:save', data),
  deleteAgendaEvent:  (id)   => ipcRenderer.invoke('agenda:delete', id),

  // ── Suivi mensuel ────────────────────────────────────────────────
  getSuivis:    (clientId) => ipcRenderer.invoke('suivi:getAll', clientId),
  saveSuivi:    (data)     => ipcRenderer.invoke('suivi:save',   data),
  deleteSuivi:  (id)       => ipcRenderer.invoke('suivi:delete', id),

  // ── Analyses menu ────────────────────────────────────────────────
  getMenuAnalyses:  (clientId)           => ipcRenderer.invoke('menu:getAll',       clientId),
  saveMenuAnalysis: (data)               => ipcRenderer.invoke('menu:save',         data),
  deleteMenuAnalysis:(id)                => ipcRenderer.invoke('menu:delete',       id),
  getMenuItems:     (analysisId)         => ipcRenderer.invoke('menu:getItems',     analysisId),
  saveMenuItems:    (analysisId, items)  => ipcRenderer.invoke('menu:saveItems',    analysisId, items),

  // ── Analyses financières ──────────────────────────────────────────
  getFinancialAnalyses:    (clientId) => ipcRenderer.invoke('financial:get', clientId),
  saveFinancialAnalysis:   (data)     => ipcRenderer.invoke('financial:save', data),
  deleteFinancialAnalysis: (id)       => ipcRenderer.invoke('financial:delete', id),
});
