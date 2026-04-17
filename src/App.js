import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════

const STAGES = [
  { key: 'prospection',   label: 'Prospection',   color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  { key: 'questionnaire', label: 'Questionnaire',  color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'audit',         label: 'Audit',          color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  { key: 'cloture',       label: 'Clôture',        color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
];

// ── Formules ──────────────────────────────────────────────
const FORMULAS = [
  { key: 'audit_menu',            label: 'Audit Menu',              color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  { key: 'audit_menu_financier',  label: 'Audit Menu & Financier',  color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  { key: 'suivi_mensuel',         label: 'Suivi Mensuel',           color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
];
const formulaOf = key => FORMULAS.find(f => f.key === key) || FORMULAS[0];

// ── Tâches par formule et par étape ───────────────────────
const FORMULA_TASKS = {
  audit_menu: {
    prospection:   ['Premier contact', "Présentation formule Audit Menu", 'Envoi devis', 'Signature contrat', 'Acompte reçu'],
    questionnaire: ['Envoi questionnaire restaurant', 'Réception carte / menu actuel', 'Réception photos plats', 'Analyse préliminaire', 'Validation des données'],
    audit:         ['Analyse complète de la carte', 'Étude des prix et positionnement', 'Cohérence et saisonnalité', 'Lisibilité et présentation', 'Calcul des marges par plat', 'Rédaction recommandations'],
    cloture:       ['Rédaction rapport Audit Menu', 'Envoi rapport au client', 'Présentation de restitution', 'Facturation solde', 'Archivage dossier'],
  },
  audit_menu_financier: {
    prospection:   ['Premier contact', 'Présentation formule complète', 'Envoi devis', 'Signature contrat', 'Acompte reçu'],
    questionnaire: ['Envoi questionnaire restaurant', 'Réception menu et tarifs', 'Réception bilans N-1', 'Réception données RH', 'Validation documents comptables'],
    audit:         ['Analyse complète de la carte', 'Étude des prix et marges', 'Calcul ratio food cost', 'Analyse masse salariale', 'Charges fixes vs variables', 'Seuil de rentabilité', 'Rédaction recommandations globales'],
    cloture:       ['Rédaction rapport menu', 'Rédaction rapport financier', 'Envoi rapport complet', 'Présentation de restitution', 'Facturation solde', 'Archivage dossier'],
  },
  suivi_mensuel: {
    prospection:   ['Premier contact', 'Présentation formule suivi', 'Envoi contrat mensuel', 'Signature', 'Mise en place indicateurs'],
    questionnaire: ['Envoi questionnaire du mois', 'Réception CA du mois', 'Réception données coûts', 'Réception données RH', 'Validation indicateurs'],
    audit:         ['Point mensuel client', 'Analyse indicateurs vs mois précédent', 'Suivi actions recommandées', 'Identification nouveaux axes', 'Mise à jour tableau de bord', 'Rédaction compte-rendu mensuel'],
    cloture:       ['Envoi compte-rendu mensuel', 'Validation client', 'Facturation mensuelle', 'Planification mois suivant'],
  },
};

// Fallback pour les anciens dossiers sans formule
const DEFAULT_TASKS = {
  prospection:   ['Premier contact', 'Analyse du besoin', 'Proposition commerciale', 'Négociation', 'Accord client'],
  questionnaire: ['Envoi questionnaire', 'Relance J+7', 'Réception des réponses', 'Analyse des réponses', 'Validation'],
  audit:         ["Réunion d'ouverture", 'Collecte des documents', 'Tests de conformité', 'Rédaction rapport', 'Revue interne'],
  cloture:       ['Présentation rapport', 'Réponse aux observations', 'Facturation', 'Archivage dossier'],
};

const getTasksForFormula = formula => FORMULA_TASKS[formula] || DEFAULT_TASKS;

const PRIORITY = {
  high:   { label: 'Haute',   color: '#dc2626', bg: '#fee2e2' },
  medium: { label: 'Moyenne', color: '#d97706', bg: '#fef3c7' },
  low:    { label: 'Basse',   color: '#6b7280', bg: '#f3f4f6' },
};

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

const fmtEur = n =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

const fmtSize = b => b < 1048576 ? `${(b / 1024).toFixed(0)} Ko` : `${(b / 1048576).toFixed(1)} Mo`;

function parseActionDate(str) {
  if (!str) return null;
  const MONTHS = { jan:0,'fév':1,mar:2,avr:3,mai:4,juin:5,juil:6,'aoû':7,sep:8,oct:9,nov:10,'déc':11 };
  const m = str.match(/(\d{1,2})\s+(jan|fév|mar|avr|mai|juin|juil|aoû|sep|oct|nov|déc)\.?/i);
  if (!m) return null;
  const d = new Date(new Date().getFullYear(), MONTHS[m[2].toLowerCase()], parseInt(m[1]));
  d.setHours(0, 0, 0, 0);
  return d;
}

const isOverdue = na => { const d = parseActionDate(na); if (!d) return false; const n = new Date(); n.setHours(0,0,0,0); return d < n; };
const stageOf   = key => STAGES.find(s => s.key === key) || STAGES[0];
const prioOf    = key => PRIORITY[key] || PRIORITY.medium;

// ══════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════

export default function App() {
  const [view,      setView]      = useState('dashboard');
  const [clients,   setClients]   = useState([]);
  const [stats,     setStats]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [userName,  setUserName]  = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const api = window.electronAPI;

  const refresh = useCallback(async (keepSelectedId) => {
    const [cls, st] = await Promise.all([api.getClients(), api.getStats()]);
    setClients(cls);
    setStats(st);
    setLoading(false);
    if (keepSelectedId) {
      const updated = cls.find(c => c.id === keepSelectedId);
      setSelected(updated || null);
    }
  }, []);

  useEffect(() => {
    refresh();
    api.getUserName().then(name => {
      setUserName(name || '');
      if (!name) setShowSetup(true);
    });
  }, [refresh]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0D1520', color:'#8A7A5A', fontSize:15, fontFamily:'system-ui' }}>
      Chargement…
    </div>
  );

  const overdueCount = clients.filter(c => isOverdue(c.nextAction)).length;

  return (
    <div style={{ display:'flex', height:'100vh', background:'#EDE8D5', fontFamily:'"Segoe UI","Helvetica Neue",Arial,sans-serif', overflow:'hidden' }}>
      <Sidebar
        view={view}
        setView={v => { setView(v); if (v !== 'clients') setSelected(null); }}
        totalClients={clients.length}
        overdueCount={overdueCount}
        userName={userName}
        onSetupUser={() => setShowSetup(true)}
      />
      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
        {view === 'dashboard' && (
          <Dashboard
            stats={stats}
            clients={clients}
            onClientClick={c => { setSelected(c); setView('clients'); }}
          />
        )}
        {view === 'clients' && (
          <ClientsView
            clients={clients}
            selected={selected}
            setSelected={setSelected}
            refresh={refresh}
            api={api}
          />
        )}
        {view === 'interne' && (
          <DossierInterne api={api} clients={clients} onRefreshClients={refresh} />
        )}
      </div>
      {showSetup && (
        <SetupUserModal
          current={userName}
          onSave={async name => {
            await api.setUserName(name);
            setUserName(name);
            setShowSetup(false);
          }}
          onClose={() => setShowSetup(false)}
          required={!userName}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════

function Sidebar({ view, setView, totalClients, overdueCount, userName, onSetupUser }) {
  const items = [
    { key: 'dashboard', label: 'Tableau de bord', icon: <IconDash /> },
    { key: 'clients',   label: 'Dossiers clients', icon: <IconFolder />, badge: overdueCount || null },
    { key: 'interne',   label: 'Dossier Interne',  icon: <IconLock /> },
  ];
  return (
    <aside style={{ width: 224, background: '#0D1520', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid #1A2535' }}>
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid #1A2535' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>A</span>
          </div>
          <div>
            <div style={{ color: '#DDD5B8', fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>La Carte</div>
            <div style={{ color: '#334155', fontSize: 10, marginTop: 1 }}>v2.0</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 0' }}>
        {items.map(item => {
          const active = view === item.key;
          return (
            <button key={item.key} onClick={() => setView(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px',
              background: active ? '#162030' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
              color: active ? '#DDD5B8' : '#475569',
              borderLeft: `3px solid ${active ? '#C9A84C' : 'transparent'}`,
              fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 0.15s',
            }}>
              <span style={{ color: active ? '#D4B86A' : '#334155', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 8, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Utilisateur en bas */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1A2535' }}>
        <button onClick={onSetupUser} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          padding: '6px 2px',
        }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: userName ? '#C9A84C' : '#1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: userName ? '#0D1520' : '#475569', fontSize: 11, fontWeight: 800 }}>
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: userName ? '#DDD5B8' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName || 'Configurer le nom'}
            </div>
            <div style={{ fontSize: 9, color: '#334155' }}>Ce poste · modifier</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════

function Dashboard({ stats, clients, onClientClick }) {
  if (!stats) return null;
  const { totalRevenue, totalClients, byStage, overdue, conversionRate } = stats;
  const stageMap = {};
  byStage.forEach(s => { stageMap[s.stage] = s; });
  const maxCount = Math.max(...STAGES.map(s => stageMap[s.key]?.count || 0), 1);

  // Stats par formule
  const formulaStats = {};
  FORMULAS.forEach(f => { formulaStats[f.key] = { count: 0, revenue: 0 }; });
  clients.forEach(c => {
    const k = c.formula || 'audit_menu';
    if (formulaStats[k]) { formulaStats[k].count++; formulaStats[k].revenue += c.revenue || 0; }
  });

  // Suivis mensuels à renouveler (en retard ou dans 7 jours)
  const today = new Date(); today.setHours(0,0,0,0);
  const renewalsDue = clients.filter(c => {
    if (c.formula !== 'suivi_mensuel') return false;
    const d = parseActionDate(c.nextAction);
    if (!d) return false;
    const diff = Math.floor((d - today) / 86400000);
    return diff <= 7;
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1140, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0D1520', margin: 0, letterSpacing: -0.3 }}>Tableau de bord</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>Vue d'ensemble de votre activité cabinet</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Chiffre d'affaires" value={fmtEur(totalRevenue)} sub="honoraires cumulés" color="#C9A84C" icon="💰" />
        <KpiCard label="Dossiers actifs" value={totalClients} sub="clients en portefeuille" color="#3b82f6" icon="📁" />
        <KpiCard label="Taux de conversion" value={`${conversionRate}%`} sub="proportion en clôture" color="#059669" icon="📈" />
        <KpiCard label="Actions en retard" value={overdue.length} sub={overdue.length ? 'à traiter urgemment' : 'tout est à jour ✓'}
          color={overdue.length ? '#dc2626' : '#059669'} icon={overdue.length ? '⚠️' : '✅'} />
      </div>

      {/* Répartition par formule */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={cardH}>Répartition par formule</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
          {FORMULAS.map(f => {
            const s = formulaStats[f.key];
            const pct = totalClients > 0 ? Math.round(s.count / totalClients * 100) : 0;
            return (
              <div key={f.key} style={{ background: f.bg, border: `1px solid ${f.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: f.color, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{f.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#0D1520', lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmtEur(s.revenue)}</div>
                </div>
                <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: f.color, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 10, color: f.color, marginTop: 4 }}>{pct}% du portefeuille</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 20 }}>
        {/* Pipeline */}
        <div style={card}>
          <h3 style={cardH}>Pipeline par étape</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
            {STAGES.map(st => {
              const info = stageMap[st.key] || { count: 0, revenue: 0 };
              const pct = Math.round((info.count / maxCount) * 100);
              return (
                <div key={st.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{st.label}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {info.count} dossier{info.count !== 1 ? 's' : ''} · {fmtEur(info.revenue)}
                    </span>
                  </div>
                  <div style={{ height: 9, background: '#EDE8D5', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: st.color, borderRadius: 5, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Entonnoir */}
        <div style={card}>
          <h3 style={cardH}>Entonnoir de conversion</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 18, alignItems: 'center' }}>
            {STAGES.map((st, i) => {
              const count = stageMap[st.key]?.count || 0;
              const w = 100 - i * 11;
              return (
                <div key={st.key} style={{ width: `${w}%`, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: st.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{st.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0D1520', lineHeight: 1.2 }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overdue table */}
      {overdue.length > 0 && (
        <div style={{ ...card, borderLeft: '4px solid #dc2626' }}>
          <h3 style={{ ...cardH, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>⚠️</span> Dossiers en retard ({overdue.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14 }}>
            <thead>
              <tr>
                {['Client', 'Entreprise', 'Étape', 'Action prévue', 'Priorité'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #DDD5B8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overdue.map(c => {
                const st = stageOf(c.stage);
                const pr = prioOf(c.priority);
                return (
                  <tr key={c.id} onClick={() => onClientClick(c)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={td}><strong style={{ color: '#0D1520' }}>{c.name}</strong></td>
                    <td style={td}><span style={{ color: '#64748b' }}>{c.company}</span></td>
                    <td style={td}><Badge color={st.color} bg={st.bg}>{st.label}</Badge></td>
                    <td style={td}><span style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>{c.nextAction}</span></td>
                    <td style={td}><Badge color={pr.color} bg={pr.bg}>{pr.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Suivis mensuels à renouveler */}
      {renewalsDue.length > 0 && (
        <div style={{ ...card, borderLeft: '4px solid #065f46' }}>
          <h3 style={{ ...cardH, color: '#065f46', display: 'flex', alignItems: 'center', gap: 7 }}>
            🔄 Suivis mensuels à renouveler ({renewalsDue.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14 }}>
            <thead>
              <tr>
                {['Client', 'Entreprise', 'Prochaine échéance', 'Honoraires/mois'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #DDD5B8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renewalsDue.map(c => {
                const d = parseActionDate(c.nextAction);
                const diff = d ? Math.floor((d - today) / 86400000) : null;
                const urgency = diff !== null && diff < 0 ? '#dc2626' : diff <= 2 ? '#d97706' : '#065f46';
                return (
                  <tr key={c.id} onClick={() => onClientClick(c)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={td}><strong style={{ color: '#0D1520' }}>{c.name}</strong></td>
                    <td style={td}><span style={{ color: '#64748b' }}>{c.company}</span></td>
                    <td style={td}><span style={{ color: urgency, fontWeight: 600, fontSize: 13 }}>
                      {c.nextAction}{diff !== null && ` (${diff < 0 ? `${Math.abs(diff)}j de retard` : diff === 0 ? "aujourd'hui" : `dans ${diff}j`})`}
                    </span></td>
                    <td style={td}><span style={{ color: '#059669', fontWeight: 700 }}>{fmtEur(c.revenue)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon }) {
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
}

// ══════════════════════════════════════════════════════════════════
// CLIENTS VIEW
// ══════════════════════════════════════════════════════════════════

function ClientsView({ clients, selected, setSelected, refresh, api }) {
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [showNew,    setShowNew]    = useState(false);
  const [showDelete, setShowDelete] = useState(null);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q);
    const matchF = filter === 'all' || c.stage === filter || (filter === 'overdue' && isOverdue(c.nextAction));
    return matchQ && matchF;
  });

  async function handleDelete(client) {
    await api.deleteClient(client.id);
    setShowDelete(null);
    setSelected(null);
    refresh();
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

function ClientRow({ client, active, compact, onClick }) {
  const st = stageOf(client.stage);
  const pr = prioOf(client.priority);
  const fm = formulaOf(client.formula);
  const late = isOverdue(client.nextAction);
  return (
    <div onClick={onClick}
      style={{ padding: compact ? '10px 14px' : '13px 16px', borderBottom: '1px solid #E8E0C8', cursor: 'pointer', background: active ? '#FAF6EE' : '#FFFDF8', borderLeft: `3px solid ${active ? '#C9A84C' : 'transparent'}` }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#FAF8F2'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#FFFDF8'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontWeight: 700, color: '#0D1520', fontSize: 13 }}>{client.name}</span>
        <Badge color={pr.color} bg={pr.bg} small>{pr.label}</Badge>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>{client.company}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <Badge color={fm.color} bg={fm.bg} small>{fm.label}</Badge>
        <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
        <span style={{ fontSize: 11, color: late ? '#dc2626' : '#94a3b8' }}>{late && '⚠ '}{client.nextAction}</span>
        {!compact && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#059669', fontWeight: 600 }}>{fmtEur(client.revenue)}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CLIENT DETAIL
// ══════════════════════════════════════════════════════════════════

function ClientDetail({ client, onClose, onDelete, onRefresh, api }) {
  const [tab,         setTab]         = useState('infos');
  const [editing,     setEditing]     = useState(false);
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [showDevis,   setShowDevis]   = useState(false);
  const [history,     setHistory]     = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [analyses,    setAnalyses]    = useState([]);
  const [menuAnalyses,setMenuAnalyses]= useState([]);
  const [suivis,      setSuivis]      = useState([]);

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

  async function loadHistory()      { setHistory(await api.getHistory(client.id)); }
  async function loadAttachments()  { setAttachments(await api.getAttachments(client.id)); }
  async function loadAnalyses()     { setAnalyses((await api.getFinancialAnalyses(client.id)) || []); }
  async function loadMenuAnalyses() { setMenuAnalyses((await api.getMenuAnalyses(client.id)) || []); }
  async function loadSuivis()       { setSuivis((await api.getSuivis(client.id)) || []); }

  async function handleSave() {
    setSaving(true);
    await api.updateClient({ ...form, tasks: client.tasks });
    setSaving(false);
    setEditing(false);
    onRefresh();
  }

  async function toggleTask(stage, idx) {
    const newTasks = { ...client.tasks };
    const formulaTasks = getTasksForFormula(client.formula);
    const base = (formulaTasks[stage] || []).map(() => false);
    const arr = [...(newTasks[stage] || base)];
    while (arr.length < base.length) arr.push(false);
    arr[idx] = !arr[idx];
    newTasks[stage] = arr;
    await api.updateClient({ ...client, nextAction: client.nextAction, tasks: newTasks });
    onRefresh();
    setTimeout(loadHistory, 300);
  }

  async function handleAddAttachments() {
    const added = await api.addAttachments(client.id);
    if (added?.length) { loadAttachments(); loadHistory(); }
  }

  async function handleDeleteAttachment(att) {
    await api.deleteAttachment({ id: att.id, clientId: client.id, storage_path: att.storage_path });
    loadAttachments();
    loadHistory();
  }

  async function handleExportPDF() {
    setExporting(true);
    const st  = stageOf(client.stage);
    const pr  = prioOf(client.priority);
    const fm  = formulaOf(client.formula);
    const formulaTasks = getTasksForFormula(client.formula);
    const taskRows = STAGES.map(s => {
      const tasks = client.tasks?.[s.key] || [];
      const stageTasks = formulaTasks[s.key] || [];
      const done  = tasks.filter(Boolean).length;
      const total = stageTasks.length;
      const pct   = total > 0 ? Math.round(done / total * 100) : 0;
      const items = stageTasks.map((label, i) =>
        `<li style="color:${tasks[i] ? '#9ca3af' : '#374151'};text-decoration:${tasks[i] ? 'line-through' : 'none'};margin:3px 0;font-size:12px;">
          ${tasks[i] ? '☑' : '☐'} ${label}
        </li>`
      ).join('');
      return `
        <div style="margin-bottom:16px;break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:${s.color};font-size:13px;">${s.label}</strong>
            <span style="font-size:11px;color:#6b7280;">${done}/${total} · ${pct}%</span>
          </div>
          <div style="height:4px;background:#e5e7eb;border-radius:2px;margin-bottom:8px;">
            <div style="width:${pct}%;height:100%;background:${s.color};border-radius:2px;"></div>
          </div>
          <ul style="margin:0;padding-left:8px;list-style:none;">${items}</ul>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 32px; font-size: 13px; line-height: 1.5; }
        h1 { font-size: 22px; font-weight: 800; color: #0D1520; letter-spacing: -0.5px; }
        .subtitle { color: #64748b; font-size: 14px; margin-top: 3px; }
        .badge { display: inline-block; border-radius: 10px; padding: 2px 10px; font-size: 11px; font-weight: 700; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 18px 0; }
        .field label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .field .val { font-size: 13px; color: #0D1520; }
        .section-title { font-size: 14px; font-weight: 700; color: #0D1520; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #DDD5B8; }
        .notes-box { background: #f8fafc; border: 1px solid #DDD5B8; border-radius: 8px; padding: 12px; font-size: 13px; color: #374151; white-space: pre-wrap; line-height: 1.6; }
        .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #DDD5B8; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
        .header-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
        .meta-badges { display: flex; gap: 7px; flex-wrap: wrap; margin: 10px 0 4px; }
      </style>
    </head><body>
      <div class="header-bar">
        <div>
          <h1>${client.name}</h1>
          <div class="subtitle">${client.company}</div>
        </div>
        <div style="text-align:right;font-size:22px;font-weight:800;color:#059669;">${fmtEur(client.revenue)}</div>
      </div>
      <div class="meta-badges">
        <span class="badge" style="background:${fm.bg};color:${fm.color};">${fm.label}</span>
        <span class="badge" style="background:${st.bg};color:${st.color};">${st.label}</span>
        <span class="badge" style="background:${pr.bg};color:${pr.color};">Priorité ${pr.label}</span>
        ${client.nextAction ? `<span style="font-size:12px;color:#64748b;margin-top:3px;">⏱ ${client.nextAction}</span>` : ''}
      </div>

      <div class="grid">
        <div class="field"><label>Email</label><div class="val">${client.email || '—'}</div></div>
        <div class="field"><label>Téléphone</label><div class="val">${client.phone || '—'}</div></div>
        <div class="field"><label>Dossier créé le</label><div class="val">${client.created_at || '—'}</div></div>
        <div class="field"><label>Honoraires</label><div class="val">${fmtEur(client.revenue)}</div></div>
      </div>

      ${client.notes ? `
        <div class="section-title">Notes internes</div>
        <div class="notes-box">${client.notes}</div>
      ` : ''}

      <div class="section-title">Avancement des tâches</div>
      ${taskRows}

      <div class="footer">
        <span>La Carte · Fiche client exportée le ${new Date().toLocaleDateString('fr-FR')}</span>
        <span>${client.name} — ${client.company}</span>
      </div>
    </body></html>`;

    await api.exportPDF({ html, filename: `Fiche_${client.name.replace(/\s+/g, '_')}.pdf` });
    setExporting(false);
  }

  const st = stageOf(client.stage);
  const pr = prioOf(client.priority);
  const fm = formulaOf(client.formula);
  const late = isOverdue(client.nextAction);

  const TABS = [
    { key: 'infos',       label: 'Informations' },
    { key: 'tasks',       label: 'Tâches' },
    { key: 'financial',   label: `Analyse financière${analyses.length ? ` (${analyses.length})` : ''}` },
    { key: 'menu',        label: `Analyse Menu${menuAnalyses.length ? ` (${menuAnalyses.length})` : ''}` },
    { key: 'suivi',       label: `Suivi Mensuel${suivis.length ? ` (${suivis.length})` : ''}` },
    ...(client.tally_preaudit ? [{ key: 'tally', label: '📋 Tally' }] : []),
    { key: 'history',     label: `Historique${history.length ? ` (${history.length})` : ''}` },
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
                <button onClick={() => setShowDevis(true)} style={{ ...btnPrimary, fontSize: 12 }} title="Générer un devis">
                  📋 Devis
                </button>
                <button onClick={handleExportPDF} disabled={exporting} style={{ ...btnSec, color: '#dc2626' }} title="Exporter fiche en PDF">
                  {exporting ? '…' : '📄 PDF'}
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
    </div>
  );
}
function InfosTab({ form, setForm, editing, createdAt }) {
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fields = [
    { k: 'name',       l: 'Nom',             t: 'text' },
    { k: 'company',    l: 'Entreprise',       t: 'text' },
    { k: 'email',      l: 'Email',            t: 'email' },
    { k: 'phone',      l: 'Téléphone',        t: 'text' },
    { k: 'revenue',    l: 'Honoraires (€)',   t: 'number' },
    { k: 'nextAction', l: 'Prochaine action', t: 'text' },
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
}

// ── Tab: Tâches ───────────────────────────────────────────────────
function TasksTab({ client, toggleTask }) {
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
          const base   = stageTasks.map(() => false);
          const tasks  = client.tasks?.[st.key] || base;
          const padded = [...tasks];
          while (padded.length < stageTasks.length) padded.push(false);
          const done  = padded.filter(Boolean).length;
          const total = stageTasks.length;
          const pct   = total > 0 ? Math.round(done / total * 100) : 0;
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
}

// ── Tab: Historique ───────────────────────────────────────────────
function HistoryTab({ history }) {
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
}

// ── Tab: Pièces jointes ───────────────────────────────────────────
const EXT_ICONS = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', txt: '📃' };

function AttachmentsTab({ attachments, onAdd, onDelete, onOpen }) {
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
}

// ══════════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════════

function NewClientModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', formula: 'audit_menu', stage: 'prospection', priority: 'medium', revenue: 0, nextAction: 'À définir', notes: '', tasks: {} });
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
            { k: 'revenue', l: 'Honoraires (€)', t: 'number' },
            { k: 'nextAction', l: 'Prochaine action', t: 'text' },
          ].map(f => (
            <div key={f.k}>
              <label style={lbl}>{f.l}</label>
              <input type={f.t} value={form[f.k]} onChange={e => set(f.k, f.t === 'number' ? parseInt(e.target.value) || 0 : e.target.value)} style={inp} />
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

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
        <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 800, color: '#0D1520' }}>{title}</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={btnSec}>Annuler</button>
          <button onClick={onConfirm} style={{ ...btnPrimary, background: '#dc2626' }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ANALYSE FINANCIÈRE — BENCHMARKS & CALCULS
// ══════════════════════════════════════════════════════════════════

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const BENCHMARKS = {
  cmv_food:        { ideal: 30, warning: 34, unit: '%', better: 'low',  label: 'CMV Food',          desc: 'Idéal < 30%' },
  cmv_boissons:    { ideal: 22, warning: 27, unit: '%', better: 'low',  label: 'CMV Boissons',       desc: 'Idéal < 22%' },
  cmv_global:      { ideal: 28, warning: 33, unit: '%', better: 'low',  label: 'CMV Global',         desc: 'Idéal < 28%' },
  masse_salariale: { ideal: 33, warning: 38, unit: '%', better: 'low',  label: 'Masse salariale',    desc: 'Idéal < 33%' },
  prime_cost:      { ideal: 60, warning: 65, unit: '%', better: 'low',  label: 'Prime Cost',         desc: 'Idéal < 60%' },
  part_boissons:   { ideal: 25, warning: 18, unit: '%', better: 'high', label: 'Part boissons',      desc: 'Idéal > 25%' },
  coussin:         { ideal: 20, warning: 10, unit: '%', better: 'high', label: 'Coussin sécurité',   desc: 'Idéal > 20%' },
  ebe:             { ideal: 10, warning:  5, unit: '%', better: 'high', label: 'EBE',                desc: 'Idéal > 10%' },
  marge_brute:     { ideal: 70, warning: 65, unit: '%', better: 'high', label: 'Marge brute',        desc: 'Idéal > 70%' },
};

function bColor(key, value) {
  const b = BENCHMARKS[key];
  if (!b || value == null || isNaN(value)) return '#94a3b8';
  if (b.better === 'low')  return value <= b.ideal ? '#059669' : value <= b.warning ? '#d97706' : '#dc2626';
  return value >= b.ideal ? '#059669' : value >= b.warning ? '#d97706' : '#dc2626';
}
function bBg(key, value) {
  const c = bColor(key, value);
  return c === '#059669' ? '#d1fae5' : c === '#d97706' ? '#fef3c7' : '#fee2e2';
}

function calcFin(d) {
  const caT  = +d.ca_total||0, caF = +d.ca_food||0, caB = +d.ca_boissons||0;
  const cov  = +d.nb_couverts||0, jrs = +d.nb_jours||0;
  const acF  = +d.achats_food||0, acB = +d.achats_boissons||0;
  const ms   = +d.masse_salariale||0, loy = +d.loyer||0;
  const cfA  = +d.charges_fixes_autres||0, cvP = +d.charges_variables_pct||0;
  const tbls = +d.nb_tables||0, plcs = +d.nb_places||0;

  const totAch = acF + acB;
  const cfTot  = ms + loy + cfA;
  const cv     = caT * cvP / 100;
  const chTot  = totAch + cfTot + cv;

  const caMJour = jrs > 0 ? caT / jrs : 0;
  const caMSem  = caMJour * 7;
  const tickM   = cov > 0 ? caT / cov : 0;
  const tickF   = cov > 0 && caF > 0 ? caF / cov : 0;
  const tickB   = cov > 0 && caB > 0 ? caB / cov : 0;
  const covJr   = jrs > 0 ? cov / jrs : 0;

  const cmvG  = caT > 0 ? totAch / caT * 100 : 0;
  const cmvF  = caF > 0 ? acF / caF * 100 : 0;
  const cmvBv = caB > 0 ? acB / caB * 100 : 0;
  const ptBv  = caT > 0 ? caB / caT * 100 : 0;
  const ptF   = caT > 0 ? caF / caT * 100 : 0;

  const msP   = caT > 0 ? ms / caT * 100 : 0;
  const loyP  = caT > 0 ? loy / caT * 100 : 0;
  const pcost = cmvG + msP;

  const mbr   = caT - totAch;
  const mbrP  = caT > 0 ? mbr / caT * 100 : 0;
  const ebe   = caT - chTot;
  const ebeP  = caT > 0 ? ebe / caT * 100 : 0;

  const tmCV  = caT > 0 ? (caT - totAch - cv) / caT : 0;
  const pm    = tmCV > 0 ? cfTot / tmCV : 0;
  const pmJr  = jrs > 0 ? pm / jrs : 0;
  const nbJPM = caMJour > 0 ? Math.round(pm / caMJour) : 0;
  const cous  = caT > 0 ? (caT - pm) / caT * 100 : 0;

  const gF    = caF  > 0 ? Math.max(0, acF - caF  * 0.30) : 0;
  const gB    = caB  > 0 ? Math.max(0, acB - caB  * 0.22) : 0;
  const gMS   = caT  > 0 ? Math.max(0, ms  - caT  * 0.33) : 0;
  const gTot  = gF + gB + gMS;

  const revPAS= plcs > 0 && jrs > 0 ? caT / (plcs * jrs * 2) : 0; // 2 services/jour

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
  const [selected,  setSelected]  = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [editData,  setEditData]  = useState(null);
  const [showDel,   setShowDel]   = useState(null);

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

// ── Résultats financiers ──────────────────────────────────────────
function FinancialResults({ data, prev, onEdit, onDelete }) {
  const k    = calcFin(data);
  const kp   = prev ? calcFin(prev) : null;
  const d    = data;

  const diff = (val, pval) => {
    if (!pval || !kp) return null;
    const delta = val - pval;
    return { delta, pct: pval !== 0 ? delta / Math.abs(pval) * 100 : 0 };
  };

  const Kpi = ({ label, value, bmKey, fmt = v => fmtEur(v), prevVal, unit = '' }) => {
    const color = bmKey ? bColor(bmKey, value) : '#0D1520';
    const bg    = bmKey ? bBg(bmKey, value)    : '#FFFDF8';
    const bench = bmKey ? BENCHMARKS[bmKey]    : null;
    const dlt   = prevVal != null && kp ? diff(value, prevVal) : null;
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
  const fmtN   = v => isNaN(v) || !v ? '—' : Math.round(v).toLocaleString('fr-FR');

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
        {[['#059669','✓ Dans les normes'],['#d97706','⚠ À surveiller'],['#dc2626','✕ Hors normes']].map(([c,l]) => (
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
  const [form,     setForm]     = useState(data || { ...EMPTY_FIN });
  const [preview,  setPreview]  = useState(false);
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
          { keys: ['ca total','chiffre','total ht','ca ht','montant ht'],  field: 'ca_total' },
          { keys: ['food','nourriture','cuisine','repas','plat'],           field: 'ca_food' },
          { keys: ['boisson','drink','bar','vin','bev'],                    field: 'ca_boissons' },
          { keys: ['couvert','cover','client','personne'],                  field: 'nb_couverts' },
          { keys: ['jour','day','ouvert'],                                   field: 'nb_jours' },
          { keys: ['achat food','achats food','cout food','matiere food'],  field: 'achats_food' },
          { keys: ['achat bois','achats bois','cout bois','matiere bois'],  field: 'achats_boissons' },
          { keys: ['salaire','masse sal','personnel','staff'],              field: 'masse_salariale' },
          { keys: ['loyer','rent','locaux'],                                 field: 'loyer' },
        ];

        rows.forEach(row => {
          const labelCell = (row[0] || '').toLowerCase().trim();
          const valueCell = (row[1] || row[row.length - 1] || '').replace(/[€\s]/g, '').replace(',', '.');
          const numVal    = parseFloat(valueCell);
          if (isNaN(numVal)) return;
          patterns.forEach(p => {
            if (p.keys.some(k => labelCell.includes(k)) && !parsed[p.field]) {
              parsed[p.field] = numVal;
            }
          });
        });

        if (Object.keys(parsed).length > 0) {
          setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(parsed).map(([k,v]) => [k, v.toString()])) }));
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
  const kpis  = valid ? calcFin(form) : null;

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
        <FinancialResults data={{ ...form, mois: +form.mois, annee: +form.annee }} prev={null} onEdit={() => setPreview(false)} onDelete={() => {}} />
      ) : (
        <>
          {/* Période */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>📅 Période</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Mois</label>
                <select value={form.mois} onChange={e => set('mois', +e.target.value)} style={{ ...inp }}>
                  {MOIS_LABELS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
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
// DOSSIER INTERNE
// ══════════════════════════════════════════════════════════════════

const PIPELINE_STATUTS = [
  { key: 'prospect',    label: 'Prospect',          color: '#6b7280', bg: '#f3f4f6' },
  { key: 'contact',     label: 'Premier contact',   color: '#0369a1', bg: '#e0f2fe' },
  { key: 'devis',       label: 'Devis envoyé',      color: '#d97706', bg: '#fef3c7' },
  { key: 'negocia',     label: 'En négociation',    color: '#7c3aed', bg: '#ede9fe' },
  { key: 'gagne',       label: 'Gagné ✓',           color: '#059669', bg: '#d1fae5' },
  { key: 'a_evaluer',   label: 'À évaluer',         color: '#d97706', bg: '#fef3c7' },
  { key: 'non_eligible',label: 'Non éligible',      color: '#dc2626', bg: '#fee2e2' },
  { key: 'perdu',       label: 'Perdu',             color: '#dc2626', bg: '#fee2e2' },
];
const pipelineStatutOf = k => PIPELINE_STATUTS.find(s => s.key === k) || PIPELINE_STATUTS[0];

const FACTURE_STATUTS = [
  { key: 'brouillon', label: 'Brouillon',    color: '#6b7280', bg: '#f3f4f6' },
  { key: 'envoyee',   label: 'Envoyée',      color: '#0369a1', bg: '#e0f2fe' },
  { key: 'attente',   label: 'En attente',   color: '#d97706', bg: '#fef3c7' },
  { key: 'payee',     label: 'Payée ✓',      color: '#059669', bg: '#d1fae5' },
  { key: 'retard',    label: 'En retard',    color: '#dc2626', bg: '#fee2e2' },
];
const factureStatutOf = k => FACTURE_STATUTS.find(s => s.key === k) || FACTURE_STATUTS[0];

const NOTE_CATS = [
  { key: 'memo',       label: 'Mémo',         color: '#0369a1', bg: '#e0f2fe' },
  { key: 'procedure',  label: 'Procédure',    color: '#7c3aed', bg: '#ede9fe' },
  { key: 'benchmark',  label: 'Benchmark',    color: '#059669', bg: '#d1fae5' },
  { key: 'idee',       label: 'Idée',         color: '#d97706', bg: '#fef3c7' },
  { key: 'autre',      label: 'Autre',        color: '#6b7280', bg: '#f3f4f6' },
];
const noteCatOf = k => NOTE_CATS.find(c => c.key === k) || NOTE_CATS[4];

// ── Dossier Interne — root ────────────────────────────────────────
function DossierInterne({ api, clients, onRefreshClients }) {
  const [tab, setTab] = useState('dashboard');

  const TABS = [
    { key: 'dashboard',  label: '📊 Cabinet' },
    { key: 'pipeline',   label: '🎯 Pipeline' },
    { key: 'facturation',label: '💰 Facturation' },
    { key: 'documents',  label: '📁 Documents' },
    { key: 'notes',      label: '📝 Notes' },
    { key: 'agenda',     label: '📅 Agenda' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
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
        {tab === 'dashboard'   && <InterneDashboard api={api} clients={clients} />}
        {tab === 'pipeline'    && <InternePipeline api={api} onRefreshClients={onRefreshClients} />}
        {tab === 'facturation' && <InterneFacturation api={api} clients={clients} />}
        {tab === 'documents'   && <InterneDocuments api={api} />}
        {tab === 'notes'       && <InterneNotes api={api} />}
        {tab === 'agenda'      && <InterneAgenda api={api} clients={clients} />}
      </div>
    </div>
  );
}

// ── Tableau de bord cabinet ───────────────────────────────────────
function InterneDashboard({ api, clients }) {
  const [factures,  setFactures]  = useState([]);
  const [pipeline,  setPipeline]  = useState([]);
  const [objectif,  setObjectif]  = useState(0);
  const [loadingObj,setLoadingObj]= useState(false);

  useEffect(() => {
    api.getFactures().then(r => setFactures(r || []));
    api.getPipeline().then(r => setPipeline(r || []));
    api.getCabinetSettings().then(s => { if (s?.objectif_mensuel) setObjectif(s.objectif_mensuel); });
  }, []);

  const now    = new Date();
  const mois   = now.getMonth() + 1;
  const annee  = now.getFullYear();

  const facturesMois = factures.filter(f => {
    const d = new Date(f.date_emission);
    return d.getMonth() + 1 === mois && d.getFullYear() === annee;
  });

  const caEncaisse  = facturesMois.filter(f => f.statut === 'payee').reduce((s, f) => s + (+f.montant || 0), 0);
  const caAttente   = facturesMois.filter(f => ['envoyee','attente','retard'].includes(f.statut)).reduce((s, f) => s + (+f.montant || 0), 0);
  const caTotal     = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (+f.montant || 0), 0);
  const enRetard    = factures.filter(f => f.statut === 'retard').length;
  const objectifPct = objectif > 0 ? Math.min(Math.round(caEncaisse / objectif * 100), 100) : 0;

  const pipelineActifs = pipeline.filter(p => !['gagne','perdu'].includes(p.statut));
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
              <span style={{ fontSize: 12, color: '#64748b' }}>Progression {MOIS_LABELS[mois-1]} {annee}</span>
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
        <KpiCard label={`CA encaissé — ${MOIS_LABELS[mois-1]}`} value={fmtEur(caEncaisse)} sub="factures payées ce mois" color="#059669" icon="✅" />
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
  const [items,     setItems]     = useState([]);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [showDel,   setShowDel]   = useState(null);
  const [expanded,  setExpanded]  = useState(null);
  const [converting,setConverting]= useState(null);
  const [showDiag,  setShowDiag]  = useState(null);

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
      const formula  = item.formule || 'audit_menu';
      const fTasks   = getTasksForFormula(formula);
      const tasks = {
        prospection:   (fTasks.prospection   || []).map(() => true),  // tout coché
        questionnaire: (fTasks.questionnaire || []).map(() => false), // en cours
        audit:         (fTasks.audit         || []).map(() => false),
        cloture:       (fTasks.cloture       || []).map(() => false),
      };

      await api.createClient({
        name,
        company,
        email:       item.email      || '',
        phone:       d.telephone     || '',
        stage:       'questionnaire',
        priority:    item.eligibilite === 'eligible' ? 'high' : 'medium',
        revenue:     item.budget_estime || 0,
        nextAction:  'Analyser questionnaire pré-audit',
        notes: [
          d.problemes_principaux     ? `🔴 Problèmes : ${d.problemes_principaux}`          : '',
          d.objectif_6mois           ? `🎯 Objectif 6 mois : ${d.objectif_6mois}`           : '',
          d.preoccupation_financiere ? `💰 Préoccupation : ${d.preoccupation_financiere}`   : '',
          d.message_libre            ? `💬 Message : ${d.message_libre}`                    : '',
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
            const st  = pipelineStatutOf(item.statut);
            const fm  = FORMULAS.find(f => f.key === item.formule);
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
  const planMatch    = texte.match(/Plan\s+(?:d.action|action)\s*:\s*(.*?)(?=\|\s*Offre\s+recommand|Offre\s+recommand|$)/is);
  const offreMatch   = texte.match(/Offre\s+recommand[ée]e?\s*:\s*(.*?)$/is);

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
    plan:    parseItems(planMatch?.[1]    || ''),
    offre:   offreMatch?.[1]?.replace(/\|/g, '').replace(/-\s+/g, '\n• ').trim() || '',
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
    if (d.vision_marge?.includes('chaque mois'))        score += 2;
    else if (d.vision_marge?.includes('proximat'))      score += 1;
    if (d.expert_comptable?.includes('mensuell'))       score += 1;
    else if (d.expert_comptable?.includes('trimestr'))  score += 0.5;
    if (d.fc_pct > 0 && d.fc_pct <= 30)                score += 1;
    else if (d.fc_pct > 30 && d.fc_pct <= 34)          score += 0.5;
    if (d.ms_pct > 0 && d.ms_pct <= 33)                score += 1;
  }
  if (domaine === 'operations') {
    max = 5;
    if (d.fiches_techniques?.includes('tous'))          score += 2;
    else if (d.fiches_techniques?.includes('partie'))   score += 1;
    if (d.bons_commande?.includes('formalis'))          score += 1;
    else if (d.bons_commande?.includes('informel'))     score += 0.5;
    if (d.back_office_en_ligne?.includes('utilise') || d.back_office_en_ligne?.includes('régulière')) score += 1;
    if (d.gaspillage_pertes?.includes('Rarement') || d.gaspillage_pertes?.includes('bon contrôle')) score += 1;
  }
  if (domaine === 'digital') {
    max = 5;
    if (d.google_business?.includes('complète') || d.google_business?.includes('complète')) score += 1;
    if (d.nb_avis?.includes('100') || d.nb_avis?.includes('200') || d.nb_avis?.includes('Plus')) score += 1;
    else if (d.nb_avis?.includes('50'))  score += 0.5;
    if (d.site_internet?.includes('jour')) score += 1;
    else if (d.site_internet?.includes('ancien')) score += 0.5;
    if (d.reseaux_sociaux && (Array.isArray(d.reseaux_sociaux) ? d.reseaux_sociaux.length > 0 : d.reseaux_sociaux !== 'Aucun')) score += 1;
    if (d.frequence_reseaux?.includes('jour') || d.frequence_reseaux?.includes('semaine')) score += 1;
  }
  if (domaine === 'gestion') {
    max = 5;
    if (d.logiciel_caisse && !d.logiciel_caisse.includes('classique')) score += 1;
    if (d.back_office_en_ligne?.includes('utilise') || d.back_office_en_ligne?.includes('régulière')) score += 1;
    if (d.fiches_techniques?.includes('tous'))   score += 1;
    if (d.bons_commande?.includes('formalis'))   score += 1;
    if (d.vision_marge?.includes('chaque mois')) score += 1;
  }
  return { score: Math.min(score, max), max };
}

function genererAlertes(d) {
  const alertes = [], vigilances = [], pointsForts = [], recommandations = [];

  // ── Finances ──
  if (d.fc_pct > 34)         alertes.push({ icon: '🔴', text: `Food cost critique : ${d.fc_pct}% (idéal < 30%)` });
  else if (d.fc_pct > 30)    vigilances.push({ icon: '🟡', text: `Food cost élevé : ${d.fc_pct}% (idéal < 30%)` });
  else if (d.fc_pct > 0)     pointsForts.push({ icon: '🟢', text: `Food cost maîtrisé : ${d.fc_pct}%` });

  if (d.ms_pct > 38)         alertes.push({ icon: '🔴', text: `Masse salariale critique : ${d.ms_pct}% (idéal < 33%)` });
  else if (d.ms_pct > 33)    vigilances.push({ icon: '🟡', text: `Masse salariale à surveiller : ${d.ms_pct}%` });
  else if (d.ms_pct > 0)     pointsForts.push({ icon: '🟢', text: `Masse salariale correcte : ${d.ms_pct}%` });

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

  if (d.loy_pct > 12)        alertes.push({ icon: '🔴', text: `Loyer très élevé : ~${d.loy_pct}% du CA (idéal < 8%)` });
  else if (d.loy_pct > 8)    vigilances.push({ icon: '🟡', text: `Loyer élevé : ~${d.loy_pct}% du CA` });

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
  if (d.fc_pct > 30)         recommandations.push('Audit food cost prioritaire — revoir les fiches techniques et tarifs');
  if (!d.fiches_techniques?.includes('tous')) recommandations.push('Créer des fiches techniques pour tous les plats');
  if (d.vision_marge?.includes('flou'))       recommandations.push('Mettre en place un tableau de bord mensuel simple');
  if (!d.google_business?.includes('complète')) recommandations.push('Optimiser la fiche Google My Business');
  if (d.ms_pct > 33)         recommandations.push('Analyser la masse salariale — optimiser le planning');
  if (d.gaspillage_pertes?.includes('significatif')) recommandations.push('Mettre en place un suivi des pertes en cuisine');

  return { alertes, vigilances, pointsForts, recommandations };
}

function DiagnosticPreaudit({ item, onBack, onConvertir, converting }) {
  const d = item.tally_preaudit || {};
  const { alertes, vigilances, pointsForts, recommandations } = genererAlertes(d);
  const domaines = [
    { key: 'finances',   label: 'Finances',    icon: '💰', color: '#059669' },
    { key: 'operations', label: 'Opérations',  icon: '🍳', color: '#7c3aed' },
    { key: 'digital',    label: 'Digital',     icon: '📱', color: '#d97706' },
    { key: 'gestion',    label: 'Gestion',     icon: '📊', color: '#0369a1' },
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
          { items: alertes,     title: `🔴 Alertes critiques (${alertes.length})`,      bg: '#fee2e2', border: '#fca5a5', color: '#dc2626' },
          { items: vigilances,  title: `🟡 Points de vigilance (${vigilances.length})`, bg: '#fef3c7', border: '#fcd34d', color: '#d97706' },
          { items: pointsForts, title: `🟢 Points forts (${pointsForts.length})`,       bg: '#d1fae5', border: '#6ee7b7', color: '#059669' },
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
          ].filter(([,v]) => v).map(([l, v]) => (
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
          ].filter(([,v]) => v).map(([l, v]) => (
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
  const [editing,  setEditing]  = useState(null);
  const [showDel,  setShowDel]  = useState(null);
  const [filter,   setFilter]   = useState('all');

  useEffect(() => { load(); }, []);
  async function load() { setFactures((await api.getFactures()) || []); }

  async function handleSave(data) {
    await api.saveFacture(data);
    setShowForm(false); setEditing(null); load();
  }

  const filtered = filter === 'all' ? factures : factures.filter(f => f.statut === filter);
  const totalPayee  = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (+f.montant || 0), 0);
  const totalAttente = factures.filter(f => ['envoyee','attente'].includes(f.statut)).reduce((s, f) => s + (+f.montant || 0), 0);
  const totalRetard = factures.filter(f => f.statut === 'retard').reduce((s, f) => s + (+f.montant || 0), 0);

  if (showForm || editing) return (
    <FactureForm data={editing} clients={clients} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAF8F2' }}>
                {['N° Facture', 'Client', 'Formule', 'Montant', 'Émission', 'Échéance', 'Statut', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #DDD5B8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const st = factureStatutOf(f.statut);
                const cl = clients.find(c => c.id === f.client_id);
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid #F5F0E8' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0D1520' }}>{f.numero}</td>
                    <td style={{ padding: '9px 10px', color: '#374151' }}>{cl?.name || f.client_nom || '—'}</td>
                    <td style={{ padding: '9px 10px' }}>{f.formule || '—'}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#059669' }}>{fmtEur(f.montant)}</td>
                    <td style={{ padding: '9px 10px', color: '#64748b' }}>{f.date_emission ? new Date(f.date_emission).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ padding: '9px 10px', color: f.statut === 'retard' ? '#dc2626' : '#64748b' }}>{f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ padding: '9px 10px' }}><Badge color={st.color} bg={st.bg} small>{st.label}</Badge></td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => setEditing(f)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11 }}>Modifier</button>
                        <button onClick={() => setShowDel(f)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer cette facture" message={`Supprimer la facture ${showDel.numero} ?`} onConfirm={async () => { await api.deleteFacture(showDel.id); setShowDel(null); load(); }} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function FactureForm({ data, clients, onSave, onCancel }) {
  const [form, setForm] = useState({
    numero: `FA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    client_id: '', client_nom: '', formule: '', montant: '', statut: 'brouillon',
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: '', notes: '', ...(data || {}),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
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
            <select value={form.client_id} onChange={e => { set('client_id', e.target.value); const cl = clients.find(c => String(c.id) === e.target.value); if (cl) set('client_nom', cl.name); }} style={inp}>
              <option value="">— Sélectionner —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
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
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} />
        </div>
      </div>
    </div>
  );
}

// ── Documents internes ────────────────────────────────────────────
function InterneDocuments({ api }) {
  const [docs,     setDocs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showDel,  setShowDel]  = useState(null);

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
  const [notes,    setNotes]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({ titre: '', contenu: '', categorie: 'memo' });
  const [saving,   setSaving]   = useState(false);
  const [showDel,  setShowDel]  = useState(null);

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
  const [events,       setEvents]       = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [showDel,      setShowDel]      = useState(null);
  const [selectedEvent,setSelectedEvent]= useState(null);
  const [viewDate,     setViewDate]     = useState(new Date());

  useEffect(() => { load(); }, []);
  async function load() { setEvents((await api.getAgendaEvents()) || []); }

  async function handleDelete(id) {
    await api.deleteAgendaEvent(id);
    setShowDel(null);
    setSelectedEvent(null);
    load();
  }

  const year  = viewDate.getFullYear();
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
        {[['#C9A84C','Actions clients (auto)'],['#0369a1','Visio'],['#dc2626','Livrable'],['#6b7280','Autre']].map(([c,l]) => (
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

// ══════════════════════════════════════════════════════════════════
// SUIVI MENSUEL
// ══════════════════════════════════════════════════════════════════

const SUIVI_STATUTS = [
  { key: 'attente',  label: 'En attente données', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'encours',  label: 'En cours',            color: '#0369a1', bg: '#e0f2fe' },
  { key: 'termine',  label: 'Terminé',             color: '#059669', bg: '#d1fae5' },
  { key: 'envoye',   label: 'Rapport envoyé',      color: '#7c3aed', bg: '#ede9fe' },
];
const suiviStatutOf = key => SUIVI_STATUTS.find(s => s.key === key) || SUIVI_STATUTS[0];

function SuiviTab({ client, api, suivis, analyses, menuAnalyses, onReload }) {
  const [selected,  setSelected]  = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [showDel,   setShowDel]   = useState(null);
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
    const menuData = menuAnalyses.find(a => {
      const d = new Date(a.created_at);
      return d.getMonth() + 1 === suivi.mois && d.getFullYear() === suivi.annee;
    });

    const kFin  = finData ? calcFin(finData) : null;
    const statut = suiviStatutOf(suivi.statut);

    const finSection = finData && kFin ? `
      <div class="section-title">📊 Analyse Financière — ${MOIS_LABELS[suivi.mois-1]} ${suivi.annee}</div>
      <div class="grid3">
        <div class="kpi"><div class="kpi-label">CA Total</div><div class="kpi-val">${fmtEur(finData.ca_total)}</div></div>
        <div class="kpi"><div class="kpi-label">Ticket Moyen</div><div class="kpi-val">${fmtEur(kFin.tickM)}</div></div>
        <div class="kpi"><div class="kpi-label">CMV Global</div><div class="kpi-val" style="color:${kFin.cmvG > 33 ? '#dc2626' : '#059669'}">${kFin.cmvG.toFixed(1)}%</div></div>
        <div class="kpi"><div class="kpi-label">Marge Brute</div><div class="kpi-val">${fmtEur(kFin.mbr)} (${kFin.mbrP.toFixed(1)}%)</div></div>
        <div class="kpi"><div class="kpi-label">EBE</div><div class="kpi-val" style="color:${kFin.ebeP < 5 ? '#dc2626' : '#059669'}">${fmtEur(kFin.ebe)} (${kFin.ebeP.toFixed(1)}%)</div></div>
        <div class="kpi"><div class="kpi-label">Point Mort</div><div class="kpi-val">${fmtEur(kFin.pm)}</div></div>
        <div class="kpi"><div class="kpi-label">Coussin Sécurité</div><div class="kpi-val" style="color:${kFin.cous < 10 ? '#dc2626' : '#059669'}">${kFin.cous.toFixed(1)}%</div></div>
        <div class="kpi"><div class="kpi-label">Prime Cost</div><div class="kpi-val" style="color:${kFin.pcost > 65 ? '#dc2626' : '#059669'}">${kFin.pcost.toFixed(1)}%</div></div>
        <div class="kpi"><div class="kpi-label">Couverts / Jour</div><div class="kpi-val">${kFin.covJr.toFixed(0)}</div></div>
      </div>` : '<div class="section-title">📊 Analyse Financière</div><p style="color:#94a3b8;font-size:12px">Aucune analyse financière liée à ce mois.</p>';

    const menuSection = menuData ? `
      <div class="section-title">🍽️ Analyse Menu — ${menuData.nom}</div>
      <p style="font-size:12px;color:#374151">Analyse réalisée le ${new Date(menuData.created_at).toLocaleDateString('fr-FR')}</p>` :
      '<div class="section-title">🍽️ Analyse Menu</div><p style="color:#94a3b8;font-size:12px">Aucune analyse menu liée à ce mois.</p>';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; padding:32px; font-size:13px; line-height:1.5; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        h1 { font-size:22px; font-weight:800; color:#0D1520; }
        .subtitle { color:#64748b; font-size:14px; margin-top:2px; }
        .badge { display:inline-block; border-radius:10px; padding:3px 10px; font-size:11px; font-weight:700; background:${statut.bg}; color:${statut.color}; }
        .section-title { font-size:13px; font-weight:700; color:#0D1520; margin:20px 0 10px; padding-bottom:6px; border-bottom:2px solid #DDD5B8; }
        .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:8px; }
        .kpi { background:#FAF8F2; border:1px solid #DDD5B8; border-radius:8px; padding:10px 12px; }
        .kpi-label { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
        .kpi-val { font-size:16px; font-weight:800; color:#0D1520; }
        .notes-box { background:#f8fafc; border:1px solid #DDD5B8; border-radius:8px; padding:12px; font-size:13px; white-space:pre-wrap; line-height:1.6; }
        .actions-box { display:flex; flex-direction:column; gap:6px; }
        .action { background:#FAF8F2; border:1px solid #DDD5B8; border-radius:8px; padding:8px 12px; font-size:12px; }
        .footer { margin-top:28px; padding-top:12px; border-top:1px solid #DDD5B8; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between; }
      </style>
    </head><body>
      <div class="header">
        <div>
          <h1>${client.name} — ${client.company}</h1>
          <div class="subtitle">Rapport Suivi Mensuel · ${MOIS_LABELS[suivi.mois-1]} ${suivi.annee}</div>
        </div>
        <span class="badge">${statut.label}</span>
      </div>

      ${finSection}
      ${menuSection}

      ${suivi.notes ? `<div class="section-title">📝 Notes & Observations</div><div class="notes-box">${suivi.notes}</div>` : ''}

      ${suivi.actions ? `
        <div class="section-title">✅ Actions décidées ce mois</div>
        <div class="actions-box">
          ${suivi.actions.split('\n').filter(Boolean).map(a =>
            `<div class="action">→ ${a}</div>`
          ).join('')}
        </div>` : ''}

      <div class="footer">
        <span>La Carte Consulting · Rapport généré le ${new Date().toLocaleDateString('fr-FR')}</span>
        <span>${client.name} — ${MOIS_LABELS[suivi.mois-1]} ${suivi.annee}</span>
      </div>
    </body></html>`;

    await api.exportPDF({ html, filename: `Suivi_${client.name.replace(/\s+/g,'_')}_${MOIS_LABELS[suivi.mois-1]}_${suivi.annee}.pdf` });
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:13, color:'#64748b' }}>{suivis.length} mois suivi{suivis.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowForm('new')} style={btnPrimary}>+ Nouveau mois</button>
      </div>

      {suivis.length === 0 ? (
        <div onClick={() => setShowForm('new')}
          style={{ border:'2px dashed #DDD5B8', borderRadius:10, padding:'48px 20px', textAlign:'center', cursor:'pointer', color:'#94a3b8' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
          <div style={{ fontSize:36, marginBottom:10 }}>📅</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#64748b', marginBottom:4 }}>Aucun suivi mensuel</div>
          <div style={{ fontSize:13 }}>Créez le suivi du premier mois pour démarrer</div>
        </div>
      ) : (
        <div style={{ display:'flex', gap:14 }}>
          {/* Sidebar mois */}
          <div style={{ width:160, flexShrink:0, display:'flex', flexDirection:'column', gap:5 }}>
            {sorted.map(s => {
              const st = suiviStatutOf(s.statut);
              const isActive = selected?.id === s.id;
              return (
                <div key={s.id} onClick={() => setSelected(s)}
                  style={{ padding:'9px 11px', borderRadius:8, border:`1px solid ${isActive ? '#C9A84C' : '#DDD5B8'}`, background: isActive ? '#FAF3E0' : '#FFFDF8', cursor:'pointer' }}>
                  <div style={{ fontWeight:700, fontSize:12, color:'#0D1520' }}>{MOIS_LABELS[s.mois-1]} {s.annee}</div>
                  <div style={{ marginTop:4 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:st.color, background:st.bg, borderRadius:6, padding:'1px 6px' }}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Détail */}
          <div style={{ flex:1, minWidth:0 }}>
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
              <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8', fontSize:13 }}>← Sélectionnez un mois</div>
            )}
          </div>
        </div>
      )}

      {showDel && (
        <ConfirmModal
          title="Supprimer ce suivi"
          message={`Supprimer le suivi de ${MOIS_LABELS[showDel.mois-1]} ${showDel.annee} ?`}
          onConfirm={() => handleDelete(showDel.id)}
          onCancel={() => setShowDel(null)}
        />
      )}
    </div>
  );
}

// ── Détail d'un suivi mensuel ─────────────────────────────────────
function SuiviDetail({ suivi, client, analyses, menuAnalyses, onEdit, onDelete, onStatusChange, onExport, exporting }) {
  const finData  = analyses.find(a => a.mois === suivi.mois && a.annee === suivi.annee);
  const menuData = menuAnalyses.find(a => {
    const d = new Date(a.created_at);
    return d.getMonth() + 1 === suivi.mois && d.getFullYear() === suivi.annee;
  });
  const kFin  = finData ? calcFin(finData) : null;
  const statut = suiviStatutOf(suivi.statut);

  return (
    <div>
      {/* En-tête */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'#0D1520' }}>{MOIS_LABELS[suivi.mois-1]} {suivi.annee}</div>
          <div style={{ marginTop:5 }}>
            <span style={{ background:statut.bg, color:statut.color, borderRadius:8, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{statut.label}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <button onClick={onExport} disabled={exporting} style={{ ...btnSec, color:'#7c3aed' }}>
            {exporting ? '…' : '📄 Rapport PDF'}
          </button>
          <button onClick={onEdit} style={btnSec}>Modifier</button>
          <button onClick={onDelete} style={{ ...btnSec, color:'#dc2626', borderColor:'#fca5a5' }}>Supprimer</button>
        </div>
      </div>

      {/* Changement de statut */}
      <div style={{ ...card, marginBottom:14, padding:'12px 16px' }}>
        <label style={lbl}>Statut du suivi</label>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
          {SUIVI_STATUTS.map(s => (
            <button key={s.key} onClick={() => onStatusChange(s.key)} style={{
              padding:'5px 13px', borderRadius:12, cursor:'pointer', fontSize:12, fontWeight:600,
              border:`1px solid ${suivi.statut === s.key ? s.color : '#DDD5B8'}`,
              background: suivi.statut === s.key ? s.bg : '#FFFDF8',
              color: suivi.statut === s.key ? s.color : '#6b7280',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Lien Analyse Financière */}
      <div style={{ ...card, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: finData ? 12 : 0 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#0D1520' }}>📊 Analyse Financière</span>
          {!finData && <span style={{ fontSize:12, color:'#94a3b8', fontStyle:'italic' }}>Aucune analyse pour ce mois — créez-en une dans l'onglet "Analyse financière"</span>}
        </div>
        {finData && kFin && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {[
              { l:'CA Total',     v:fmtEur(finData.ca_total),               c:'#0D1520' },
              { l:'Ticket Moyen', v:fmtEur(kFin.tickM),                     c:'#0D1520' },
              { l:'CMV Global',   v:`${kFin.cmvG.toFixed(1)}%`,             c: kFin.cmvG > 33 ? '#dc2626' : kFin.cmvG > 28 ? '#d97706' : '#059669' },
              { l:'EBE',          v:`${fmtEur(kFin.ebe)} (${kFin.ebeP.toFixed(1)}%)`, c: kFin.ebeP < 5 ? '#dc2626' : '#059669' },
              { l:'Prime Cost',   v:`${kFin.pcost.toFixed(1)}%`,            c: kFin.pcost > 65 ? '#dc2626' : '#059669' },
              { l:'Point Mort',   v:fmtEur(kFin.pm),                        c:'#0D1520' },
              { l:'Coussin',      v:`${kFin.cous.toFixed(1)}%`,             c: kFin.cous < 10 ? '#dc2626' : '#059669' },
              { l:'Couverts/j',   v:kFin.covJr.toFixed(0),                  c:'#0D1520' },
            ].map(k => (
              <div key={k.l} style={{ background:'#FAF8F2', border:'1px solid #DDD5B8', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>{k.l}</div>
                <div style={{ fontSize:14, fontWeight:800, color:k.c }}>{k.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lien Analyse Menu */}
      <div style={{ ...card, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#0D1520' }}>🍽️ Analyse Menu</span>
          {menuData
            ? <span style={{ fontSize:12, color:'#059669', fontWeight:600 }}>✓ {menuData.nom} · {new Date(menuData.created_at).toLocaleDateString('fr-FR')}</span>
            : <span style={{ fontSize:12, color:'#94a3b8', fontStyle:'italic' }}>Aucune analyse menu pour ce mois</span>
          }
        </div>
      </div>

      {/* Notes */}
      {suivi.notes && (
        <div style={{ ...card, marginBottom:12 }}>
          <label style={lbl}>Notes & Observations</label>
          <div style={{ fontSize:13, color:'#374151', lineHeight:1.65, whiteSpace:'pre-wrap', marginTop:4 }}>{suivi.notes}</div>
        </div>
      )}

      {/* Actions */}
      {suivi.actions && (
        <div style={card}>
          <label style={lbl}>Actions décidées ce mois</label>
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:6 }}>
            {suivi.actions.split('\n').filter(Boolean).map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'6px 10px', background:'#FAF8F2', borderRadius:7, border:'1px solid #DDD5B8' }}>
                <span style={{ color:'#C9A84C', fontWeight:700, flexShrink:0 }}>→</span>
                <span style={{ fontSize:13, color:'#374151' }}>{a}</span>
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
    mois:    data?.mois    || new Date().getMonth() + 1,
    annee:   data?.annee   || new Date().getFullYear(),
    statut:  data?.statut  || 'attente',
    notes:   data?.notes   || '',
    actions: data?.actions || '',
    ...(data || {}),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.mois && form.annee;

  return (
    <div style={{ maxWidth:640, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding:'6px 12px' }}>← Retour</button>
        <h3 style={{ flex:1, margin:0, fontSize:16, fontWeight:800, color:'#0D1520' }}>
          {data?.id ? 'Modifier le suivi' : 'Nouveau suivi mensuel'}
        </h3>
        <button onClick={() => onSave({ ...form, mois:+form.mois, annee:+form.annee })}
          disabled={!valid} style={{ ...btnPrimary, opacity:valid?1:0.5 }}>
          Enregistrer
        </button>
      </div>

      <div style={{ ...card, marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#C9A84C', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>📅 Période</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={lbl}>Mois</label>
            <select value={form.mois} onChange={e => set('mois', +e.target.value)} style={inp}>
              {MOIS_LABELS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Année</label>
            <input type="number" value={form.annee} onChange={e => set('annee', e.target.value)} style={inp} min="2020" max="2035" />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#C9A84C', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>📋 Statut</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {SUIVI_STATUTS.map(s => (
            <button key={s.key} onClick={() => set('statut', s.key)} style={{
              padding:'5px 13px', borderRadius:12, cursor:'pointer', fontSize:12, fontWeight:600,
              border:`1px solid ${form.statut === s.key ? s.color : '#DDD5B8'}`,
              background: form.statut === s.key ? s.bg : '#FFFDF8',
              color: form.statut === s.key ? s.color : '#6b7280',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginBottom:12 }}>
        <label style={lbl}>Notes & Observations</label>
        <textarea rows={4} value={form.notes} onChange={e => set('notes', e.target.value)}
          style={{ ...inp, resize:'vertical', minHeight:90, marginTop:4 }}
          placeholder="Points abordés pendant le suivi, contexte du mois, observations terrain…" />
      </div>

      <div style={card}>
        <label style={lbl}>Actions décidées ce mois</label>
        <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 6px' }}>Une action par ligne</p>
        <textarea rows={5} value={form.actions} onChange={e => set('actions', e.target.value)}
          style={{ ...inp, resize:'vertical', minHeight:110 }}
          placeholder={"Renégocier fournisseur viande\nRetravailler description des entrées\nSupprimer les 2 plats poids morts"} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ANALYSE MENU — CONFIG & CALCULS
// ══════════════════════════════════════════════════════════════════

const MENU_CATS = [
  { key: 'entree',   label: 'Entrée',   color: '#0369a1', bg: '#e0f2fe' },
  { key: 'plat',     label: 'Plat',     color: '#7c3aed', bg: '#ede9fe' },
  { key: 'dessert',  label: 'Dessert',  color: '#d97706', bg: '#fef3c7' },
  { key: 'boisson',  label: 'Boisson',  color: '#065f46', bg: '#d1fae5' },
  { key: 'autre',    label: 'Autre',    color: '#6b7280', bg: '#f3f4f6' },
];
const menuCatOf = key => MENU_CATS.find(c => c.key === key) || MENU_CATS[4];

const MATRIX_CELLS = {
  star:       { label: 'Star ⭐',       color: '#059669', bg: '#d1fae5', border: '#6ee7b7', desc: 'Rentable + Populaire → Maintenir, mettre en avant' },
  vache:      { label: 'Vache 🐄',      color: '#d97706', bg: '#fef3c7', border: '#fcd34d', desc: 'Populaire mais peu rentable → Optimiser coût ou prix' },
  enigme:     { label: 'Énigme ❓',     color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc', desc: 'Rentable mais peu vendu → Mieux positionner, mieux décrire' },
  poids_mort: { label: 'Poids Mort 💀', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', desc: 'Peu rentable + Peu vendu → Supprimer ou retravailler' },
};

const EDITORIAL_CHECKS = [
  { key: 'noms_clairs',        label: 'Noms des plats clairs et évocateurs' },
  { key: 'descriptions',       label: 'Descriptions présentes et appétissantes' },
  { key: 'nb_items_ok',        label: 'Nombre de plats adapté (5-7 par catégorie max)' },
  { key: 'prix_lisibles',      label: 'Prix bien formatés, cohérents' },
  { key: 'pas_symbole_euro',   label: 'Pas de symbole € (réduit inhibition d\'achat)' },
  { key: 'hierarchie_visuelle',label: 'Hiérarchie visuelle claire (titres, sections)' },
  { key: 'plats_star_en_haut', label: 'Plats stars / rentables en début de catégorie' },
  { key: 'pas_colonnes',       label: 'Pas de colonne prix alignée à droite' },
  { key: 'decoys',             label: 'Présence d\'un plat "ancre" (prix élevé pour contraste)' },
  { key: 'coherence_theme',    label: 'Cohérence avec le concept / thème du restaurant' },
  { key: 'saison',             label: 'Mention des produits de saison / locaux' },
  { key: 'allergenes',         label: 'Allergènes indiqués' },
];

function classifyItem(item, avgPop, avgMargin) {
  const margin    = (+item.prix_vente_ht || 0) - (+item.cout_revient || 0);
  const pop       = +item.quantite_vendue || 0;
  const isPopular = pop >= avgPop;
  const isProfitable = margin >= avgMargin;
  if (isPopular && isProfitable)  return 'star';
  if (isPopular && !isProfitable) return 'vache';
  if (!isPopular && isProfitable) return 'enigme';
  return 'poids_mort';
}

function computeMenuStats(items) {
  if (!items.length) return { avgPop: 0, avgMargin: 0, classified: [], byCategory: {}, totalRevenue: 0, totalCost: 0, cmvGlobal: 0 };
  const avgPop    = items.reduce((s, i) => s + (+i.quantite_vendue || 0), 0) / items.length;
  const margins   = items.map(i => (+i.prix_vente_ht || 0) - (+i.cout_revient || 0));
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  const classified = items.map((item, idx) => ({
    ...item,
    _margin:   margins[idx],
    _cmv_pct:  +item.prix_vente_ht > 0 ? (+item.cout_revient / +item.prix_vente_ht) * 100 : 0,
    _revenue:  (+item.prix_vente_ht || 0) * (+item.quantite_vendue || 0),
    _cost_total:(+item.cout_revient || 0) * (+item.quantite_vendue || 0),
    _class:    classifyItem(item, avgPop, avgMargin),
  }));
  const totalRevenue = classified.reduce((s, i) => s + i._revenue, 0);
  const totalCost    = classified.reduce((s, i) => s + i._cost_total, 0);
  const cmvGlobal    = totalRevenue > 0 ? totalCost / totalRevenue * 100 : 0;
  const byCategory   = {};
  MENU_CATS.forEach(c => {
    const cat = classified.filter(i => i.categorie === c.key);
    if (!cat.length) return;
    const rev  = cat.reduce((s, i) => s + i._revenue, 0);
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
  const vaches      = classified.filter(i => i._class === 'vache');
  const enigmes     = classified.filter(i => i._class === 'enigme');
  const poidsMorts  = classified.filter(i => i._class === 'poids_mort');
  const stars       = classified.filter(i => i._class === 'star');

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
  const [selected,  setSelected]  = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [editData,  setEditData]  = useState(null);
  const [showDel,   setShowDel]   = useState(null);
  const [items,     setItems]     = useState([]);

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
      id:               analysisId,
      client_id:        client.id,
      nom:              selected?.nom   || '',
      notes:            selected?.notes || '',
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
    { key: 'matrix',    label: '🎯 Matrice' },
    { key: 'items',     label: '🍽️ Références' },
    { key: 'architecture', label: '🏗️ Architecture' },
    { key: 'editorial', label: '📖 Éditorial' },
    { key: 'actions',   label: '📋 Plan d\'action' },
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
          {activeSection === 'matrix'       && <MenuMatrix stats={stats} />}
          {activeSection === 'items'        && <MenuItemsTable stats={stats} />}
          {activeSection === 'architecture' && <MenuArchitecture stats={stats} items={items} />}
          {activeSection === 'editorial'    && <MenuEditorial analysis={analysis} onSave={onSaveEditorial} />}
          {activeSection === 'actions'      && <MenuActions actions={actions} gain={gain} />}
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
      if (sortKey === '_margin')  return b._margin - a._margin;
      if (sortKey === 'qty')      return (+b.quantite_vendue||0) - (+a.quantite_vendue||0);
      if (sortKey === '_class')   return ['star','vache','enigme','poids_mort'].indexOf(a._class) - ['star','vache','enigme','poids_mort'].indexOf(b._class);
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
        {[['_class','Classe'],['_cmv_pct','CMV%'],['_margin','Marge'],['qty','Popularité']].map(([k,l]) => (
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
              {['Plat','Catégorie','Coût','Prix HT','Marge','CMV%','Qté vendue','CA','Classe'].map(h => (
                <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #DDD5B8', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((i, idx) => {
              const cell = MATRIX_CELLS[i._class];
              const cat  = menuCatOf(i.categorie);
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
                  <td style={{ padding: '7px 8px', color: (+i.quantite_vendue||0) >= stats.avgPop ? '#059669' : '#d97706', fontWeight: 600 }}>{i.quantite_vendue || 0}</td>
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
const valBig   = { fontSize: 15, fontWeight: 800, color: '#0D1520' };

// ── Grille éditoriale ─────────────────────────────────────────────
function MenuEditorial({ analysis, onSave }) {
  const stored = (() => { try { return JSON.parse(analysis.editorial_checks || '{}'); } catch { return {}; } })();
  const [checks,  setChecks]  = useState(stored);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(true); // false = modifications non sauvegardées

  const score = EDITORIAL_CHECKS.filter(c => checks[c.key]).length;
  const pct   = Math.round(score / EDITORIAL_CHECKS.length * 100);
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
  const [nom,     setNom]     = useState(data?.nom     || '');
  const [notes,   setNotes]   = useState(data?.notes   || '');
  const [items,   setItems]   = useState(existingItems?.length ? existingItems : [{ ...EMPTY_ITEM }]);
  const [importing, setImporting] = useState(false);

  function addItem()    { setItems(p => [...p, { ...EMPTY_ITEM }]); }
  function removeItem(i){ setItems(p => p.filter((_, j) => j !== i)); }
  function setItemField(i, k, v) { setItems(p => p.map((it, j) => j === i ? { ...it, [k]: v } : it)); }

  function handleCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text  = ev.target.result;
        const rows  = text.split('\n').filter(r => r.trim());
        const header= rows[0].split(/[,;|\t]/).map(h => h.trim().toLowerCase());
        const colIdx = {
          nom:  header.findIndex(h => ['nom','name','plat','article','libelle','référence'].some(k => h.includes(k))),
          cat:  header.findIndex(h => ['cat','type','section','famille'].some(k => h.includes(k))),
          cout: header.findIndex(h => ['cout','cost','revient','achat','matiere'].some(k => h.includes(k))),
          prix: header.findIndex(h => ['prix','price','vente','tarif','ht'].some(k => h.includes(k))),
          qty:  header.findIndex(h => ['qte','qty','quantite','vendu','nb','nombre','volume'].some(k => h.includes(k))),
          desc: header.findIndex(h => ['desc','description','detail'].some(k => h.includes(k))),
        };
        const CAT_MAP = { 'entrée': 'entree', 'entree': 'entree', 'plat': 'plat', 'dessert': 'dessert', 'boisson': 'boisson', 'drink': 'boisson' };
        const parsed = rows.slice(1).map(row => {
          const cols = row.split(/[,;|\t]/);
          const cat  = cols[colIdx.cat]?.trim().toLowerCase() || 'plat';
          return {
            nom:             cols[colIdx.nom]?.trim()  || '',
            categorie:       CAT_MAP[cat] || 'plat',
            cout_revient:    cols[colIdx.cout]?.replace(/[€\s]/g, '').replace(',', '.') || '',
            prix_vente_ht:   cols[colIdx.prix]?.replace(/[€\s]/g, '').replace(',', '.') || '',
            quantite_vendue: cols[colIdx.qty]?.trim()  || '',
            description:     cols[colIdx.desc]?.trim() || '',
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
          {['Nom du plat','Catégorie','Coût (€)','Prix HT (€)','Qté vendue','Marge',''].map(h => (
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
// DEVIS — GÉNÉRATION PDF
// ══════════════════════════════════════════════════════════════════

const DEVIS_TARIFS = {
  audit_menu: [
    { label: 'Moins de 30 références', prix: 490 },
    { label: '30 à 60 références',     prix: 640 },
    { label: 'Plus de 60 références',  prix: 790 },
  ],
  audit_menu_financier: [
    { label: 'Établissement solo / TPE',  prix: 990  },
    { label: 'Multi-concept ou 2 sites',  prix: 1290 },
    { label: 'Structure complexe',        prix: 1490 },
  ],
  suivi_mensuel: [
    { label: 'Avec Audit Complet préalable', prix: 490,  suffix: '/mois' },
    { label: 'Sans audit préalable',         prix: 690,  suffix: '/mois (1er mois audit inclus)' },
  ],
};

function fmtDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function generateDevisHTML(client, form) {
  const today    = new Date();
  const validity = new Date(today); validity.setDate(validity.getDate() + 30);
  const tarifs   = DEVIS_TARIFS[form.formula] || DEVIS_TARIFS.audit_menu;
  const tarif    = tarifs[form.tarifIdx] || tarifs[0];
  const prixFinal = form.prixFinal != null ? form.prixFinal : (form.customPrice !== '' ? +form.customPrice : tarif.prix);
  const acompte  = form.formula === 'suivi_mensuel' ? prixFinal : Math.round(prixFinal * 0.5);
  const phoneStr = form.phone || '+33 X XX XX XX XX';

  const FORMULA_LABELS = {
    audit_menu:           'Audit Menu',
    audit_menu_financier: 'Audit Complet',
    suivi_mensuel:        'Retainer Mensuel',
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
      Devis N° ${form.devisNum} émis le ${fmtDate(today)} · Valable 30 jours · La Carte — Anthony Grimault, auto-entrepreneur · SIRET : [en cours] · Non assujetti à la TVA – Art. 293 B du CGI · Toute acceptation du présent devis vaut acceptation des CGV disponibles sur demande.
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
  const bullet   = (t) => `<div style="display:flex;gap:8px;margin:3px 0;font-size:9.5px;color:#374151;"><span style="color:#C9A84C;flex-shrink:0;">■</span><span>${t}</span></div>`;

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
      ${['Art. 01 · Objet et champ d\'application','Art. 02 · Définitions','Art. 03 · Prestations proposées','Art. 04 · Formation du contrat','Art. 05 · Tarifs et conditions tarifaires','Art. 06 · Modalités de paiement','Art. 07 · Délais de livraison et pénalités','Art. 08 · Obligations du Prestataire','Art. 09 · Obligations du Client','Art. 10 · Confidentialité et protection des données','Art. 11 · Propriété intellectuelle','Art. 12 · Responsabilité et limitations','Art. 13 · Droit de rétractation','Art. 14 · Résiliation','Art. 15 · Droit applicable et litiges','Art. 16 · Dispositions diverses'].map(a => `<div style="padding:3px 8px;background:#f8fafc;border-radius:4px;">${a}</div>`).join('')}
    </div>

    <div style="font-size:9px;color:#64748b;padding:8px 12px;border:1px solid #DDD5B8;border-radius:6px;">
      <strong style="color:#0D1520;">Identité du Prestataire</strong><br>
      Anthony Grimault · La Carte — Restaurant Advisory · Auto-entrepreneur · SIRET : [en cours d'immatriculation] · lacarte.advisory@gmail.com · TVA non applicable — Art. 293 B du CGI
    </div>

    ${artTitle('01','Objet et champ d\'application')}
    ${artStyle}Les présentes CGV définissent les droits et obligations des parties pour des prestations de conseil en ingénierie de menu et optimisation financière CHR. Ces prestations sont exclusivement réalisées à distance. Elles n'incluent aucune intervention physique sur site, ni accompagnement opérationnel (HACCP, management, travaux, marketing digital), sauf accord écrit préalable.</div>
    ${bullet('Le Prestataire intervient uniquement sur les dimensions analytiques et stratégiques. Toute recommandation constitue un avis professionnel et non une garantie de résultat.')}

    ${artTitle('02','Définitions')}
    ${artStyle}<strong>Prestataire :</strong> La Carte — Anthony Grimault, auto-entrepreneur, conseil CHR.<br>
    <strong>Client :</strong> Toute personne physique ou morale ayant accepté un devis La Carte.<br>
    <strong>Livrable :</strong> Tout document produit par le Prestataire (rapport PDF, dashboard Excel, etc.).<br>
    <strong>Mission :</strong> Ensemble de la prestation depuis la signature jusqu'à la remise du livrable final.</div>

    ${artTitle('03','Prestations proposées')}
    ${artStyle}<strong>Audit Menu (490–790 €) :</strong> Analyse de la carte, matrice menu engineering, recommandations de re-pricing et plan d'action. Délai : 7 jours ouvrés.<br>
    <strong>Audit Complet (990–1 490 €) :</strong> Audit Menu augmenté de l'analyse financière complète. Dashboard Excel livré. Délai : 10 jours ouvrés.<br>
    <strong>Retainer Mensuel (490–690 €/mois) :</strong> Accompagnement continu avec revue mensuelle, rapport PDF, visio et accès email. Engagement minimum 3 mois.</div>

    ${cgvFooter(6)}
  </div>`;

  const cgvPage2 = `
  <div class="page">
    ${cgvHeader}

    ${artTitle('04','Formation du contrat')}
    ${artStyle}Le contrat est formé par : (1) transmission du devis signé, (2) règlement de l'acompte de 50 %, (3) accusé de réception du Prestataire. Le devis est valable 30 jours. Passé ce délai, le Prestataire peut réévaluer les conditions tarifaires.</div>

    ${artTitle('05','Tarifs et conditions tarifaires')}
    ${artStyle}Les tarifs sont exprimés en euros. Le Prestataire n'est pas assujetti à la TVA (art. 293 B du CGI). Toute demande hors périmètre initial fera l'objet d'un avenant soumis à acceptation avant exécution.</div>

    ${artTitle('06','Modalités de paiement')}
    ${artStyle}<strong>Prestations ponctuelles :</strong> acompte 50 % à la signature, solde 50 % à la remise du livrable.<br>
    <strong>Retainer :</strong> facturation mensuelle à terme échu, paiement sous 15 jours. Tout mois commencé est dû intégralement.<br>
    <strong>Modes acceptés :</strong> virement bancaire et chèque. Tout retard entraîne des pénalités égales à 3× le taux légal + indemnité forfaitaire de 40 €.</div>

    ${artTitle('07','Délais de livraison et pénalités')}
    ${artStyle}Les délais sont calculés en jours ouvrés à compter de la réception de l'intégralité des données requises. En cas de retard imputable au Prestataire : réduction de 10 % par jour ouvré de retard, plafonnée à 30 %. Les cas de force majeure suspendent les délais de plein droit.</div>

    ${artTitle('08','Obligations du Prestataire')}
    ${bullet('Réaliser les prestations avec le soin attendu d\'un consultant CHR expérimenté.')}
    ${bullet('Respecter les délais contractuels ou en informer le Client sans délai.')}
    ${bullet('N\'intégrer que des données vérifiées et sourcées dans les rapports.')}
    ${bullet('Maintenir la confidentialité absolue de toutes les données transmises.')}
    ${bullet('Être en mesure de justifier chaque recommandation par une donnée chiffrée.')}

    ${artTitle('09','Obligations du Client')}
    ${bullet('Transmettre des données exactes, complètes et à jour dans les délais convenus.')}
    ${bullet('Répondre aux demandes de clarification sous 48h ouvrées.')}
    ${bullet('Régler les factures aux échéances convenues.')}
    ${bullet('Informer le Prestataire de tout changement significatif dans l\'activité.')}
    ${bullet('S\'abstenir de diffuser les livrables à des tiers sans accord écrit préalable.')}

    ${artTitle('10','Confidentialité et protection des données')}
    ${artStyle}Le Prestataire traite avec la stricte confidentialité toutes les informations transmises. Un NDA peut être signé sur demande. Conformément au RGPD, le Client dispose d'un droit d'accès, rectification et suppression. Les données sont conservées pour la durée des obligations contractuelles, puis archivées 3 ans maximum.</div>

    ${cgvFooter(7)}
  </div>`;

  const cgvPage3 = `
  <div class="page">
    ${cgvHeader}

    ${artTitle('11','Propriété intellectuelle')}
    ${artStyle}Les livrables constituent des œuvres de l'esprit. À complet paiement, le Client obtient une licence d'utilisation non exclusive, non cessible, limitée à son usage interne. Le Client s'interdit de revendre les livrables, de les transmettre à des concurrents, ou de les exploiter dans une activité de conseil. Les méthodes et outils du Prestataire restent sa propriété exclusive.</div>

    ${artTitle('12','Responsabilité et limitations')}
    ${artStyle}Le Prestataire est tenu à une obligation de moyens. Sa responsabilité ne saurait être engagée en cas de données transmises incomplètes ou erronées, de non-application des recommandations, ou d'événements extérieurs affectant l'activité. En toute hypothèse, la responsabilité est limitée au montant effectivement perçu au titre de la prestation concernée.</div>

    ${artTitle('13','Droit de rétractation')}
    ${artStyle}Dans le cadre d'une relation B2B, le droit légal de rétractation de 14 jours ne s'applique pas. Toutefois, le Prestataire accorde un délai de 48h après signature pour annulation sans frais, à condition qu'aucune prestation n'ait débuté. Passé ce délai, l'acompte reste acquis.</div>

    ${artTitle('14','Résiliation')}
    ${artStyle}<strong>Prestations ponctuelles :</strong> toute résiliation après démarrage entraîne le versement de 50 % du montant restant dû, en sus de l'acompte versé.<br>
    <strong>Retainer :</strong> résiliation avec préavis de 30 jours calendaires par email avec accusé de réception. L'engagement minimum de 3 mois doit être honoré. Tout mois commencé est facturé intégralement.<br>
    Le Prestataire peut résilier de plein droit en cas de non-paiement, données frauduleuses ou comportement abusif.</div>

    ${artTitle('15','Droit applicable et règlement des litiges')}
    ${artStyle}Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut d'accord amiable dans les 30 jours, le litige sera soumis aux tribunaux compétents du domicile professionnel du Prestataire.</div>

    ${artTitle('16','Dispositions diverses')}
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
    formula:           client.formula || 'audit_menu',
    tarifIdx:          0,
    customPrice:       '',
    typeEtablissement: '',
    contexte:          '',
    phone:             '',
    devisNum:          `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
  });
  const [generating, setGenerating] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const tarifs     = DEVIS_TARIFS[form.formula] || DEVIS_TARIFS.audit_menu;
  const tarif      = tarifs[form.tarifIdx] || tarifs[0];
  const prixFinal  = form.customPrice !== '' ? +form.customPrice : tarif.prix;
  const acompte    = form.formula === 'suivi_mensuel' ? prixFinal : Math.round(prixFinal * 0.5);

  async function handleGenerate() {
    setGenerating(true);
    const html     = generateDevisHTML(client, { ...form, prixFinal });
    const filename = `Devis_${form.devisNum}_${client.company.replace(/\s+/g, '_')}.pdf`;
    await api.exportPDF({ html, filename });
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
        {d.masse_sal_estimee  > 0 && <TallyField label="Masse sal. estimée"  value={fmtEurLocal(d.masse_sal_estimee)} />}
        {d.loyer_estime       > 0 && <TallyField label="Loyer estimé"        value={fmtEurLocal(d.loyer_estime)} />}
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
            {d.deja_accompagne   && <TallyField label="Déjà accompagné"    value={d.deja_accompagne} />}
            {d.budget_mensuel    && <TallyField label="Budget mensuel"     value={d.budget_mensuel} highlight />}
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

function Badge({ color, bg, children, small }) {
  return (
    <span style={{ background: bg, color, borderRadius: 10, padding: small ? '1px 7px' : '2px 10px', fontSize: small ? 10 : 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {children}
    </span>
  );
}

// SVG icons
const IconDash   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor"/><rect x="9" y="1" width="5" height="5" rx="1" fill="currentColor"/><rect x="1" y="9" width="5" height="5" rx="1" fill="currentColor"/><rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor"/></svg>;
const IconFolder = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 3.5A1.5 1.5 0 012.5 2h3.086a1.5 1.5 0 011.06.44L7.5 3.5H12.5A1.5 1.5 0 0114 5v6.5A1.5 1.5 0 0112.5 13h-10A1.5 1.5 0 011 11.5V3.5z" fill="currentColor"/></svg>;
const IconList   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M2 7.5h11M2 11h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconLock   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="3" y="7" width="9" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;

// ══════════════════════════════════════════════════════════════════
// SHARED STYLES
// ══════════════════════════════════════════════════════════════════

const card   = { background: '#FFFDF8', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(13,21,32,0.07)', border: '1px solid #DDD5B8' };
const cardH  = { fontSize: 14, fontWeight: 500, color: '#0D1520', margin: 0, letterSpacing: 0.1 };
const td     = { padding: '10px 12px', fontSize: 13 };
const lbl    = { fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 4 };
const inp    = { padding: '8px 10px', border: '1px solid #DDD5B8', borderRadius: 7, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', background: '#FAF8F2' };
const iconBtn= { background: '#FFFDF8', border: '1px solid #DDD5B8', borderRadius: 5, cursor: 'pointer', fontSize: 12, padding: '2px 7px', color: '#6b7280' };
const overlay= { position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' };
const modal  = { background: '#FFFDF8', borderRadius: 16, padding: 26, width: '90%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(13,21,32,0.22)' };
const btnPrimary = { background: '#C9A84C', color: '#0D1520', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.2 };
const btnSec     = { background: '#FFFDF8', color: '#0D1520', border: '1px solid #DDD5B8', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
