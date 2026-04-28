import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { fmtEur, fmtSize, parseActionDate } from '../utils';
import { MOIS_LABELS, FORMULAS, getTasksForFormula } from '../constants';
import { PALETTE, card, cardH, lbl, inp, iconBtn, overlay, modal, btnPrimary, btnSec, td } from '../styles';
import Badge from '../components/Badge';
// ══════════════════════════════════════════════════════════════════
// DOSSIER INTERNE
// ══════════════════════════════════════════════════════════════════

const PIPELINE_STATUTS = [
  { key: 'prospect', label: 'Prospect', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'contact', label: 'Premier contact', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'devis', label: 'Devis envoyé', color: '#d97706', bg: '#fef3c7' },
  { key: 'negocia', label: 'En négociation', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'gagne', label: 'Gagné ✓', color: '#059669', bg: '#d1fae5' },
  { key: 'a_evaluer', label: 'À évaluer', color: '#d97706', bg: '#fef3c7' },
  { key: 'non_eligible', label: 'Non éligible', color: '#dc2626', bg: '#fee2e2' },
  { key: 'perdu', label: 'Perdu', color: '#dc2626', bg: '#fee2e2' },
];
const pipelineStatutOf = k => PIPELINE_STATUTS.find(s => s.key === k) || PIPELINE_STATUTS[0];

const FACTURE_STATUTS = [
  { key: 'brouillon', label: 'Brouillon', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'envoyee', label: 'Envoyée', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'attente', label: 'En attente', color: '#d97706', bg: '#fef3c7' },
  { key: 'premier_versement', label: '1er versement reçu', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'payee', label: 'Payée ✓', color: '#059669', bg: '#d1fae5' },
  { key: 'retard', label: 'En retard', color: '#dc2626', bg: '#fee2e2' },
];
const factureStatutOf = k => FACTURE_STATUTS.find(s => s.key === k) || FACTURE_STATUTS[0];

const NOTE_CATS = [
  { key: 'memo', label: 'Mémo', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'procedure', label: 'Procédure', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'benchmark', label: 'Benchmark', color: '#059669', bg: '#d1fae5' },
  { key: 'idee', label: 'Idée', color: '#d97706', bg: '#fef3c7' },
  { key: 'autre', label: 'Autre', color: '#6b7280', bg: '#f3f4f6' },
];
const noteCatOf = k => NOTE_CATS.find(c => c.key === k) || NOTE_CATS[4];

// ── Dossier Interne — root ────────────────────────────────────────
function DossierInterne({ api, clients, onRefreshClients, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'dashboard');

  const TABS = [
    { key: 'dashboard', label: '📊 Cabinet' },
    { key: 'pipeline', label: '🎯 Pipeline' },
    { key: 'facturation', label: '💰 Facturation' },
    { key: 'documents', label: '📁 Documents' },
    { key: 'notes', label: '📝 Notes' },
    { key: 'agenda', label: '📅 Agenda' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#FFFDF8', borderBottom: '1px solid #DDD5B8', padding: '18px 28px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D1520', margin: 0 }}>Dossier Interne</h1>
          <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0' }}>Gestion interne du cabinet La Carte</p>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#C9A84C' : '#6b7280',
              borderBottom: `2px solid ${tab === t.key ? '#C9A84C' : 'transparent'}`,
              whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 28px' }}>
        {tab === 'dashboard' && <InterneDashboard api={api} clients={clients} />}
        {tab === 'pipeline' && <InternePipeline api={api} onRefreshClients={onRefreshClients} />}
        {tab === 'facturation' && <InterneFacturation api={api} clients={clients} />}
        {tab === 'documents' && <InterneDocuments api={api} />}
        {tab === 'notes' && <InterneNotes api={api} />}
        {tab === 'agenda' && <InterneAgenda api={api} clients={clients} />}
      </div>
    </div>
  );
}

// ── Tableau de bord cabinet ───────────────────────────────────────

// ── KpiCard (utilisé par InterneDashboard) ───────────────────────
const KpiCard = memo(function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 }}>{label}</div>
          <div style={{ fontSize: 27, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
        </div>
        <span style={{ fontSize: 26, marginTop: 2 }}>{icon}</span>
      </div>
    </div>
  );
});
function InterneDashboard({ api, clients }) {
  const [factures, setFactures] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [objectif, setObjectif] = useState(0);
  const [loadingObj, setLoadingObj] = useState(false);

  useEffect(() => {
    api.getFactures().then(r => setFactures(r || []));
    api.getPipeline().then(r => setPipeline(r || []));
    api.getCabinetSettings().then(s => { if (s?.objectif_mensuel) setObjectif(s.objectif_mensuel); });
  }, []);

  const now = new Date();
  const mois = now.getMonth() + 1;
  const annee = now.getFullYear();

  const facturesMois = factures.filter(f => {
    const d = new Date(f.date_emission);
    return d.getMonth() + 1 === mois && d.getFullYear() === annee;
  });

  const caEncaisse = facturesMois
    .filter(f => ['payee', 'premier_versement'].includes(f.statut))
    .reduce((s, f) => s + (f.statut === 'premier_versement' ? (+f.montant || 0) * 0.5 : (+f.montant || 0)), 0);
  const caAttente = facturesMois.filter(f => ['envoyee', 'attente', 'retard'].includes(f.statut)).reduce((s, f) => s + (+f.montant || 0), 0);
  const caTotal = factures
    .filter(f => ['payee', 'premier_versement'].includes(f.statut))
    .reduce((s, f) => s + (f.statut === 'premier_versement' ? (+f.montant || 0) * 0.5 : (+f.montant || 0)), 0);
  const enRetard = factures.filter(f => f.statut === 'retard').length;
  const objectifPct = objectif > 0 ? Math.min(Math.round(caEncaisse / objectif * 100), 100) : 0;

  const pipelineActifs = pipeline.filter(p => !['gagne', 'perdu'].includes(p.statut));
  const caPrevi = pipeline.filter(p => p.statut === 'devis').reduce((s, p) => s + (+p.budget_estime || 0), 0);

  // CA par mois sur 6 mois
  const sixMois = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(annee, mois - 1 - (5 - i));
    const m = d.getMonth() + 1, a = d.getFullYear();
    const ca = factures.filter(f => {
      const fd = new Date(f.date_emission);
      return fd.getMonth() + 1 === m && fd.getFullYear() === a && f.statut === 'payee';
    }).reduce((s, f) => s + (+f.montant || 0), 0);
    return { label: MOIS_LABELS[m - 1].slice(0, 3), ca };
  });
  const maxCA = Math.max(...sixMois.map(m => m.ca), 1);

  async function saveObjectif(val) {
    setLoadingObj(true);
    await api.saveCabinetSettings({ objectif_mensuel: +val });
    setLoadingObj(false);
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Objectif mensuel */}
      <div style={{ ...card, marginBottom: 20, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Objectif CA mensuel (€)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
              <input type="number" defaultValue={objectif} onBlur={e => saveObjectif(e.target.value)}
                style={{ ...inp, maxWidth: 180 }} placeholder="Ex: 3000" />
              {loadingObj && <span style={{ fontSize: 11, color: '#94a3b8' }}>Sauvegarde…</span>}
            </div>
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Progression {MOIS_LABELS[mois - 1]} {annee}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: objectifPct >= 100 ? '#059669' : '#0D1520' }}>{fmtEur(caEncaisse)} / {fmtEur(objectif)}</span>
            </div>
            <div style={{ height: 10, background: '#EDE8D5', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${objectifPct}%`, height: '100%', background: objectifPct >= 100 ? '#059669' : '#C9A84C', borderRadius: 5, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: objectifPct >= 100 ? '#059669' : '#64748b', marginTop: 4 }}>{objectifPct}% de l'objectif atteint</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label={`CA encaissé — ${MOIS_LABELS[mois - 1]}`} value={fmtEur(caEncaisse)} sub="factures payées ce mois" color="#059669" icon="✅" />
        <KpiCard label="CA en attente" value={fmtEur(caAttente)} sub="factures non réglées" color="#d97706" icon="⏳" />
        <KpiCard label="CA total (historique)" value={fmtEur(caTotal)} sub="depuis le début" color="#C9A84C" icon="💰" />
        <KpiCard label="Factures en retard" value={enRetard} sub={enRetard ? 'à relancer' : 'aucun retard'} color={enRetard ? '#dc2626' : '#059669'} icon={enRetard ? '⚠️' : '✅'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 20 }}>
        {/* Graphe CA 6 mois */}
        <div style={card}>
          <h3 style={cardH}>Évolution CA — 6 derniers mois</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 20, height: 120 }}>
            {sixMois.map((m, i) => {
              const h = maxCA > 0 ? Math.max(Math.round(m.ca / maxCA * 100), m.ca > 0 ? 4 : 0) : 0;
              const isLast = i === sixMois.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {m.ca > 0 && <div style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtEur(m.ca)}</div>}
                  <div style={{ width: '100%', height: `${h}%`, minHeight: m.ca > 0 ? 4 : 0, background: isLast ? '#C9A84C' : '#EDE8D5', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                    {isLast && <div style={{ position: 'absolute', inset: 0, background: '#C9A84C', borderRadius: '4px 4px 0 0', opacity: 0.85 }} />}
                  </div>
                  <div style={{ fontSize: 10, color: isLast ? '#C9A84C' : '#94a3b8', fontWeight: isLast ? 700 : 400 }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline */}
        <div style={card}>
          <h3 style={cardH}>Pipeline commercial</h3>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#FAF8F2', borderRadius: 7 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Prospects actifs</span>
              <span style={{ fontWeight: 700, color: '#0D1520' }}>{pipelineActifs.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#FAF8F2', borderRadius: 7 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Devis en attente</span>
              <span style={{ fontWeight: 700, color: '#d97706' }}>{pipeline.filter(p => p.statut === 'devis').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#FAF8F2', borderRadius: 7 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>CA prévisionnel</span>
              <span style={{ fontWeight: 700, color: '#059669' }}>{fmtEur(caPrevi)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#FAF8F2', borderRadius: 7 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Clients actifs</span>
              <span style={{ fontWeight: 700, color: '#0D1520' }}>{clients.filter(c => c.stage !== 'cloture').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline commercial ───────────────────────────────────────────
function InternePipeline({ api, onRefreshClients }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [converting, setConverting] = useState(null);
  const [showDiag, setShowDiag] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getPipeline()) || []); }

  async function handleSave(data) {
    await api.savePipeline(data);
    setShowForm(false); setEditing(null); load();
  }
  async function handleDelete(id) {
    await api.deletePipeline(id);
    setShowDel(null); load();
  }

  async function handleConvertir(item) {
    setConverting(item.id);
    try {
      const d = item.tally_preaudit || {};

      // Nom d'entreprise — chercher dans plusieurs sources
      const company = item.entreprise
        || d.nom_etablissement
        || d.etablissement
        || item.nom
        || '';

      // Nom du contact
      const name = item.nom || d.nom_prenom || company || '';

      // Pré-remplir les tâches : prospection = toute cochée (prospect qualifié),
      // questionnaire = en cours (vient de remplir le formulaire)
      const formula = item.formule || 'audit_menu';
      const fTasks = getTasksForFormula(formula);
      const tasks = {
        prospection: (fTasks.prospection || []).map(() => true),  // tout coché
        questionnaire: (fTasks.questionnaire || []).map(() => false), // en cours
        audit: (fTasks.audit || []).map(() => false),
        cloture: (fTasks.cloture || []).map(() => false),
      };

      await api.createClient({
        name,
        company,
        email: item.email || '',
        phone: d.telephone || '',
        stage: 'questionnaire',
        priority: item.eligibilite === 'eligible' ? 'high' : 'medium',
        revenue: item.budget_estime || 0,
        nextAction: 'Analyser questionnaire pré-audit',
        notes: [
          d.problemes_principaux ? `🔴 Problèmes : ${d.problemes_principaux}` : '',
          d.objectif_6mois ? `🎯 Objectif 6 mois : ${d.objectif_6mois}` : '',
          d.preoccupation_financiere ? `💰 Préoccupation : ${d.preoccupation_financiere}` : '',
          d.message_libre ? `💬 Message : ${d.message_libre}` : '',
        ].filter(Boolean).join('\n\n'),
        formula,
        tasks,
      });

      await api.savePipeline({ ...item, statut: 'gagne' });
      load();
      if (onRefreshClients) await onRefreshClients();
      alert(`✅ Dossier client créé pour ${name} !\nRetrouvez-le dans "Dossiers clients".`);
    } catch (e) {
      alert('Erreur lors de la conversion : ' + e.message);
    }
    setConverting(null);
  }

  if (showForm || editing) return (
    <PipelineForm data={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );

  if (showDiag) return (
    <DiagnosticPreaudit item={showDiag} onBack={() => setShowDiag(null)} onConvertir={handleConvertir} converting={converting} />
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{items.length} prospect{items.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Nouveau prospect</button>
      </div>
      {items.length === 0 ? (
        <div onClick={() => setShowForm(true)} style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: '48px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucun prospect</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => {
            const st = pipelineStatutOf(item.statut);
            const fm = FORMULAS.find(f => f.key === item.formule);
            const isExpanded = expanded === item.id;
            const hasRapport = !!item.rapport_notion;
            return (
              <div key={item.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                {/* Header ligne */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0D1520' }}>{item.nom}</span>
                      <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
                      {fm && <Badge color={fm.color} bg={fm.bg} small>{fm.label}</Badge>}
                      {item.eligibilite && (
                        <Badge
                          color={item.eligibilite === 'eligible' ? '#059669' : item.eligibilite === 'a_evaluer' ? '#d97706' : '#dc2626'}
                          bg={item.eligibilite === 'eligible' ? '#d1fae5' : item.eligibilite === 'a_evaluer' ? '#fef3c7' : '#fee2e2'}
                          small
                        >{item.eligibilite === 'eligible' ? '✓ Éligible' : item.eligibilite === 'a_evaluer' ? '⚠ À évaluer' : '✕ Non éligible'}</Badge>
                      )}
                      {hasRapport && <span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700 }}>📋 Rapport Tally</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.entreprise}{item.source ? ` · ${item.source}` : ''}</div>
                    {item.next_action && <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 600, marginTop: 3 }}>→ {item.next_action}</div>}
                  </div>
                  {item.budget_estime > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>{fmtEur(item.budget_estime)}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>budget estimé</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {hasRapport && (
                      <button onClick={() => setExpanded(isExpanded ? null : item.id)} style={{ ...btnSec, padding: '5px 10px', fontSize: 12, color: '#C9A84C', borderColor: '#C9A84C' }}>
                        {isExpanded ? '▲ Rapport' : '▼ Rapport'}
                      </button>
                    )}
                    {item.tally_preaudit && (
                      <button onClick={() => setShowDiag(item)} style={{ ...btnSec, padding: '5px 10px', fontSize: 12, color: '#7c3aed', borderColor: '#c4b5fd' }}>
                        🔍 Diagnostic
                      </button>
                    )}
                    {item.tally_preaudit && item.statut !== 'gagne' && (
                      <button onClick={() => handleConvertir(item)} disabled={converting === item.id} style={{ ...btnPrimary, padding: '5px 12px', fontSize: 12, opacity: converting === item.id ? 0.6 : 1 }}>
                        {converting === item.id ? '…' : '→ Créer dossier'}
                      </button>
                    )}
                    <button onClick={() => setEditing(item)} style={btnSec}>Modifier</button>
                    <button onClick={() => setShowDel(item)} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5', padding: '6px 10px' }}>✕</button>
                  </div>
                </div>
                {/* Rapport déplié */}
                {isExpanded && hasRapport && (
                  <div style={{ borderTop: '1px solid #DDD5B8', background: '#FAF8F2', padding: '14px 16px' }}>
                    <RapportEligibilite texte={item.rapport_notion} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer ce prospect" message={`Supprimer ${showDel.nom} ?`} onConfirm={() => handleDelete(showDel.id)} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

// ── Rapport Éligibilité (depuis Notion via Make) ──────────────────
function parseRapportNotion(texte) {
  if (!texte) return { signaux: [], plan: [], offre: '' };
  // Split sur les grandes sections
  const signauxMatch = texte.match(/Signaux\s+d[ée]tect[ée]s\s*:\s*(.*?)(?=\|\s*Plan\s+action|Plan\s+d.action|$)/is);
  const planMatch = texte.match(/Plan\s+(?:d.action|action)\s*:\s*(.*?)(?=\|\s*Offre\s+recommand|Offre\s+recommand|$)/is);
  const offreMatch = texte.match(/Offre\s+recommand[ée]e?\s*:\s*(.*?)$/is);

  const parseItems = (str) => {
    if (!str) return [];
    return str
      .replace(/\|/g, '')
      .split(/[-–•]\s+|\d+[-.)]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  };

  return {
    signaux: parseItems(signauxMatch?.[1] || ''),
    plan: parseItems(planMatch?.[1] || ''),
    offre: offreMatch?.[1]?.replace(/\|/g, '').replace(/-\s+/g, '\n• ').trim() || '',
  };
}

function RapportEligibilite({ texte }) {
  const { signaux, plan, offre } = parseRapportNotion(texte);

  const Section = ({ icon, title, color, bg, border, children }) => (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, padding: '12px 14px', flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        📋 Rapport d'éligibilité — Généré automatiquement via Tally → Make → Notion
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Signaux */}
        <Section icon="🔍" title="Signaux détectés" color="#0369a1" bg="#e0f2fe" border="#7dd3fc">
          {signaux.length === 0
            ? <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Aucun signal détecté</div>
            : signaux.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, fontSize: 11, color: '#0c4a6e', lineHeight: 1.4 }}>
                <span style={{ color: '#0369a1', flexShrink: 0, marginTop: 1 }}>•</span>
                <span>{s}</span>
              </div>
            ))
          }
        </Section>

        {/* Plan d'action */}
        <Section icon="📋" title="Plan d'action" color="#7c3aed" bg="#ede9fe" border="#c4b5fd">
          {plan.length === 0
            ? <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Aucune action définie</div>
            : plan.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5, fontSize: 11, color: '#3b0764', lineHeight: 1.4 }}>
                <span style={{ background: '#7c3aed', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <span>{p}</span>
              </div>
            ))
          }
        </Section>

        {/* Offre recommandée */}
        <Section icon="💡" title="Offre recommandée" color="#b45309" bg="#fef3c7" border="#fcd34d">
          {!offre
            ? <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Aucune offre définie</div>
            : offre.split('\n').map((line, i) => (
              <div key={i} style={{ fontSize: 11, color: '#78350f', lineHeight: 1.5, marginBottom: 3 }}>{line}</div>
            ))
          }
        </Section>
      </div>
    </div>
  );
}

// ── Fiche Diagnostic Pré-Audit ────────────────────────────────────
function scoreDomaine(d, domaine) {
  let score = 0, max = 0;
  if (domaine === 'finances') {
    max = 5;
    if (d.vision_marge?.includes('chaque mois')) score += 2;
    else if (d.vision_marge?.includes('proximat')) score += 1;
    if (d.expert_comptable?.includes('mensuell')) score += 1;
    else if (d.expert_comptable?.includes('trimestr')) score += 0.5;
    if (d.fc_pct > 0 && d.fc_pct <= 30) score += 1;
    else if (d.fc_pct > 30 && d.fc_pct <= 34) score += 0.5;
    if (d.ms_pct > 0 && d.ms_pct <= 33) score += 1;
  }
  if (domaine === 'operations') {
    max = 5;
    if (d.fiches_techniques?.includes('tous')) score += 2;
    else if (d.fiches_techniques?.includes('partie')) score += 1;
    if (d.bons_commande?.includes('formalis')) score += 1;
    else if (d.bons_commande?.includes('informel')) score += 0.5;
    if (d.back_office_en_ligne?.includes('utilise') || d.back_office_en_ligne?.includes('régulière')) score += 1;
    if (d.gaspillage_pertes?.includes('Rarement') || d.gaspillage_pertes?.includes('bon contrôle')) score += 1;
  }
  if (domaine === 'digital') {
    max = 5;
    if (d.google_business?.includes('complète') || d.google_business?.includes('complète')) score += 1;
    if (d.nb_avis?.includes('100') || d.nb_avis?.includes('200') || d.nb_avis?.includes('Plus')) score += 1;
    else if (d.nb_avis?.includes('50')) score += 0.5;
    if (d.site_internet?.includes('jour')) score += 1;
    else if (d.site_internet?.includes('ancien')) score += 0.5;
    if (d.reseaux_sociaux && (Array.isArray(d.reseaux_sociaux) ? d.reseaux_sociaux.length > 0 : d.reseaux_sociaux !== 'Aucun')) score += 1;
    if (d.frequence_reseaux?.includes('jour') || d.frequence_reseaux?.includes('semaine')) score += 1;
  }
  if (domaine === 'gestion') {
    max = 5;
    if (d.logiciel_caisse && !d.logiciel_caisse.includes('classique')) score += 1;
    if (d.back_office_en_ligne?.includes('utilise') || d.back_office_en_ligne?.includes('régulière')) score += 1;
    if (d.fiches_techniques?.includes('tous')) score += 1;
    if (d.bons_commande?.includes('formalis')) score += 1;
    if (d.vision_marge?.includes('chaque mois')) score += 1;
  }
  return { score: Math.min(score, max), max };
}

function genererAlertes(d) {
  const alertes = [], vigilances = [], pointsForts = [], recommandations = [];

  // ── Finances ──
  if (d.fc_pct > 34) alertes.push({ icon: '🔴', text: `Food cost critique : ${d.fc_pct}% (idéal < 30%)` });
  else if (d.fc_pct > 30) vigilances.push({ icon: '🟡', text: `Food cost élevé : ${d.fc_pct}% (idéal < 30%)` });
  else if (d.fc_pct > 0) pointsForts.push({ icon: '🟢', text: `Food cost maîtrisé : ${d.fc_pct}%` });

  if (d.ms_pct > 38) alertes.push({ icon: '🔴', text: `Masse salariale critique : ${d.ms_pct}% (idéal < 33%)` });
  else if (d.ms_pct > 33) vigilances.push({ icon: '🟡', text: `Masse salariale à surveiller : ${d.ms_pct}%` });
  else if (d.ms_pct > 0) pointsForts.push({ icon: '🟢', text: `Masse salariale correcte : ${d.ms_pct}%` });

  if (d.vision_marge?.includes('flou') || d.vision_marge?.includes('délègu'))
    alertes.push({ icon: '🔴', text: 'Aucune vision de la marge nette — pilotage financier insuffisant' });
  else if (d.vision_marge?.includes('proximat'))
    vigilances.push({ icon: '🟡', text: 'Vision de la marge approximative — manque de précision' });
  else if (d.vision_marge?.includes('chaque'))
    pointsForts.push({ icon: '🟢', text: 'Marge nette suivie chaque mois' });

  if (d.expert_comptable?.includes('bilan annuel'))
    vigilances.push({ icon: '🟡', text: 'États financiers seulement annuels — manque de visibilité en cours d\'année' });
  if (!d.expert_comptable || d.expert_comptable.includes('pas'))
    alertes.push({ icon: '🔴', text: 'Pas d\'expert-comptable — risque fiscal et juridique' });

  if (d.loy_pct > 12) alertes.push({ icon: '🔴', text: `Loyer très élevé : ~${d.loy_pct}% du CA (idéal < 8%)` });
  else if (d.loy_pct > 8) vigilances.push({ icon: '🟡', text: `Loyer élevé : ~${d.loy_pct}% du CA` });

  // ── Opérations ──
  if (d.fiches_techniques?.includes('tête'))
    alertes.push({ icon: '🔴', text: 'Aucune fiche technique — food cost incontrôlable' });
  else if (d.fiches_techniques?.includes('partie'))
    vigilances.push({ icon: '🟡', text: 'Fiches techniques incomplètes' });
  else if (d.fiches_techniques?.includes('tous'))
    pointsForts.push({ icon: '🟢', text: 'Fiches techniques pour tous les plats' });

  if (d.bons_commande?.includes('Non'))
    vigilances.push({ icon: '🟡', text: 'Pas de bons de commande — achats non tracés' });
  else if (d.bons_commande?.includes('formalis'))
    pointsForts.push({ icon: '🟢', text: 'Bons de commande formalisés' });

  if (d.gaspillage_pertes?.includes('significatif'))
    alertes.push({ icon: '🔴', text: 'Gaspillage significatif en cuisine — impact direct sur le food cost' });
  else if (d.gaspillage_pertes?.includes('Parfois'))
    vigilances.push({ icon: '🟡', text: 'Gaspillage occasionnel à surveiller' });

  // ── Digital ──
  if (!d.google_business || d.google_business.includes('Non'))
    alertes.push({ icon: '🔴', text: 'Pas de fiche Google My Business — invisibilité locale critique' });
  else if (d.google_business.includes('basique'))
    vigilances.push({ icon: '🟡', text: 'Fiche Google incomplète — à optimiser' });

  if (d.nb_avis?.includes('Moins de 20'))
    vigilances.push({ icon: '🟡', text: 'Très peu d\'avis Google — crédibilité faible' });

  if (!d.site_internet || d.site_internet.includes('Non'))
    vigilances.push({ icon: '🟡', text: 'Pas de site internet' });

  if (d.plateformes_livraison?.includes('Aucune') || !d.plateformes_livraison)
    vigilances.push({ icon: '🟡', text: 'Absent des plateformes de livraison' });

  // ── Recommandations ──
  if (d.fc_pct > 30) recommandations.push('Audit food cost prioritaire — revoir les fiches techniques et tarifs');
  if (!d.fiches_techniques?.includes('tous')) recommandations.push('Créer des fiches techniques pour tous les plats');
  if (d.vision_marge?.includes('flou')) recommandations.push('Mettre en place un tableau de bord mensuel simple');
  if (!d.google_business?.includes('complète')) recommandations.push('Optimiser la fiche Google My Business');
  if (d.ms_pct > 33) recommandations.push('Analyser la masse salariale — optimiser le planning');
  if (d.gaspillage_pertes?.includes('significatif')) recommandations.push('Mettre en place un suivi des pertes en cuisine');

  return { alertes, vigilances, pointsForts, recommandations };
}

function DiagnosticPreaudit({ item, onBack, onConvertir, converting }) {
  const d = item.tally_preaudit || {};
  const { alertes, vigilances, pointsForts, recommandations } = genererAlertes(d);
  const domaines = [
    { key: 'finances', label: 'Finances', icon: '💰', color: '#059669' },
    { key: 'operations', label: 'Opérations', icon: '🍳', color: '#7c3aed' },
    { key: 'digital', label: 'Digital', icon: '📱', color: '#d97706' },
    { key: 'gestion', label: 'Gestion', icon: '📊', color: '#0369a1' },
  ];
  const st = pipelineStatutOf(item.statut);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0D1520' }}>
            Diagnostic — {item.nom}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {item.entreprise} · {d.type_etablissement || '—'} · {d.capacite ? `${d.capacite} couverts` : '—'} · {d.anciennete || '—'}
          </div>
        </div>
        {item.statut !== 'gagne' && (
          <button onClick={() => onConvertir(item)} disabled={converting === item.id}
            style={{ ...btnPrimary, opacity: converting === item.id ? 0.6 : 1 }}>
            {converting === item.id ? 'Création…' : '→ Créer dossier client'}
          </button>
        )}
        {item.statut === 'gagne' && (
          <span style={{ background: '#d1fae5', color: '#059669', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700 }}>✓ Dossier client créé</span>
        )}
      </div>

      {/* Scores par domaine */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {domaines.map(dom => {
          const { score, max } = scoreDomaine(d, dom.key);
          const pct = Math.round(score / max * 100);
          const color = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
          return (
            <div key={dom.key} style={{ ...card, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{dom.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>{dom.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{score.toFixed(0)}/{max}</div>
              <div style={{ height: 5, background: '#EDE8D5', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color, marginTop: 4, fontWeight: 700 }}>{pct}%</div>
            </div>
          );
        })}
      </div>

      {/* Alertes / Vigilances / Points forts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { items: alertes, title: `🔴 Alertes critiques (${alertes.length})`, bg: '#fee2e2', border: '#fca5a5', color: '#dc2626' },
          { items: vigilances, title: `🟡 Points de vigilance (${vigilances.length})`, bg: '#fef3c7', border: '#fcd34d', color: '#d97706' },
          { items: pointsForts, title: `🟢 Points forts (${pointsForts.length})`, bg: '#d1fae5', border: '#6ee7b7', color: '#059669' },
        ].map(({ items, title, bg, border, color }) => (
          <div key={title} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>{title}</div>
            {items.length === 0
              ? <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Aucun</div>
              : items.map((a, i) => (
                <div key={i} style={{ fontSize: 11, color: '#374151', marginBottom: 6, lineHeight: 1.45, display: 'flex', gap: 5 }}>
                  <span style={{ flexShrink: 0 }}>{a.icon}</span><span>{a.text}</span>
                </div>
              ))
            }
          </div>
        ))}
      </div>

      {/* Recommandations prioritaires */}
      {recommandations.length > 0 && (
        <div style={{ ...card, marginBottom: 16, borderLeft: '4px solid #C9A84C' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>
            💡 Recommandations prioritaires
          </div>
          {recommandations.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#374151' }}>
              <span style={{ background: '#C9A84C', color: '#0D1520', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Données clés */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Finances */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>💰 Données financières</div>
          {[
            ['CA mensuel estimé', d.ca_mensuel],
            ['Food cost', d.food_cost],
            ['Masse salariale', d.masse_salariale],
            ['Loyer', d.loyer],
            ['Vision marge', d.vision_marge],
            ['Expert-comptable', d.expert_comptable],
          ].filter(([, v]) => v).map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F5F0E8', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>{l}</span>
              <span style={{ fontWeight: 600, color: '#0D1520' }}>{v}</span>
            </div>
          ))}
          {d.preoccupation_financiere && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626', fontStyle: 'italic' }}>⚠ {d.preoccupation_financiere}</div>
          )}
        </div>

        {/* Opérations */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>🍳 Opérations & Gestion</div>
          {[
            ['Logiciel caisse', d.logiciel_caisse],
            ['Back-office', d.back_office_en_ligne],
            ['Fiches techniques', d.fiches_techniques],
            ['Bons de commande', d.bons_commande],
            ['Nb fournisseurs', d.nb_fournisseurs],
            ['Gaspillage', d.gaspillage_pertes],
            ['Brigade', d.brigade_cuisine],
          ].filter(([, v]) => v).map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F5F0E8', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>{l}</span>
              <span style={{ fontWeight: 600, color: '#0D1520', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
          {d.difficulte_cuisine && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#7c3aed', fontStyle: 'italic' }}>⚠ {d.difficulte_cuisine}</div>
          )}
        </div>
      </div>

      {/* Objectifs */}
      {(d.problemes_principaux || d.objectif_6mois) && (
        <div style={{ ...card, background: '#FAF3E0', border: '1px solid #C9A84C' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>🎯 Ressenti & Objectifs</div>
          {d.problemes_principaux && (
            <div style={{ marginBottom: 10 }}>
              <div style={lbl}>3 principaux problèmes</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{d.problemes_principaux}</div>
            </div>
          )}
          {d.objectif_6mois && (
            <div style={{ marginBottom: 10 }}>
              <div style={lbl}>Objectif à 6 mois</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1520', lineHeight: 1.65 }}>{d.objectif_6mois}</div>
            </div>
          )}
          {d.solutions_tentees && (
            <div>
              <div style={lbl}>Ce qu'ils ont déjà essayé</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, fontStyle: 'italic' }}>{d.solutions_tentees}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PipelineForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({ nom: '', entreprise: '', source: '', formule: 'audit_menu', statut: 'prospect', budget_estime: '', next_action: '', notes: '', ...(data || {}) });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{data?.id ? 'Modifier' : 'Nouveau prospect'}</h3>
        <button onClick={() => onSave(form)} disabled={!form.nom.trim()} style={{ ...btnPrimary, opacity: form.nom.trim() ? 1 : 0.5 }}>Enregistrer</button>
      </div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Nom / Prénom *</label><input value={form.nom} onChange={e => set('nom', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Entreprise</label><input value={form.entreprise} onChange={e => set('entreprise', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Source (bouche à oreille, réseau…)</label><input value={form.source} onChange={e => set('source', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Budget estimé (€)</label><input type="number" value={form.budget_estime} onChange={e => set('budget_estime', e.target.value)} style={inp} min="0" /></div>
          <div><label style={lbl}>Prochaine action</label><input value={form.next_action} onChange={e => set('next_action', e.target.value)} style={inp} placeholder="Ex: Relancer le 25 avr." /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Statut</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PIPELINE_STATUTS.map(s => (
              <button key={s.key} onClick={() => set('statut', s.key)} style={{ padding: '4px 11px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.statut === s.key ? s.color : '#DDD5B8'}`, background: form.statut === s.key ? s.bg : '#FFFDF8', color: form.statut === s.key ? s.color : '#6b7280' }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Formule visée</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {FORMULAS.map(f => (
              <button key={f.key} onClick={() => set('formule', f.key)} style={{ padding: '4px 11px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.formule === f.key ? f.color : '#DDD5B8'}`, background: form.formule === f.key ? f.bg : '#FFFDF8', color: form.formule === f.key ? f.color : '#6b7280' }}>{f.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} placeholder="Contexte, remarques, opportunités…" />
        </div>
      </div>
    </div>
  );
}

// ── Facturation ───────────────────────────────────────────────────
function InterneFacturation({ api, clients }) {
  const [factures, setFactures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);
  async function load() { setFactures((await api.getFactures()) || []); }

  async function handleSave(data) {
    await api.saveFacture(data);
    setShowForm(false); setEditing(null); load();
  }

  const filtered = filter === 'all' ? factures : factures.filter(f => f.statut === filter);
  const totalPayee = factures
    .filter(f => ['payee', 'premier_versement'].includes(f.statut))
    .reduce((s, f) => s + (f.statut === 'premier_versement' ? (+f.montant || 0) * 0.5 : (+f.montant || 0)), 0);
  const totalAttente = factures.filter(f => ['envoyee', 'attente'].includes(f.statut)).reduce((s, f) => s + (+f.montant || 0), 0);
  const totalRetard = factures.filter(f => f.statut === 'retard').reduce((s, f) => s + (+f.montant || 0), 0);

  if (showForm || editing) return (
    <FactureForm data={editing} clients={clients} api={api} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #059669' }}>
          <div style={lbl}>Encaissé</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{fmtEur(totalPayee)}</div>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #d97706' }}>
          <div style={lbl}>En attente</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{fmtEur(totalAttente)}</div>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #dc2626' }}>
          <div style={lbl}>En retard</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{fmtEur(totalRetard)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[{ key: 'all', label: 'Toutes' }, ...FACTURE_STATUTS].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)} style={{ padding: '3px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${filter === s.key ? (s.color || '#C9A84C') : '#DDD5B8'}`, background: filter === s.key ? (s.bg || '#FAF3E0') : '#FFFDF8', color: filter === s.key ? (s.color || '#0D1520') : '#6b7280' }}>{s.label}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Nouvelle facture</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', border: '2px dashed #DDD5B8', borderRadius: 10 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucune facture</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(f => {
            const st = factureStatutOf(f.statut);
            const cl = clients.find(c => String(c.id) === String(f.client_id));
            const isPv = f.statut === 'premier_versement';
            return (
              <div key={f.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0D1520' }}>{f.numero}</span>
                    <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {cl?.name || f.client_nom || '—'}{f.formule ? ` · ${f.formule}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {f.date_emission ? new Date(f.date_emission).toLocaleDateString('fr-FR') : '—'}
                    {f.date_echeance ? ` → ${new Date(f.date_echeance).toLocaleDateString('fr-FR')}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isPv ? '#7c3aed' : '#059669' }}>
                    {isPv ? fmtEur(+f.montant * 0.5) : fmtEur(f.montant)}
                  </div>
                  {isPv && <div style={{ fontSize: 9, color: '#7c3aed' }}>acompte 50%</div>}
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>sur {fmtEur(f.montant)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => api.getSettings().then(s => api.openFactureEditor(generateFactureHTML({ ...f, _settings: s }, cl)))}
                    style={{ ...btnPrimary, padding: '5px 12px', fontSize: 11 }}>
                    ✏️ Ouvrir
                  </button>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => setEditing(f)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, flex: 1 }}>Modifier</button>
                    <button onClick={() => setShowDel(f)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer cette facture" message={`Supprimer la facture ${showDel.numero} ?`} onConfirm={async () => { await api.deleteFacture(showDel.id); setShowDel(null); load(); }} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function FactureForm({ data, clients, onSave, onCancel, api }) {
  const [form, setForm] = useState({
    numero: '',
    client_id: '',
    client_nom: '',
    formule: '',
    montant: '',
    statut: 'brouillon',
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: '',
    notes: '',
    ...(data || {}),
    client_id: data?.client_id != null ? String(data.client_id) : '',
    date_emission: data?.date_emission || new Date().toISOString().split('T')[0],
    date_echeance: data?.date_echeance || '',
    montant: data?.montant != null ? String(data.montant) : '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!data?.id) {
      api.getNextNumero('facture').then(n => setForm(p => ({ ...p, numero: n })));
    }
  }, []);

  const valid = form.numero && form.montant;
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{data?.id ? 'Modifier la facture' : 'Nouvelle facture'}</h3>
        <button onClick={() => onSave(form)} disabled={!valid} style={{ ...btnPrimary, opacity: valid ? 1 : 0.5 }}>Enregistrer</button>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>N° Facture *</label><input value={form.numero} onChange={e => set('numero', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Montant (€) *</label><input type="number" value={form.montant} onChange={e => set('montant', e.target.value)} style={inp} min="0" /></div>
          <div>
            <label style={lbl}>Client</label>
            <select value={form.client_id} onChange={e => {
              set('client_id', e.target.value);
              const cl = clients.find(c => String(c.id) === e.target.value);
              if (cl) set('client_nom', cl.name);
            }} style={inp}>
              <option value="">— Sélectionner —</option>
              {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name} — {c.company}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Formule / Prestation</label><input value={form.formule} onChange={e => set('formule', e.target.value)} style={inp} placeholder="Ex: Audit Menu" /></div>
          <div><label style={lbl}>Date d'émission</label><input type="date" value={form.date_emission} onChange={e => set('date_emission', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Date d'échéance</label><input type="date" value={form.date_echeance} onChange={e => set('date_echeance', e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Statut</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FACTURE_STATUTS.map(s => (
              <button key={s.key} onClick={() => set('statut', s.key)} style={{ padding: '4px 11px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.statut === s.key ? s.color : '#DDD5B8'}`, background: form.statut === s.key ? s.bg : '#FFFDF8', color: form.statut === s.key ? s.color : '#6b7280' }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Notes</label>
          <textarea rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} />
        </div>
      </div>
    </div>
  );
}

// ── Documents internes ────────────────────────────────────────────
function InterneDocuments({ api }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    setDocs((await api.getCabinetDocs()) || []);
    setLoading(false);
  }

  async function handleAdd() {
    const added = await api.addCabinetDocs();
    if (added?.length) load();
  }

  async function handleDelete(doc) {
    await api.deleteCabinetDoc({ id: doc.id, storage_path: doc.storage_path });
    setShowDel(null); load();
  }

  const EXT_ICONS = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', png: '🖼️', jpg: '🖼️', txt: '📃', ppt: '📊', pptx: '📊' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
        <button onClick={handleAdd} style={btnPrimary}>📎 Ajouter des documents</button>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement…</div>
        : docs.length === 0 ? (
          <div onClick={handleAdd} style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: '48px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucun document</div>
            <div style={{ fontSize: 13 }}>Contrats, modèles, benchmarks, CGV…</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{EXT_ICONS[d.filetype] || '📎'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.filename}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{d.filetype?.toUpperCase()} · {fmtSize(d.size)} · {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : ''}</div>
                </div>
                <button onClick={() => api.openAttachment(d)} style={{ ...btnSec, padding: '4px 10px', fontSize: 12 }}>Ouvrir</button>
                <button onClick={() => setShowDel(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16 }} onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>✕</button>
              </div>
            ))}
          </div>
        )}
      {showDel && <ConfirmModal title="Supprimer ce document" message={`Supprimer "${showDel.filename}" ?`} onConfirm={() => handleDelete(showDel)} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

// ── Notes internes ────────────────────────────────────────────────
function InterneNotes({ api }) {
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ titre: '', contenu: '', categorie: 'memo' });
  const [saving, setSaving] = useState(false);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const data = (await api.getNotes()) || [];
    setNotes(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
  }

  async function handleSave() {
    setSaving(true);
    const saved = await api.saveNote({ ...form, id: editing === 'edit' ? selected?.id : undefined });
    setSaving(false);
    setEditing(false);
    await load();
    if (saved?.id) setSelected({ ...form, id: saved.id });
  }

  async function handleNew() {
    setForm({ titre: '', contenu: '', categorie: 'memo' });
    setEditing('new');
    setSelected(null);
  }

  function handleEdit() {
    setForm({ titre: selected.titre, contenu: selected.contenu, categorie: selected.categorie });
    setEditing('edit');
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'flex', gap: 14, height: 600 }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <button onClick={handleNew} style={{ ...btnPrimary, marginBottom: 5 }}>+ Nouvelle note</button>
        {notes.map(n => {
          const cat = noteCatOf(n.categorie);
          const isActive = selected?.id === n.id && !editing;
          return (
            <div key={n.id} onClick={() => { setSelected(n); setEditing(false); }}
              style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${isActive ? '#C9A84C' : '#DDD5B8'}`, background: isActive ? '#FAF3E0' : '#FFFDF8', cursor: 'pointer' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0D1520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titre || 'Sans titre'}</div>
              <Badge color={cat.color} bg={cat.bg} small>{cat.label}</Badge>
            </div>
          );
        })}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, ...card, display: 'flex', flexDirection: 'column' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Titre de la note" style={{ ...inp, fontSize: 16, fontWeight: 700, flex: 1, marginRight: 10 }} />
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={() => setEditing(false)} style={btnSec}>Annuler</button>
                <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving ? '…' : 'Enregistrer'}</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {NOTE_CATS.map(c => (
                <button key={c.key} onClick={() => set('categorie', c.key)} style={{ padding: '3px 9px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.categorie === c.key ? c.color : '#DDD5B8'}`, background: form.categorie === c.key ? c.bg : '#FFFDF8', color: form.categorie === c.key ? c.color : '#6b7280' }}>{c.label}</button>
              ))}
            </div>
            <textarea value={form.contenu} onChange={e => set('contenu', e.target.value)} placeholder="Contenu de la note…" style={{ ...inp, flex: 1, resize: 'none', fontFamily: 'inherit', lineHeight: 1.65 }} />
          </div>
        ) : selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0D1520' }}>{selected.titre || 'Sans titre'}</div>
                <div style={{ display: 'flex', gap: 7, marginTop: 5 }}>
                  <Badge color={noteCatOf(selected.categorie).color} bg={noteCatOf(selected.categorie).bg}>{noteCatOf(selected.categorie).label}</Badge>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{selected.updated_at ? new Date(selected.updated_at).toLocaleDateString('fr-FR') : ''}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={handleEdit} style={btnSec}>Modifier</button>
                <button onClick={() => setShowDel(selected)} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.contenu || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun contenu</span>}</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', margin: 'auto', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <div>Sélectionnez ou créez une note</div>
          </div>
        )}
      </div>
      {showDel && <ConfirmModal title="Supprimer cette note" message={`Supprimer "${showDel.titre}" ?`} onConfirm={async () => { await api.deleteNote(showDel.id); setShowDel(null); setSelected(null); load(); }} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

// ── Agenda ────────────────────────────────────────────────────────
function InterneAgenda({ api, clients }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => { load(); }, []);
  async function load() { setEvents((await api.getAgendaEvents()) || []); }

  async function handleDelete(id) {
    await api.deleteAgendaEvent(id);
    setShowDel(null);
    setSelectedEvent(null);
    load();
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  // Événements auto depuis les clients (next_action)
  const autoEvents = clients
    .filter(c => c.nextAction)
    .map(c => {
      const d = parseActionDate(c.nextAction);
      if (!d) return null;
      return { id: `auto_${c.id}`, date: d.toISOString().split('T')[0], titre: c.nextAction, type: 'client', nom: c.name, auto: true };
    }).filter(Boolean);

  const allEvents = [...autoEvents, ...events];

  const eventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents.filter(e => e.date === dateStr);
  };

  const today = new Date();

  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const EVENT_COLORS = { client: '#C9A84C', visio: '#0369a1', livrable: '#dc2626', autre: '#6b7280' };

  if (showForm || editing) return (
    <AgendaForm data={editing} clients={clients} onSave={async d => { await api.saveAgendaEvent(d); setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1))} style={{ ...btnSec, padding: '5px 10px' }}>←</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0D1520' }}>{MOIS_LABELS[month]} {year}</span>
          <button onClick={() => setViewDate(new Date(year, month + 1))} style={{ ...btnSec, padding: '5px 10px' }}>→</button>
          <button onClick={() => setViewDate(new Date())} style={{ ...btnSec, fontSize: 11 }}>Aujourd'hui</button>
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Événement</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: '#DDD5B8', borderRadius: 10, overflow: 'hidden' }}>
        {JOURS.map(j => (
          <div key={j} style={{ background: '#0D1520', color: '#C9A84C', textAlign: 'center', padding: '8px 4px', fontSize: 11, fontWeight: 700 }}>{j}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`e${i}`} style={{ background: '#FAF8F2', minHeight: 80, padding: 4 }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const evs = eventsForDay(day);
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          return (
            <div key={day} style={{ background: '#FFFDF8', minHeight: 80, padding: 4, position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 400, color: isToday ? '#fff' : '#64748b', background: isToday ? '#C9A84C' : 'transparent', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>{day}</div>
              {evs.map(e => (
                <div key={e.id}
                  style={{ fontSize: 9, background: EVENT_COLORS[e.type] || EVENT_COLORS.autre, color: '#fff', borderRadius: 3, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: e.auto ? 'default' : 'pointer' }}
                  onClick={!e.auto ? () => setSelectedEvent(e) : undefined}>
                  {e.titre}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {[['#C9A84C', 'Actions clients (auto)'], ['#0369a1', 'Visio'], ['#dc2626', 'Livrable'], ['#6b7280', 'Autre']].map(([c, l]) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
            {l}
          </div>
        ))}
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>Cliquez sur un événement pour le modifier ou supprimer</span>
      </div>

      {/* Panneau événement sélectionné */}
      {selectedEvent && (
        <div style={{ marginTop: 14, ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `4px solid ${EVENT_COLORS[selectedEvent.type] || '#6b7280'}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1520' }}>{selectedEvent.titre}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {new Date(selectedEvent.date).toLocaleDateString('fr-FR')}
              {selectedEvent.notes && ` · ${selectedEvent.notes}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => { setEditing(selectedEvent); setSelectedEvent(null); }} style={btnSec}>Modifier</button>
            <button onClick={() => setShowDel(selectedEvent)} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
            <button onClick={() => setSelectedEvent(null)} style={{ ...btnSec, padding: '6px 10px', fontWeight: 700 }}>✕</button>
          </div>
        </div>
      )}

      {showDel && (
        <ConfirmModal
          title="Supprimer cet événement"
          message={`Supprimer "${showDel.titre}" du ${new Date(showDel.date).toLocaleDateString('fr-FR')} ?`}
          onConfirm={() => handleDelete(showDel.id)}
          onCancel={() => setShowDel(null)}
        />
      )}
    </div>
  );
}

function AgendaForm({ data, clients, onSave, onCancel }) {
  const [form, setForm] = useState({ titre: '', date: new Date().toISOString().split('T')[0], type: 'autre', client_id: '', notes: '', ...(data || {}) });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{data?.id ? 'Modifier' : 'Nouvel événement'}</h3>
        <button onClick={() => onSave(form)} disabled={!form.titre} style={{ ...btnPrimary, opacity: form.titre ? 1 : 0.5 }}>Enregistrer</button>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Titre *</label><input value={form.titre} onChange={e => set('titre', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} /></div>
          <div>
            <label style={lbl}>Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
              <option value="visio">Visio</option>
              <option value="livrable">Livrable</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Client lié (optionnel)</label>
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)} style={inp}>
              <option value="">— Aucun —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Notes</label><textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} /></div>
        </div>
      </div>
    </div>
  );
}


export default DossierInterne;