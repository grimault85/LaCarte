import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { isOverdue, stageOf, prioOf, formulaOf, fmtEur, fmtSize, parseActionDate } from '../utils';
import { getTasksForFormula, STAGES, FORMULAS, PRIORITY } from '../constants';
import { PALETTE, card, cardH, lbl, inp, iconBtn, overlay, modal, btnPrimary, btnSec, td } from '../styles';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
function ClientsView({ clients, setClients, selected, setSelected, refresh, api }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [showDelete, setShowDelete] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q);
      const matchF = filter === 'all' || c.stage === filter || (filter === 'overdue' && isOverdue(c.nextAction));
      return matchQ && matchF;
    });
  }, [clients, search, filter]);

  async function handleDelete(client) {
    const ok = await api.deleteClient(client.id);
    if (!ok) {
      alert(`Erreur : impossible de supprimer ${client.name}.\nVérifiez la connexion Supabase.`);
      setShowDelete(null);
      return;
    }
    // Supprimer localement sans recharger depuis Supabase
    setClients(prev => prev.filter(c => c.id !== client.id));
    setShowDelete(null);
    setSelected(null);
  }

  const filterOptions = [
    { key: 'all', label: 'Tous' },
    ...STAGES,
    { key: 'overdue', label: '⚠️ En retard', color: '#dc2626', bg: '#fee2e2' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Left panel */}
      <div style={{ width: selected ? 340 : '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #DDD5B8', background: '#FFFDF8', flexShrink: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #E8E0C8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0D1520', margin: 0 }}>Dossiers clients</h2>
            <button onClick={() => setShowNew(true)} style={btnPrimary}>+ Nouveau</button>
          </div>
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #DDD5B8', borderRadius: 7, fontSize: 13, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap' }}>
            {filterOptions.map(f => {
              const active = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '2px 9px', borderRadius: 10, border: `1px solid ${active ? (f.color || '#C9A84C') : '#DDD5B8'}`,
                  background: active ? (f.bg || '#ede9fe') : '#fff',
                  color: active ? (f.color || '#C9A84C') : '#6b7280',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>{f.label}</button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.length === 0
            ? <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Aucun dossier</div>
            : filtered.map(c => (
              <ClientRow key={c.id} client={c} active={selected?.id === c.id} compact={!!selected} onClick={() => setSelected(c)} />
            ))
          }
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid #E8E0C8', fontSize: 11, color: '#cbd5e1' }}>
          {filtered.length} dossier{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Right panel — detail */}
      {selected && (
        <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
          <ClientDetail
            client={selected}
            onClose={() => setSelected(null)}
            onDelete={() => setShowDelete(selected)}
            onRefresh={() => refresh(selected.id)}
            api={api}
          />
        </div>
      )}

      {showNew && (
        <NewClientModal
          onClose={() => setShowNew(false)}
          onSave={async data => { await api.createClient(data); setShowNew(false); refresh(); }}
        />
      )}
      {showDelete && (
        <ConfirmModal
          title="Supprimer ce dossier"
          message={`Supprimer définitivement le dossier de ${showDelete.name} ? Cette action est irréversible.`}
          onConfirm={() => handleDelete(showDelete)}
          onCancel={() => setShowDelete(null)}
        />
      )}
    </div>
  );
}

const ClientRow = memo(function ClientRow({ client, active, compact, onClick }) {
  const st = stageOf(client.stage);
  const pr = prioOf(client.priority);
  const fm = formulaOf(client.formula);
  const late = isOverdue(client.nextAction);
  return (
    <div onClick={onClick}
      style={{ padding: compact ? '10px 14px' : '13px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: active ? 'var(--bg3)' : 'var(--surface)', borderLeft: `3px solid ${active ? PALETTE.gold : 'transparent'}` }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg2)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--surface)'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{client.name}</span>
        <Badge color={pr.color} bg={pr.bg} small>{pr.label}</Badge>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{client.company}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <Badge color={fm.color} bg={fm.bg} small>{fm.label}</Badge>
        <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
        {late && <span style={{ fontSize: 11, color: PALETTE.danger, fontWeight: 600 }}>⚠ En retard</span>}
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════
// CLIENT DETAIL
// ══════════════════════════════════════════════════════════════════

function ClientDetail({ client, onClose, onDelete, onRefresh, api }) {
  const [tab, setTab] = useState('infos');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [exportingGarde, setExportingGarde] = useState(false);
  const [showDevis, setShowDevis] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [history, setHistory] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [menuAnalyses, setMenuAnalyses] = useState([]);
  const [suivis, setSuivis] = useState([]);

  useEffect(() => {
    setForm({ ...client, nextAction: client.nextAction || '' });
    setEditing(false);
    setTab('infos');
    loadHistory();
    loadAttachments();
    loadAnalyses();
    loadMenuAnalyses();
    loadSuivis();
  }, [client.id]);

  const loadHistory = useCallback(async () => { setHistory(await api.getHistory(client.id)); }, [client.id]);
  const loadAttachments = useCallback(async () => { setAttachments(await api.getAttachments(client.id)); }, [client.id]);
  const loadAnalyses = useCallback(async () => { setAnalyses((await api.getFinancialAnalyses(client.id)) || []); }, [client.id]);
  const loadMenuAnalyses = useCallback(async () => { setMenuAnalyses((await api.getMenuAnalyses(client.id)) || []); }, [client.id]);
  const loadSuivis = useCallback(async () => { setSuivis((await api.getSuivis(client.id)) || []); }, [client.id]);

  async function handleSave() {
    setSaving(true);
    await api.updateClient({ ...form, tasks: client.tasks });
    setSaving(false);
    setEditing(false);
    onRefresh();
  }

  const toggleTask = useCallback(async (stage, idx) => {
    const newTasks = { ...client.tasks };
    const formulaTasks = getTasksForFormula(client.formula);
    const base = (formulaTasks[stage] || []).map(() => false);
    const arr = [...(newTasks[stage] || base)];
    while (arr.length < base.length) arr.push(false);
    arr[idx] = !arr[idx];
    newTasks[stage] = arr;
    await api.updateClient({ ...client, tasks: newTasks });
    onRefresh();
    setTimeout(loadHistory, 300);
  }, [client, onRefresh, loadHistory]);

  const handleAddAttachments = useCallback(async () => {
    const added = await api.addAttachments(client.id);
    if (added?.length) { loadAttachments(); loadHistory(); }
  }, [client.id, loadAttachments, loadHistory]);

  const handleDeleteAttachment = useCallback(async (att) => {
    await api.deleteAttachment({ id: att.id, clientId: client.id, storage_path: att.storage_path });
    loadAttachments();
    loadHistory();
  }, [client.id, loadAttachments, loadHistory]);

  async function handleExportPageGarde() {
    setExportingGarde(true);
    const st = stageOf(client.stage);
    const pr = prioOf(client.priority);
    const fm = formulaOf(client.formula);

    // KPIs financiers — dernière analyse si dispo
    const lastAnalyse = [...analyses].sort((a, b) => b.annee !== a.annee ? b.annee - a.annee : b.mois - a.mois)[0];
    const kFin = lastAnalyse ? calcFin(lastAnalyse) : null;

    // Tâches par étape
    const formulaTasks = getTasksForFormula(client.formula);
    const currentStage = client.stage;
    const allStages = STAGES.filter(s => formulaTasks[s.key]?.length > 0);

    // Progression globale
    const totalDone = allStages.reduce((s, st2) => s + (client.tasks?.[st2.key] || []).filter(Boolean).length, 0);
    const totalTasks = allStages.reduce((s, st2) => s + (formulaTasks[st2.key] || []).length, 0);
    const globalPct = totalTasks > 0 ? Math.round(totalDone / totalTasks * 100) : 0;

    // Tâches étape courante
    const curTasks = formulaTasks[currentStage] || [];
    const curDone = (client.tasks?.[currentStage] || []).filter(Boolean).length;
    const curTotal = curTasks.length;
    const curPct = curTotal > 0 ? Math.round(curDone / curTotal * 100) : 0;
    const curTasksHTML = curTasks.map((label, i) => {
      const done = client.tasks?.[currentStage]?.[i] || false;
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;margin-bottom:4px;background:${done ? '#f0fdf4' : '#FFFDF8'};border:1px solid ${done ? '#bbf7d0' : '#DDD5B8'};border-radius:6px;">
        <span style="color:${done ? '#059669' : '#94a3b8'};font-size:14px;">${done ? '✓' : '○'}</span>
        <span style="font-size:12px;color:${done ? '#6b7280' : '#374151'};text-decoration:${done ? 'line-through' : 'none'};">${label}</span>
      </div>`;
    }).join('');

    // Derniers suivis
    const dernierSuivi = suivis.length > 0 ? [...suivis].sort((a, b) => b.annee !== a.annee ? b.annee - a.annee : b.mois - a.mois)[0] : null;

    const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',Arial,sans-serif; background:#fff; color:#1e293b; font-size:13px; line-height:1.5; }
  .page { width:210mm; min-height:297mm; display:flex; flex-direction:column; }

  /* Header navy */
  .header { background:#0D1520; padding:28px 36px 24px; position:relative; overflow:hidden; }
  .header::after { content:''; position:absolute; top:-40px; right:-40px; width:200px; height:200px; background:radial-gradient(circle,rgba(201,168,76,0.12) 0%,transparent 70%); }
  .header::before { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#C9A84C 0%,rgba(201,168,76,0.15) 100%); }
  .logo-la { font-family:'DM Serif Display',serif; font-size:9px; color:#C9A84C; letter-spacing:5px; display:block; }
  .logo-carte { font-family:'DM Serif Display',serif; font-size:20px; color:#EEE6C9; letter-spacing:5px; line-height:1; }
  .logo-sub { font-size:8px; color:rgba(238,230,201,0.3); letter-spacing:2px; text-transform:uppercase; margin-top:3px; }
  .doc-label { font-family:'DM Serif Display',serif; font-size:11px; color:rgba(238,230,201,0.4); letter-spacing:2px; text-align:right; }
  .doc-date { font-size:10px; color:rgba(238,230,201,0.35); text-align:right; margin-top:4px; }

  /* Client block */
  .client-block { background:#162030; margin:0 36px; border-radius:0 0 12px 12px; padding:20px 24px 18px; margin-bottom:20px; }
  .client-name { font-family:'DM Serif Display',serif; font-size:26px; color:#EEE6C9; font-weight:400; letter-spacing:-0.3px; }
  .client-company { font-size:14px; color:rgba(238,230,201,0.5); margin-top:4px; }

  /* Body */
  .body { padding:0 36px; flex:1; }

  /* Badges */
  .badges { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:18px; }
  .badge { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; }

  /* Section */
  .section { margin-bottom:20px; }
  .section-title { font-family:'DM Serif Display',serif; font-size:13px; color:#0D1520; font-weight:400; margin-bottom:10px; padding-bottom:6px; border-bottom:1.5px solid #DDD5B8; display:flex; align-items:center; gap:8px; }

  /* KPI grid */
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:6px; }
  .kpi { background:#FAF8F2; border:1px solid #DDD5B8; border-radius:8px; padding:10px 12px; }
  .kpi-label { font-size:8px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:3px; }
  .kpi-val { font-size:17px; font-weight:800; color:#0D1520; line-height:1; }
  .kpi-sub { font-size:9px; color:#94a3b8; margin-top:2px; }

  /* Progression globale */
  .progress-bar { height:6px; background:#EDE8D5; border-radius:3px; overflow:hidden; margin:8px 0 4px; }
  .progress-fill { height:100%; border-radius:3px; }

  /* Grille infos */
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
  .info-field label { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.8px; display:block; margin-bottom:2px; }
  .info-field .val { font-size:12px; color:#0D1520; font-weight:500; }

  /* Prochaine action */
  .next-action { background:#FAF3E0; border:1px solid rgba(201,168,76,0.35); border-left:3px solid #C9A84C; border-radius:0 8px 8px 0; padding:12px 14px; }
  .next-action-label { font-size:9px; font-weight:700; color:#C9A84C; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px; }
  .next-action-val { font-size:13px; font-weight:600; color:#0D1520; }

  /* Footer */
  .footer { background:#0D1520; padding:14px 36px; display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
  .footer-brand { font-family:'DM Serif Display',serif; font-size:12px; letter-spacing:3px; color:rgba(238,230,201,0.25); }
  .footer-brand span { color:#C9A84C; }
  .footer-info { font-size:9px; color:rgba(238,230,201,0.25); text-align:right; line-height:1.6; }

  @media print { body { background:none; } .page { box-shadow:none; } }
</style>
</head><body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <span class="logo-la">LA</span>
        <span class="logo-carte">CARTE</span>
        <span class="logo-sub">Restaurant Advisory</span>
      </div>
      <div>
        <div class="doc-label">FICHE RENDEZ-VOUS</div>
        <div class="doc-date">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>
  </div>

  <!-- CLIENT -->
  <div class="client-block">
    <div class="client-name">${client.name}</div>
    <div class="client-company">${client.company || ''}</div>
  </div>

  <div class="body">

    <!-- BADGES -->
    <div class="badges">
      <span class="badge" style="background:${fm.bg};color:${fm.color};">📋 ${fm.label}</span>
      <span class="badge" style="background:${st.bg};color:${st.color};">📍 ${st.label}</span>
      <span class="badge" style="background:${pr.bg};color:${pr.color};">⚡ Priorité ${pr.label}</span>
    </div>

    <!-- INFOS CONTACT -->
    <div class="section">
      <div class="section-title"><span>👤</span> Informations</div>
      <div class="info-grid">
        <div class="info-field"><label>Email</label><div class="val">${client.email || '—'}</div></div>
        <div class="info-field"><label>Téléphone</label><div class="val">${client.phone || '—'}</div></div>
        <div class="info-field"><label>Dossier depuis</label><div class="val">${client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : '—'}</div></div>
      </div>
    </div>

    <!-- PROGRESSION MISSION -->
    <div class="section">
      <div class="section-title"><span>🎯</span> Avancement mission — ${st.label}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;color:#64748b;">Progression globale</span>
        <span style="font-size:13px;font-weight:800;color:${globalPct === 100 ? '#059669' : '#C9A84C'};">${globalPct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${globalPct}%;background:${globalPct === 100 ? '#059669' : '#C9A84C'};"></div></div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:12px;">${totalDone} tâches accomplies sur ${totalTasks}</div>

      ${curTasks.length > 0 ? `
      <div style="font-size:10px;font-weight:700;color:#0D1520;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">
        Tâches en cours — ${st.label} (${curDone}/${curTotal})
      </div>
      ${curTasksHTML}
      ` : ''}
    </div>

    ${kFin ? `
    <!-- KPIs FINANCIERS -->
    <div class="section">
      <div class="section-title"><span>📊</span> Derniers indicateurs financiers — ${MOIS_LABELS[lastAnalyse.mois - 1]} ${lastAnalyse.annee}</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">CA Total</div><div class="kpi-val" style="color:#059669;">${fmtEur(lastAnalyse.ca_total)}</div></div>
        <div class="kpi"><div class="kpi-label">CMV Global</div><div class="kpi-val" style="color:${kFin.cmvG > 33 ? '#dc2626' : '#059669'};">${kFin.cmvG.toFixed(1)}%</div><div class="kpi-sub">Cible &lt; 33%</div></div>
        <div class="kpi"><div class="kpi-label">EBE</div><div class="kpi-val" style="color:${kFin.ebeP < 5 ? '#dc2626' : '#059669'};">${kFin.ebeP.toFixed(1)}%</div><div class="kpi-sub">Cible &gt; 5%</div></div>
        <div class="kpi"><div class="kpi-label">Ticket Moyen</div><div class="kpi-val">${fmtEur(kFin.tickM)}</div></div>
        <div class="kpi"><div class="kpi-label">Prime Cost</div><div class="kpi-val" style="color:${kFin.pcost > 65 ? '#dc2626' : '#059669'};">${kFin.pcost.toFixed(1)}%</div><div class="kpi-sub">Cible &lt; 65%</div></div>
        <div class="kpi"><div class="kpi-label">Marge Brute</div><div class="kpi-val">${kFin.mbrP.toFixed(1)}%</div></div>
        <div class="kpi"><div class="kpi-label">Point Mort</div><div class="kpi-val" style="font-size:13px;">${fmtEur(kFin.pm)}</div></div>
        <div class="kpi"><div class="kpi-label">Couverts/Jour</div><div class="kpi-val">${kFin.covJr.toFixed(0)}</div></div>
      </div>
    </div>
    ` : ''}

    <!-- PROCHAINE ACTION -->
    ${client.nextAction ? `
    <div class="section">
      <div class="next-action">
        <div class="next-action-label">⏱ Prochaine action</div>
        <div class="next-action-val">${client.nextAction}</div>
      </div>
    </div>
    ` : ''}

    <!-- NOTES -->
    ${client.notes ? `
    <div class="section">
      <div class="section-title"><span>📝</span> Notes du dossier</div>
      <div style="background:#FAF8F2;border:1px solid #DDD5B8;border-radius:8px;padding:12px 14px;font-size:12px;color:#374151;white-space:pre-wrap;line-height:1.65;">${client.notes}</div>
    </div>
    ` : ''}

    ${dernierSuivi ? `
    <!-- DERNIER SUIVI -->
    <div class="section">
      <div class="section-title"><span>📅</span> Dernier suivi — ${MOIS_LABELS[dernierSuivi.mois - 1]} ${dernierSuivi.annee}</div>
      ${dernierSuivi.observations_terrain ? `<div style="margin-bottom:8px;"><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Observations terrain</div><div style="font-size:12px;color:#374151;">${dernierSuivi.observations_terrain}</div></div>` : ''}
      ${dernierSuivi.recommandations_mois ? `<div><div style="font-size:9px;font-weight:700;color:#C9A84C;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Recommandations M+1</div><div style="font-size:12px;color:#374151;white-space:pre-wrap;">${dernierSuivi.recommandations_mois}</div></div>` : ''}
    </div>
    ` : ''}

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-brand">LA <span>CARTE</span></div>
    <div class="footer-info">
      Anthony Grimault — Fondateur<br>
      lacarte.advisory@gmail.com<br>
      Document confidentiel · ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>

</div>
</body></html>`;

    await api.exportPDF({ html, filename: `FicheRDV_${client.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf` });
    setExportingGarde(false);
  }

  const st = stageOf(client.stage);
  const pr = prioOf(client.priority);
  const fm = formulaOf(client.formula);
  const late = isOverdue(client.nextAction);

  const TABS = [
    { key: 'infos', label: 'Informations' },
    { key: 'tasks', label: 'Tâches' },
    { key: 'financial', label: `Analyse financière${analyses.length ? ` (${analyses.length})` : ''}` },
    { key: 'menu', label: `Analyse Menu${menuAnalyses.length ? ` (${menuAnalyses.length})` : ''}` },
    { key: 'suivi', label: `Suivi Mensuel${suivis.length ? ` (${suivis.length})` : ''}` },
    ...(client.tally_preaudit ? [{ key: 'tally', label: '📋 Tally' }] : []),
    { key: 'history', label: `Historique${history.length ? ` (${history.length})` : ''}` },
    { key: 'attachments', label: `Pièces jointes${attachments.length ? ` (${attachments.length})` : ''}` },
  ];

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header sticky */}
      <div style={{ background: '#FFFDF8', borderBottom: '1px solid #DDD5B8', padding: '18px 24px 0', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0D1520', letterSpacing: -0.3 }}>{client.name}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{client.company}</div>
          </div>
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} style={btnSec}>Annuler</button>
                <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving ? '…' : 'Enregistrer'}</button>
              </>
            ) : (
              <>
                <button onClick={() => setShowEmail(true)} style={{ ...btnSec, fontSize: 12, color: '#0369a1', borderColor: '#93c5fd' }} title="Envoyer un email">
                  📧 Email
                </button>
                <button onClick={() => setShowDevis(true)} style={{ ...btnPrimary, fontSize: 12 }} title="Générer un devis">
                  📋 Devis
                </button>
                <button onClick={handleExportPageGarde} disabled={exportingGarde} style={{ ...btnSec, fontSize: 12, color: '#7c3aed', borderColor: '#c4b5fd' }} title="Exporter la fiche client">
                  {exportingGarde ? '…' : '🖨️ Fiche RDV'}
                </button>
                <button onClick={() => setEditing(true)} style={btnSec}>Modifier</button>
                <button onClick={onDelete} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
                <button onClick={onClose} style={{ ...btnSec, padding: '6px 10px', fontWeight: 700 }}>✕</button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
          <Badge color={fm.color} bg={fm.bg}>{fm.label}</Badge>
          <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
          <Badge color={pr.color} bg={pr.bg}>Priorité {pr.label}</Badge>
          <span style={{ fontSize: 12, color: late ? '#dc2626' : '#94a3b8', fontWeight: late ? 600 : 400 }}>{late && '⚠ '}{client.nextAction}</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#059669', fontWeight: 700 }}>{fmtEur(client.revenue)}</span>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#C9A84C' : '#6b7280',
              borderBottom: `2px solid ${tab === t.key ? '#C9A84C' : 'transparent'}`,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab body */}
      <div style={{ flex: 1, padding: '22px 24px' }}>
        {tab === 'infos' && (
          <InfosTab form={form} setForm={setForm} editing={editing} createdAt={client.created_at} />
        )}
        {tab === 'tasks' && (
          <TasksTab client={client} toggleTask={toggleTask} />
        )}
        {tab === 'financial' && (
          <FinancialTab client={client} api={api} analyses={analyses} onReload={loadAnalyses} />
        )}
        {tab === 'menu' && (
          <MenuTab client={client} api={api} menuAnalyses={menuAnalyses} onReload={loadMenuAnalyses} />
        )}
        {tab === 'suivi' && (
          <SuiviTab client={client} api={api} suivis={suivis} analyses={analyses} menuAnalyses={menuAnalyses} onReload={loadSuivis} />
        )}
        {tab === 'tally' && (
          <TallyPreauditTab client={client} />
        )}
        {tab === 'history' && (
          <HistoryTab history={history} />
        )}
        {tab === 'attachments' && (
          <AttachmentsTab
            attachments={attachments}
            onAdd={handleAddAttachments}
            onDelete={handleDeleteAttachment}
            onOpen={att => api.openAttachment(att)}
          />
        )}
      </div>
      {showDevis && (
        <DevisModal
          client={client}
          onClose={() => setShowDevis(false)}
          api={api}
        />
      )}
      {showEmail && (
        <EmailModal
          client={client}
          api={api}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  );
}
const InfosTab = memo(function InfosTab({ form, setForm, editing, createdAt }) {
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fields = [
    { k: 'name', l: 'Nom', t: 'text' },
    { k: 'company', l: 'Entreprise', t: 'text' },
    { k: 'email', l: 'Email', t: 'email' },
    { k: 'phone', l: 'Téléphone', t: 'text' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {fields.map(f => (
          <div key={f.k}>
            <label style={lbl}>{f.l}</label>
            {editing
              ? <input type={f.t} value={form[f.k] || ''} onChange={e => set(f.k, f.t === 'number' ? parseInt(e.target.value) || 0 : e.target.value)} style={inp} />
              : <div style={{ fontSize: 14, color: '#0D1520', fontWeight: f.k === 'name' ? 600 : 400, marginTop: 2 }}>{form[f.k] || <span style={{ color: '#cbd5e1' }}>—</span>}</div>
            }
          </div>
        ))}
      </div>

      {!editing && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Formule</label>
          {(() => { const fm = formulaOf(form.formula); return <Badge color={fm.color} bg={fm.bg}>{fm.label}</Badge>; })()}
        </div>
      )}

      {editing && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Étape</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {STAGES.map(s => (
                <button key={s.key} onClick={() => set('stage', s.key)} style={{
                  padding: '5px 13px', borderRadius: 12,
                  border: `1px solid ${form.stage === s.key ? s.color : '#DDD5B8'}`,
                  background: form.stage === s.key ? s.bg : '#FFFDF8',
                  color: form.stage === s.key ? s.color : '#6b7280',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{s.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Formule</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {FORMULAS.map(f => (
                <button key={f.key} onClick={() => set('formula', f.key)} style={{
                  padding: '5px 13px', borderRadius: 12,
                  border: `1px solid ${form.formula === f.key ? f.color : '#DDD5B8'}`,
                  background: form.formula === f.key ? f.bg : '#FFFDF8',
                  color: form.formula === f.key ? f.color : '#6b7280',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{f.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Priorité</label>
            <div style={{ display: 'flex', gap: 7 }}>
              {Object.entries(PRIORITY).map(([k, p]) => (
                <button key={k} onClick={() => set('priority', k)} style={{
                  padding: '5px 13px', borderRadius: 12,
                  border: `1px solid ${form.priority === k ? p.color : '#DDD5B8'}`,
                  background: form.priority === k ? p.bg : '#FFFDF8',
                  color: form.priority === k ? p.color : '#6b7280',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{p.label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <label style={lbl}>Notes internes</label>
        {editing
          ? <textarea rows={4} value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical', minHeight: 90 }} />
          : <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{form.notes || <span style={{ color: '#cbd5e1' }}>Aucune note</span>}</div>
        }
      </div>
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #E8E0C8', fontSize: 11, color: '#cbd5e1' }}>
        Dossier créé le {createdAt}
      </div>
    </div>
  );
});

// ── Tab: Tâches ───────────────────────────────────────────────────
const TasksTab = memo(function TasksTab({ client, toggleTask }) {
  const formulaTasks = getTasksForFormula(client.formula);
  const fm = formulaOf(client.formula);
  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge color={fm.color} bg={fm.bg}>{fm.label}</Badge>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Tâches adaptées à la formule</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {STAGES.map(st => {
          const stageTasks = formulaTasks[st.key] || [];
          const base = stageTasks.map(() => false);
          const tasks = client.tasks?.[st.key] || base;
          const padded = [...tasks];
          while (padded.length < stageTasks.length) padded.push(false);
          const done = padded.filter(Boolean).length;
          const total = stageTasks.length;
          const pct = total > 0 ? Math.round(done / total * 100) : 0;
          const isCurrent = client.stage === st.key;

          return (
            <div key={st.key} style={{ border: `1px solid ${isCurrent ? st.color : '#DDD5B8'}`, borderRadius: 10, overflow: 'hidden', opacity: isCurrent ? 1 : 0.65 }}>
              <div style={{ background: isCurrent ? st.bg : '#FAF8F2', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: st.color, fontSize: 13 }}>{st.label}</span>
                  {isCurrent && <span style={{ background: st.color, color: '#fff', borderRadius: 8, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>EN COURS</span>}
                </div>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{done}/{total} · {pct}%</span>
              </div>
              <div style={{ padding: '6px 14px 10px', background: '#FFFDF8' }}>
                <div style={{ height: 3, background: '#E8E0C8', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: st.color, transition: 'width 0.3s' }} />
                </div>
                {stageTasks.map((label, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', cursor: 'pointer', borderBottom: '1px solid #FAF8F2' }}>
                    <input type="checkbox" checked={padded[i] || false} onChange={() => toggleTask(st.key, i)}
                      style={{ width: 15, height: 15, accentColor: st.color, cursor: 'pointer', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: padded[i] ? '#94a3b8' : '#374151', textDecoration: padded[i] ? 'line-through' : 'none' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── Tab: Historique ───────────────────────────────────────────────
const HistoryTab = memo(function HistoryTab({ history }) {
  if (history.length === 0) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucune activité</div>
      <div style={{ fontSize: 13 }}>Les modifications apparaîtront ici automatiquement</div>
    </div>
  );
  return (
    <div>
      {history.map((h, i) => (
        <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', flexShrink: 0 }} />
            {i < history.length - 1 && <div style={{ width: 1, flex: 1, background: '#DDD5B8', margin: '3px 0' }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0D1520' }}>{h.action}</span>
              {h.utilisateur && (
                <span style={{ fontSize: 10, background: '#FAF3E0', color: '#C9A84C', borderRadius: 6, padding: '1px 6px', fontWeight: 700 }}>
                  {h.utilisateur}
                </span>
              )}
            </div>
            {h.details && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.5 }}>{h.details}</div>}
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{h.created_at}</div>
          </div>
        </div>
      ))}
    </div>
  );
});

// ── Tab: Pièces jointes ───────────────────────────────────────────
const EXT_ICONS = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', txt: '📃' };

const AttachmentsTab = memo(function AttachmentsTab({ attachments, onAdd, onDelete, onOpen }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{attachments.length} fichier{attachments.length !== 1 ? 's' : ''}</span>
        <button onClick={onAdd} style={btnPrimary}>📎 Ajouter des fichiers</button>
      </div>
      {attachments.length === 0 ? (
        <div onClick={onAdd} style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Glissez ou cliquez pour ajouter</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>PDF, Word, Excel, Images</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attachments.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #DDD5B8', borderRadius: 8, background: '#FFFDF8' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{EXT_ICONS[a.filetype] || '📎'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{a.filetype?.toUpperCase()} · {fmtSize(a.size)} · {a.created_at?.split(' ')[0]}</div>
              </div>
              <button onClick={() => onOpen(a)} style={{ ...btnSec, padding: '4px 10px', fontSize: 12 }}>Ouvrir</button>
              <button onClick={() => onDelete(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, padding: 4, lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════════

function NewClientModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', formula: 'audit_menu', stage: 'prospection', priority: 'medium', revenue: 0, nextAction: '', notes: '', tasks: {} });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.name.trim() && form.company.trim();

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0D1520' }}>Nouveau dossier client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { k: 'name', l: 'Nom *', t: 'text' },
            { k: 'company', l: 'Entreprise *', t: 'text' },
            { k: 'email', l: 'Email', t: 'email' },
            { k: 'phone', l: 'Téléphone', t: 'text' },
          ].map(f => (
            <div key={f.k}>
              <label style={lbl}>{f.l}</label>
              <input type={f.t} value={form[f.k]} onChange={e => set(f.k, e.target.value)} style={inp} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Formule *</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FORMULAS.map(f => (
              <button key={f.key} onClick={() => set('formula', f.key)} style={{
                padding: '5px 13px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                border: `1px solid ${form.formula === f.key ? f.color : '#DDD5B8'}`,
                background: form.formula === f.key ? f.bg : '#FFFDF8',
                color: form.formula === f.key ? f.color : '#6b7280',
              }}>{f.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Étape initiale</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STAGES.map(s => (
              <button key={s.key} onClick={() => set('stage', s.key)} style={{
                padding: '4px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                border: `1px solid ${form.stage === s.key ? s.color : '#DDD5B8'}`,
                background: form.stage === s.key ? s.bg : '#fff',
                color: form.stage === s.key ? s.color : '#6b7280',
              }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
            style={{ ...inp, resize: 'vertical', minHeight: 70 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnSec}>Annuler</button>
          <button onClick={() => onSave(form)} disabled={!valid} style={{ ...btnPrimary, opacity: valid ? 1 : 0.5 }}>Créer le dossier</button>
        </div>
      </div>
    </div>
  );
}

function RemindersModal({ reminders, onClose }) {
  const COLORS = {
    warning: { border: '#fca5a5', bg: '#fff1f2', icon: '#dc2626', title: '#dc2626' },
    info: { border: '#93c5fd', bg: '#eff6ff', icon: '#0369a1', title: '#0369a1' },
    gold: { border: '#C9A84C', bg: '#FAF3E0', icon: '#C9A84C', title: '#0D1520' },
  };
  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0D1520' }}>🔔 Rappels du jour</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {reminders.map((r, i) => {
            const c = COLORS[r.type] || COLORS.info;
            return (
              <div key={i} onClick={() => { r.action?.(); onClose(); }}
                style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px', cursor: r.action ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
                onMouseEnter={e => { if (r.action) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: c.title }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{r.detail}</div>
                  </div>
                  {r.action && <span style={{ fontSize: 12, color: '#94a3b8' }}>→</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ ...btnPrimary, width: '100%', textAlign: 'center' }}>
          Compris, commencer la journée
        </button>
      </div>
    </div>
  );
}

function SetupUserModal({ current, onSave, onClose, required }) {
  const [name, setName] = useState(current || '');
  const valid = name.trim().length > 0;

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>👤</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0D1520', margin: '0 0 8px' }}>
          {current ? 'Modifier le nom' : 'Bienvenue sur La Carte !'}
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
          {current
            ? 'Modifiez le nom affiché pour ce poste.'
            : 'Indiquez votre prénom pour identifier ce poste dans l\'historique des actions.'}
        </p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && valid && onSave(name.trim())}
          placeholder="Ex : Anthony, Chloé…"
          style={{ ...inp, fontSize: 16, textAlign: 'center', marginBottom: 20, fontWeight: 600 }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {!required && <button onClick={onClose} style={btnSec}>Annuler</button>}
          <button onClick={() => onSave(name.trim())} disabled={!valid}
            style={{ ...btnPrimary, opacity: valid ? 1 : 0.5, minWidth: 140 }}>
            {current ? 'Enregistrer' : 'Commencer →'}
          </button>
        </div>
        {required && (
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 14 }}>
            Ce nom est stocké uniquement sur ce poste et ne nécessite pas de mot de passe.
          </p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ANALYSE FINANCIÈRE — BENCHMARKS & CALCULS
// ══════════════════════════════════════════════════════════════════

const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const BENCHMARKS = {
  cmv_food: { ideal: 30, warning: 34, unit: '%', better: 'low', label: 'CMV Food', desc: 'Idéal < 30%' },
  cmv_boissons: { ideal: 22, warning: 27, unit: '%', better: 'low', label: 'CMV Boissons', desc: 'Idéal < 22%' },
  cmv_global: { ideal: 28, warning: 33, unit: '%', better: 'low', label: 'CMV Global', desc: 'Idéal < 28%' },
  masse_salariale: { ideal: 33, warning: 38, unit: '%', better: 'low', label: 'Masse salariale', desc: 'Idéal < 33%' },
  prime_cost: { ideal: 60, warning: 65, unit: '%', better: 'low', label: 'Prime Cost', desc: 'Idéal < 60%' },
  part_boissons: { ideal: 25, warning: 18, unit: '%', better: 'high', label: 'Part boissons', desc: 'Idéal > 25%' },
  coussin: { ideal: 20, warning: 10, unit: '%', better: 'high', label: 'Coussin sécurité', desc: 'Idéal > 20%' },
  ebe: { ideal: 10, warning: 5, unit: '%', better: 'high', label: 'EBE', desc: 'Idéal > 10%' },
  marge_brute: { ideal: 70, warning: 65, unit: '%', better: 'high', label: 'Marge brute', desc: 'Idéal > 70%' },
};

function bColor(key, value) {
  const b = BENCHMARKS[key];
  if (!b || value == null || isNaN(value)) return '#94a3b8';
  if (b.better === 'low') return value <= b.ideal ? '#059669' : value <= b.warning ? '#d97706' : '#dc2626';
  return value >= b.ideal ? '#059669' : value >= b.warning ? '#d97706' : '#dc2626';
}
function bBg(key, value) {
  const c = bColor(key, value);
  return c === '#059669' ? '#d1fae5' : c === '#d97706' ? '#fef3c7' : '#fee2e2';
}

function calcFin(d) {
  const caT = +d.ca_total || 0, caF = +d.ca_food || 0, caB = +d.ca_boissons || 0;
  const cov = +d.nb_couverts || 0, jrs = +d.nb_jours || 0;
  const acF = +d.achats_food || 0, acB = +d.achats_boissons || 0;
  const ms = +d.masse_salariale || 0, loy = +d.loyer || 0;
  const cfA = +d.charges_fixes_autres || 0, cvP = +d.charges_variables_pct || 0;
  const tbls = +d.nb_tables || 0, plcs = +d.nb_places || 0;

  const totAch = acF + acB;
  const cfTot = ms + loy + cfA;
  const cv = caT * cvP / 100;
  const chTot = totAch + cfTot + cv;

  const caMJour = jrs > 0 ? caT / jrs : 0;
  const caMSem = caMJour * 7;
  const tickM = cov > 0 ? caT / cov : 0;
  const tickF = cov > 0 && caF > 0 ? caF / cov : 0;
  const tickB = cov > 0 && caB > 0 ? caB / cov : 0;
  const covJr = jrs > 0 ? cov / jrs : 0;

  const cmvG = caT > 0 ? totAch / caT * 100 : 0;
  const cmvF = caF > 0 ? acF / caF * 100 : 0;
  const cmvBv = caB > 0 ? acB / caB * 100 : 0;
  const ptBv = caT > 0 ? caB / caT * 100 : 0;
  const ptF = caT > 0 ? caF / caT * 100 : 0;

  const msP = caT > 0 ? ms / caT * 100 : 0;
  const loyP = caT > 0 ? loy / caT * 100 : 0;
  const pcost = cmvG + msP;

  const mbr = caT - totAch;
  const mbrP = caT > 0 ? mbr / caT * 100 : 0;
  const ebe = caT - chTot;
  const ebeP = caT > 0 ? ebe / caT * 100 : 0;

  const tmCV = caT > 0 ? (caT - totAch - cv) / caT : 0;
  const pm = tmCV > 0 ? cfTot / tmCV : 0;
  const pmJr = jrs > 0 ? pm / jrs : 0;
  const nbJPM = caMJour > 0 ? Math.round(pm / caMJour) : 0;
  const cous = caT > 0 ? (caT - pm) / caT * 100 : 0;

  const gF = caF > 0 ? Math.max(0, acF - caF * 0.30) : 0;
  const gB = caB > 0 ? Math.max(0, acB - caB * 0.22) : 0;
  const gMS = caT > 0 ? Math.max(0, ms - caT * 0.33) : 0;
  const gTot = gF + gB + gMS;

  const revPAS = plcs > 0 && jrs > 0 ? caT / (plcs * jrs * 2) : 0; // 2 services/jour

  return {
    caMJour, caMSem, tickM, tickF, tickB, covJr,
    cmvG, cmvF, cmvBv, ptBv, ptF,
    msP, loyP, pcost,
    mbr, mbrP, ebe, ebeP,
    pm, pmJr, nbJPM, cous,
    gF, gB, gMS, gTot,
    totAch, cfTot, chTot, cv,
    revPAS,
  };
}

// ── Tab: Analyse Financière ───────────────────────────────────────
function FinancialTab({ client, api, analyses, onReload }) {
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDel, setShowDel] = useState(null);

  const sorted = [...analyses].sort((a, b) => b.annee !== a.annee ? b.annee - a.annee : b.mois - a.mois);

  useEffect(() => {
    if (sorted.length > 0 && !selected) setSelected(sorted[0]);
  }, [analyses]);

  async function handleSave(data) {
    await api.saveFinancialAnalysis({ ...data, client_id: client.id });
    setShowForm(false); setEditData(null);
    const updated = await api.getFinancialAnalyses(client.id);
    onReload();
    const saved = updated?.find(a => a.mois === data.mois && a.annee === data.annee);
    if (saved) setSelected(saved);
  }

  async function handleDelete(id) {
    await api.deleteFinancialAnalysis(id);
    setShowDel(null);
    if (selected?.id === id) setSelected(sorted.find(a => a.id !== id) || null);
    onReload();
  }

  const prevData = selected ? sorted.find((a, i) => i > sorted.findIndex(x => x.id === selected.id)) : null;

  if (showForm) return (
    <FinancialForm
      data={editData}
      onSave={handleSave}
      onCancel={() => { setShowForm(false); setEditData(null); }}
    />
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{analyses.length} période{analyses.length !== 1 ? 's' : ''} analysée{analyses.length !== 1 ? 's' : ''}</span>
        <button onClick={() => { setEditData(null); setShowForm(true); }} style={btnPrimary}>+ Nouvelle analyse</button>
      </div>

      {analyses.length === 0 ? (
        <div onClick={() => setShowForm(true)}
          style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: '48px 20px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Aucune analyse financière</div>
          <div style={{ fontSize: 13 }}>Importez un ticket Z ou saisissez les données manuellement</div>
        </div>
      ) : (
        <>
          {/* Graphe d'évolution — visible seulement si 2+ analyses */}
          {analyses.length >= 2 && (
            <EvolutionChart analyses={sorted} />
          )}
          <div style={{ display: 'flex', gap: 14 }}>
            {/* Sidebar périodes */}
            <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sorted.map(a => {
                const k = calcFin(a);
                const ec = bColor('ebe', k.ebeP);
                const isActive = selected?.id === a.id;
                return (
                  <div key={a.id} onClick={() => setSelected(a)}
                    style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${isActive ? '#C9A84C' : '#DDD5B8'}`, background: isActive ? '#FAF3E0' : '#FFFDF8', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#0D1520' }}>{a.periode}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtEur(a.ca_total)}</div>
                    <div style={{ fontSize: 10, color: ec, marginTop: 3, fontWeight: 700 }}>EBE {k.ebeP.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>

            {/* Résultats */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {selected ? (
                <FinancialResults
                  data={selected}
                  prev={prevData}
                  onEdit={() => { setEditData(selected); setShowForm(true); }}
                  onDelete={() => setShowDel(selected)}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 13 }}>← Sélectionnez une période</div>
              )}
            </div>
          </div>
        </>
      )}

      {showDel && (
        <ConfirmModal
          title="Supprimer cette analyse"
          message={`Supprimer l'analyse de ${showDel.periode} ?`}
          onConfirm={() => handleDelete(showDel.id)}
          onCancel={() => setShowDel(null)}
        />
      )}
    </div>
  );
}

// ── Graphe d'évolution client ─────────────────────────────────────
const EvolutionChart = memo(function EvolutionChart({ analyses }) {
  const [metric, setMetric] = useState('ca');

  const METRICS = [
    { key: 'ca', label: 'CA', color: '#C9A84C', fn: d => +d.ca_total || 0, fmt: v => fmtEur(v), unit: '€' },
    { key: 'cmv', label: 'CMV %', color: '#dc2626', fn: d => calcFin(d).cmvG, fmt: v => `${v.toFixed(1)}%`, unit: '%' },
    { key: 'ebe', label: 'EBE %', color: '#059669', fn: d => calcFin(d).ebeP, fmt: v => `${v.toFixed(1)}%`, unit: '%' },
    { key: 'pcost', label: 'Prime Cost', color: '#7c3aed', fn: d => calcFin(d).pcost, fmt: v => `${v.toFixed(1)}%`, unit: '%' },
    { key: 'ticket', label: 'Ticket moy', color: '#0369a1', fn: d => calcFin(d).tickM, fmt: v => fmtEur(v), unit: '€' },
  ];

  const m = METRICS.find(x => x.key === metric) || METRICS[0];
  // Trier chronologiquement (le plus ancien en premier)
  const sorted = [...analyses].sort((a, b) => a.annee !== b.annee ? a.annee - b.annee : a.mois - b.mois);
  const values = sorted.map(a => m.fn(a));
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const first = values[0];
  const last = values[values.length - 1];
  const evol = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const evolColor = evol >= 0 ? '#059669' : '#dc2626';
  // Pour CMV et Prime Cost, une baisse est positive
  const isInverse = ['cmv', 'pcost'].includes(metric);
  const evolPositif = isInverse ? evol <= 0 : evol >= 0;

  return (
    <div style={{ ...card, marginBottom: 16, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0D1520' }}>📈 Évolution sur {analyses.length} mois</h3>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {sorted[0]?.periode} → {sorted[sorted.length - 1]?.periode}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Badge évolution */}
          <div style={{ background: evolPositif ? '#d1fae5' : '#fee2e2', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Évolution</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: evolPositif ? '#059669' : '#dc2626' }}>
              {evol >= 0 ? '+' : ''}{evol.toFixed(1)}%
            </div>
          </div>
          {/* Sélecteur métrique */}
          <div style={{ display: 'flex', gap: 4 }}>
            {METRICS.map(x => (
              <button key={x.key} onClick={() => setMetric(x.key)} style={{
                padding: '3px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                border: `1px solid ${metric === x.key ? x.color : '#DDD5B8'}`,
                background: metric === x.key ? `${x.color}18` : '#FFFDF8',
                color: metric === x.key ? x.color : '#6b7280',
              }}>{x.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Graphe */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 8 }}>
        {sorted.map((a, i) => {
          const v = values[i];
          const h = Math.max(Math.round(((v - minVal) / range) * 80 + 8), 4);
          const isLast = i === sorted.length - 1;
          return (
            <div key={a.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
                {m.fmt(v)}
              </div>
              <div style={{ width: '100%', height: h, background: isLast ? m.color : `${m.color}55`, borderRadius: '3px 3px 0 0', transition: 'height 0.3s', position: 'relative' }}>
                {isLast && <div style={{ position: 'absolute', inset: 0, background: m.color, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />}
              </div>
              <div style={{ fontSize: 9, color: isLast ? m.color : '#94a3b8', fontWeight: isLast ? 700 : 400, whiteSpace: 'nowrap', textAlign: 'center' }}>
                {a.periode?.split(' ')[0]?.slice(0, 3)} {a.annee}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende valeurs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #EDE8D5', fontSize: 11 }}>
        <div><span style={{ color: '#94a3b8' }}>Début : </span><span style={{ fontWeight: 700, color: '#0D1520' }}>{m.fmt(first)}</span></div>
        <div><span style={{ color: '#94a3b8' }}>Actuel : </span><span style={{ fontWeight: 700, color: m.color }}>{m.fmt(last)}</span></div>
        <div><span style={{ color: '#94a3b8' }}>Meilleur : </span><span style={{ fontWeight: 700, color: '#059669' }}>{m.fmt(isInverse ? Math.min(...values) : Math.max(...values))}</span></div>
      </div>
    </div>
  );
});

// ── Résultats financiers ──────────────────────────────────────────
function FinancialResults({ data, prev, onEdit, onDelete }) {
  const k = calcFin(data);
  const kp = prev ? calcFin(prev) : null;
  const d = data;

  const diff = (val, pval) => {
    if (!pval || !kp) return null;
    const delta = val - pval;
    return { delta, pct: pval !== 0 ? delta / Math.abs(pval) * 100 : 0 };
  };

  const Kpi = ({ label, value, bmKey, fmt = v => fmtEur(v), prevVal, unit = '' }) => {
    const color = bmKey ? bColor(bmKey, value) : '#0D1520';
    const bg = bmKey ? bBg(bmKey, value) : '#FFFDF8';
    const bench = bmKey ? BENCHMARKS[bmKey] : null;
    const dlt = prevVal != null && kp ? diff(value, prevVal) : null;
    return (
      <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 9, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{fmt(value)}{unit}</div>
        {bench && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>{bench.desc}</div>}
        {dlt && (
          <div style={{ fontSize: 10, color: dlt.delta >= 0 ? '#059669' : '#dc2626', marginTop: 3, fontWeight: 600 }}>
            {dlt.delta >= 0 ? '▲' : '▼'} {Math.abs(dlt.pct).toFixed(1)}% vs {prev.periode}
          </div>
        )}
      </div>
    );
  };

  const Section = ({ title, icon, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {children}
      </div>
    </div>
  );

  const fmtPct = v => `${isNaN(v) ? '—' : v.toFixed(1)}%`;
  const fmtN = v => isNaN(v) || !v ? '—' : Math.round(v).toLocaleString('fr-FR');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{data.periode}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{d.nb_jours} jours · {fmtN(d.nb_couverts)} couverts</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={onEdit} style={btnSec}>Modifier</button>
          <button onClick={onDelete} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
        </div>
      </div>

      {/* Section 1 — CA & Fréquentation */}
      <Section title="CA & Fréquentation" icon="💰">
        <Kpi label="CA Total" value={d.ca_total} prevVal={prev?.ca_total} />
        <Kpi label="CA Moyen / Jour" value={k.caMJour} prevVal={kp?.caMJour} />
        <Kpi label="CA Moyen / Semaine" value={k.caMSem} prevVal={kp?.caMSem} />
        <Kpi label="Ticket Moyen" value={k.tickM} prevVal={kp?.tickM} />
        <Kpi label="Ticket Moyen Food" value={k.tickF} prevVal={kp?.tickF} />
        <Kpi label="Ticket Moyen Boissons" value={k.tickB} prevVal={kp?.tickB} />
        <Kpi label="Couverts / Jour" value={k.covJr} fmt={v => v.toFixed(0)} unit=" cvts" prevVal={kp?.covJr} />
        <Kpi label="CA Food" value={d.ca_food} prevVal={prev?.ca_food} />
        <Kpi label="CA Boissons" value={d.ca_boissons} prevVal={prev?.ca_boissons} />
      </Section>

      {/* Section 2 — Coût Matières */}
      <Section title="Coût des Matières (CMV)" icon="🛒">
        <Kpi label="CMV Global" value={k.cmvG} bmKey="cmv_global" fmt={fmtPct} unit="" prevVal={kp?.cmvG} />
        <Kpi label="CMV Food" value={k.cmvF} bmKey="cmv_food" fmt={fmtPct} unit="" prevVal={kp?.cmvF} />
        <Kpi label="CMV Boissons" value={k.cmvBv} bmKey="cmv_boissons" fmt={fmtPct} unit="" prevVal={kp?.cmvBv} />
        <Kpi label="Part Boissons / CA" value={k.ptBv} bmKey="part_boissons" fmt={fmtPct} unit="" prevVal={kp?.ptBv} />
        <Kpi label="Part Food / CA" value={k.ptF} fmt={fmtPct} unit="" prevVal={kp?.ptF} />
        <Kpi label="Total Achats" value={k.totAch} prevVal={kp?.totAch} />
      </Section>

      {/* Section 3 — Charges */}
      <Section title="Charges d'Exploitation" icon="💼">
        <Kpi label="Masse Salariale €" value={d.masse_salariale} prevVal={prev?.masse_salariale} />
        <Kpi label="Masse Salariale %" value={k.msP} bmKey="masse_salariale" fmt={fmtPct} unit="" prevVal={kp?.msP} />
        <Kpi label="Prime Cost (CMV+MS)" value={k.pcost} bmKey="prime_cost" fmt={fmtPct} unit="" prevVal={kp?.pcost} />
        <Kpi label="Loyer €" value={d.loyer} prevVal={prev?.loyer} />
        <Kpi label="Loyer % CA" value={k.loyP} fmt={fmtPct} unit="" prevVal={kp?.loyP} />
        <Kpi label="Total Charges" value={k.chTot} prevVal={kp?.chTot} />
      </Section>

      {/* Section 4 — Rentabilité */}
      <Section title="Rentabilité" icon="📈">
        <Kpi label="Marge Brute €" value={k.mbr} prevVal={kp?.mbr} />
        <Kpi label="Marge Brute %" value={k.mbrP} bmKey="marge_brute" fmt={fmtPct} unit="" prevVal={kp?.mbrP} />
        <Kpi label="EBE Estimé €" value={k.ebe} prevVal={kp?.ebe} />
        <Kpi label="EBE %" value={k.ebeP} bmKey="ebe" fmt={fmtPct} unit="" prevVal={kp?.ebeP} />
        <Kpi label="Point Mort Mensuel" value={k.pm} prevVal={kp?.pm} />
        <Kpi label="Point Mort / Jour" value={k.pmJr} prevVal={kp?.pmJr} />
        <Kpi label="Jours pour atteindre PM" value={k.nbJPM} fmt={v => `${v} j`} unit="" prevVal={kp?.nbJPM} />
        <Kpi label="Coussin de Sécurité" value={k.cous} bmKey="coussin" fmt={fmtPct} unit="" prevVal={kp?.cous} />
        {d.nb_places > 0 && <Kpi label="RevPASH" value={k.revPAS} prevVal={kp?.revPAS} />}
      </Section>

      {/* Section 5 — Potentiel d'optimisation */}
      {k.gTot > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            ✨ Potentiel d'optimisation (vs benchmarks)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {k.gF > 0 && (
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #fcd34d' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: 4 }}>Gain CMV Food</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{fmtEur(k.gF)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Si CMV food → 30%</div>
              </div>
            )}
            {k.gB > 0 && (
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #fcd34d' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: 4 }}>Gain CMV Boissons</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{fmtEur(k.gB)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Si CMV boissons → 22%</div>
              </div>
            )}
            {k.gMS > 0 && (
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #fcd34d' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: 4 }}>Gain Masse Salariale</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{fmtEur(k.gMS)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Si MS → 33% du CA</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0D1520' }}>Gain total potentiel</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{fmtEur(k.gTot)} / mois</span>
          </div>
        </div>
      )}

      {/* Légende benchmarks */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {[['#059669', '✓ Dans les normes'], ['#d97706', '⚠ À surveiller'], ['#dc2626', '✕ Hors normes']].map(([c, l]) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Formulaire saisie / import ────────────────────────────────────
const EMPTY_FIN = {
  periode: '', annee: new Date().getFullYear(), mois: new Date().getMonth() + 1,
  ca_total: '', ca_food: '', ca_boissons: '', nb_couverts: '', nb_jours: '',
  achats_food: '', achats_boissons: '',
  masse_salariale: '', loyer: '', charges_fixes_autres: '', charges_variables_pct: '',
  nb_tables: '', nb_places: '',
  notes: '',
};

// NumInput défini HORS du composant — évite le démontage à chaque frappe (perte de focus)
function NumInput({ formVal, onSet, k, l, placeholder = '0', extraStyle = {} }) {
  return (
    <div>
      <label style={lbl}>{l}</label>
      <input
        type="number"
        value={formVal}
        onChange={e => onSet(k, e.target.value)}
        placeholder={placeholder}
        style={{ ...inp, ...extraStyle }}
        min="0"
      />
    </div>
  );
}

function FinancialForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState(data || { ...EMPTY_FIN });
  const [preview, setPreview] = useState(false);
  const [importing, setImporting] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (form.mois && form.annee) {
      set('periode', `${MOIS_LABELS[form.mois - 1]} ${form.annee}`);
    }
  }, [form.mois, form.annee]);

  // Auto-calcul CA total si food + boissons renseignés
  useEffect(() => {
    const f = +form.ca_food || 0, b = +form.ca_boissons || 0;
    if (f > 0 && b > 0 && !form._ca_manual) set('ca_total', f + b);
  }, [form.ca_food, form.ca_boissons]);

  function handleCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target.result;
        const rows = text.split('\n').map(r => r.split(/[,;|\t]/));
        const parsed = {};

        // Mapping intelligent des colonnes ticket Z
        const patterns = [
          { keys: ['ca total', 'chiffre', 'total ht', 'ca ht', 'montant ht'], field: 'ca_total' },
          { keys: ['food', 'nourriture', 'cuisine', 'repas', 'plat'], field: 'ca_food' },
          { keys: ['boisson', 'drink', 'bar', 'vin', 'bev'], field: 'ca_boissons' },
          { keys: ['couvert', 'cover', 'client', 'personne'], field: 'nb_couverts' },
          { keys: ['jour', 'day', 'ouvert'], field: 'nb_jours' },
          { keys: ['achat food', 'achats food', 'cout food', 'matiere food'], field: 'achats_food' },
          { keys: ['achat bois', 'achats bois', 'cout bois', 'matiere bois'], field: 'achats_boissons' },
          { keys: ['salaire', 'masse sal', 'personnel', 'staff'], field: 'masse_salariale' },
          { keys: ['loyer', 'rent', 'locaux'], field: 'loyer' },
        ];

        rows.forEach(row => {
          const labelCell = (row[0] || '').toLowerCase().trim();
          const valueCell = (row[1] || row[row.length - 1] || '').replace(/[€\s]/g, '').replace(',', '.');
          const numVal = parseFloat(valueCell);
          if (isNaN(numVal)) return;
          patterns.forEach(p => {
            if (p.keys.some(k => labelCell.includes(k)) && !parsed[p.field]) {
              parsed[p.field] = numVal;
            }
          });
        });

        if (Object.keys(parsed).length > 0) {
          setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, v.toString()])) }));
          alert(`✓ ${Object.keys(parsed).length} champ(s) détecté(s). Vérifiez et complétez si nécessaire.`);
        } else {
          alert('Aucun champ reconnu. Vérifiez le format du CSV (colonnes: libellé, valeur).');
        }
      } catch (_) {
        alert('Erreur lors de la lecture du fichier.');
      }
      setImporting(false);
    };
    reader.readAsText(file, 'utf-8');
  }

  const valid = form.ca_total && form.nb_jours && form.mois && form.annee;
  const kpis = valid ? calcFin(form) : null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>
          {data?.id ? 'Modifier l\'analyse' : 'Nouvelle analyse financière'}
        </h3>
        <label style={{ ...btnSec, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          📥 {importing ? 'Import…' : 'Import CSV'}
          <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleCSV} style={{ display: 'none' }} />
        </label>
        <button onClick={() => setPreview(!preview)} style={btnSec}>
          {preview ? '📝 Saisie' : '👁 Aperçu'}
        </button>
        <button onClick={() => onSave({ ...form, mois: +form.mois, annee: +form.annee })}
          disabled={!valid} style={{ ...btnPrimary, opacity: valid ? 1 : 0.5 }}>
          Enregistrer
        </button>
      </div>

      {preview && kpis ? (
        <FinancialResults data={{ ...form, mois: +form.mois, annee: +form.annee }} prev={null} onEdit={() => setPreview(false)} onDelete={() => { }} />
      ) : (
        <>
          {/* Période */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>📅 Période</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Mois</label>
                <select value={form.mois} onChange={e => set('mois', +e.target.value)} style={{ ...inp }}>
                  {MOIS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Année</label>
                <input type="number" value={form.annee} onChange={e => set('annee', e.target.value)} style={inp} min="2020" max="2030" />
              </div>
              <NumInput formVal={form["nb_jours"]} onSet={set} k="nb_jours" l="Jours d'ouverture" placeholder="26" />
              <NumInput formVal={form["nb_couverts"]} onSet={set} k="nb_couverts" l="Nombre de couverts total" placeholder="1200" />
            </div>
          </div>

          {/* CA */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>💰 Chiffre d'affaires HT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <NumInput formVal={form["ca_food"]} onSet={set} k="ca_food" l="CA Food / Cuisine (€)" />
              <NumInput formVal={form["ca_boissons"]} onSet={set} k="ca_boissons" l="CA Boissons (€)" />
              <div>
                <label style={lbl}>CA Total HT (€)</label>
                <input type="number" value={form.ca_total}
                  onChange={e => { set('ca_total', e.target.value); set('_ca_manual', true); }}
                  style={{ ...inp, fontWeight: 700, borderColor: '#C9A84C' }} min="0" placeholder="Auto si food+bois renseignés" />
              </div>
            </div>
          </div>

          {/* Coût matières */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>🛒 Achats / Coût des matières HT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumInput formVal={form["achats_food"]} onSet={set} k="achats_food" l="Achats Food (€)" />
              <NumInput formVal={form["achats_boissons"]} onSet={set} k="achats_boissons" l="Achats Boissons (€)" />
            </div>
          </div>

          {/* Charges */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>💼 Charges d'exploitation</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumInput formVal={form["masse_salariale"]} onSet={set} k="masse_salariale" l="Masse salariale brute (€)" />
              <NumInput formVal={form["loyer"]} onSet={set} k="loyer" l="Loyer / charges locatives (€)" />
              <NumInput formVal={form["charges_fixes_autres"]} onSet={set} k="charges_fixes_autres" l="Autres charges fixes (€)" />
              <div>
                <label style={lbl}>Charges variables (% du CA)</label>
                <input type="number" value={form.charges_variables_pct} onChange={e => set('charges_variables_pct', e.target.value)}
                  style={inp} min="0" max="100" step="0.5" placeholder="Ex: 3.5" />
              </div>
            </div>
          </div>

          {/* Optionnel */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>📐 Données complémentaires (optionnel)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumInput formVal={form["nb_tables"]} onSet={set} k="nb_tables" l="Nombre de tables" />
              <NumInput formVal={form["nb_places"]} onSet={set} k="nb_places" l="Nombre de places" />
            </div>
          </div>

          {/* Notes */}
          <div style={card}>
            <label style={lbl}>Notes / Observations</label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ ...inp, resize: 'vertical', minHeight: 70 }}
              placeholder="Contexte, événements particuliers ce mois-ci, piste d'actions…" />
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUIVI MENSUEL
// ══════════════════════════════════════════════════════════════════

const SUIVI_STATUTS = [
  { key: 'attente', label: 'En attente données', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'encours', label: 'En cours', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'termine', label: 'Terminé', color: '#059669', bg: '#d1fae5' },
  { key: 'envoye', label: 'Rapport envoyé', color: '#7c3aed', bg: '#ede9fe' },
];
const suiviStatutOf = key => SUIVI_STATUTS.find(s => s.key === key) || SUIVI_STATUTS[0];

function SuiviTab({ client, api, suivis, analyses, menuAnalyses, onReload }) {
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDel, setShowDel] = useState(null);
  const [exporting, setExporting] = useState(false);

  const sorted = [...suivis].sort((a, b) =>
    b.annee !== a.annee ? b.annee - a.annee : b.mois - a.mois
  );

  useEffect(() => {
    if (sorted.length > 0 && !selected) setSelected(sorted[0]);
  }, [suivis]);

  async function handleSave(data) {
    await api.saveSuivi({ ...data, client_id: client.id });
    setShowForm(false);
    await onReload();
    const updated = (await api.getSuivis(client.id)) || [];
    const found = updated.find(s => s.mois === data.mois && s.annee === data.annee) || updated[0];
    if (found) setSelected(found);
  }

  async function handleDelete(id) {
    await api.deleteSuivi(id);
    setShowDel(null);
    setSelected(null);
    onReload();
  }

  async function handleStatusChange(suivi, newStatus) {
    await api.saveSuivi({ ...suivi, client_id: client.id, statut: newStatus });
    await onReload();
    const updated = (await api.getSuivis(client.id)) || [];
    const found = updated.find(s => s.id === suivi.id);
    if (found) setSelected(found);
  }

  async function handleExportPDF(suivi) {
    setExporting(true);
    const finData = analyses.find(a => a.mois === suivi.mois && a.annee === suivi.annee);
    const finPrev = analyses.find(a => {
      const prevMois = suivi.mois === 1 ? 12 : suivi.mois - 1;
      const prevAnn = suivi.mois === 1 ? suivi.annee - 1 : suivi.annee;
      return a.mois === prevMois && a.annee === prevAnn;
    });
    const menuData = menuAnalyses.find(a => {
      const d = new Date(a.created_at);
      return d.getMonth() + 1 === suivi.mois && d.getFullYear() === suivi.annee;
    });
    const kFin = finData ? calcFin(finData) : null;
    const kPrev = finPrev ? calcFin(finPrev) : null;
    const statut = suiviStatutOf(suivi.statut);

    const fmtPct = v => `${v.toFixed(1)}%`;
    const delta = (cur, prev) => {
      if (!prev || prev === 0) return '';
      const d = cur - prev;
      const sign = d >= 0 ? '+' : '';
      return `<span style="font-size:10px;color:${d >= 0 ? '#059669' : '#dc2626'};margin-left:4px;">${sign}${d.toFixed(1)}</span>`;
    };
    const deltaEur = (cur, prev) => {
      if (!prev) return '';
      const d = cur - prev;
      const sign = d >= 0 ? '+' : '';
      return `<span style="font-size:10px;color:${d >= 0 ? '#059669' : '#dc2626'};margin-left:4px;">${sign}${Math.round(d).toLocaleString('fr-FR')} €</span>`;
    };

    const kpiRow = (label, val, prev, isBad) => `
      <tr>
        <td style="padding:7px 10px;font-size:11px;color:#64748b;">${label}</td>
        <td style="padding:7px 10px;font-size:13px;font-weight:700;color:${isBad ? '#dc2626' : '#0D1520'};">${val}${prev ? (typeof prev === 'string' ? delta(parseFloat(val), parseFloat(prev)) : deltaEur(parseFloat(val), parseFloat(prev))) : ''}</td>
      </tr>`;

    const actionsHTML = suivi.actions
      ? suivi.actions.split('\n').filter(Boolean).map((a, i) =>
        `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:#FAF8F2;border:1px solid #DDD5B8;border-radius:6px;margin-bottom:6px;">
            <span style="background:#C9A84C;color:#0D1520;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0;margin-top:1px;">${i + 1}</span>
            <span style="font-size:12px;color:#374151;line-height:1.5;">${a}</span>
          </div>`
      ).join('')
      : '<p style="color:#94a3b8;font-size:12px;font-style:italic;">Aucune action renseignée</p>';

    const recoHTML = suivi.recommandations_mois
      ? suivi.recommandations_mois.split('\n').filter(Boolean).map((r, i) =>
        `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#FAF3E0;border:1px solid rgba(201,168,76,0.3);border-radius:6px;margin-bottom:8px;">
            <span style="background:#0D1520;color:#C9A84C;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;margin-top:1px;">${i + 1}</span>
            <span style="font-size:12px;color:#374151;line-height:1.55;">${r}</span>
          </div>`
      ).join('')
      : '<p style="color:#94a3b8;font-size:12px;font-style:italic;">Aucune recommandation renseignée</p>';

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'DM Sans',Arial,sans-serif; color:#1e293b; background:#fff; font-size:12px; line-height:1.5; }
  .page { width:210mm; min-height:297mm; padding:14mm 16mm 12mm; page-break-after:always; position:relative; }
  .page:last-child { page-break-after:avoid; }

  /* Header */
  .lc-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:0; padding-bottom:14px; }
  .lc-logo-la { font-family:'DM Serif Display',serif; font-size:9px; color:#C9A84C; letter-spacing:4px; display:block; }
  .lc-logo-carte { font-family:'DM Serif Display',serif; font-size:20px; color:#0D1520; letter-spacing:4px; line-height:1; }
  .lc-logo-sub { font-size:8px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .gold-bar { height:2px; background:linear-gradient(90deg,#C9A84C 0%,rgba(201,168,76,0.1) 100%); margin-bottom:18px; }
  .page-label { font-size:10px; color:#94a3b8; text-align:right; }
  .page-label strong { color:#C9A84C; font-size:11px; display:block; }

  /* Cover */
  .cover-tag { background:#0D1520; color:#C9A84C; font-size:8px; font-weight:700; letter-spacing:3px; text-transform:uppercase; padding:5px 12px; display:inline-block; margin-bottom:24px; }
  .cover-title { font-family:'DM Serif Display',serif; font-size:28px; color:#0D1520; line-height:1.15; margin-bottom:6px; font-weight:400; }
  .cover-sub { font-size:14px; color:#64748b; margin-bottom:28px; }
  .cover-gold { width:40px; height:2px; background:#C9A84C; margin-bottom:28px; }
  .cover-client { background:#0D1520; border-radius:10px; padding:20px 22px; margin-bottom:20px; }
  .cover-client-label { font-size:9px; font-weight:700; color:#C9A84C; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px; }
  .cover-client-name { font-family:'DM Serif Display',serif; font-size:22px; color:#EEE6C9; font-weight:400; }
  .cover-client-co { font-size:12px; color:rgba(238,230,201,0.5); margin-top:4px; }
  .cover-meta { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:24px; }
  .cover-meta-item { background:#FAF8F2; border:1px solid #DDD5B8; border-radius:8px; padding:10px 12px; }
  .cover-meta-label { font-size:8px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:3px; }
  .cover-meta-val { font-size:13px; font-weight:700; color:#0D1520; }
  .cover-conseiller { display:flex; align-items:center; gap:12px; border:1px solid #C9A84C; border-radius:8px; padding:12px 14px; background:#FAF3E0; }
  .cover-avatar { width:32px; height:32px; background:#C9A84C; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#0D1520; font-weight:800; font-size:13px; flex-shrink:0; }
  .cover-con-name { font-weight:700; font-size:12px; color:#0D1520; }
  .cover-con-sub { font-size:10px; color:#64748b; margin-top:1px; }

  /* Message client */
  .msg-box { background:#FAF3E0; border-left:3px solid #C9A84C; border-radius:0 8px 8px 0; padding:14px 16px; margin-bottom:18px; font-size:13px; color:#374151; line-height:1.7; font-style:italic; }

  /* Sections */
  .section-hd { font-family:'DM Serif Display',serif; font-size:15px; color:#0D1520; font-weight:400; margin:20px 0 12px; padding-bottom:7px; border-bottom:1.5px solid #DDD5B8; display:flex; align-items:center; gap:8px; }
  .section-hd span { font-size:16px; }

  /* KPI table */
  .kpi-table { width:100%; border-collapse:collapse; margin-bottom:14px; }
  .kpi-table thead tr { background:#0D1520; }
  .kpi-table thead th { padding:7px 10px; text-align:left; font-size:9px; font-weight:700; color:#C9A84C; text-transform:uppercase; letter-spacing:0.8px; }
  .kpi-table thead th:last-child { text-align:right; color:#EEE6C9; }
  .kpi-table tbody tr:nth-child(even) { background:#FAF8F2; }
  .kpi-table tbody tr { border-bottom:1px solid #EEE6C9; }

  /* Qualitative */
  .qual-box { background:#fff; border:1px solid #DDD5B8; border-radius:8px; padding:12px 14px; margin-bottom:14px; }
  .qual-label { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
  .qual-text { font-size:12px; color:#374151; line-height:1.7; white-space:pre-wrap; }

  /* Footer */
  .page-footer { position:absolute; bottom:8mm; left:16mm; right:16mm; display:flex; justify-content:space-between; font-size:8px; color:#94a3b8; border-top:1px solid #EEE6C9; padding-top:5px; }

  @media print { body { background:none; } .page { box-shadow:none; } }
</style>
</head><body>

<!-- ══ PAGE 1 — COUVERTURE ══════════════════════════════════════ -->
<div class="page">
  <div class="lc-header">
    <div>
      <span class="lc-logo-la">LA</span>
      <span class="lc-logo-carte">CARTE</span>
      <span class="lc-logo-sub">Restaurant Advisory</span>
    </div>
    <div class="page-label">
      <strong>RAPPORT MENSUEL</strong>
      ${MOIS_LABELS[suivi.mois - 1]} ${suivi.annee}
    </div>
  </div>
  <div class="gold-bar"></div>

  <div class="cover-tag">Rapport de suivi mensuel</div>
  <div class="cover-title">Synthèse &amp; Recommandations<br>${MOIS_LABELS[suivi.mois - 1]} ${suivi.annee}</div>
  <div class="cover-sub">Accompagnement La Carte</div>
  <div class="cover-gold"></div>

  <div class="cover-client">
    <div class="cover-client-label">Établissement suivi</div>
    <div class="cover-client-name">${client.name}</div>
    <div class="cover-client-co">${client.company}</div>
  </div>

  <div class="cover-meta">
    <div class="cover-meta-item">
      <div class="cover-meta-label">Période</div>
      <div class="cover-meta-val">${MOIS_LABELS[suivi.mois - 1]} ${suivi.annee}</div>
    </div>
    <div class="cover-meta-item">
      <div class="cover-meta-label">Statut</div>
      <div class="cover-meta-val" style="color:${statut.color}">${statut.label}</div>
    </div>
    <div class="cover-meta-item">
      <div class="cover-meta-label">Formule</div>
      <div class="cover-meta-val">${(() => { const f = { audit_menu: 'Audit Menu', audit_menu_financier: 'Audit Complet', suivi_mensuel: 'Retainer' }; return f[client.formula] || '—'; })()}</div>
    </div>
  </div>

  ${suivi.message_client ? `<div class="msg-box">${suivi.message_client}</div>` : ''}

  <div class="cover-conseiller">
    <div class="cover-avatar">A</div>
    <div>
      <div class="cover-con-name">Anthony Grimault — Votre Conseiller</div>
      <div class="cover-con-sub">lacarte.advisory@gmail.com</div>
    </div>
  </div>

  <div class="page-footer">
    <span>La Carte — Document confidentiel</span>
    <span>Rapport ${MOIS_LABELS[suivi.mois - 1]} ${suivi.annee} — ${client.company}</span>
  </div>
</div>

<!-- ══ PAGE 2 — DONNÉES FINANCIÈRES ═══════════════════════════════ -->
<div class="page">
  <div class="lc-header">
    <div><span class="lc-logo-la">LA</span><span class="lc-logo-carte">CARTE</span></div>
    <div class="page-label"><strong>ANALYSE FINANCIÈRE</strong>${MOIS_LABELS[suivi.mois - 1]} ${suivi.annee}</div>
  </div>
  <div class="gold-bar"></div>

  <div class="section-hd"><span>💰</span> Indicateurs financiers du mois</div>

  ${kFin ? `
  <table class="kpi-table">
    <thead><tr>
      <th>Indicateur</th>
      <th style="text-align:right;">Valeur ${MOIS_LABELS[suivi.mois - 1]}</th>
    </tr></thead>
    <tbody>
      ${kpiRow('CA Total', fmtEur(finData.ca_total), kPrev ? fmtEur(finPrev.ca_total) : null, false)}
      ${kpiRow('Ticket Moyen', fmtEur(kFin.tickM), kPrev ? fmtEur(kPrev.tickM) : null, false)}
      ${kpiRow('Couverts / Jour', kFin.covJr.toFixed(0), kPrev ? kPrev.covJr.toFixed(0) : null, false)}
      ${kpiRow('CMV Global', fmtPct(kFin.cmvG), kPrev ? fmtPct(kPrev.cmvG) : null, kFin.cmvG > 33)}
      ${kpiRow('Masse Salariale %', fmtPct(kFin.msP), kPrev ? fmtPct(kPrev.msP) : null, kFin.msP > 38)}
      ${kpiRow('Prime Cost', fmtPct(kFin.pcost), kPrev ? fmtPct(kPrev.pcost) : null, kFin.pcost > 65)}
      ${kpiRow('Marge Brute', `${fmtEur(kFin.mbr)} (${fmtPct(kFin.mbrP)})`, null, kFin.mbrP < 55)}
      ${kpiRow('EBE', `${fmtEur(kFin.ebe)} (${fmtPct(kFin.ebeP)})`, null, kFin.ebeP < 5)}
      ${kpiRow('Point Mort', fmtEur(kFin.pm), null, false)}
      ${kpiRow('Coussin de Sécurité', fmtPct(kFin.cous), kPrev ? fmtPct(kPrev.cous) : null, kFin.cous < 10)}
    </tbody>
  </table>
  ${kPrev ? `<p style="font-size:10px;color:#94a3b8;margin-top:-8px;margin-bottom:14px;">Les flèches indiquent l'évolution par rapport à ${MOIS_LABELS[(suivi.mois === 1 ? 12 : suivi.mois) - 2]} ${suivi.mois === 1 ? suivi.annee - 1 : suivi.annee}</p>` : ''}
  ` : '<div style="padding:20px;background:#FAF8F2;border-radius:8px;color:#94a3b8;font-size:12px;text-align:center;">Aucune analyse financière liée à ce mois</div>'}

  ${menuData ? `
  <div class="section-hd" style="margin-top:20px;"><span>🍽️</span> Analyse Carte — ${menuData.nom}</div>
  <p style="font-size:12px;color:#64748b;">Analyse réalisée le ${new Date(menuData.created_at).toLocaleDateString('fr-FR')}</p>
  ` : ''}

  <div class="page-footer">
    <span>La Carte — Document confidentiel</span>
    <span>Page 2 — ${client.company}</span>
  </div>
</div>

<!-- ══ PAGE 3 — ANALYSE QUALITATIVE ══════════════════════════════ -->
<div class="page">
  <div class="lc-header">
    <div><span class="lc-logo-la">LA</span><span class="lc-logo-carte">CARTE</span></div>
    <div class="page-label"><strong>ANALYSE &amp; RECOMMANDATIONS</strong>${MOIS_LABELS[suivi.mois - 1]} ${suivi.annee}</div>
  </div>
  <div class="gold-bar"></div>

  ${suivi.observations_terrain ? `
  <div class="section-hd"><span>👁️</span> Observations terrain</div>
  <div class="qual-box"><div class="qual-text">${suivi.observations_terrain}</div></div>
  ` : ''}

  ${suivi.analyse_carte ? `
  <div class="section-hd"><span>🍽️</span> Analyse de la carte</div>
  <div class="qual-box"><div class="qual-text">${suivi.analyse_carte}</div></div>
  ` : ''}

  <div class="section-hd"><span>✅</span> Actions décidées ce mois</div>
  ${actionsHTML}

  <div class="page-footer">
    <span>La Carte — Document confidentiel</span>
    <span>Page 3 — ${client.company}</span>
  </div>
</div>

<!-- ══ PAGE 4 — RECOMMANDATIONS M+1 ══════════════════════════════ -->
<div class="page">
  <div class="lc-header">
    <div><span class="lc-logo-la">LA</span><span class="lc-logo-carte">CARTE</span></div>
    <div class="page-label"><strong>PLAN D'ACTION</strong>${MOIS_LABELS[suivi.mois === 12 ? 0 : suivi.mois]} ${suivi.mois === 12 ? suivi.annee + 1 : suivi.annee}</div>
  </div>
  <div class="gold-bar"></div>

  <div class="section-hd"><span>🎯</span> Recommandations pour ${MOIS_LABELS[suivi.mois === 12 ? 0 : suivi.mois]} ${suivi.mois === 12 ? suivi.annee + 1 : suivi.annee}</div>
  ${recoHTML}

  ${suivi.notes ? `
  <div class="section-hd" style="margin-top:20px;"><span>📝</span> Notes internes</div>
  <div class="qual-box" style="background:#f8fafc;"><div class="qual-text" style="color:#94a3b8;font-style:italic;">${suivi.notes}</div></div>
  ` : ''}

  <div style="margin-top:auto;padding-top:20px;border-top:1.5px solid #DDD5B8;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;">
      <div>
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">Document établi par</div>
        <div style="font-size:12px;font-weight:700;color:#0D1520;">Anthony Grimault</div>
        <div style="font-size:10px;color:#64748b;">La Carte · lacarte.advisory@gmail.com</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">Rapport généré le</div>
        <div style="font-size:12px;color:#0D1520;">${new Date().toLocaleDateString('fr-FR')}</div>
        <div style="font-size:10px;color:#64748b;">Document confidentiel</div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>La Carte — Document confidentiel</span>
    <span>Page 4 — ${client.company}</span>
  </div>
</div>

</body></html>`;

    await api.exportPDF({ html, filename: `Rapport_${client.company.replace(/\s+/g, '_')}_${MOIS_LABELS[suivi.mois - 1]}_${suivi.annee}.pdf` });
    setExporting(false);
  }

  if (showForm) return (
    <SuiviForm
      data={showForm === 'new' ? null : selected}
      onSave={handleSave}
      onCancel={() => setShowForm(false)}
    />
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{suivis.length} mois suivi{suivis.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowForm('new')} style={btnPrimary}>+ Nouveau mois</button>
      </div>

      {suivis.length === 0 ? (
        <div onClick={() => setShowForm('new')}
          style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: '48px 20px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Aucun suivi mensuel</div>
          <div style={{ fontSize: 13 }}>Créez le suivi du premier mois pour démarrer</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14 }}>
          {/* Sidebar mois */}
          <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sorted.map(s => {
              const st = suiviStatutOf(s.statut);
              const isActive = selected?.id === s.id;
              return (
                <div key={s.id} onClick={() => setSelected(s)}
                  style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${isActive ? '#C9A84C' : '#DDD5B8'}`, background: isActive ? '#FAF3E0' : '#FFFDF8', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#0D1520' }}>{MOIS_LABELS[s.mois - 1]} {s.annee}</div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 6, padding: '1px 6px' }}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Détail */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selected ? (
              <SuiviDetail
                suivi={selected}
                client={client}
                analyses={analyses}
                menuAnalyses={menuAnalyses}
                onEdit={() => setShowForm('edit')}
                onDelete={() => setShowDel(selected)}
                onStatusChange={st => handleStatusChange(selected, st)}
                onExport={() => handleExportPDF(selected)}
                exporting={exporting}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 13 }}>← Sélectionnez un mois</div>
            )}
          </div>
        </div>
      )}

      {showDel && (
        <ConfirmModal
          title="Supprimer ce suivi"
          message={`Supprimer le suivi de ${MOIS_LABELS[showDel.mois - 1]} ${showDel.annee} ?`}
          onConfirm={() => handleDelete(showDel.id)}
          onCancel={() => setShowDel(null)}
        />
      )}
    </div>
  );
}

// ── Détail d'un suivi mensuel ─────────────────────────────────────
function SuiviDetail({ suivi, client, analyses, menuAnalyses, onEdit, onDelete, onStatusChange, onExport, exporting }) {
  const finData = analyses.find(a => a.mois === suivi.mois && a.annee === suivi.annee);
  const menuData = menuAnalyses.find(a => {
    const d = new Date(a.created_at);
    return d.getMonth() + 1 === suivi.mois && d.getFullYear() === suivi.annee;
  });
  const kFin = finData ? calcFin(finData) : null;
  const statut = suiviStatutOf(suivi.statut);

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0D1520' }}>{MOIS_LABELS[suivi.mois - 1]} {suivi.annee}</div>
          <div style={{ marginTop: 5 }}>
            <span style={{ background: statut.bg, color: statut.color, borderRadius: 8, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{statut.label}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={onExport} disabled={exporting} style={{ ...btnSec, color: '#7c3aed' }}>
            {exporting ? '…' : '📄 Rapport PDF'}
          </button>
          <button onClick={onEdit} style={btnSec}>Modifier</button>
          <button onClick={onDelete} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
        </div>
      </div>

      {/* Changement de statut */}
      <div style={{ ...card, marginBottom: 14, padding: '12px 16px' }}>
        <label style={lbl}>Statut du suivi</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {SUIVI_STATUTS.map(s => (
            <button key={s.key} onClick={() => onStatusChange(s.key)} style={{
              padding: '5px 13px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${suivi.statut === s.key ? s.color : '#DDD5B8'}`,
              background: suivi.statut === s.key ? s.bg : '#FFFDF8',
              color: suivi.statut === s.key ? s.color : '#6b7280',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Lien Analyse Financière */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: finData ? 12 : 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0D1520' }}>📊 Analyse Financière</span>
          {!finData && <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Aucune analyse pour ce mois — créez-en une dans l'onglet "Analyse financière"</span>}
        </div>
        {finData && kFin && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { l: 'CA Total', v: fmtEur(finData.ca_total), c: '#0D1520' },
              { l: 'Ticket Moyen', v: fmtEur(kFin.tickM), c: '#0D1520' },
              { l: 'CMV Global', v: `${kFin.cmvG.toFixed(1)}%`, c: kFin.cmvG > 33 ? '#dc2626' : kFin.cmvG > 28 ? '#d97706' : '#059669' },
              { l: 'EBE', v: `${fmtEur(kFin.ebe)} (${kFin.ebeP.toFixed(1)}%)`, c: kFin.ebeP < 5 ? '#dc2626' : '#059669' },
              { l: 'Prime Cost', v: `${kFin.pcost.toFixed(1)}%`, c: kFin.pcost > 65 ? '#dc2626' : '#059669' },
              { l: 'Point Mort', v: fmtEur(kFin.pm), c: '#0D1520' },
              { l: 'Coussin', v: `${kFin.cous.toFixed(1)}%`, c: kFin.cous < 10 ? '#dc2626' : '#059669' },
              { l: 'Couverts/j', v: kFin.covJr.toFixed(0), c: '#0D1520' },
            ].map(k => (
              <div key={k.l} style={{ background: '#FAF8F2', border: '1px solid #DDD5B8', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 }}>{k.l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lien Analyse Menu */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0D1520' }}>🍽️ Analyse Menu</span>
          {menuData
            ? <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ {menuData.nom} · {new Date(menuData.created_at).toLocaleDateString('fr-FR')}</span>
            : <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Aucune analyse menu pour ce mois</span>
          }
        </div>
      </div>

      {/* Notes */}
      {suivi.notes && (
        <div style={{ ...card, marginBottom: 12 }}>
          <label style={lbl}>Notes & Observations</label>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginTop: 4 }}>{suivi.notes}</div>
        </div>
      )}

      {/* Actions */}
      {suivi.actions && (
        <div style={card}>
          <label style={lbl}>Actions décidées ce mois</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
            {suivi.actions.split('\n').filter(Boolean).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', background: '#FAF8F2', borderRadius: 7, border: '1px solid #DDD5B8' }}>
                <span style={{ color: '#C9A84C', fontWeight: 700, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 13, color: '#374151' }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulaire Suivi Mensuel ──────────────────────────────────────
function SuiviForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({
    mois: data?.mois || new Date().getMonth() + 1,
    annee: data?.annee || new Date().getFullYear(),
    statut: data?.statut || 'attente',
    notes: data?.notes || '',
    actions: data?.actions || '',
    observations_terrain: data?.observations_terrain || '',
    analyse_carte: data?.analyse_carte || '',
    recommandations_mois: data?.recommandations_mois || '',
    message_client: data?.message_client || '',
    ...(data || {}),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.mois && form.annee;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>
          {data?.id ? 'Modifier le suivi' : 'Nouveau suivi mensuel'}
        </h3>
        <button onClick={() => onSave({ ...form, mois: +form.mois, annee: +form.annee })}
          disabled={!valid} style={{ ...btnPrimary, opacity: valid ? 1 : 0.5 }}>
          Enregistrer
        </button>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>📅 Période</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Mois</label>
            <select value={form.mois} onChange={e => set('mois', +e.target.value)} style={inp}>
              {MOIS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Année</label>
            <input type="number" value={form.annee} onChange={e => set('annee', e.target.value)} style={inp} min="2020" max="2035" />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>📋 Statut</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUIVI_STATUTS.map(s => (
            <button key={s.key} onClick={() => set('statut', s.key)} style={{
              padding: '5px 13px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${form.statut === s.key ? s.color : '#DDD5B8'}`,
              background: form.statut === s.key ? s.bg : '#FFFDF8',
              color: form.statut === s.key ? s.color : '#6b7280',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Champs quantitatifs */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>📊 Données du mois</div>
        <label style={lbl}>Notes & Observations internes</label>
        <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
          style={{ ...inp, resize: 'vertical', minHeight: 70, marginTop: 4 }}
          placeholder="Points abordés, contexte du mois, notes pour vous…" />
        <label style={{ ...lbl, marginTop: 12, display: 'block' }}>Actions décidées ce mois</label>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 6px' }}>Une action par ligne</p>
        <textarea rows={4} value={form.actions} onChange={e => set('actions', e.target.value)}
          style={{ ...inp, resize: 'vertical', minHeight: 90 }}
          placeholder={"Renégocier fournisseur viande\nRetravailler description des entrées"} />
      </div>

      {/* Champs qualitatifs — votre valeur ajoutée */}
      <div style={{ ...card, marginBottom: 12, borderLeft: '3px solid #C9A84C' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>✍️ Votre analyse — ce qui ira dans le rapport client</div>
        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>Ces champs constituent le cœur du rapport. Votre regard terrain, votre expérience.</p>

        <label style={lbl}>Observations terrain du mois</label>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 6px' }}>Ce que vous avez vu, ressenti, constaté ce mois-ci dans l'établissement ou lors des échanges</p>
        <textarea rows={4} value={form.observations_terrain} onChange={e => set('observations_terrain', e.target.value)}
          style={{ ...inp, resize: 'vertical', minHeight: 90, marginBottom: 14 }}
          placeholder="Ex: La brigade manque de rigueur sur le grammage des entrées. Bonne dynamique sur le brunch du dimanche, à capitaliser. Fournisseur viande à renégocier en juin…" />

        <label style={lbl}>Analyse de la carte ce mois</label>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 6px' }}>Évolution du menu, plats à repositionner, nouvelles opportunités</p>
        <textarea rows={4} value={form.analyse_carte} onChange={e => set('analyse_carte', e.target.value)}
          style={{ ...inp, resize: 'vertical', minHeight: 90, marginBottom: 14 }}
          placeholder="Ex: Le plat du jour génère 40% des couverts mais son CMV dépasse 35%. Retravailler la recette ou ajuster le prix de 12€ à 13,50€ pour revenir sous les 30%…" />

        <label style={lbl}>Recommandations pour le mois prochain</label>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 6px' }}>Vos priorités d'action pour M+1, dans l'ordre d'importance</p>
        <textarea rows={4} value={form.recommandations_mois} onChange={e => set('recommandations_mois', e.target.value)}
          style={{ ...inp, resize: 'vertical', minHeight: 90, marginBottom: 14 }}
          placeholder={"1. Ajuster le prix du plat du jour à 13,50€\n2. Mettre en avant les Vins au verre (marge +62%)\n3. Supprimer les 2 desserts poids morts de la carte"} />

        <label style={lbl}>Message personnalisé au client</label>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 6px' }}>Mot d'introduction ou de clôture du rapport, dans votre ton</p>
        <textarea rows={3} value={form.message_client} onChange={e => set('message_client', e.target.value)}
          style={{ ...inp, resize: 'vertical', minHeight: 70 }}
          placeholder="Ex: Ce mois marque une vraie progression — votre CMV a baissé de 2 points. Les ajustements de tarifs que nous avons décidés ensemble commencent à produire leurs effets…" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ANALYSE MENU — CONFIG & CALCULS
// ══════════════════════════════════════════════════════════════════

const MENU_CATS = [
  { key: 'entree', label: 'Entrée', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'plat', label: 'Plat', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'dessert', label: 'Dessert', color: '#d97706', bg: '#fef3c7' },
  { key: 'boisson', label: 'Boisson', color: '#065f46', bg: '#d1fae5' },
  { key: 'autre', label: 'Autre', color: '#6b7280', bg: '#f3f4f6' },
];
const menuCatOf = key => MENU_CATS.find(c => c.key === key) || MENU_CATS[4];

const MATRIX_CELLS = {
  star: { label: 'Star ⭐', color: '#059669', bg: '#d1fae5', border: '#6ee7b7', desc: 'Rentable + Populaire → Maintenir, mettre en avant' },
  vache: { label: 'Vache 🐄', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', desc: 'Populaire mais peu rentable → Optimiser coût ou prix' },
  enigme: { label: 'Énigme ❓', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc', desc: 'Rentable mais peu vendu → Mieux positionner, mieux décrire' },
  poids_mort: { label: 'Poids Mort 💀', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', desc: 'Peu rentable + Peu vendu → Supprimer ou retravailler' },
};

const EDITORIAL_CHECKS = [
  { key: 'noms_clairs', label: 'Noms des plats clairs et évocateurs' },
  { key: 'descriptions', label: 'Descriptions présentes et appétissantes' },
  { key: 'nb_items_ok', label: 'Nombre de plats adapté (5-7 par catégorie max)' },
  { key: 'prix_lisibles', label: 'Prix bien formatés, cohérents' },
  { key: 'pas_symbole_euro', label: 'Pas de symbole € (réduit inhibition d\'achat)' },
  { key: 'hierarchie_visuelle', label: 'Hiérarchie visuelle claire (titres, sections)' },
  { key: 'plats_star_en_haut', label: 'Plats stars / rentables en début de catégorie' },
  { key: 'pas_colonnes', label: 'Pas de colonne prix alignée à droite' },
  { key: 'decoys', label: 'Présence d\'un plat "ancre" (prix élevé pour contraste)' },
  { key: 'coherence_theme', label: 'Cohérence avec le concept / thème du restaurant' },
  { key: 'saison', label: 'Mention des produits de saison / locaux' },
  { key: 'allergenes', label: 'Allergènes indiqués' },
];

function classifyItem(item, avgPop, avgMargin) {
  const margin = (+item.prix_vente_ht || 0) - (+item.cout_revient || 0);
  const pop = +item.quantite_vendue || 0;
  const isPopular = pop >= avgPop;
  const isProfitable = margin >= avgMargin;
  if (isPopular && isProfitable) return 'star';
  if (isPopular && !isProfitable) return 'vache';
  if (!isPopular && isProfitable) return 'enigme';
  return 'poids_mort';
}

function computeMenuStats(items) {
  if (!items.length) return { avgPop: 0, avgMargin: 0, classified: [], byCategory: {}, totalRevenue: 0, totalCost: 0, cmvGlobal: 0 };
  const avgPop = items.reduce((s, i) => s + (+i.quantite_vendue || 0), 0) / items.length;
  const margins = items.map(i => (+i.prix_vente_ht || 0) - (+i.cout_revient || 0));
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  const classified = items.map((item, idx) => ({
    ...item,
    _margin: margins[idx],
    _cmv_pct: +item.prix_vente_ht > 0 ? (+item.cout_revient / +item.prix_vente_ht) * 100 : 0,
    _revenue: (+item.prix_vente_ht || 0) * (+item.quantite_vendue || 0),
    _cost_total: (+item.cout_revient || 0) * (+item.quantite_vendue || 0),
    _class: classifyItem(item, avgPop, avgMargin),
  }));
  const totalRevenue = classified.reduce((s, i) => s + i._revenue, 0);
  const totalCost = classified.reduce((s, i) => s + i._cost_total, 0);
  const cmvGlobal = totalRevenue > 0 ? totalCost / totalRevenue * 100 : 0;
  const byCategory = {};
  MENU_CATS.forEach(c => {
    const cat = classified.filter(i => i.categorie === c.key);
    if (!cat.length) return;
    const rev = cat.reduce((s, i) => s + i._revenue, 0);
    const cost = cat.reduce((s, i) => s + i._cost_total, 0);
    byCategory[c.key] = {
      items: cat,
      count: cat.length,
      revenue: rev,
      cmv: rev > 0 ? cost / rev * 100 : 0,
      avgPrice: cat.reduce((s, i) => s + (+i.prix_vente_ht || 0), 0) / cat.length,
      minPrice: Math.min(...cat.map(i => +i.prix_vente_ht || 0)),
      maxPrice: Math.max(...cat.map(i => +i.prix_vente_ht || 0)),
    };
  });
  return { avgPop, avgMargin, classified, byCategory, totalRevenue, totalCost, cmvGlobal };
}

function generateActions(stats) {
  const { classified, cmvGlobal, byCategory } = stats;
  const actions = [];
  const vaches = classified.filter(i => i._class === 'vache');
  const enigmes = classified.filter(i => i._class === 'enigme');
  const poidsMorts = classified.filter(i => i._class === 'poids_mort');
  const stars = classified.filter(i => i._class === 'star');

  if (poidsMorts.length > 0) actions.push({ priority: 1, icon: '🗑️', title: `Supprimer ${poidsMorts.length} poids mort${poidsMorts.length > 1 ? 's' : ''}`, detail: poidsMorts.map(i => i.nom).join(', '), impact: 'Simplification carte + focus équipe' });
  if (vaches.length > 0) {
    const gainPotentiel = vaches.reduce((s, i) => s + Math.max(0, (+i.cout_revient * 0.9 - (+i.prix_vente_ht * 0.28)) * (+i.quantite_vendue || 0)), 0);
    actions.push({ priority: 1, icon: '💰', title: `Optimiser le CMV de ${vaches.length} vache${vaches.length > 1 ? 's' : ''}`, detail: `Renégocier fournisseurs ou ajuster prix : ${vaches.map(i => i.nom).join(', ')}`, impact: gainPotentiel > 0 ? `+${fmtEur(gainPotentiel)}/mois estimé` : 'Amélioration marges' });
  }
  if (enigmes.length > 0) actions.push({ priority: 2, icon: '📍', title: `Repositionner ${enigmes.length} énigme${enigmes.length > 1 ? 's' : ''} sur la carte`, detail: `Déplacer en haut de catégorie, améliorer descriptions : ${enigmes.map(i => i.nom).join(', ')}`, impact: 'Augmentation popularité sans modifier prix' });
  if (stars.length > 0) actions.push({ priority: 2, icon: '⭐', title: `Mettre en avant ${stars.length} star${stars.length > 1 ? 's' : ''} sur la carte`, detail: stars.map(i => i.nom).join(', '), impact: 'Maximiser le CA sur les plats les plus rentables' });
  if (cmvGlobal > 33) actions.push({ priority: 1, icon: '⚠️', title: 'CMV global trop élevé (>' + cmvGlobal.toFixed(0) + '%)', detail: 'Revoir les fiches techniques, renégocier les achats matières ou ajuster les prix de vente', impact: 'Réduction directe du coût matière' });
  Object.entries(byCategory).forEach(([cat, data]) => {
    if (data.count > 7) actions.push({ priority: 3, icon: '✂️', title: `Trop de références en "${menuCatOf(cat).label}" (${data.count} plats)`, detail: 'Réduire à 5-7 plats max pour faciliter le choix client et réduire la complexité cuisine', impact: 'Meilleure lisibilité + réduction gaspillage' });
  });
  return actions.sort((a, b) => a.priority - b.priority);
}

function estimateGain(stats, caMonthly = 0) {
  const { classified, cmvGlobal, totalRevenue } = stats;
  if (!totalRevenue) return { cmvGain: 0, repositionGain: 0, total: 0 };
  const vaches = classified.filter(i => i._class === 'vache');
  const enigmes = classified.filter(i => i._class === 'enigme');
  const cmvGain = vaches.reduce((s, i) => {
    const targetCMV = 0.28;
    const actualCost = +i.cout_revient || 0;
    const price = +i.prix_vente_ht || 0;
    const qty = +i.quantite_vendue || 0;
    const targetCost = price * targetCMV;
    return s + Math.max(0, (actualCost - targetCost) * qty);
  }, 0);
  const repositionGain = enigmes.reduce((s, i) => {
    const revenue = i._revenue || 0;
    return s + revenue * 0.20; // hypothèse +20% ventes si mieux positionné
  }, 0);
  return { cmvGain, repositionGain, total: cmvGain + repositionGain };
}

// ── Tab principal Analyse Menu ────────────────────────────────────
function MenuTab({ client, api, menuAnalyses, onReload }) {
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [items, setItems] = useState([]);

  const sorted = [...menuAnalyses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  useEffect(() => {
    if (sorted.length > 0 && !selected) setSelected(sorted[0]);
  }, [menuAnalyses]);

  useEffect(() => {
    if (selected?.id) loadItems(selected.id);
    else setItems([]);
  }, [selected]);

  async function loadItems(analysisId) {
    const its = await api.getMenuItems(analysisId);
    setItems(its || []);
  }

  async function handleSave(data, its) {
    const saved = await api.saveMenuAnalysis({ ...data, client_id: client.id });
    if (saved?.id && its) await api.saveMenuItems(saved.id, its);
    setShowForm(false); setEditData(null);
    await onReload();
    const updated = (await api.getMenuAnalyses(client.id)) || [];
    const found = updated.find(a => a.id === (saved?.id || data.id));
    if (found) { setSelected(found); loadItems(found.id); }
  }

  async function handleSaveEditorial(analysisId, checks) {
    await api.saveMenuAnalysis({
      id: analysisId,
      client_id: client.id,
      nom: selected?.nom || '',
      notes: selected?.notes || '',
      editorial_checks: JSON.stringify(checks),
    });
    await onReload();
    const updated = (await api.getMenuAnalyses(client.id)) || [];
    const found = updated.find(a => a.id === analysisId);
    if (found) setSelected(found);
  }

  async function handleDelete(id) {
    await api.deleteMenuAnalysis(id);
    setShowDel(null);
    setSelected(null); setItems([]);
    onReload();
  }

  if (showForm) return (
    <MenuForm
      data={editData}
      existingItems={editData ? items : []}
      onSave={handleSave}
      onCancel={() => { setShowForm(false); setEditData(null); }}
    />
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{menuAnalyses.length} analyse{menuAnalyses.length !== 1 ? 's' : ''}</span>
        <button onClick={() => { setEditData(null); setShowForm(true); }} style={btnPrimary}>+ Nouvelle analyse carte</button>
      </div>

      {menuAnalyses.length === 0 ? (
        <div onClick={() => setShowForm(true)}
          style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: '48px 20px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Aucune analyse de carte</div>
          <div style={{ fontSize: 13 }}>Saisissez les références ou importez un fichier CSV</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14 }}>
          {/* Sidebar */}
          <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sorted.map(a => {
              const isActive = selected?.id === a.id;
              return (
                <div key={a.id} onClick={() => setSelected(a)}
                  style={{ padding: '9px 11px', borderRadius: 8, border: `1px solid ${isActive ? '#C9A84C' : '#DDD5B8'}`, background: isActive ? '#FAF3E0' : '#FFFDF8', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#0D1520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nom}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              );
            })}
          </div>

          {/* Résultats */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selected ? (
              <MenuResults
                analysis={selected}
                items={items}
                onEdit={() => { setEditData(selected); setShowForm(true); }}
                onDelete={() => setShowDel(selected)}
                onSaveEditorial={checks => handleSaveEditorial(selected.id, checks)}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 13 }}>← Sélectionnez une analyse</div>
            )}
          </div>
        </div>
      )}

      {showDel && (
        <ConfirmModal
          title="Supprimer cette analyse"
          message={`Supprimer l'analyse "${showDel.nom}" et tous ses plats ?`}
          onConfirm={() => handleDelete(showDel.id)}
          onCancel={() => setShowDel(null)}
        />
      )}
    </div>
  );
}

// ── Résultats analyse menu ────────────────────────────────────────
function MenuResults({ analysis, items, onEdit, onDelete, onSaveEditorial }) {
  const [activeSection, setActiveSection] = useState('matrix');
  const stats = computeMenuStats(items);
  const actions = generateActions(stats);
  const gain = estimateGain(stats);

  const SECTIONS = [
    { key: 'matrix', label: '🎯 Matrice' },
    { key: 'items', label: '🍽️ Références' },
    { key: 'architecture', label: '🏗️ Architecture' },
    { key: 'editorial', label: '📖 Éditorial' },
    { key: 'actions', label: '📋 Plan d\'action' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{analysis.nom}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{items.length} référence{items.length !== 1 ? 's' : ''} · {new Date(analysis.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={onEdit} style={btnSec}>Modifier</button>
          <button onClick={onDelete} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
        </div>
      </div>

      {/* KPIs rapides */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'Références', v: items.length, c: '#0D1520' },
            { l: 'CMV Global', v: `${stats.cmvGlobal.toFixed(1)}%`, c: stats.cmvGlobal > 33 ? '#dc2626' : stats.cmvGlobal > 28 ? '#d97706' : '#059669' },
            { l: 'Stars', v: stats.classified.filter(i => i._class === 'star').length, c: '#059669' },
            { l: 'Poids Morts', v: stats.classified.filter(i => i._class === 'poids_mort').length, c: '#dc2626' },
          ].map(k => (
            <div key={k.l} style={{ background: '#FFFDF8', border: '1px solid #DDD5B8', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sous-navigation */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
            padding: '5px 12px', borderRadius: 8, border: `1px solid ${activeSection === s.key ? '#C9A84C' : '#DDD5B8'}`,
            background: activeSection === s.key ? '#FAF3E0' : '#FFFDF8',
            color: activeSection === s.key ? '#0D1520' : '#6b7280',
            fontSize: 12, fontWeight: activeSection === s.key ? 700 : 400, cursor: 'pointer',
          }}>{s.label}</button>
        ))}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>Aucun plat dans cette analyse — cliquez sur Modifier pour en ajouter.</div>
      ) : (
        <>
          {activeSection === 'matrix' && <MenuMatrix stats={stats} />}
          {activeSection === 'items' && <MenuItemsTable stats={stats} />}
          {activeSection === 'architecture' && <MenuArchitecture stats={stats} items={items} />}
          {activeSection === 'editorial' && <MenuEditorial analysis={analysis} onSave={onSaveEditorial} />}
          {activeSection === 'actions' && <MenuActions actions={actions} gain={gain} />}
        </>
      )}
    </div>
  );
}

// ── Matrice 4 quadrants ───────────────────────────────────────────
function MenuMatrix({ stats }) {
  const { classified } = stats;
  const byClass = { star: [], vache: [], enigme: [], poids_mort: [] };
  classified.forEach(i => byClass[i._class].push(i));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {Object.entries(MATRIX_CELLS).map(([key, cell]) => {
          const its = byClass[key] || [];
          return (
            <div key={key} style={{ background: cell.bg, border: `1px solid ${cell.border}`, borderRadius: 10, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: cell.color }}>{cell.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: cell.color }}>{its.length}</span>
              </div>
              <div style={{ fontSize: 10, color: cell.color, marginBottom: 10, opacity: 0.8 }}>{cell.desc}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {its.length === 0 ? (
                  <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Aucun plat</span>
                ) : its.map(i => (
                  <div key={i.id || i.nom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: 5, padding: '4px 8px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0D1520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{i.nom}</span>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: '#64748b' }}>{fmtEur(i.prix_vente_ht)}</span>
                      <span style={{ fontSize: 10, color: i._cmv_pct > 33 ? '#dc2626' : '#059669', fontWeight: 700 }}>{i._cmv_pct.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        Classification basée sur la popularité moyenne ({stats.avgPop.toFixed(0)} ventes/plat) et la marge moyenne ({fmtEur(stats.avgMargin)}/plat)
      </div>
    </div>
  );
}

// ── Table des références avec CMV/Pricing ─────────────────────────
function MenuItemsTable({ stats }) {
  const { classified } = stats;
  const [sortKey, setSortKey] = useState('_class');
  const [catFilter, setCatFilter] = useState('all');

  const filtered = classified
    .filter(i => catFilter === 'all' || i.categorie === catFilter)
    .sort((a, b) => {
      if (sortKey === '_cmv_pct') return a._cmv_pct - b._cmv_pct;
      if (sortKey === '_margin') return b._margin - a._margin;
      if (sortKey === 'qty') return (+b.quantite_vendue || 0) - (+a.quantite_vendue || 0);
      if (sortKey === '_class') return ['star', 'vache', 'enigme', 'poids_mort'].indexOf(a._class) - ['star', 'vache', 'enigme', 'poids_mort'].indexOf(b._class);
      return 0;
    });

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Catégorie :</span>
        {[{ key: 'all', label: 'Toutes' }, ...MENU_CATS].map(c => (
          <button key={c.key} onClick={() => setCatFilter(c.key)} style={{
            padding: '2px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            border: `1px solid ${catFilter === c.key ? '#C9A84C' : '#DDD5B8'}`,
            background: catFilter === c.key ? '#FAF3E0' : '#FFFDF8',
            color: catFilter === c.key ? '#0D1520' : '#6b7280',
          }}>{c.label}</button>
        ))}
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>Trier :</span>
        {[['_class', 'Classe'], ['_cmv_pct', 'CMV%'], ['_margin', 'Marge'], ['qty', 'Popularité']].map(([k, l]) => (
          <button key={k} onClick={() => setSortKey(k)} style={{
            padding: '2px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
            border: `1px solid ${sortKey === k ? '#0D1520' : '#DDD5B8'}`,
            background: sortKey === k ? '#0D1520' : '#FFFDF8',
            color: sortKey === k ? '#fff' : '#6b7280', fontWeight: sortKey === k ? 700 : 400,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#FAF8F2' }}>
              {['Plat', 'Catégorie', 'Coût', 'Prix HT', 'Marge', 'CMV%', 'Qté vendue', 'CA', 'Classe'].map(h => (
                <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #DDD5B8', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((i, idx) => {
              const cell = MATRIX_CELLS[i._class];
              const cat = menuCatOf(i.categorie);
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F5F0E8' }}>
                  <td style={{ padding: '7px 8px', fontWeight: 600, color: '#0D1520' }}>{i.nom}</td>
                  <td style={{ padding: '7px 8px' }}><Badge color={cat.color} bg={cat.bg} small>{cat.label}</Badge></td>
                  <td style={{ padding: '7px 8px', color: '#64748b' }}>{fmtEur(i.cout_revient)}</td>
                  <td style={{ padding: '7px 8px', fontWeight: 600 }}>{fmtEur(i.prix_vente_ht)}</td>
                  <td style={{ padding: '7px 8px', color: i._margin > stats.avgMargin ? '#059669' : '#d97706', fontWeight: 700 }}>{fmtEur(i._margin)}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <span style={{ color: i._cmv_pct > 33 ? '#dc2626' : i._cmv_pct > 28 ? '#d97706' : '#059669', fontWeight: 700 }}>{i._cmv_pct.toFixed(1)}%</span>
                  </td>
                  <td style={{ padding: '7px 8px', color: (+i.quantite_vendue || 0) >= stats.avgPop ? '#059669' : '#d97706', fontWeight: 600 }}>{i.quantite_vendue || 0}</td>
                  <td style={{ padding: '7px 8px', color: '#059669', fontWeight: 600 }}>{fmtEur(i._revenue)}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <span style={{ background: cell.bg, color: cell.color, borderRadius: 8, padding: '2px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{cell.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Architecture carte ────────────────────────────────────────────
function MenuArchitecture({ stats, items }) {
  const { byCategory, totalRevenue, cmvGlobal } = stats;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {MENU_CATS.filter(c => byCategory[c.key]).map(cat => {
        const data = byCategory[cat.key];
        const pctRevenue = totalRevenue > 0 ? data.revenue / totalRevenue * 100 : 0;
        const tooMany = data.count > 7;
        return (
          <div key={cat.key} style={{ background: '#FFFDF8', border: `1px solid ${tooMany ? '#fca5a5' : '#DDD5B8'}`, borderRadius: 10, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge color={cat.color} bg={cat.bg}>{cat.label}</Badge>
                {tooMany && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>⚠ {data.count} plats (max 7 recommandé)</span>}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{fmtEur(data.revenue)} · {pctRevenue.toFixed(0)}% du CA</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              <div><div style={lblSmall}>Références</div><div style={valBig}>{data.count}</div></div>
              <div><div style={lblSmall}>Prix moyen</div><div style={valBig}>{fmtEur(data.avgPrice)}</div></div>
              <div><div style={lblSmall}>Fourchette</div><div style={valBig}>{fmtEur(data.minPrice)} – {fmtEur(data.maxPrice)}</div></div>
              <div><div style={lblSmall}>CMV catégorie</div><div style={{ ...valBig, color: data.cmv > 33 ? '#dc2626' : data.cmv > 28 ? '#d97706' : '#059669' }}>{data.cmv.toFixed(1)}%</div></div>
            </div>
            <div style={{ marginTop: 8, height: 5, background: '#EDE8D5', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(pctRevenue, 100)}%`, height: '100%', background: cat.color, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
      <div style={{ background: '#FAF3E0', border: '1px solid #DDD5B8', borderRadius: 10, padding: '14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 8 }}>Synthèse globale</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <div><div style={lblSmall}>Total références</div><div style={valBig}>{items.length}</div></div>
          <div><div style={lblSmall}>CMV global</div><div style={{ ...valBig, color: cmvGlobal > 33 ? '#dc2626' : '#059669' }}>{cmvGlobal.toFixed(1)}%</div></div>
          <div><div style={lblSmall}>CA total analysé</div><div style={valBig}>{fmtEur(totalRevenue)}</div></div>
        </div>
      </div>
    </div>
  );
}

const lblSmall = { fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 };
const valBig = { fontSize: 15, fontWeight: 800, color: '#0D1520' };

// ── Grille éditoriale ─────────────────────────────────────────────
function MenuEditorial({ analysis, onSave }) {
  const stored = (() => { try { return JSON.parse(analysis.editorial_checks || '{}'); } catch { return {}; } })();
  const [checks, setChecks] = useState(stored);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true); // false = modifications non sauvegardées

  const score = EDITORIAL_CHECKS.filter(c => checks[c.key]).length;
  const pct = Math.round(score / EDITORIAL_CHECKS.length * 100);
  const color = pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626';

  function toggle(key, val) {
    setChecks(p => ({ ...p, [key]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(checks);
    setSaving(false);
    setSaved(true);
  }

  // Reset quand l'analyse change (changement de sélection)
  useEffect(() => {
    const s = (() => { try { return JSON.parse(analysis.editorial_checks || '{}'); } catch { return {}; } })();
    setChecks(s);
    setSaved(true);
  }, [analysis.id]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '14px 16px', background: '#FFFDF8', border: '1px solid #DDD5B8', borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 }}>Score éditorial</div>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{pct}%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, background: '#EDE8D5', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{score}/{EDITORIAL_CHECKS.length} critères validés</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{ ...btnPrimary, opacity: saved ? 0.45 : 1, minWidth: 120 }}
        >
          {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : '💾 Enregistrer'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {EDITORIAL_CHECKS.map(c => (
          <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: checks[c.key] ? '#f0fdf4' : '#FFFDF8', border: `1px solid ${checks[c.key] ? '#6ee7b7' : '#DDD5B8'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s' }}>
            <input type="checkbox" checked={!!checks[c.key]} onChange={e => toggle(c.key, e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#059669', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: checks[c.key] ? '#065f46' : '#374151' }}>{c.label}</span>
            {checks[c.key] && <span style={{ marginLeft: 'auto', color: '#059669', fontSize: 12 }}>✓</span>}
          </label>
        ))}
      </div>
      {!saved && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ Modifications non sauvegardées</span>
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, padding: '4px 12px', fontSize: 12 }}>
            {saving ? '…' : 'Enregistrer maintenant'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Plan d'action + gain potentiel ───────────────────────────────
function MenuActions({ actions, gain }) {
  const PRIO_LABELS = { 1: { l: 'Urgent', c: '#dc2626', bg: '#fee2e2' }, 2: { l: 'Important', c: '#d97706', bg: '#fef3c7' }, 3: { l: 'Optimisation', c: '#0369a1', bg: '#e0f2fe' } };
  return (
    <div>
      {/* Gain potentiel */}
      {gain.total > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', marginBottom: 10 }}>✨ Gain potentiel mensuel estimé</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {gain.cmvGain > 0 && (
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #6ee7b7' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', marginBottom: 4 }}>Optimisation CMV Vaches</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{fmtEur(gain.cmvGain)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Ajustement coût → 28%</div>
              </div>
            )}
            {gain.repositionGain > 0 && (
              <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #6ee7b7' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', marginBottom: 4 }}>Repositionnement Énigmes</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{fmtEur(gain.repositionGain)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Hypothèse +20% popularité</div>
              </div>
            )}
            <div style={{ background: '#059669', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', marginBottom: 4, opacity: 0.8 }}>Total potentiel</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{fmtEur(gain.total)}</div>
              <div style={{ fontSize: 10, color: '#fff', marginTop: 2, opacity: 0.8 }}>/ mois si actions réalisées</div>
            </div>
          </div>
        </div>
      )}

      {/* Plan d'action */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
            🎉 Aucune action critique détectée — carte bien optimisée !
          </div>
        ) : actions.map((a, i) => {
          const p = PRIO_LABELS[a.priority];
          return (
            <div key={i} style={{ background: '#FFFDF8', border: `1px solid ${p.bg === '#fee2e2' ? '#fca5a5' : p.bg === '#fef3c7' ? '#fcd34d' : '#7dd3fc'}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0D1520' }}>{a.title}</span>
                    <span style={{ background: p.bg, color: p.c, borderRadius: 8, fontSize: 10, padding: '1px 7px', fontWeight: 700 }}>{p.l}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{a.detail}</div>
                  {a.impact && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>→ {a.impact}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Formulaire création / édition analyse menu ────────────────────
const EMPTY_ITEM = { nom: '', categorie: 'plat', cout_revient: '', prix_vente_ht: '', quantite_vendue: '', description: '' };

function MenuForm({ data, existingItems, onSave, onCancel }) {
  const [nom, setNom] = useState(data?.nom || '');
  const [notes, setNotes] = useState(data?.notes || '');
  const [items, setItems] = useState(existingItems?.length ? existingItems : [{ ...EMPTY_ITEM }]);
  const [importing, setImporting] = useState(false);

  function addItem() { setItems(p => [...p, { ...EMPTY_ITEM }]); }
  function removeItem(i) { setItems(p => p.filter((_, j) => j !== i)); }
  function setItemField(i, k, v) { setItems(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it)); }

  function handleCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target.result;
        const rows = text.split('\n').filter(r => r.trim());
        const header = rows[0].split(/[,;|\t]/).map(h => h.trim().toLowerCase());
        const colIdx = {
          nom: header.findIndex(h => ['nom', 'name', 'plat', 'article', 'libelle', 'référence'].some(k => h.includes(k))),
          cat: header.findIndex(h => ['cat', 'type', 'section', 'famille'].some(k => h.includes(k))),
          cout: header.findIndex(h => ['cout', 'cost', 'revient', 'achat', 'matiere'].some(k => h.includes(k))),
          prix: header.findIndex(h => ['prix', 'price', 'vente', 'tarif', 'ht'].some(k => h.includes(k))),
          qty: header.findIndex(h => ['qte', 'qty', 'quantite', 'vendu', 'nb', 'nombre', 'volume'].some(k => h.includes(k))),
          desc: header.findIndex(h => ['desc', 'description', 'detail'].some(k => h.includes(k))),
        };
        const CAT_MAP = { 'entrée': 'entree', 'entree': 'entree', 'plat': 'plat', 'dessert': 'dessert', 'boisson': 'boisson', 'drink': 'boisson' };
        const parsed = rows.slice(1).map(row => {
          const cols = row.split(/[,;|\t]/);
          const cat = cols[colIdx.cat]?.trim().toLowerCase() || 'plat';
          return {
            nom: cols[colIdx.nom]?.trim() || '',
            categorie: CAT_MAP[cat] || 'plat',
            cout_revient: cols[colIdx.cout]?.replace(/[€\s]/g, '').replace(',', '.') || '',
            prix_vente_ht: cols[colIdx.prix]?.replace(/[€\s]/g, '').replace(',', '.') || '',
            quantite_vendue: cols[colIdx.qty]?.trim() || '',
            description: cols[colIdx.desc]?.trim() || '',
          };
        }).filter(i => i.nom);
        if (parsed.length > 0) { setItems(parsed); alert(`✓ ${parsed.length} plat(s) importé(s).`); }
        else alert('Aucun plat reconnu. Colonnes attendues : nom, catégorie, coût, prix, quantité.');
      } catch { alert('Erreur lors de la lecture.'); }
      setImporting(false);
    };
    reader.readAsText(file, 'utf-8');
  }

  const valid = nom.trim() && items.some(i => i.nom.trim());

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{data?.id ? 'Modifier l\'analyse' : 'Nouvelle analyse carte'}</h3>
        <label style={{ ...btnSec, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          📥 {importing ? 'Import…' : 'Import CSV'}
          <input type="file" accept=".csv,.txt" onChange={handleCSV} style={{ display: 'none' }} />
        </label>
        <button onClick={() => onSave({ ...(data || {}), nom, notes }, items)} disabled={!valid}
          style={{ ...btnPrimary, opacity: valid ? 1 : 0.5 }}>Enregistrer</button>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Nom de l'analyse *</label>
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Carte été 2026"
              style={{ ...inp, fontWeight: 700 }} />
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Version, contexte…" style={inp} />
          </div>
        </div>
      </div>

      {/* Table des plats */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8 }}>🍽️ Références ({items.length})</span>
          <div style={{ display: 'flex', gap: 7 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'center' }}>Format CSV : nom, catégorie, coût, prix HT, quantité vendue</span>
            <button onClick={addItem} style={{ ...btnPrimary, padding: '5px 12px', fontSize: 12 }}>+ Ajouter</button>
          </div>
        </div>

        {/* En-têtes */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 28px', gap: 6, marginBottom: 6 }}>
          {['Nom du plat', 'Catégorie', 'Coût (€)', 'Prix HT (€)', 'Qté vendue', 'Marge', ''].map(h => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 420, overflowY: 'auto' }}>
          {items.map((item, i) => {
            const margin = (+item.prix_vente_ht || 0) - (+item.cout_revient || 0);
            const cmvPct = +item.prix_vente_ht > 0 ? (+item.cout_revient / +item.prix_vente_ht * 100) : 0;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 28px', gap: 6, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #FAF8F2' }}>
                <input value={item.nom} onChange={e => setItemField(i, 'nom', e.target.value)}
                  placeholder="Nom du plat" style={{ ...inp, padding: '5px 8px', fontSize: 12 }} />
                <select value={item.categorie} onChange={e => setItemField(i, 'categorie', e.target.value)}
                  style={{ ...inp, padding: '5px 8px', fontSize: 12 }}>
                  {MENU_CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <input type="number" value={item.cout_revient} onChange={e => setItemField(i, 'cout_revient', e.target.value)}
                  placeholder="0.00" style={{ ...inp, padding: '5px 8px', fontSize: 12 }} min="0" step="0.01" />
                <input type="number" value={item.prix_vente_ht} onChange={e => setItemField(i, 'prix_vente_ht', e.target.value)}
                  placeholder="0.00" style={{ ...inp, padding: '5px 8px', fontSize: 12 }} min="0" step="0.01" />
                <input type="number" value={item.quantite_vendue} onChange={e => setItemField(i, 'quantite_vendue', e.target.value)}
                  placeholder="0" style={{ ...inp, padding: '5px 8px', fontSize: 12 }} min="0" />
                <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: margin > 0 ? (cmvPct > 33 ? '#d97706' : '#059669') : '#dc2626' }}>
                  {+item.prix_vente_ht > 0 ? `${fmtEur(margin)} (${cmvPct.toFixed(0)}%)` : '—'}
                </div>
                <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: 0, textAlign: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>✕</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EMAIL — TEMPLATES & MODAL
// ══════════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES = [
  // ── PARTIE 1 — Emails systématiques ──────────────────────────────
  {
    id: 'post_rdv_devis',
    label: '1 · Post-RDV Découverte — Envoi du devis',
    stage: 'prospection',
    subject: '[La Carte] Votre devis d\'audit — {{etablissement}}',
    body: `Bonjour {{prenom}},

Merci pour notre échange de ce {{jour}}. J'ai bien pris note de votre situation et des axes que vous souhaitez travailler.

Comme convenu, vous trouverez en pièce jointe votre devis personnalisé avec le détail des formules adaptées à votre établissement :

— Audit Menu : analyse de votre carte (ingénierie menu, pricing, lisibilité)
— Audit Complet : carte + analyse financière et opérationnelle
— Retainer Mensuel : suivi continu avec visio mensuelle et recommandations

Chaque formule inclut un rapport PDF détaillé et un appel de restitution pour parcourir les résultats ensemble.

Le devis est valable 30 jours. Si vous avez la moindre question sur le contenu ou le déroulement, je suis disponible par email ou par téléphone.

Je vous laisse prendre le temps de la réflexion. Quand vous serez prêt, un simple retour par email suffit pour démarrer.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'confirmation_demarrage',
    label: '2 · Confirmation démarrage + demande de documents',
    stage: 'questionnaire',
    subject: '[La Carte] Lancement de votre audit — Documents à transmettre',
    body: `Bonjour {{prenom}},

C'est parti. Votre mission d'audit {{formule}} est officiellement lancée.

Pour que je puisse démarrer l'analyse dans les meilleures conditions, j'ai besoin de recevoir les documents suivants :

DOCUMENTS OBLIGATOIRES
— Votre carte / menu actuel(le) au format PDF, photo ou scan lisible
— Les fiches techniques de vos plats (si disponibles)
— Vos tarifs fournisseurs principaux (derniers bons de livraison ou factures)

DOCUMENTS COMPLÉMENTAIRES (Audit Complet uniquement)
— Tickets Z des 3 derniers mois (ou a minima du dernier mois complet)
— Compte de résultat ou bilan du dernier exercice
— Tout document que vous jugez utile (organigramme, planning, rapports précédents)

Vous pouvez m'envoyer les fichiers directement par email ou via le lien de transfert sécurisé que je vous communiquerai si nécessaire.

Délai souhaité : idéalement sous 5 jours ouvrables pour tenir le calendrier prévu. Dès réception complète, je vous confirme le délai de livraison du rapport.

L'ensemble de vos données est traité de manière strictement confidentielle, conformément à la clause de confidentialité figurant dans nos CGV.

N'hésitez pas si vous avez des questions sur les documents demandés.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'accuse_reception_docs',
    label: '3 · Accusé de réception des documents',
    stage: 'questionnaire',
    subject: '[La Carte] Documents bien reçus — {{etablissement}}',
    body: `Bonjour {{prenom}},

J'accuse bonne réception de vos documents. Voici ce que j'ai reçu :

— ✅ Carte / menu actuel
— ✅ Fiches techniques
— ✅ Tarifs fournisseurs

[Adapter selon les documents effectivement reçus]

Tout est complet, je démarre l'analyse. Vous recevrez le rapport finalisé sous [X] jours ouvrables, soit au plus tard le [date].

— — —
VARIANTE SI INCOMPLET :

Il me manque encore les éléments suivants pour pouvoir démarrer :

— ❌ [Document manquant 1]
— ❌ [Document manquant 2]

Le délai de livraison commencera à courir dès réception de l'ensemble.
— — —

Je reviens vers vous dès que le rapport est prêt. D'ici là, n'hésitez pas si vous pensez à un élément complémentaire à m'envoyer.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'envoi_rapport',
    label: '4 · Envoi du rapport + invitation restitution',
    stage: 'audit',
    subject: '[La Carte] Votre rapport d\'audit — {{etablissement}}',
    body: `Bonjour {{prenom}},

Votre rapport d'audit est finalisé. Vous le trouverez en pièce jointe.

Le document couvre les axes suivants :

— Ingénierie de menu : classification de chaque référence, identification des plats qui portent votre résultat et de ceux qui le pèsent
— CMV & Pricing : coût matière et marge réelle par plat, comparaison au benchmark de votre segment, leviers d'optimisation chiffrés
— Lisibilité & structure : architecture de la carte, positionnement des références rentables, améliorations éditoriales

Le rapport inclut en fin de document un plan d'action priorisé avec les modifications concrètes à effectuer et une estimation du gain mensuel potentiel.

Je vous propose de parcourir tout cela ensemble lors d'un appel de restitution. Comptez environ 1 heure.

Créneau proposé : [DATE] à [HEURE]
Lien visio : [LIEN]

Si cette date ne vous convient pas, indiquez-moi vos disponibilités et je m'adapte.

Je vous recommande de lire le rapport une première fois avant notre échange, afin que nous puissions passer directement aux questions et aux priorités d'action.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'post_restitution_retainer',
    label: '5A · Post-restitution — Récap + proposition retainer',
    stage: 'cloture',
    subject: '[La Carte] Récapitulatif de votre restitution — {{etablissement}}',
    body: `Bonjour {{prenom}},

Merci pour notre échange de ce {{jour}}. Voici le récapitulatif des points que nous avons retenus ensemble.

ACTIONS PRIORITAIRES
1. [Action 1 — ex. : Repositionner le plat star en tête de section]
2. [Action 2 — ex. : Ajuster le prix du plat de X,XX € à X,XX €]
3. [Action 3 — ex. : Supprimer les X références classées « Poids mort »]

Ces trois points représentent l'essentiel du gain estimé dans le rapport.

POUR ALLER PLUS LOIN
Si vous souhaitez un suivi dans la durée — mesurer l'impact réel des ajustements sur votre CMV et votre mix de ventes, et continuer à optimiser la carte mois après mois — le retainer mensuel La Carte est conçu pour ça.

Il comprend un point mensuel de 45 minutes, un suivi des indicateurs clés et des recommandations d'ajustement au fil des saisons.

Je peux vous envoyer le détail si cela vous intéresse. Aucune pression, l'audit que vous avez entre les mains est déjà un outil complet en soi.

Quoi qu'il en soit, je reste disponible si une question apparaît au moment de la mise en œuvre.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'post_restitution_cloture',
    label: '5B · Post-restitution — Clôture simple',
    stage: 'cloture',
    subject: '[La Carte] Récapitulatif — {{etablissement}}',
    body: `Bonjour {{prenom}},

Merci pour notre échange de ce {{jour}}. Voici le récapitulatif des actions prioritaires que nous avons identifiées :

1. [Action 1]
2. [Action 2]
3. [Action 3]

La mission d'audit est désormais clôturée. Le rapport reste votre outil de référence pour les prochains mois.

Si à l'usage vous avez besoin d'un regard extérieur pour ajuster la carte après un changement de saison ou une évolution de vos fournisseurs, n'hésitez pas à reprendre contact.

Je vous souhaite une belle mise en œuvre et de bons résultats.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },

  // ── PARTIE 2 — Emails cas par cas ────────────────────────────────
  {
    id: 'relance_devis_j3',
    label: '6A · Relance devis sans réponse — J+3',
    stage: 'prospection',
    subject: 'Re: [La Carte] Votre devis d\'audit — {{etablissement}}',
    body: `Bonjour {{prenom}},

Je me permets de revenir vers vous concernant le devis envoyé {{jour}}. Je comprends que le quotidien en restauration laisse peu de temps pour ce type de décision.

Si vous avez des questions sur le contenu, les formules ou le déroulement, je suis disponible pour un échange rapide de 10 minutes à votre convenance.

Et si le timing n'est pas le bon, aucun souci — dites-le-moi simplement.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'relance_devis_j7',
    label: '6B · Relance devis sans réponse — J+7',
    stage: 'prospection',
    subject: 'Re: [La Carte] Votre devis d\'audit — {{etablissement}}',
    body: `Bonjour {{prenom}},

Je fais un dernier point concernant votre devis. Le devis reste valable jusqu'au {{date_limite}}.

Si votre priorité est ailleurs pour le moment, je le comprends parfaitement. Mon offre reste ouverte, et vous pouvez revenir vers moi quand le moment sera opportun.

Je vous souhaite un bon service.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'relance_documents',
    label: '7 · Relance documents manquants',
    stage: 'questionnaire',
    subject: '[La Carte] Point sur les documents — {{etablissement}}',
    body: `Bonjour {{prenom}},

Je reviens vers vous concernant les documents nécessaires au démarrage de votre audit. À ce jour, je n'ai pas encore reçu :

— [Document manquant 1]
— [Document manquant 2]

L'analyse ne peut démarrer qu'à réception de l'ensemble. Le délai de livraison commencera à courir à partir de cette date.

Si vous rencontrez une difficulté pour réunir certains documents (format, accès comptable, etc.), dites-le-moi — je peux souvent m'adapter.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'point_etape',
    label: '8 · Point d\'étape mi-analyse',
    stage: 'audit',
    subject: '[La Carte] Votre audit avance — {{etablissement}}',
    body: `Bonjour {{prenom}},

Un point rapide pour vous tenir informé : l'analyse de vos données est en cours et avance bien.

J'ai terminé [la classification de votre carte / l'analyse de vos coûts matière / la partie ingénierie menu] et je travaille actuellement sur [les recommandations de pricing / la synthèse financière / la rédaction du rapport].

Livraison prévue comme convenu : [date].

Je reviens vers vous dès que le rapport est finalisé.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'demande_precision',
    label: '9 · Demande de précisions sur les données',
    stage: 'audit',
    subject: '[La Carte] Précision nécessaire — {{etablissement}}',
    body: `Bonjour {{prenom}},

L'analyse est en bonne voie. J'ai besoin d'une précision pour finaliser un point :

[Question précise — ex. : Quel est votre coût matière pour le burger signature ? Je n'ai pas trouvé la fiche technique correspondante dans les documents transmis.]

Un retour rapide par email suffit. Si vous n'avez pas le chiffre exact, une estimation me permettra d'avancer.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'rappel_restitution',
    label: '10 · Rappel restitution — veille du RDV',
    stage: 'audit',
    subject: '[La Carte] Rappel — Restitution demain à [HEURE]',
    body: `Bonjour {{prenom}},

Un rappel pour notre appel de restitution demain {{jour}} à [heure].

Lien visio : [LIEN]
Durée prévue : environ 1 heure

Si vous avez eu le temps de parcourir le rapport, n'hésitez pas à noter vos questions en amont pour qu'on en profite au maximum.

À demain.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'cloture_formelle',
    label: '11 · Clôture formelle de mission',
    stage: 'cloture',
    subject: '[La Carte] Clôture de mission — {{etablissement}}',
    body: `Bonjour {{prenom}},

Je vous confirme la clôture de votre mission d'audit avec La Carte.

Pour récapituler, vous disposez désormais :

— Du rapport d'audit complet (envoyé le [date])
— Du récapitulatif des actions prioritaires (envoyé le [date])

Ces documents restent vos outils de référence. Les recommandations du rapport sont conçues pour être applicables immédiatement et rester pertinentes sur les prochains mois.

Merci pour votre confiance. Ce fut un plaisir de travailler sur votre carte.

Si à l'avenir vous souhaitez refaire un point — changement de carte saisonnier, évolution de vos coûts, nouvelle offre — ma porte est ouverte. Un simple email suffit.

Belle continuation à vous et à toute l'équipe.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
  {
    id: 'demande_temoignage',
    label: '12 · Demande de témoignage / avis',
    stage: 'cloture',
    subject: '[La Carte] Votre retour compte — {{etablissement}}',
    body: `Bonjour {{prenom}},

J'espère que la mise en œuvre des recommandations se passe bien de votre côté.

Votre retour d'expérience m'intéresse sincèrement — à la fois pour améliorer mon accompagnement et pour aider d'autres restaurateurs à franchir le pas.

Si vous êtes d'accord, deux options rapides :

— Un avis Google (2 minutes) : [LIEN GOOGLE BUSINESS]
— Un court témoignage par email : 2-3 phrases sur ce que l'audit vous a apporté concrètement. Je peux l'anonymiser si vous préférez.

Aucune obligation bien sûr. Si vous préférez ne pas le faire, je comprendrai parfaitement.

Et si vous avez des questions sur la mise en pratique du rapport, n'hésitez pas — je suis toujours disponible même après la clôture.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },

  // ── Conservé — Suivi mensuel chiffres ────────────────────────────
  {
    id: 'suivi_mensuel_chiffres',
    label: '📅 Suivi mensuel — demande des chiffres',
    stage: 'audit',
    subject: '[La Carte] Suivi {{mois}} — Données du mois',
    body: `Bonjour {{prenom}},

Nous entrons dans la période de suivi de {{mois}}. Pour préparer votre rapport mensuel, j'aurais besoin des éléments suivants pour {{etablissement}} :

DONNÉES À ME TRANSMETTRE
─────────────────────────────
☐ Tickets Z ou export caisse du mois de {{mois_precedent}}
☐ Tout changement de carte intervenu ce mois-ci (nouveaux plats, suppressions, changements de prix)
☐ Tout changement chez vos fournisseurs (nouveaux tarifs, changements de produits)
☐ Vos observations du mois : événements particuliers, fortes affluences, problèmes rencontrés

─────────────────────────────
Merci de me transmettre ces éléments avant le {{date_limite}} afin que je puisse vous remettre votre rapport sous 5 jours ouvrés.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },

  // ── Conservé — Relance facture ───────────────────────────────────
  {
    id: 'relance_facture',
    label: '💰 Relance facture impayée',
    stage: null,
    subject: '[La Carte] Rappel de paiement — Facture {{numero_facture}}',
    body: `Bonjour {{prenom}},

Je me permets de vous contacter au sujet de la facture {{numero_facture}} d'un montant de {{montant}}, émise le {{date_emission}} et dont l'échéance est fixée au {{date_echeance}}.

À ce jour, je n'ai pas encore reçu le règlement correspondant. Il s'agit peut-être d'un simple oubli — si c'est le cas, merci de procéder au virement dans les meilleurs délais.

Coordonnées bancaires :
• Titulaire : Anthony Grimault
• IBAN : {{iban}}
• BIC : {{bic}}

Si vous rencontrez une difficulté particulière, n'hésitez pas à me contacter pour qu'on en discute.

Bien cordialement,
Anthony Grimault
La Carte — Conseil · Analyse · Recette · Tactique · Exploitation`,
  },
];

// ── Modal Email ───────────────────────────────────────────────────
function EmailModal({ client, onClose, api: apiProp }) {
  const emailApi = apiProp || api;
  const fm = formulaOf(client.formula);
  const prenom = client.name?.split(' ')[0] || client.name || '';
  const today = new Date();
  const moisCourant = MOIS_LABELS[today.getMonth()];
  const moisPrec = MOIS_LABELS[today.getMonth() === 0 ? 11 : today.getMonth() - 1];
  const [settings, setSettings] = useState({});
  useEffect(() => { emailApi.getSettings().then(s => setSettings(s || {})); }, []);
  const dateLimite = new Date(today); dateLimite.setDate(today.getDate() + 5);
  const dateLimiteStr = dateLimite.toLocaleDateString('fr-FR');

  // Valeurs de substitution depuis la fiche client + paramètres cabinet
  const vars = {
    '{{prenom}}': prenom,
    '{{nom}}': client.name || '',
    '{{etablissement}}': client.company || '',
    '{{email}}': client.email || '',
    '{{formule}}': fm.label || '',
    '{{montant}}': '[montant]',
    '{{acompte}}': '[acompte]',
    '{{date_limite}}': dateLimiteStr,
    '{{mois}}': moisCourant,
    '{{mois_precedent}}': moisPrec,
    '{{delai}}': client.formula === 'audit_menu_financier' ? '10' : '7',
    '{{numero_facture}}': '[N° Facture]',
    '{{date_emission}}': today.toLocaleDateString('fr-FR'),
    '{{date_echeance}}': '[Date échéance]',
    '{{date_visio}}': '[Date]',
    '{{heure_visio}}': '[Heure]',
    '{{lien_visio}}': settings.lien_visio || '[Lien visio]',
    '[IBAN]': settings.iban || '[IBAN]',
    '{{iban}}': settings.iban || '[IBAN]',
    '{{bic}}': settings.bic || '[BIC]',
    '[BIC]': settings.bic || '[BIC]',
    '[LIEN GOOGLE BUSINESS]': settings.lien_google || '[LIEN GOOGLE BUSINESS]',
  };

  function applyVars(text) {
    let t = text;
    Object.entries(vars).forEach(([k, v]) => { t = t.replaceAll(k, v); });
    return t;
  }

  const [selectedId, setSelectedId] = useState(EMAIL_TEMPLATES[0].id);
  const template = EMAIL_TEMPLATES.find(t => t.id === selectedId) || EMAIL_TEMPLATES[0];

  const [subject, setSubject] = useState(applyVars(template.subject));
  const [body, setBody] = useState(applyVars(template.body));
  const [montantEdit, setMontantEdit] = useState(client.revenue > 0 ? String(client.revenue) : '');

  function selectTemplate(id) {
    const t = EMAIL_TEMPLATES.find(x => x.id === id);
    if (!t) return;
    setSelectedId(id);
    const customVars = { ...vars };
    if (montantEdit) {
      const m = +montantEdit;
      customVars['{{montant}}'] = fmtEur(m);
      customVars['{{acompte}}'] = fmtEur(Math.round(m * 0.5));
    }
    let s = t.subject, b = t.body;
    Object.entries(customVars).forEach(([k, v]) => { s = s.replaceAll(k, v); b = b.replaceAll(k, v); });
    setSubject(s);
    setBody(b);
  }

  function handleMontantChange(val) {
    setMontantEdit(val);
    const m = +val;
    if (!m) return;
    const newBody = body.replaceAll(fmtEur(+montantEdit || 0), fmtEur(m))
      .replaceAll('[montant]', fmtEur(m));
    const newAcompte = fmtEur(Math.round(m * 0.5));
    setBody(newBody.replaceAll(fmtEur(Math.round((+montantEdit || 0) * 0.5)), newAcompte).replaceAll('[acompte]', newAcompte));
    setSubject(subject.replaceAll('[montant]', fmtEur(m)));
  }

  function handleSend() {
    const gmailUrl = `https://mail.google.com/mail/u/lacarte.advisory@gmail.com/?view=cm&to=${encodeURIComponent(client.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.electronAPI.openExternal(gmailUrl);
    onClose();
  }

  const CATS = [
    { label: 'Systématiques', ids: ['post_rdv_devis', 'confirmation_demarrage', 'accuse_reception_docs', 'envoi_rapport', 'post_restitution_retainer', 'post_restitution_cloture'] },
    { label: 'Cas par cas', ids: ['relance_devis_j3', 'relance_devis_j7', 'relance_documents', 'point_etape', 'demande_precision', 'rappel_restitution', 'cloture_formelle', 'demande_temoignage'] },
    { label: 'Suivi & Admin', ids: ['suivi_mensuel_chiffres', 'relance_facture'] },
  ];

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0D1520' }}>📧 Envoyer un email</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
              {client.name} — {client.email || <span style={{ color: '#dc2626' }}>Aucun email renseigné</span>}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
          {/* Sidebar templates */}
          <div style={{ width: 200, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CATS.map(cat => (
              <div key={cat.label}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{cat.label}</div>
                {cat.ids.map(id => {
                  const t = EMAIL_TEMPLATES.find(x => x.id === id);
                  if (!t) return null;
                  return (
                    <button key={id} onClick={() => selectTemplate(id)} style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px',
                      borderRadius: 7, border: `1px solid ${selectedId === id ? '#C9A84C' : '#DDD5B8'}`,
                      background: selectedId === id ? '#FAF3E0' : '#FFFDF8',
                      color: selectedId === id ? '#0D1520' : '#6b7280',
                      fontSize: 11, fontWeight: selectedId === id ? 700 : 400, cursor: 'pointer',
                      marginBottom: 4,
                    }}>{t.label}</button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Éditeur */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

            {/* Objet */}
            <div>
              <label style={lbl}>Objet</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inp, fontWeight: 600 }} />
            </div>

            {/* Corps */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={lbl}>Corps de l'email</label>
              <textarea value={body} onChange={e => setBody(e.target.value)}
                style={{ ...inp, flex: 1, resize: 'none', fontFamily: 'inherit', lineHeight: 1.65, fontSize: 12, minHeight: 280 }} />
            </div>

            <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
              💡 La signature Gmail sera ajoutée automatiquement à l'envoi
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={onClose} style={btnSec}>Annuler</button>
              <button onClick={handleSend} disabled={!client.email}
                style={{ ...btnPrimary, opacity: client.email ? 1 : 0.5 }}>
                📧 Ouvrir dans Gmail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DEVIS — GÉNÉRATION PDF
// ══════════════════════════════════════════════════════════════════

const DEVIS_TARIFS = {
  audit_menu: [
    { label: 'Moins de 30 références', prix: 490 },
    { label: '30 à 60 références', prix: 640 },
    { label: 'Plus de 60 références', prix: 790 },
  ],
  audit_menu_financier: [
    { label: 'Établissement solo / TPE', prix: 990 },
    { label: 'Multi-concept ou 2 sites', prix: 1290 },
    { label: 'Structure complexe', prix: 1490 },
  ],
  suivi_mensuel: [
    { label: 'Avec Audit Complet préalable', prix: 490, suffix: '/mois' },
    { label: 'Sans audit préalable', prix: 690, suffix: '/mois (1er mois audit inclus)' },
  ],
};

function fmtDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Génération HTML Facture ───────────────────────────────────────
function generateFactureHTML(facture, client) {
  const montant = +facture.montant || 0;
  const acompte = Math.round(montant / 2 * 100) / 100;
  const fmt = v => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateEmission = facture.date_emission ? new Date(facture.date_emission).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const dateEcheance = facture.date_echeance ? new Date(facture.date_echeance).toISOString().split('T')[0] : '';

  // Détecter le type d'audit pour pré-cocher
  const isComplet = facture.formule?.toLowerCase().includes('complet') || facture.formule?.toLowerCase().includes('financier');
  const isMenu = !isComplet && (facture.formule?.toLowerCase().includes('menu') || facture.formule?.toLowerCase().includes('audit'));
  const auditLabel = isComplet ? 'Audit Complet — Menu + Financier & CMV' : isMenu ? 'Audit Menu — Ingénierie de carte' : facture.formule || '— Prestation de conseil —';

  // Déterminer si acompte ou solde selon statut
  const isAcompte = ['brouillon', 'envoyee', 'attente'].includes(facture.statut);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${facture.numero} — La Carte</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
:root { --marine:#0D1B2A; --or:#C9A84C; --creme:#F0E6C8; --creme-light:#FAF5EA; --or-light:rgba(201,168,76,0.12); }
body { background:#e8e0d0; font-family:'Space Mono',monospace; color:var(--marine); padding:40px 20px 80px; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
.toolbar { width:210mm; margin:0 auto 16px; display:flex; gap:10px; justify-content:flex-end; }
.btn { font-family:'Bebas Neue',sans-serif; font-size:12px; letter-spacing:3px; padding:10px 22px; border:none; cursor:pointer; transition:all .2s; }
.btn-print { background:var(--marine); color:var(--or); }
.btn-print:hover { background:#1a3048; }
.page { width:210mm; min-height:297mm; margin:0 auto; background:var(--creme-light); position:relative; overflow:hidden; box-shadow:0 8px 40px rgba(13,27,42,0.25); }
.page::before { content:''; position:absolute; top:0; right:0; width:0; height:0; border-style:solid; border-width:0 80px 80px 0; border-color:transparent var(--or) transparent transparent; z-index:2; }
.page::after { content:''; position:absolute; top:-60px; left:-60px; width:280px; height:280px; background:radial-gradient(circle,rgba(201,168,76,0.08) 0%,transparent 70%); z-index:0; pointer-events:none; }
input[type="text"],input[type="date"],input[type="number"],select { font-family:'Space Mono',monospace; font-size:10px; color:var(--marine); background:transparent; border:none; border-bottom:1.5px solid rgba(13,27,42,0.3); outline:none; padding:1px 3px; }
input[type="text"]:focus,input[type="date"]:focus,input[type="number"]:focus { border-bottom-color:var(--or); background:rgba(201,168,76,0.06); }
input::placeholder { color:rgba(13,27,42,0.28); font-style:italic; }
.on-dark input { color:var(--creme); border-bottom-color:rgba(240,230,200,0.25); }
.on-dark input:focus { border-bottom-color:var(--or); background:rgba(255,255,255,0.05); }
.on-dark input::placeholder { color:rgba(240,230,200,0.3); }
.header { background:var(--marine); padding:36px 40px 30px; display:flex; justify-content:space-between; align-items:flex-end; position:relative; z-index:1; }
.logo-name { font-family:'Bebas Neue',sans-serif; font-size:34px; letter-spacing:6px; color:var(--creme); line-height:1; }
.logo-name span { color:var(--or); }
.logo-tagline { font-family:'Cormorant Garamond',serif; font-size:11px; font-style:italic; color:rgba(240,230,200,0.5); letter-spacing:3px; margin-top:4px; }
.doc-label { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:5px; color:var(--or); line-height:1; }
.doc-number { font-family:'Space Mono',monospace; font-size:11px; color:rgba(240,230,200,0.6); margin-top:6px; }
.doc-number input { font-size:11px; width:120px; color:rgba(240,230,200,0.85); border-bottom-color:rgba(240,230,200,0.2); }
.gold-bar { height:3px; background:linear-gradient(90deg,var(--or) 0%,rgba(201,168,76,0.2) 100%); }
.body { padding:36px 40px; position:relative; z-index:1; }
.meta-row { display:flex; justify-content:space-between; margin-bottom:36px; gap:24px; }
.meta-block { flex:1; }
.meta-label { font-family:'Bebas Neue',sans-serif; font-size:10px; letter-spacing:3px; color:var(--or); margin-bottom:10px; }
.meta-value { font-family:'Space Mono',monospace; font-size:10px; color:var(--marine); line-height:2; }
.meta-value input[type="text"] { width:180px; }
.meta-value input[type="date"] { width:120px; font-size:9.5px; }
.section-title { font-family:'Bebas Neue',sans-serif; font-size:12px; letter-spacing:4px; color:var(--or); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid rgba(201,168,76,0.3); }
.audit-type-row { display:flex; gap:24px; margin-bottom:20px; align-items:center; }
.audit-type-row label { display:flex; align-items:center; gap:8px; font-family:'Space Mono',monospace; font-size:10px; color:var(--marine); cursor:pointer; padding:8px 16px; border:1.5px solid rgba(13,27,42,0.15); transition:all .2s; }
.audit-type-row label:hover { border-color:var(--or); background:var(--or-light); }
.audit-type-row input[type="radio"] { accent-color:var(--or); width:14px; height:14px; }
.audit-type-row label.selected { border-color:var(--or); background:var(--or-light); font-weight:700; }
.service-table { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:10px; }
.service-table thead tr { background:var(--marine); }
.service-table thead th { font-family:'Bebas Neue',sans-serif; font-size:10px; letter-spacing:2px; color:var(--or); padding:10px 12px; text-align:left; font-weight:400; }
.service-table thead th:nth-child(2),.service-table thead th:nth-child(3),.service-table thead th:last-child { text-align:right; }
.service-table tbody tr { border-bottom:1px solid rgba(13,27,42,0.08); }
.service-table tbody tr:nth-child(even) { background:var(--or-light); }
.service-table tbody td { padding:10px 12px; font-family:'Space Mono',monospace; font-size:9.5px; color:var(--marine); vertical-align:middle; }
.service-table tbody td:nth-child(2),.service-table tbody td:nth-child(3),.service-table tbody td:last-child { text-align:right; }
.service-table input[type="text"] { width:100%; max-width:240px; }
.service-table input[type="number"] { width:80px; text-align:right; font-size:9.5px; }
.desc-sub { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:11px; color:rgba(13,27,42,0.55); margin-top:3px; }
.desc-sub input { width:200px; font-size:10px; font-style:italic; font-family:'Cormorant Garamond',serif; }
.total-read { font-family:'Space Mono',monospace; font-size:9.5px; color:var(--marine); font-weight:700; }
.totals-area { display:flex; justify-content:flex-end; margin-top:4px; margin-bottom:28px; }
.totals-table { width:280px; font-size:10px; border-collapse:collapse; }
.totals-table tr td { padding:5px 10px; font-family:'Space Mono',monospace; }
.totals-table tr td:last-child { text-align:right; }
.totals-table tr.total-ht td { color:rgba(13,27,42,0.65); font-size:9.5px; border-top:1px solid rgba(13,27,42,0.15); }
.totals-table tr.tva td { color:rgba(13,27,42,0.65); font-size:9.5px; }
.totals-table tr.total-ttc td { background:var(--marine); color:var(--creme); font-family:'Bebas Neue',sans-serif; font-size:13px; letter-spacing:2px; padding:10px 12px; }
.totals-table tr.total-ttc td:last-child { color:var(--or); font-size:15px; }
.acompte-section { background:var(--marine); padding:24px 28px; margin-bottom:20px; position:relative; overflow:hidden; }
.acompte-header { font-family:'Bebas Neue',sans-serif; font-size:13px; letter-spacing:4px; color:var(--or); margin-bottom:16px; }
.acompte-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.acompte-item-label { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:10px; color:rgba(240,230,200,0.55); letter-spacing:1px; margin-bottom:6px; }
.acompte-amount { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:2px; color:var(--or); line-height:1; }
.acompte-amount.solde-color { color:var(--creme); }
.acompte-item-note { font-family:'Space Mono',monospace; font-size:8.5px; color:rgba(240,230,200,0.45); margin-top:4px; }
.solde-section { background:var(--or-light); border:1px solid rgba(201,168,76,0.35); border-left:3px solid var(--or); padding:16px 20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; gap:16px; }
.solde-label { font-family:'Bebas Neue',sans-serif; font-size:11px; letter-spacing:3px; color:var(--marine); margin-bottom:10px; }
.echéance-radios { display:flex; gap:20px; }
.echéance-radios label { display:flex; align-items:center; gap:6px; font-family:'Cormorant Garamond',serif; font-style:italic; font-size:11px; color:rgba(13,27,42,0.65); cursor:pointer; }
.echéance-radios input[type="radio"] { accent-color:var(--or); }
.solde-amount-display { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:2px; color:var(--marine); white-space:nowrap; min-width:140px; text-align:right; }
.solde-amount-display span { color:var(--or); }
.payment-section { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
.payment-box { background:white; border:1px solid rgba(13,27,42,0.1); padding:16px; }
.payment-box-title { font-family:'Bebas Neue',sans-serif; font-size:10px; letter-spacing:3px; color:var(--or); margin-bottom:10px; }
.payment-line { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.payment-key { font-family:'Cormorant Garamond',serif; font-style:italic; color:rgba(13,27,42,0.55); font-size:10px; }
.payment-val { font-family:'Space Mono',monospace; color:var(--marine); font-weight:700; font-size:9px; }
.payment-val input { width:130px; font-size:9px; font-weight:700; }
.footer { background:var(--marine); padding:16px 40px; display:flex; justify-content:space-between; align-items:center; }
.footer-brand { font-family:'Bebas Neue',sans-serif; font-size:13px; letter-spacing:4px; color:rgba(240,230,200,0.3); }
.footer-brand span { color:var(--or); }
.footer-legal { font-family:'Space Mono',monospace; font-size:7.5px; color:rgba(240,230,200,0.3); text-align:right; line-height:1.7; }
@media print { body { background:none; padding:0; } .toolbar { display:none; } .page { box-shadow:none; margin:0; width:100%; min-height:100vh; } input,select { border-bottom:1px solid rgba(13,27,42,0.2)!important; background:transparent!important; } .on-dark input { border-bottom:1px solid rgba(240,230,200,0.2)!important; } .audit-type-row label { border:1px solid rgba(13,27,42,0.12)!important; } .audit-type-row label.selected { border:1.5px solid var(--or)!important; } }
</style>
</head>
<body>

<div class="toolbar">
  <button class="btn btn-print" onclick="window.print()">⎙ IMPRIMER / EXPORTER PDF</button>
</div>

<div class="page">
  <div class="header">
    <div class="logo-block">
      <div class="logo-name">LA <span>CARTE</span></div>
      <div class="logo-tagline">Conseil · Analyse · Recette · Tactique · Exploitation</div>
    </div>
    <div class="doc-type-block">
      <div class="doc-label">FACTURE</div>
      <div class="doc-number on-dark">
        N°&nbsp;<input type="text" id="num_facture" value="${facture.numero || ''}" style="width:110px; font-size:11px; color:rgba(240,230,200,0.85); border-bottom-color:rgba(240,230,200,0.2);">
      </div>
    </div>
  </div>
  <div class="gold-bar"></div>

  <div class="body">
    <div class="meta-row">
      <div class="meta-block">
        <div class="meta-label">ÉMETTEUR</div>
        <div class="meta-value">
          <strong>Anthony Grimault</strong><br>
          La Carte — Restaurant Advisory<br>
          ${facture._settings?.adresse ? `<span>${facture._settings.adresse}</span><br>` : '<input type="text" placeholder="Adresse" style="width:190px;"><br>'}
          ${(facture._settings?.code_postal || facture._settings?.ville) ? `<span>${[facture._settings.code_postal, facture._settings.ville].filter(Boolean).join(' ')}</span><br>` : '<input type="text" placeholder="Code postal, Ville" style="width:190px;"><br>'}
          ${facture._settings?.telephone ? `${facture._settings.telephone}<br>` : ''}
          SIRET&nbsp;: 950 998 468 00025<br>
          lacarte.advisory@gmail.com<br>
          TVA non applicable — Art. 293 B CGI
        </div>
      </div>
      <div class="meta-block">
        <div class="meta-label">CLIENT</div>
        <div class="meta-value">
          <input type="text" value="${client ? (client.name || '') + (client.company ? ' — ' + client.company : '') : (facture.client_nom || '')}" style="width:190px;"><br>
          <input type="text" placeholder="Adresse ligne 1" style="width:190px;"><br>
          <input type="text" placeholder="Code postal, Ville" style="width:190px;"><br>
          SIRET&nbsp;: <input type="text" placeholder="950 998 468 00025" style="width:150px;">
        </div>
      </div>
      <div class="meta-block" style="flex:0.75; text-align:right;">
        <div class="meta-label">DATES</div>
        <div class="meta-value" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
          <label style="display:flex; align-items:center; gap:6px;">
            <span>Émission</span>
            <input type="date" value="${dateEmission}" style="width:130px;">
          </label>
          <label style="display:flex; align-items:center; gap:6px;">
            <span>Commande</span>
            <input type="date" style="width:130px;">
          </label>
          <label style="display:flex; align-items:center; gap:6px;">
            <span>Rapport</span>
            <input type="date" value="${dateEcheance}" style="width:130px;">
          </label>
        </div>
      </div>
    </div>

    <div class="section-title">TYPE D'AUDIT</div>
    <div class="audit-type-row" style="margin-bottom:24px;">
      <label id="lbl_menu" class="${isMenu ? 'selected' : ''}">
        <input type="radio" name="audit_type" value="menu" ${isMenu ? 'checked' : ''} onchange="updateAuditType()">
        Audit Menu &nbsp;<span style="color:rgba(13,27,42,0.45); font-size:9px;">490 – 790 €</span>
      </label>
      <label id="lbl_complet" class="${isComplet ? 'selected' : ''}">
        <input type="radio" name="audit_type" value="complet" ${isComplet ? 'checked' : ''} onchange="updateAuditType()">
        Audit Complet &nbsp;<span style="color:rgba(13,27,42,0.45); font-size:9px;">990 – 1 490 €</span>
      </label>
      <div style="flex:1; display:flex; align-items:center; gap:8px;">
        <span style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:11px; color:rgba(13,27,42,0.5);">Objet :</span>
        <input type="text" value="${facture.formule || ''}" placeholder="ex : Ingénierie menu — Le Comptoir du Marché" style="width:280px; font-size:10px;">
      </div>
    </div>

    <div class="section-title">PRESTATIONS FACTURÉES</div>
    <table class="service-table">
      <thead>
        <tr>
          <th style="width:46%">DÉSIGNATION</th>
          <th style="width:12%">QTÉ</th>
          <th style="width:20%">P.U. HT</th>
          <th style="width:22%">TOTAL HT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div id="audit_label_display" style="font-weight:700; font-size:10px; margin-bottom:3px;">${auditLabel}</div>
            <div class="desc-sub">
              <input type="text" placeholder="Précisions (périmètre, restaurant…)" style="width:220px;" value="${client?.company || ''}">
            </div>
          </td>
          <td>1</td>
          <td style="text-align:right;">
            <input type="number" id="ligne1_pu" value="${montant}" min="0" step="0.01" oninput="calcTotals()" style="width:80px; text-align:right;"> €
          </td>
          <td style="text-align:right;"><span class="total-read" id="ligne1_total">${fmt(montant)}</span> €</td>
        </tr>
        <tr>
          <td>
            <div style="font-weight:700; font-size:10px; margin-bottom:3px;">Frais annexes</div>
            <div class="desc-sub"><input type="text" placeholder="Déplacements, impressions…" style="width:220px;"></div>
          </td>
          <td>1</td>
          <td style="text-align:right;"><input type="number" id="ligne2_pu" placeholder="0" min="0" step="0.01" oninput="calcTotals()" style="width:80px; text-align:right;"> €</td>
          <td style="text-align:right;"><span class="total-read" id="ligne2_total">—</span> €</td>
        </tr>
        <tr>
          <td>
            <div style="font-weight:700; font-size:10px; margin-bottom:3px;">Autre</div>
            <div class="desc-sub"><input type="text" placeholder="Désignation libre…" style="width:220px;"></div>
          </td>
          <td><input type="number" id="ligne3_qty" placeholder="1" min="0" step="1" value="1" oninput="calcTotals()" style="width:36px; text-align:center;"></td>
          <td style="text-align:right;"><input type="number" id="ligne3_pu" placeholder="0" min="0" step="0.01" oninput="calcTotals()" style="width:80px; text-align:right;"> €</td>
          <td style="text-align:right;"><span class="total-read" id="ligne3_total">—</span> €</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr class="total-ht"><td>Montant HT</td><td><span id="display_ht">${fmt(montant)}</span> €</td></tr>
        <tr class="tva">
          <td>TVA &nbsp;<select id="tva_rate" onchange="calcTotals()" style="width:52px; border-bottom:none; font-size:9px; color:rgba(13,27,42,0.65);">
            <option value="0" selected>0 %</option><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option>
          </select></td>
          <td><span id="display_tva">0,00</span> €</td>
        </tr>
        <tr class="total-ttc"><td>TOTAL TTC</td><td><span id="display_ttc">${fmt(montant)}</span> €</td></tr>
      </table>
    </div>

    <div class="acompte-section on-dark">
      <div class="acompte-header">ÉCHÉANCIER DE PAIEMENT</div>
      <div class="acompte-grid">
        <div class="acompte-item">
          <div class="acompte-item-label">Acompte à la commande — 50 %</div>
          <div class="acompte-amount" id="display_acompte">${fmt(acompte)} €</div>
          <div class="acompte-item-note">Exigible à la signature de la commande</div>
        </div>
        <div class="acompte-item" style="border-left:1px solid rgba(201,168,76,0.2); padding-left:20px;">
          <div class="acompte-item-label">Solde à la remise du rapport — 50 %</div>
          <div class="acompte-amount solde-color" id="display_solde">${fmt(acompte)} €</div>
          <div class="acompte-item-note">Exigible à la livraison du rapport final</div>
        </div>
      </div>
    </div>

    <div class="solde-section">
      <div style="flex:1;">
        <div class="solde-label">MONTANT DÛ SUR LA PRÉSENTE FACTURE</div>
        <div class="echéance-radios">
          <label>
            <input type="radio" name="echeance" value="acompte" ${isAcompte ? 'checked' : ''} onchange="updateEcheanceDisplay()">
            Acompte — dû à la signature
          </label>
          <label>
            <input type="radio" name="echeance" value="solde" ${!isAcompte ? 'checked' : ''} onchange="updateEcheanceDisplay()">
            Solde — dû à la remise du rapport
          </label>
        </div>
      </div>
      <div class="solde-amount-display" id="echeance_display">${fmt(isAcompte ? acompte : acompte)} <span>€</span></div>
    </div>

    <div class="payment-section">
      <div class="payment-box">
        <div class="payment-box-title">COORDONNÉES BANCAIRES</div>
        <div class="payment-line"><span class="payment-key">Titulaire</span><span class="payment-val"><input type="text" value="Anthony Grimault" style="width:140px;"></span></div>
        <div class="payment-line"><span class="payment-key">IBAN</span><span class="payment-val"><input type="text" id="iban_input" value="${facture._settings?.iban || ''}" placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" style="width:200px;"></span></div>
        <div class="payment-line"><span class="payment-key">BIC</span><span class="payment-val"><input type="text" id="bic_input" value="${facture._settings?.bic || ''}" placeholder="XXXXXXXX" style="width:100px;"></span></div>
        <div class="payment-line"><span class="payment-key">Banque</span><span class="payment-val"><input type="text" value="${facture._settings?.banque || ''}" placeholder="Nom de la banque" style="width:140px;"></span></div>
      </div>
      <div class="payment-box">
        <div class="payment-box-title">CONDITIONS</div>
        <div class="payment-line"><span class="payment-key">Délai de paiement</span><span class="payment-val">30 jours</span></div>
        <div class="payment-line"><span class="payment-key">Mode de règlement</span><span class="payment-val">Virement bancaire</span></div>
        <div class="payment-line"><span class="payment-key">Pénalités de retard</span><span class="payment-val">3× taux légal</span></div>
        <div class="payment-line"><span class="payment-key">Indemnité forfaitaire</span><span class="payment-val">40 € / facture</span></div>
        <div class="payment-line" style="margin-top:8px;">
          <span class="payment-key" style="font-size:8.5px; color:rgba(13,27,42,0.4); font-style:italic;">TVA non applicable — Art. 293 B du CGI</span>
        </div>
      </div>
    </div>
    ${facture.notes ? `<div style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:11px; color:rgba(13,27,42,0.55); margin-bottom:20px; padding:10px 14px; border-left:3px solid var(--or);">${facture.notes}</div>` : ''}
  </div>

  <div class="footer">
    <div class="footer-brand">LA <span>CARTE</span></div>
    <div class="footer-legal">
      Anthony Grimault · Auto-entrepreneur · SIRET : 950 998 468 00025<br>
      lacarte.advisory@gmail.com · TVA non applicable — Art. 293 B du CGI<br>
      Tout litige sera soumis à la compétence des tribunaux compétents
    </div>
  </div>
</div>

<script>
  const fmt = v => v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
  function calcTotals() {
    const l1 = parseFloat(document.getElementById('ligne1_pu').value)||0;
    const l2 = parseFloat(document.getElementById('ligne2_pu').value)||0;
    const l3q = parseFloat(document.getElementById('ligne3_qty').value)||1;
    const l3 = (parseFloat(document.getElementById('ligne3_pu').value)||0)*l3q;
    const ht = l1+l2+l3;
    const tvaRate = parseFloat(document.getElementById('tva_rate').value)/100;
    const tva = ht*tvaRate; const ttc = ht+tva; const acompte = ttc/2;
    document.getElementById('ligne1_total').textContent = l1>0?fmt(l1):'—';
    document.getElementById('ligne2_total').textContent = l2>0?fmt(l2):'—';
    document.getElementById('ligne3_total').textContent = l3>0?fmt(l3):'—';
    document.getElementById('display_ht').textContent = fmt(ht);
    document.getElementById('display_tva').textContent = fmt(tva);
    document.getElementById('display_ttc').textContent = fmt(ttc);
    document.getElementById('display_acompte').textContent = fmt(acompte)+' €';
    document.getElementById('display_solde').textContent = fmt(acompte)+' €';
    updateEcheanceDisplay();
  }
  function updateEcheanceDisplay() {
    const sel = document.querySelector('input[name="echeance"]:checked').value;
    const val = sel==='acompte'?document.getElementById('display_acompte').textContent:document.getElementById('display_solde').textContent;
    document.getElementById('echeance_display').innerHTML = val.replace(' €','')+' <span>€</span>';
  }
  function updateAuditType() {
    const val = document.querySelector('input[name="audit_type"]:checked')?.value;
    document.getElementById('lbl_menu').classList.toggle('selected',val==='menu');
    document.getElementById('lbl_complet').classList.toggle('selected',val==='complet');
  }
</script>
</body></html>`;
}

function generateDevisHTML(client, form) {

  const today = new Date();
  const validity = new Date(today); validity.setDate(validity.getDate() + 30);
  const tarifs = DEVIS_TARIFS[form.formula] || DEVIS_TARIFS.audit_menu;
  const tarif = tarifs[form.tarifIdx] || tarifs[0];
  const prixFinal = form.prixFinal != null ? form.prixFinal : (form.customPrice !== '' ? +form.customPrice : tarif.prix);
  const acompte = form.formula === 'suivi_mensuel' ? prixFinal : Math.round(prixFinal * 0.5);
  const phoneStr = form.phone || '+33 X XX XX XX XX';

  const FORMULA_LABELS = {
    audit_menu: 'Audit Menu',
    audit_menu_financier: 'Audit Complet',
    suivi_mensuel: 'Retainer Mensuel',
  };
  const formulaLabel = FORMULA_LABELS[form.formula] || 'Audit Menu';

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.55; background: #fff; }
    .page { width: 210mm; min-height: 297mm; padding: 18mm 18mm 16mm; page-break-after: always; position: relative; }
    .page:last-child { page-break-after: avoid; }

    /* Header La Carte */
    .lc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #C9A84C; }
    .lc-logo { display: flex; align-items: center; gap: 10px; }
    .lc-logo-box { width: 38px; height: 38px; background: #0D1520; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
    .lc-logo-la { color: #C9A84C; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-align: center; line-height: 1.1; }
    .lc-logo-carte { color: #fff; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; }
    .lc-tagline { font-size: 8px; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
    .lc-header-right { text-align: right; font-size: 10px; color: #64748b; }
    .lc-header-right strong { color: #0D1520; font-size: 11px; }

    /* Page footer */
    .page-footer { position: absolute; bottom: 10mm; left: 18mm; right: 18mm; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; border-top: 1px solid #EEE6C9; padding-top: 5px; }

    /* Cover page */
    .cover-flag { background: #0D1520; color: #EEE6C9; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 6px 14px; display: inline-block; margin-bottom: 28px; }
    .cover-title { font-size: 26px; font-weight: 800; color: #0D1520; line-height: 1.15; margin-bottom: 4px; }
    .cover-subtitle { font-size: 14px; color: #64748b; margin-bottom: 32px; }
    .cover-gold-line { width: 48px; height: 3px; background: #C9A84C; margin-bottom: 32px; }

    .cover-section { margin-bottom: 22px; }
    .cover-label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #C9A84C; margin-bottom: 6px; }
    .cover-client-name { font-size: 17px; font-weight: 800; color: #0D1520; }
    .cover-client-sub { font-size: 12px; color: #64748b; margin-top: 3px; }

    .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; padding: 14px 16px; background: #FAF8F2; border: 1px solid #DDD5B8; border-radius: 6px; }
    .meta-item .meta-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
    .meta-item .meta-val { font-size: 12px; font-weight: 600; color: #0D1520; }

    .sommaire { background: #0D1520; color: #EEE6C9; padding: 16px 18px; border-radius: 6px; margin-bottom: 20px; }
    .sommaire-title { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #C9A84C; margin-bottom: 10px; }
    .sommaire-item { font-size: 10px; padding: 2px 0; display: flex; gap: 10px; }
    .sommaire-num { color: #C9A84C; font-weight: 700; width: 18px; flex-shrink: 0; }

    .conseiller-box { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: 1px solid #C9A84C; border-radius: 6px; background: #FAF8F2; }
    .conseiller-avatar { width: 36px; height: 36px; background: #C9A84C; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0D1520; font-weight: 800; font-size: 14px; flex-shrink: 0; }
    .conseiller-name { font-weight: 700; color: #0D1520; font-size: 12px; }
    .conseiller-sub { font-size: 10px; color: #64748b; margin-top: 1px; }

    /* Formulas */
    .section-title { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #C9A84C; margin-bottom: 14px; }
    .formula-card { border: 1px solid #DDD5B8; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .formula-card.selected { border-color: #C9A84C; border-width: 2px; background: #FAF3E0; }
    .formula-card.recommended { border-color: #0D1520; }
    .formula-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
    .formula-num { width: 26px; height: 26px; background: #0D1520; color: #C9A84C; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0; margin-right: 10px; }
    .formula-name { font-size: 14px; font-weight: 800; color: #0D1520; }
    .formula-desc { font-size: 10px; color: #64748b; margin-top: 1px; }
    .formula-price { text-align: right; }
    .formula-price-val { font-size: 16px; font-weight: 800; color: #C9A84C; }
    .formula-price-sub { font-size: 9px; color: #94a3b8; }
    .rec-badge { background: #0D1520; color: #C9A84C; font-size: 8px; font-weight: 700; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.5px; }

    .delivrable { display: flex; align-items: flex-start; gap: 7px; font-size: 10px; color: #374151; padding: 3px 0; }
    .delivrable-check { color: #C9A84C; font-weight: 700; flex-shrink: 0; }
    .data-req { font-size: 10px; color: #64748b; padding: 2px 0; }
    .data-req::before { content: "→ "; color: #C9A84C; font-weight: 700; }

    .tarif-line { display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; border-radius: 4px; font-size: 11px; }
    .tarif-line.selected-tarif { background: #FAF3E0; border: 1px solid #C9A84C; font-weight: 700; }

    /* Engagements */
    .engagement-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .engagement { padding: 12px; border: 1px solid #DDD5B8; border-radius: 6px; }
    .engagement-icon { font-size: 14px; margin-bottom: 5px; }
    .engagement-title { font-size: 10px; font-weight: 700; color: #0D1520; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .engagement-text { font-size: 9.5px; color: #64748b; line-height: 1.5; }

    .paiement-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .paiement-table th { background: #0D1520; color: #EEE6C9; padding: 7px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    .paiement-table td { padding: 7px 10px; border-bottom: 1px solid #EEE6C9; }
    .paiement-table tr:last-child td { border-bottom: none; }

    /* Comparison */
    .compare-table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 16px; }
    .compare-table th { background: #0D1520; color: #EEE6C9; padding: 8px 10px; text-align: center; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    .compare-table th:first-child { text-align: left; }
    .compare-table td { padding: 6px 10px; border-bottom: 1px solid #EEE6C9; text-align: center; }
    .compare-table td:first-child { text-align: left; font-weight: 500; color: #374151; }
    .compare-table tr:nth-child(even) td { background: #FAF8F2; }
    .check-yes { color: #059669; font-weight: 700; }
    .check-no  { color: #d1d5db; }
    .check-part{ color: #d97706; font-size: 9px; }

    /* Acceptance */
    .steps { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .step { display: flex; align-items: flex-start; gap: 12px; }
    .step-num { width: 22px; height: 22px; background: #C9A84C; color: #0D1520; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; flex-shrink: 0; }
    .step-text { font-size: 11px; color: #374151; padding-top: 2px; }
    .step-text strong { color: #0D1520; display: block; margin-bottom: 1px; }

    .bpa { border: 2px solid #0D1520; border-radius: 8px; padding: 20px; }
    .bpa-title { font-size: 13px; font-weight: 800; color: #0D1520; text-align: center; margin-bottom: 16px; letter-spacing: -0.2px; }
    .bpa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .bpa-party-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .bpa-field { border-bottom: 1px solid #DDD5B8; padding-bottom: 4px; margin-bottom: 12px; font-size: 11px; color: #374151; min-height: 24px; }
    .bpa-field-label { font-size: 9px; color: #94a3b8; margin-bottom: 2px; }
    .bpa-sig-box { border: 1px solid #DDD5B8; border-radius: 4px; height: 60px; background: #FAF8F2; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; }

    .highlight-box { background: #FAF3E0; border: 1px solid #C9A84C; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
    .highlight-box .hl-label { font-size: 9px; font-weight: 700; color: #C9A84C; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .highlight-box .hl-val { font-size: 16px; font-weight: 800; color: #0D1520; }
    .hl-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  `;

  const header = (pageNum) => `
    <div class="lc-header">
      <div class="lc-logo">
        <div class="lc-logo-box">
          <div>
            <div class="lc-logo-la">LA</div>
            <div class="lc-logo-carte">CARTE</div>
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:#0D1520;letter-spacing:0.3px;">Restaurant Advisory</div>
          <div class="lc-tagline">Conseil · Analyse · Recette · Tactique · Exploitation</div>
        </div>
      </div>
      <div class="lc-header-right">
        <strong>DEVIS N° ${form.devisNum}</strong><br>
        Page ${pageNum}<br>
        <span style="color:#C9A84C;font-weight:600;">${form.formula !== 'suivi_mensuel' ? `${formulaLabel}` : 'Retainer Mensuel'}</span>
      </div>
    </div>`;

  const footer = `<div class="page-footer"><span>La Carte · Restaurant Advisory · lacarte.advisory@gmail.com · Document confidentiel</span><span>Devis N° ${form.devisNum} · ${fmtDate(today)}</span></div>`;

  // ── PAGE 1 — COUVERTURE ─────────────────────────────────────────
  const page1 = `
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
      <div class="lc-logo">
        <div class="lc-logo-box" style="width:50px;height:50px;">
          <div><div class="lc-logo-la" style="font-size:11px;">LA</div><div class="lc-logo-carte" style="font-size:17px;">CARTE</div></div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:800;color:#0D1520;letter-spacing:0.5px;">Restaurant Advisory</div>
          <div class="lc-tagline" style="font-size:9px;">Conseil · Analyse · Recette · Tactique · Exploitation</div>
        </div>
      </div>
      <div style="text-align:right;font-size:10px;color:#94a3b8;">
        <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#C9A84C;font-weight:700;">N° ${form.devisNum}</div>
      </div>
    </div>
    <div style="height:2px;background:#C9A84C;margin-bottom:32px;"></div>

    <div class="cover-flag">RESTAURANT ADVISORY</div>
    <div class="cover-title">PROPOSITION COMMERCIALE<br>Devis de Conseil</div>
    <div class="cover-subtitle">Ingénierie de Menu & Optimisation Financière CHR</div>
    <div class="cover-gold-line"></div>

    <div class="cover-section">
      <div class="cover-label">Établi pour</div>
      <div class="cover-client-name">${client.company}</div>
      <div class="cover-client-sub">${form.typeEtablissement || '[Type d\'établissement]'}</div>
      <div class="cover-client-sub" style="margin-top:4px;">${client.email || ''}${client.email && client.phone ? ' · ' : ''}${client.phone || ''}</div>
    </div>

    <div class="cover-meta">
      <div class="meta-item">
        <div class="meta-label">Date d'émission</div>
        <div class="meta-val">${fmtDate(today)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Validité</div>
        <div class="meta-val">30 jours — jusqu'au ${fmtDate(validity)}</div>
      </div>
    </div>

    <div style="background:#f8fafc;border:1px solid #DDD5B8;border-radius:6px;padding:12px 16px;margin-bottom:20px;font-size:10.5px;color:#374151;line-height:1.65;">
      <div style="font-size:9px;font-weight:700;color:#C9A84C;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Contexte de la mission</div>
      ${form.contexte || 'Suite à notre premier contact, La Carte vous soumet cette proposition sur mesure. Forte de 15 ans d\'expérience en restauration combinée à une expertise comptable et revenue management, notre approche 100 % distancielle vous permet d\'accéder à un niveau de conseil habituellement réservé aux groupes, au tarif d\'un prestataire indépendant.'}
    </div>

    <div class="sommaire">
      <div class="sommaire-title">Ce document contient</div>
      <div class="sommaire-item"><span class="sommaire-num">01</span> Présentation des 3 formules de conseil</div>
      <div class="sommaire-item"><span class="sommaire-num">02</span> Détail des livrables et méthodologie</div>
      <div class="sommaire-item"><span class="sommaire-num">03</span> Tarification et conditions de règlement</div>
      <div class="sommaire-item"><span class="sommaire-num">04</span> Engagements contractuels (délais, confidentialité, déontologie)</div>
      <div class="sommaire-item"><span class="sommaire-num">05</span> Bon pour accord & modalités d'acceptation</div>
    </div>

    <div class="conseiller-box">
      <div class="conseiller-avatar">A</div>
      <div>
        <div class="conseiller-name">Anthony Grimault — Votre Conseiller</div>
        <div class="conseiller-sub">lacarte.advisory@gmail.com · ${phoneStr}</div>
      </div>
    </div>
    ${footer}
  </div>`;

  // ── PAGE 2 — FORMULES ───────────────────────────────────────────
  const page2 = `
  <div class="page">
    ${header(2)}
    <div class="section-title">Nos formules de conseil</div>

    <div class="formula-card ${form.formula === 'audit_menu' ? 'selected' : ''}">
      <div class="formula-header">
        <div style="display:flex;align-items:center;">
          <div class="formula-num">01</div>
          <div>
            <div class="formula-name">Audit Menu</div>
            <div class="formula-desc">Analyse de carte & rentabilité par plat</div>
          </div>
        </div>
        <div class="formula-price">
          <div class="formula-price-val">À partir de 490 €</div>
          <div class="formula-price-sub">Livraison sous 7 jours ouvrés</div>
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Livrables inclus</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Matrice menu engineering complète (Stars / Vaches / Énigmes / Poids morts)</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Analyse de la contribution marginale par plat et par famille</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Identification des plats à repositionner, supprimer ou valoriser</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Recommandations de re-pricing avec simulation d'impact sur le CA</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Rapport PDF personnalisé (15–25 pages, charte La Carte)</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Appel de restitution visio (45 min) avec synthèse commentée</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Plan d'action priorisé S1 / M1 / M2-3</div>
      </div>
      <div style="display:flex;gap:20px;">
        <div style="flex:1;">
          <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Données requises</div>
          <div class="data-req">Carte actuelle complète (prix + intitulés)</div>
          <div class="data-req">Coûts matière par plat ou bon de commande fournisseur</div>
          <div class="data-req">Volumes de ventes sur 3 mois minimum</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Tarification</div>
          ${DEVIS_TARIFS.audit_menu.map((t, i) =>
    `<div class="tarif-line${form.formula === 'audit_menu' && form.tarifIdx === i ? ' selected-tarif' : ''}">
              <span>${t.label}</span><span style="font-weight:700;">${t.prix} €</span>
            </div>`
  ).join('')}
        </div>
      </div>
    </div>

    <div class="formula-card ${form.formula === 'audit_menu_financier' ? 'selected' : ''}" style="border-color:${form.formula !== 'audit_menu_financier' ? '#0D1520' : '#C9A84C'};">
      <div class="formula-header">
        <div style="display:flex;align-items:center;">
          <div class="formula-num">02</div>
          <div>
            <div class="formula-name">Audit Complet</div>
            <div class="formula-desc">Ingénierie de menu + analyse financière intégrale</div>
          </div>
        </div>
        <div class="formula-price">
          <div class="formula-price-val">À partir de 990 €</div>
          <div class="formula-price-sub">Livraison sous 10 jours · <span class="rec-badge">★ RECOMMANDÉ</span></div>
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Tout l'Audit Menu +</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Analyse complète du CMV global et par famille de produits</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Dépouillement des tickets Z sur 3 à 6 mois (CA réel)</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Calcul du seuil de rentabilité et du point mort mensuel</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Simulation de 2 à 3 scénarios financiers (prix / mix produit)</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> Dashboard Excel livré et réutilisable (CMV, tickets Z, marges)</div>
        <div class="delivrable"><span class="delivrable-check">✓</span> 2 appels de restitution visio inclus (J+7 et J+30)</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Tarification</div>
        ${DEVIS_TARIFS.audit_menu_financier.map((t, i) =>
    `<div class="tarif-line${form.formula === 'audit_menu_financier' && form.tarifIdx === i ? ' selected-tarif' : ''}">
            <span>${t.label}</span><span style="font-weight:700;">${t.prix} €</span>
          </div>`
  ).join('')}
      </div>
    </div>
    ${footer}
  </div>`;

  // ── PAGE 3 — RETAINER + TABLEAU COMPARATIF ─────────────────────
  const page3 = `
  <div class="page">
    ${header(3)}
    <div class="formula-card ${form.formula === 'suivi_mensuel' ? 'selected' : ''}">
      <div class="formula-header">
        <div style="display:flex;align-items:center;">
          <div class="formula-num">03</div>
          <div>
            <div class="formula-name">Retainer Mensuel</div>
            <div class="formula-desc">Suivi continu · pilotage mensuel de la performance</div>
          </div>
        </div>
        <div class="formula-price">
          <div class="formula-price-val">490 € / mois</div>
          <div class="formula-price-sub">Démarrage sous 5 jours</div>
        </div>
      </div>
      <div style="display:flex;gap:20px;margin-bottom:10px;">
        <div style="flex:1.2;">
          <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Inclus chaque mois</div>
          <div class="delivrable"><span class="delivrable-check">✓</span> Revue mensuelle des indicateurs clés (CMV, panier moyen, mix produit)</div>
          <div class="delivrable"><span class="delivrable-check">✓</span> 1 rapport mensuel PDF synthétique (5–10 pages)</div>
          <div class="delivrable"><span class="delivrable-check">✓</span> 1 visio de suivi mensuel (60 min) avec plan d'actions actualisé</div>
          <div class="delivrable"><span class="delivrable-check">✓</span> Alertes proactives en cas de dérive CMV ou de baisse de marge</div>
          <div class="delivrable"><span class="delivrable-check">✓</span> Accès illimité par email entre les sessions (réponse sous 48h)</div>
          <div class="delivrable"><span class="delivrable-check">✓</span> Recommandations saisonnières et ajustements de carte</div>
        </div>
        <div style="flex:0.8;">
          <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Conditions</div>
          ${DEVIS_TARIFS.suivi_mensuel.map((t, i) =>
    `<div class="tarif-line${form.formula === 'suivi_mensuel' && form.tarifIdx === i ? ' selected-tarif' : ''}" style="font-size:10px;">
              <span style="max-width:120px;display:inline-block;line-height:1.3">${t.label}</span>
              <span style="font-weight:700;white-space:nowrap">${t.prix} €${t.suffix || '/mois'}</span>
            </div>`
  ).join('')}
          <div style="font-size:9px;color:#94a3b8;margin-top:6px;">Engagement minimum 3 mois · Résiliation préavis 30 jours</div>
        </div>
      </div>
    </div>

    <div class="section-title" style="margin-top:20px;">Récapitulatif comparatif des 3 formules</div>
    <table class="compare-table">
      <thead>
        <tr>
          <th style="text-align:left;">Livrable / Formule</th>
          <th>Audit Menu</th>
          <th>Audit Complet</th>
          <th>Retainer</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Matrice menu engineering</td><td class="check-yes">✓</td><td class="check-yes">✓</td><td class="check-yes">✓</td></tr>
        <tr><td>Analyse CMV & rentabilité</td><td class="check-part">Partielle</td><td class="check-yes">✓</td><td class="check-yes">✓</td></tr>
        <tr><td>Tickets Z & CA réel</td><td class="check-no">—</td><td class="check-yes">✓</td><td class="check-yes">✓</td></tr>
        <tr><td>Seuil de rentabilité</td><td class="check-no">—</td><td class="check-yes">✓</td><td class="check-yes">✓</td></tr>
        <tr><td>Dashboard Excel livré</td><td class="check-no">—</td><td class="check-yes">✓</td><td class="check-part">Mis à jour</td></tr>
        <tr><td>Rapport PDF personnalisé</td><td class="check-yes">✓</td><td class="check-yes">✓</td><td class="check-part">Mensuel</td></tr>
        <tr><td>Visio(s) incluse(s)</td><td>1×45 min</td><td>2×60 min</td><td>1×60 min/mois</td></tr>
        <tr><td>Email illimité 48h</td><td class="check-no">—</td><td class="check-no">—</td><td class="check-yes">✓</td></tr>
        <tr>
          <td style="font-weight:700;">Tarif</td>
          <td style="font-weight:700;">490–790 €</td>
          <td style="font-weight:700;color:#C9A84C;">990–1 490 €</td>
          <td style="font-weight:700;">490–690 €</td>
        </tr>
      </tbody>
    </table>

    <div class="highlight-box">
      <div class="hl-label">Formule retenue pour ce devis</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
        <div>
          <div style="font-size:16px;font-weight:800;color:#0D1520;">${formulaLabel} — ${tarif.label}</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">${client.company}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22px;font-weight:800;color:#C9A84C;">${prixFinal} €${tarif.suffix || ''}</div>
          ${form.formula !== 'suivi_mensuel' ? `<div style="font-size:10px;color:#64748b;">Acompte 50% : ${acompte} €</div>` : '<div style="font-size:10px;color:#64748b;">Engagement min. 3 mois</div>'}
        </div>
      </div>
    </div>
    ${footer}
  </div>`;

  // ── PAGE 4 — ENGAGEMENTS & CONDITIONS ──────────────────────────
  const page4 = `
  <div class="page">
    ${header(4)}
    <div class="section-title">Nos engagements contractuels</div>
    <div style="font-size:9.5px;color:#64748b;margin-bottom:14px;">Ces engagements s'appliquent à l'ensemble des formules et constituent le cadre déontologique de La Carte.</div>
    <div class="engagement-grid">
      <div class="engagement">
        <div class="engagement-icon">⏱</div>
        <div class="engagement-title">Délais garantis</div>
        <div class="engagement-text">Les délais indiqués sont contractuels. Toute remise hors délai ouvre droit à une réduction de 10 % par jour ouvré de retard, plafonnée à 30 %. F01 : 7 jours · F02 : 10 jours · Retainer : J+5 du mois.</div>
      </div>
      <div class="engagement">
        <div class="engagement-icon">🔒</div>
        <div class="engagement-title">Confidentialité absolue</div>
        <div class="engagement-text">Toutes vos données (CA, coûts matière, tickets Z, fournisseurs) sont traitées avec la plus stricte confidentialité. Aucune information partagée avec des tiers. Un NDA peut être signé sur demande avant tout échange.</div>
      </div>
      <div class="engagement">
        <div class="engagement-icon">📊</div>
        <div class="engagement-title">Transparence méthodologique</div>
        <div class="engagement-text">Chaque recommandation est étayée par des données chiffrées. Aucune supposition non vérifiée ne figure dans les rapports. Donnée manquante = signalée explicitement, jamais estimée sans accord préalable.</div>
      </div>
      <div class="engagement">
        <div class="engagement-icon">⚖️</div>
        <div class="engagement-title">Indépendance & impartialité</div>
        <div class="engagement-text">La Carte ne perçoit aucune commission de fournisseurs ou de tiers. Les recommandations sont exclusivement motivées par votre intérêt économique. Aucun lien commercial n'influence nos analyses.</div>
      </div>
      <div class="engagement">
        <div class="engagement-icon">🔄</div>
        <div class="engagement-title">Droit de révision inclus</div>
        <div class="engagement-text">Un cycle de révision est inclus dans chaque formule. Si le rapport ne répond pas aux objectifs de cadrage, une révision complète est effectuée sans surcoût sous 5 jours ouvrés après restitution.</div>
      </div>
      <div class="engagement">
        <div class="engagement-icon">🎯</div>
        <div class="engagement-title">Périmètre clairement défini</div>
        <div class="engagement-text">La Carte intervient exclusivement sur l'ingénierie de menu et l'optimisation financière CHR. Sujets hors périmètre : HACCP, management, travaux, marketing digital.</div>
      </div>
    </div>

    <div class="section-title">Conditions de règlement</div>
    <table class="paiement-table">
      <thead><tr><th>Modalité</th><th>Détail</th></tr></thead>
      <tbody>
        ${form.formula !== 'suivi_mensuel' ? `
        <tr><td style="font-weight:600;">Acompte</td><td>50 % à la signature — déclenche le démarrage de la mission (${acompte} €)</td></tr>
        <tr><td style="font-weight:600;">Solde</td><td>50 % à la livraison du rapport final, avant la visio de restitution (${acompte} €)</td></tr>` : `
        <tr><td style="font-weight:600;">Retainer</td><td>Facturation mensuelle à terme échu · Paiement sous 15 jours · Tout mois commencé est dû intégralement</td></tr>`}
        <tr><td style="font-weight:600;">Modes acceptés</td><td>Virement bancaire (IBAN fourni à signature) · Chèque</td></tr>
        <tr><td style="font-weight:600;">TVA</td><td>Non applicable — Art. 293 B du CGI (auto-entrepreneur)</td></tr>
      </tbody>
    </table>
    ${footer}
  </div>`;

  // ── PAGE 5 — BON POUR ACCORD ────────────────────────────────────
  const page5 = `
  <div class="page">
    ${header(5)}
    <div class="section-title">Modalités d'acceptation</div>
    <div class="steps">
      <div class="step"><div class="step-num">01</div><div class="step-text"><strong>Choisir votre formule</strong>Indiquez la formule retenue par retour d'email ou par téléphone.</div></div>
      <div class="step"><div class="step-num">02</div><div class="step-text"><strong>Retourner le bon pour accord</strong>Signez le bon ci-dessous (scan ou photo) et retournez-le à lacarte.advisory@gmail.com.</div></div>
      <div class="step"><div class="step-num">03</div><div class="step-text"><strong>Régler l'acompte de 50 %</strong>Le virement de l'acompte déclenche officiellement le démarrage de la mission.</div></div>
      <div class="step"><div class="step-num">04</div><div class="step-text"><strong>Transmettre les données</strong>Un questionnaire de collecte vous sera envoyé sous 24h selon la formule choisie.</div></div>
      <div class="step"><div class="step-num">05</div><div class="step-text"><strong>Démarrage de la mission</strong>Votre conseiller accuse réception et confirme la date de livraison prévue.</div></div>
    </div>

    <div class="bpa">
      <div class="bpa-title">BON POUR ACCORD</div>
      <div style="font-size:10px;color:#64748b;text-align:center;margin-bottom:16px;">À retourner signé par email à lacarte.advisory@gmail.com</div>

      <div style="background:#FAF8F2;border:1px solid #DDD5B8;border-radius:6px;padding:12px 14px;margin-bottom:16px;font-size:11px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Client</div>
            <div style="font-weight:700;color:#0D1520;">${client.company} — ${client.name}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Formule retenue</div>
            <div style="font-weight:700;color:#C9A84C;">${formulaLabel} — ${prixFinal} €${tarif.suffix || ''}</div>
          </div>
        </div>
      </div>

      <div class="bpa-grid">
        <div>
          <div class="bpa-party-title">Client</div>
          <div class="bpa-field-label">Lu et approuvé — Bon pour accord</div>
          <div class="bpa-field">Nom : ${client.name}</div>
          <div class="bpa-field-label">Date</div>
          <div class="bpa-field"></div>
          <div class="bpa-field-label">Signature</div>
          <div class="bpa-sig-box">Signature du client</div>
        </div>
        <div>
          <div class="bpa-party-title">La Carte</div>
          <div class="bpa-field-label">Lu et approuvé — Bon pour accord</div>
          <div class="bpa-field">Nom : Anthony Grimault</div>
          <div class="bpa-field-label">Date</div>
          <div class="bpa-field">${fmtDate(today)}</div>
          <div class="bpa-field-label">Signature</div>
          <div class="bpa-sig-box">Anthony Grimault — La Carte</div>
        </div>
      </div>
    </div>

    <div style="margin-top:14px;font-size:8.5px;color:#94a3b8;text-align:center;line-height:1.5;">
      Devis N° ${form.devisNum} émis le ${fmtDate(today)} · Valable 30 jours · La Carte — Anthony Grimault, auto-entrepreneur · SIRET : 950 998 468 00025 · Non assujetti à la TVA – Art. 293 B du CGI · Toute acceptation du présent devis vaut acceptation des CGV disponibles sur demande.
    </div>
    ${footer}
  </div>`;

  // ── PAGES CGV ───────────────────────────────────────────────────
  const cgvHeader = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #C9A84C;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:34px;height:34px;background:#0D1520;display:flex;align-items:center;justify-content:center;border-radius:4px;">
          <div><div style="color:#C9A84C;font-size:8px;font-weight:800;letter-spacing:1.5px;text-align:center;">LA</div><div style="color:#fff;font-size:12px;font-weight:800;">CARTE</div></div>
        </div>
        <div style="font-size:10px;font-weight:700;color:#0D1520;">Restaurant Advisory</div>
      </div>
      <div style="text-align:right;font-size:9px;color:#64748b;">CONDITIONS GÉNÉRALES DE VENTE<br><span style="color:#C9A84C;font-weight:600;">Version Avril 2025</span></div>
    </div>`;

  const cgvFooter = (pg) => `<div style="position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;border-top:1px solid #EEE6C9;padding-top:5px;"><span>La Carte · lacarte.advisory@gmail.com · Version Avril 2025 · Document confidentiel</span><span>Page ${pg}</span></div>`;

  const artStyle = `<div style="font-size:9.5px;color:#374151;line-height:1.65;margin-bottom:10px;">`;
  const artTitle = (n, t) => `<div style="font-size:11px;font-weight:700;color:#0D1520;margin:14px 0 5px;padding-left:8px;border-left:3px solid #C9A84C;">Article ${n} — ${t}</div>`;
  const bullet = (t) => `<div style="display:flex;gap:8px;margin:3px 0;font-size:9.5px;color:#374151;"><span style="color:#C9A84C;flex-shrink:0;">■</span><span>${t}</span></div>`;

  const cgvPage1 = `
  <div class="page">
    ${cgvHeader}
    <div style="background:#0D1520;color:#EEE6C9;padding:10px 16px;border-radius:6px;margin-bottom:16px;text-align:center;">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C;margin-bottom:4px;">DOCUMENT CONTRACTUEL</div>
      <div style="font-size:16px;font-weight:800;">Conditions Générales de Vente</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:3px;">Applicables à toutes les prestations La Carte</div>
    </div>

    <div style="font-size:10px;color:#374151;line-height:1.6;margin-bottom:14px;padding:10px 14px;background:#FAF8F2;border:1px solid #DDD5B8;border-radius:6px;">
      <strong style="color:#0D1520;">Préambule</strong><br>
      Les présentes Conditions Générales de Vente régissent l'ensemble des prestations de conseil proposées par La Carte (Anthony Grimault, auto-entrepreneur), à toute personne physique ou morale exploitant un établissement du secteur CHR. Toute acceptation d'un devis emporte acceptation pleine et entière des présentes CGV.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;font-size:9px;color:#374151;">
      ${['Art. 01 · Objet et champ d\'application', 'Art. 02 · Définitions', 'Art. 03 · Prestations proposées', 'Art. 04 · Formation du contrat', 'Art. 05 · Tarifs et conditions tarifaires', 'Art. 06 · Modalités de paiement', 'Art. 07 · Délais de livraison et pénalités', 'Art. 08 · Obligations du Prestataire', 'Art. 09 · Obligations du Client', 'Art. 10 · Confidentialité et protection des données', 'Art. 11 · Propriété intellectuelle', 'Art. 12 · Responsabilité et limitations', 'Art. 13 · Droit de rétractation', 'Art. 14 · Résiliation', 'Art. 15 · Droit applicable et litiges', 'Art. 16 · Dispositions diverses'].map(a => `<div style="padding:3px 8px;background:#f8fafc;border-radius:4px;">${a}</div>`).join('')}
    </div>

    <div style="font-size:9px;color:#64748b;padding:8px 12px;border:1px solid #DDD5B8;border-radius:6px;">
      <strong style="color:#0D1520;">Identité du Prestataire</strong><br>
      Anthony Grimault · La Carte — Restaurant Advisory · Auto-entrepreneur · SIRET : 950 998 468 00025 · lacarte.advisory@gmail.com · TVA non applicable — Art. 293 B du CGI
    </div>

    ${artTitle('01', 'Objet et champ d\'application')}
    ${artStyle}Les présentes CGV définissent les droits et obligations des parties pour des prestations de conseil en ingénierie de menu et optimisation financière CHR. Ces prestations sont exclusivement réalisées à distance. Elles n'incluent aucune intervention physique sur site, ni accompagnement opérationnel (HACCP, management, travaux, marketing digital), sauf accord écrit préalable.</div>
    ${bullet('Le Prestataire intervient uniquement sur les dimensions analytiques et stratégiques. Toute recommandation constitue un avis professionnel et non une garantie de résultat.')}

    ${artTitle('02', 'Définitions')}
    ${artStyle}<strong>Prestataire :</strong> La Carte — Anthony Grimault, auto-entrepreneur, conseil CHR.<br>
    <strong>Client :</strong> Toute personne physique ou morale ayant accepté un devis La Carte.<br>
    <strong>Livrable :</strong> Tout document produit par le Prestataire (rapport PDF, dashboard Excel, etc.).<br>
    <strong>Mission :</strong> Ensemble de la prestation depuis la signature jusqu'à la remise du livrable final.</div>

    ${artTitle('03', 'Prestations proposées')}
    ${artStyle}<strong>Audit Menu (490–790 €) :</strong> Analyse de la carte, matrice menu engineering, recommandations de re-pricing et plan d'action. Délai : 7 jours ouvrés.<br>
    <strong>Audit Complet (990–1 490 €) :</strong> Audit Menu augmenté de l'analyse financière complète. Dashboard Excel livré. Délai : 10 jours ouvrés.<br>
    <strong>Retainer Mensuel (490–690 €/mois) :</strong> Accompagnement continu avec revue mensuelle, rapport PDF, visio et accès email. Engagement minimum 3 mois.</div>

    ${cgvFooter(6)}
  </div>`;

  const cgvPage2 = `
  <div class="page">
    ${cgvHeader}

    ${artTitle('04', 'Formation du contrat')}
    ${artStyle}Le contrat est formé par : (1) transmission du devis signé, (2) règlement de l'acompte de 50 %, (3) accusé de réception du Prestataire. Le devis est valable 30 jours. Passé ce délai, le Prestataire peut réévaluer les conditions tarifaires.</div>

    ${artTitle('05', 'Tarifs et conditions tarifaires')}
    ${artStyle}Les tarifs sont exprimés en euros. Le Prestataire n'est pas assujetti à la TVA (art. 293 B du CGI). Toute demande hors périmètre initial fera l'objet d'un avenant soumis à acceptation avant exécution.</div>

    ${artTitle('06', 'Modalités de paiement')}
    ${artStyle}<strong>Prestations ponctuelles :</strong> acompte 50 % à la signature, solde 50 % à la remise du livrable.<br>
    <strong>Retainer :</strong> facturation mensuelle à terme échu, paiement sous 15 jours. Tout mois commencé est dû intégralement.<br>
    <strong>Modes acceptés :</strong> virement bancaire et chèque. Tout retard entraîne des pénalités égales à 3× le taux légal + indemnité forfaitaire de 40 €.</div>

    ${artTitle('07', 'Délais de livraison et pénalités')}
    ${artStyle}Les délais sont calculés en jours ouvrés à compter de la réception de l'intégralité des données requises. En cas de retard imputable au Prestataire : réduction de 10 % par jour ouvré de retard, plafonnée à 30 %. Les cas de force majeure suspendent les délais de plein droit.</div>

    ${artTitle('08', 'Obligations du Prestataire')}
    ${bullet('Réaliser les prestations avec le soin attendu d\'un consultant CHR expérimenté.')}
    ${bullet('Respecter les délais contractuels ou en informer le Client sans délai.')}
    ${bullet('N\'intégrer que des données vérifiées et sourcées dans les rapports.')}
    ${bullet('Maintenir la confidentialité absolue de toutes les données transmises.')}
    ${bullet('Être en mesure de justifier chaque recommandation par une donnée chiffrée.')}

    ${artTitle('09', 'Obligations du Client')}
    ${bullet('Transmettre des données exactes, complètes et à jour dans les délais convenus.')}
    ${bullet('Répondre aux demandes de clarification sous 48h ouvrées.')}
    ${bullet('Régler les factures aux échéances convenues.')}
    ${bullet('Informer le Prestataire de tout changement significatif dans l\'activité.')}
    ${bullet('S\'abstenir de diffuser les livrables à des tiers sans accord écrit préalable.')}

    ${artTitle('10', 'Confidentialité et protection des données')}
    ${artStyle}Le Prestataire traite avec la stricte confidentialité toutes les informations transmises. Un NDA peut être signé sur demande. Conformément au RGPD, le Client dispose d'un droit d'accès, rectification et suppression. Les données sont conservées pour la durée des obligations contractuelles, puis archivées 3 ans maximum.</div>

    ${cgvFooter(7)}
  </div>`;

  const cgvPage3 = `
  <div class="page">
    ${cgvHeader}

    ${artTitle('11', 'Propriété intellectuelle')}
    ${artStyle}Les livrables constituent des œuvres de l'esprit. À complet paiement, le Client obtient une licence d'utilisation non exclusive, non cessible, limitée à son usage interne. Le Client s'interdit de revendre les livrables, de les transmettre à des concurrents, ou de les exploiter dans une activité de conseil. Les méthodes et outils du Prestataire restent sa propriété exclusive.</div>

    ${artTitle('12', 'Responsabilité et limitations')}
    ${artStyle}Le Prestataire est tenu à une obligation de moyens. Sa responsabilité ne saurait être engagée en cas de données transmises incomplètes ou erronées, de non-application des recommandations, ou d'événements extérieurs affectant l'activité. En toute hypothèse, la responsabilité est limitée au montant effectivement perçu au titre de la prestation concernée.</div>

    ${artTitle('13', 'Droit de rétractation')}
    ${artStyle}Dans le cadre d'une relation B2B, le droit légal de rétractation de 14 jours ne s'applique pas. Toutefois, le Prestataire accorde un délai de 48h après signature pour annulation sans frais, à condition qu'aucune prestation n'ait débuté. Passé ce délai, l'acompte reste acquis.</div>

    ${artTitle('14', 'Résiliation')}
    ${artStyle}<strong>Prestations ponctuelles :</strong> toute résiliation après démarrage entraîne le versement de 50 % du montant restant dû, en sus de l'acompte versé.<br>
    <strong>Retainer :</strong> résiliation avec préavis de 30 jours calendaires par email avec accusé de réception. L'engagement minimum de 3 mois doit être honoré. Tout mois commencé est facturé intégralement.<br>
    Le Prestataire peut résilier de plein droit en cas de non-paiement, données frauduleuses ou comportement abusif.</div>

    ${artTitle('15', 'Droit applicable et règlement des litiges')}
    ${artStyle}Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut d'accord amiable dans les 30 jours, le litige sera soumis aux tribunaux compétents du domicile professionnel du Prestataire.</div>

    ${artTitle('16', 'Dispositions diverses')}
    ${artStyle}Si une clause est déclarée nulle, les autres restent en vigueur. Les présentes CGV peuvent être modifiées à tout moment ; la version applicable est celle en vigueur à la date d'acceptation du devis.</div>

    <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px;border:1px solid #DDD5B8;border-radius:8px;padding:16px;">
      <div>
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Le Client</div>
        <div style="font-size:9.5px;color:#374151;margin-bottom:6px;font-style:italic;">Lu et approuvé — Signature précédée de<br>la mention « Bon pour accord »</div>
        <div style="border-bottom:1px solid #DDD5B8;margin-bottom:8px;padding-bottom:4px;font-size:10px;">Date : ___________________</div>
        <div style="border:1px solid #DDD5B8;border-radius:4px;height:50px;background:#FAF8F2;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;">Signature</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">La Carte</div>
        <div style="font-size:9.5px;color:#374151;margin-bottom:6px;font-style:italic;">Anthony Grimault<br>« Bon pour accord »</div>
        <div style="border-bottom:1px solid #DDD5B8;margin-bottom:8px;padding-bottom:4px;font-size:10px;">Date : ${fmtDate(today)}</div>
        <div style="border:1px solid #DDD5B8;border-radius:4px;height:50px;background:#FAF8F2;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;">Anthony Grimault — La Carte</div>
      </div>
    </div>

    <div style="margin-top:12px;font-size:8px;color:#94a3b8;text-align:center;line-height:1.5;">
      Document établi par Anthony Grimault — La Carte — Restaurant Advisory · Version Avril 2025 · lacarte.advisory@gmail.com
    </div>
    ${cgvFooter(8)}
  </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${page1}${page2}${page3}${page4}${page5}${cgvPage1}${cgvPage2}${cgvPage3}</body></html>`;
}

// ── Modal Devis ───────────────────────────────────────────────────
function DevisModal({ client, onClose, api }) {
  const fm = formulaOf(client.formula);
  const [form, setForm] = useState({
    formula: client.formula || 'audit_menu',
    tarifIdx: 0,
    customPrice: '',
    typeEtablissement: '',
    contexte: '',
    phone: '',
    devisNum: '',
  });
  const [generating, setGenerating] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.getNextNumero('devis').then(n => setForm(f => f.devisNum ? f : { ...f, devisNum: n.replace('DEV-', '') }));
  }, []);
  const tarifs = DEVIS_TARIFS[form.formula] || DEVIS_TARIFS.audit_menu;
  const tarif = tarifs[form.tarifIdx] || tarifs[0];
  const prixFinal = form.customPrice !== '' ? +form.customPrice : tarif.prix;
  const acompte = form.formula === 'suivi_mensuel' ? prixFinal : Math.round(prixFinal * 0.5);

  async function handleGenerate() {
    setGenerating(true);
    const html = generateDevisHTML(client, { ...form, prixFinal });
    const filename = `Devis_${form.devisNum}_${client.company.replace(/\s+/g, '_')}.pdf`;
    await api.devisExportAndSave(html, filename, {
      numero: `DEV-${form.devisNum}`,
      client_id: client.id,
      client_nom: client.name,
      formule: formulaOf(form.formula).label,
      montant: String(prixFinal),
    });
    setGenerating(false);
    onClose();
  }

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0D1520' }}>📋 Générer un devis</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>✕</button>
        </div>

        {/* Formule */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Formule</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {FORMULAS.map(f => (
              <button key={f.key} onClick={() => { set('formula', f.key); set('tarifIdx', 0); }} style={{
                padding: '5px 13px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                border: `1px solid ${form.formula === f.key ? f.color : '#DDD5B8'}`,
                background: form.formula === f.key ? f.bg : '#FFFDF8',
                color: form.formula === f.key ? f.color : '#6b7280',
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Tarif */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Tarif applicable</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {tarifs.map((t, i) => (
              <label key={i} onClick={() => { set('tarifIdx', i); set('customPrice', ''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${form.tarifIdx === i ? '#C9A84C' : '#DDD5B8'}`, background: form.tarifIdx === i ? '#FAF3E0' : '#FFFDF8', cursor: 'pointer' }}>
                <input type="radio" name="tarif" checked={form.tarifIdx === i} onChange={() => { set('tarifIdx', i); set('customPrice', ''); }} style={{ accentColor: '#C9A84C' }} />
                <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
                <span style={{ fontWeight: 800, color: '#C9A84C', fontSize: 15 }}>{t.prix} €{t.suffix || ''}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ ...lbl, margin: 0, whiteSpace: 'nowrap' }}>Prix personnalisé (€)</label>
            <input
              type="number"
              value={form.customPrice}
              onChange={e => set('customPrice', e.target.value)}
              placeholder={`${tarif.prix} (défaut)`}
              style={{ ...inp, maxWidth: 160 }}
              min="0"
            />
            {form.customPrice !== '' && (
              <button onClick={() => set('customPrice', '')} style={{ ...btnSec, padding: '4px 10px', fontSize: 12 }}>Réinitialiser</button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Numéro de devis</label>
            <input value={form.devisNum} onChange={e => set('devisNum', e.target.value)} style={inp} placeholder="2025-001" />
          </div>
          <div>
            <label style={lbl}>Votre téléphone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="+33 6 XX XX XX XX" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Type d'établissement</label>
            <input value={form.typeEtablissement} onChange={e => set('typeEtablissement', e.target.value)} style={inp} placeholder="Restaurant · SARL · 40 couverts" />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Contexte de la mission (personnalisé)</label>
          <textarea rows={4} value={form.contexte} onChange={e => set('contexte', e.target.value)}
            style={{ ...inp, resize: 'vertical', minHeight: 90 }}
            placeholder="Suite à notre échange du... Votre restaurant présente des opportunités sur... Laissez vide pour le texte par défaut." />
        </div>

        {/* Récap */}
        <div style={{ background: '#FAF3E0', border: '1px solid #C9A84C', borderRadius: 8, padding: '12px 14px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0D1520' }}>{FORMULAS.find(f => f.key === form.formula)?.label} — {tarif.label}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{client.company}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#C9A84C' }}>{prixFinal} €{tarif.suffix || ''}</div>
              {form.formula !== 'suivi_mensuel' && <div style={{ fontSize: 11, color: '#64748b' }}>Acompte : {acompte} €</div>}
              {form.customPrice !== '' && <div style={{ fontSize: 10, color: '#d97706' }}>Prix personnalisé</div>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnSec}>Annuler</button>
          <button onClick={handleGenerate} disabled={generating} style={btnPrimary}>
            {generating ? 'Génération…' : '📄 Générer le PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Données Tally Pré-Audit ──────────────────────────────────
function TallyPreauditTab({ client }) {
  const d = client.tally_preaudit;
  const rapport = client.rapport_preaudit;
  if (!d) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune donnée Tally</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Les données apparaîtront automatiquement après soumission du questionnaire pré-audit</div>
    </div>
  );

  const TallySection = ({ icon, title, color, bg, border, children }) => (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {children}
      </div>
    </div>
  );

  const TallyField = ({ label, value, highlight }) => (
    value ? (
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: highlight ? 700 : 400, color: highlight ? '#0D1520' : '#374151' }}>{value}</div>
      </div>
    ) : null
  );

  const TallyText = ({ label, value }) => (
    value ? (
      <div style={{ gridColumn: '1/-1' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#374151', background: 'rgba(255,255,255,0.6)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>{value}</div>
      </div>
    ) : null
  );

  const fmtPct = v => v > 0 ? `${v}%` : null;
  const fmtEurLocal = v => v > 0 ? fmtEur(v) : null;

  return (
    <div>
      {/* En-tête avec date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0D1520' }}>Questionnaire Pré-Audit</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Reçu le {d.received_at ? new Date(d.received_at).toLocaleDateString('fr-FR') : '—'} via Tally → Make → La Carte
          </div>
        </div>
        {d.ca_num > 0 && (
          <div style={{ background: '#FAF3E0', border: '1px solid #C9A84C', borderRadius: 8, padding: '8px 14px', textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 2 }}>CA mensuel estimé</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0D1520' }}>{fmtEur(d.ca_num)}</div>
          </div>
        )}
      </div>

      {/* Rapport Notion */}
      {rapport && (
        <div style={{ marginBottom: 16 }}>
          <RapportEligibilite texte={rapport} />
        </div>
      )}

      {/* Section 1 — Profil */}
      <TallySection icon="🏠" title="Profil établissement" color="#0369a1" bg="#e0f2fe" border="#7dd3fc">
        <TallyField label="Type" value={d.type_etablissement} highlight />
        <TallyField label="Capacité" value={d.capacite ? `${d.capacite} couverts` : null} />
        <TallyField label="Ancienneté" value={d.anciennete} />
        <TallyField label="Effectif" value={d.nb_employes} />
        <TallyField label="Statut juridique" value={d.statut_juridique} />
        <TallyField label="Jours / semaine" value={d.jours_semaine} />
        {d.services?.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Services</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {d.services.map((s, i) => <span key={i} style={{ background: '#0369a1', color: '#fff', borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>{s}</span>)}
            </div>
          </div>
        )}
      </TallySection>

      {/* Section 2 — Finances */}
      <TallySection icon="💰" title="Données financières" color="#059669" bg="#d1fae5" border="#6ee7b7">
        <TallyField label="CA mensuel" value={d.ca_mensuel} highlight />
        <TallyField label="Food cost" value={d.food_cost} highlight />
        <TallyField label="Masse salariale" value={d.masse_salariale} highlight />
        <TallyField label="Loyer % CA" value={d.loyer_pct} />
        <TallyField label="Vision marge" value={d.vision_marge} />
        <TallyField label="Expert-comptable" value={d.expert_comptable} />
        {/* Estimations calculées */}
        {d.achats_food_estime > 0 && <TallyField label="Achats food estimés" value={fmtEurLocal(d.achats_food_estime)} />}
        {d.masse_sal_estimee > 0 && <TallyField label="Masse sal. estimée" value={fmtEurLocal(d.masse_sal_estimee)} />}
        {d.loyer_estime > 0 && <TallyField label="Loyer estimé" value={fmtEurLocal(d.loyer_estime)} />}
        <TallyText label="Préoccupation financière" value={d.preoccupation_financiere} />
      </TallySection>

      {/* Section 3 — Opérations */}
      <TallySection icon="🍳" title="Opérations & cuisine" color="#7c3aed" bg="#ede9fe" border="#c4b5fd">
        <TallyField label="Logiciel de caisse" value={d.logiciel_caisse} highlight />
        <TallyField label="Back-office" value={d.backoffice} />
        <TallyField label="Fiches techniques" value={d.fiches_techniques} />
        <TallyField label="Bons de commande" value={d.bons_commande} />
        <TallyField label="Nb fournisseurs" value={d.nb_fournisseurs} />
        <TallyField label="Gaspillage" value={d.gaspillage} />
        <TallyField label="Brigade" value={d.brigade} />
        {d.frequence_commandes?.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Fréquence commandes</div>
            <div>{d.frequence_commandes.join(', ')}</div>
          </div>
        )}
        <TallyText label="Difficulté opérationnelle" value={d.difficulte_cuisine} />
      </TallySection>

      {/* Section 4 — Digital */}
      <TallySection icon="📱" title="Digital & visibilité" color="#d97706" bg="#fef3c7" border="#fcd34d">
        <TallyField label="Google My Business" value={d.google_my_business} />
        <TallyField label="Note Google" value={d.note_google} />
        <TallyField label="Avis Google" value={d.nb_avis_google} />
        <TallyField label="Fréquence posts" value={d.frequence_posts} />
        <TallyField label="Réservations" value={d.reservations} />
        <TallyField label="Site internet" value={d.site_web} />
        {d.reseaux_sociaux?.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Réseaux sociaux</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {d.reseaux_sociaux.map((r, i) => <span key={i} style={{ background: '#d97706', color: '#fff', borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>{r}</span>)}
            </div>
          </div>
        )}
        {d.plateformes_livraison?.length > 0 && (
          <TallyField label="Livraison" value={d.plateformes_livraison.join(', ')} />
        )}
        <TallyText label="Expérience client" value={d.experience_client} />
      </TallySection>

      {/* Section 5 — Objectifs */}
      <div style={{ background: '#FAF8F2', border: '1px solid #DDD5B8', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>🎯 Ressenti & Objectifs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {d.problemes_principaux && (
            <div>
              <div style={lbl}>3 principaux problèmes</div>
              <div style={{ fontSize: 13, color: '#374151', background: '#fff', borderRadius: 7, padding: '8px 12px', border: '1px solid #DDD5B8', lineHeight: 1.65 }}>{d.problemes_principaux}</div>
            </div>
          )}
          {d.solutions_essayees && (
            <div>
              <div style={lbl}>Ce qu'ils ont déjà essayé</div>
              <div style={{ fontSize: 13, color: '#374151', background: '#fff', borderRadius: 7, padding: '8px 12px', border: '1px solid #DDD5B8', lineHeight: 1.65 }}>{d.solutions_essayees}</div>
            </div>
          )}
          {d.objectif_6mois && (
            <div>
              <div style={lbl}>Objectif à 6 mois</div>
              <div style={{ fontSize: 13, color: '#0D1520', fontWeight: 600, background: '#FAF3E0', borderRadius: 7, padding: '8px 12px', border: '1px solid #C9A84C', lineHeight: 1.65 }}>{d.objectif_6mois}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {d.raison_consultant && <TallyField label="Raison consultation" value={d.raison_consultant} />}
            {d.deja_accompagne && <TallyField label="Déjà accompagné" value={d.deja_accompagne} />}
            {d.budget_mensuel && <TallyField label="Budget mensuel" value={d.budget_mensuel} highlight />}
          </div>
          {d.message_libre && (
            <div>
              <div style={lbl}>Message libre</div>
              <div style={{ fontSize: 13, color: '#374151', fontStyle: 'italic', background: '#fff', borderRadius: 7, padding: '8px 12px', border: '1px solid #DDD5B8' }}>{d.message_libre}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        ✅ Analyse financière pré-remplie automatiquement dans l'onglet "Analyse financière"
      </div>
    </div>
  );
}

// ── Tab: Informations ─────────────────────────────────────────────


export { SetupUserModal, RemindersModal };
export default ClientsView;