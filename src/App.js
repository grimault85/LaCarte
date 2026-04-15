import React, { useState, useCallback, useEffect } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────
const STAGES = [
  { id: 'prospection',  label: 'Prospection' },
  { id: 'questionnaire',label: 'Questionnaire' },
  { id: 'audit',        label: 'Audit' },
  { id: 'cloture',      label: 'Clôture' },
];

const SC = {
  prospection:   { bg:'#EEEDFE', bd:'#AFA9EC', tc:'#3C3489', dot:'#7F77DD' },
  questionnaire: { bg:'#E6F1FB', bd:'#85B7EB', tc:'#0C447C', dot:'#378ADD' },
  audit:         { bg:'#FAEEDA', bd:'#FAC775', tc:'#633806', dot:'#BA7517' },
  cloture:       { bg:'#E1F5EE', bd:'#5DCAA5', tc:'#085041', dot:'#1D9E75' },
};

const PC = {
  high:   { bg:'#FCEBEB', tc:'#791F1F', l:'Urgent' },
  medium: { bg:'#FAEEDA', tc:'#633806', l:'Normal' },
  low:    { bg:'#EAF3DE', tc:'#27500A', l:'Faible' },
};

const TASKS = {
  prospection:   ['Premier contact établi','Qualification du besoin','Présentation de l\'offre','Devis envoyé','Devis accepté'],
  questionnaire: ['Questionnaire envoyé','Relance effectuée','Questionnaire reçu','Documents complémentaires','Questionnaire validé'],
  audit:         ['Réunion de lancement','Collecte des données','Analyse terrain','Entretiens réalisés','Rapport préliminaire','Rapport final rédigé'],
  cloture:       ['Présentation du rapport','Retours client intégrés','Rapport signé','Facturation émise','Dossier archivé'],
};

const AVBG = [
  ['#EEEDFE','#3C3489'],['#E6F1FB','#0C447C'],
  ['#FAEEDA','#633806'],['#E1F5EE','#085041'],['#FAECE7','#712B13']
];

const EMPTY_TASKS = {
  prospection:   [false,false,false,false,false],
  questionnaire: [false,false,false,false,false],
  audit:         [false,false,false,false,false,false],
  cloture:       [false,false,false,false,false],
};

// ── Helpers ────────────────────────────────────────────────────────────────
const pct    = arr => Math.round(arr.filter(Boolean).length / arr.length * 100);
const ovPct  = c   => { const a = Object.values(c.tasks).flat(); return Math.round(a.filter(Boolean).length / a.length * 100); };
const inits  = n   => n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0,2);
const api    = window.electronAPI;

// ── Micro-components ───────────────────────────────────────────────────────
function Bar({ v, color, h = 4 }) {
  return (
    <div style={{ height:h, background:'#e5e5e5', borderRadius:h, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${v}%`, background:color, borderRadius:h, transition:'width .3s' }} />
    </div>
  );
}

function Av({ name, size = 36 }) {
  const [bg, tc] = AVBG[name.charCodeAt(0) % 5];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:tc,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:Math.round(size*.34), fontWeight:600, flexShrink:0 }}>
      {inits(name)}
    </div>
  );
}

function SBadge({ stage }) {
  const c = SC[stage], s = STAGES.find(x => x.id === stage);
  return (
    <span style={{ background:c.bg, color:c.tc, border:`1px solid ${c.bd}`,
      borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:500, whiteSpace:'nowrap' }}>
      {s.label}
    </span>
  );
}

function PBadge({ p }) {
  const c = PC[p];
  return <span style={{ background:c.bg, color:c.tc, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:500 }}>{c.l}</span>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ clients, open }) {
  const total   = clients.length;
  const revenue = clients.reduce((a,c) => a + c.revenue, 0);
  const avgP    = total ? Math.round(clients.reduce((a,c) => a + ovPct(c), 0) / total) : 0;
  const bys     = STAGES.map(s => ({ ...s, n: clients.filter(c => c.stage === s.id).length }));

  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', height:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ fontSize:18, fontWeight:600 }}>Tableau de bord</div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[['Dossiers actifs', total],['CA prévisionnel', `${revenue.toLocaleString('fr')} €`],
          ['Progression moy.', `${avgP} %`],['En clôture', bys[3].n]].map(([l,v]) => (
          <div key={l} style={{ background:'#f5f5f5', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'#666', marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:600 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div style={{ background:'#fff', border:'1px solid #e5e5e5', borderRadius:12, padding:'16px 20px' }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Répartition pipeline</div>
        <div style={{ display:'flex', gap:10 }}>
          {bys.map(s => {
            const c = SC[s.id];
            return (
              <div key={s.id} style={{ flex:1, background:c.bg, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:11, color:c.tc, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:24, fontWeight:700, color:c.tc }}>{s.n}</div>
                <div style={{ fontSize:10, color:c.tc, opacity:.7 }}>{total ? Math.round(s.n/total*100) : 0} %</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next actions */}
      <div style={{ background:'#fff', border:'1px solid #e5e5e5', borderRadius:12, padding:'16px 20px' }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Actions à venir</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {clients.map(c => (
            <div key={c.id} onClick={() => open(c)}
              style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'7px 8px', borderRadius:8 }}
              onMouseEnter={e => e.currentTarget.style.background='#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <Av name={c.name} size={30} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{c.name}</div>
                <div style={{ fontSize:11, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nextAction}</div>
              </div>
              <SBadge stage={c.stage} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pipeline ───────────────────────────────────────────────────────────────
function Pipeline({ clients, open }) {
  return (
    <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12, height:'100%', boxSizing:'border-box', overflow:'hidden' }}>
      <div style={{ fontSize:18, fontWeight:600, flexShrink:0 }}>Pipeline</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, flex:1, overflow:'hidden', minHeight:0 }}>
        {STAGES.map(stage => {
          const col = SC[stage.id];
          const sc  = clients.filter(c => c.stage === stage.id);
          return (
            <div key={stage.id} style={{ display:'flex', flexDirection:'column', gap:8, minHeight:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'7px 12px', background:col.bg, borderRadius:8, flexShrink:0 }}>
                <span style={{ fontSize:12, fontWeight:600, color:col.tc }}>{stage.label}</span>
                <span style={{ fontSize:11, fontWeight:600, color:col.tc,
                  background:col.dot+'44', padding:'1px 7px', borderRadius:10 }}>{sc.length}</span>
              </div>
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                {sc.map(c => {
                  const p = pct(c.tasks[stage.id]);
                  return (
                    <div key={c.id} onClick={() => open(c)}
                      style={{ background:'#fff', border:'1px solid #e5e5e5', borderRadius:10,
                        padding:'12px 14px', cursor:'pointer', transition:'border-color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = col.dot}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e5e5'}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <Av name={c.name} size={28} />
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize:11, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.company}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, color:'#888' }}>Étape</span>
                        <span style={{ fontSize:10, fontWeight:600, color:col.tc }}>{p} %</span>
                      </div>
                      <Bar v={p} color={col.dot} />
                      {c.revenue > 0 && <div style={{ fontSize:11, color:'#888', marginTop:6 }}>{c.revenue.toLocaleString('fr')} €</div>}
                      <div style={{ fontSize:10, color:'#888', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nextAction}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detail ─────────────────────────────────────────────────────────────────
function Detail({ client, back, update, remove }) {
  const [tab,    setTab]    = useState(client.stage);
  const [notes,  setNotes]  = useState(client.notes);
  const [nxt,    setNxt]    = useState(client.nextAction);
  const [confirm,setConfirm]= useState(false);

  const ov = ovPct(client);
  const si = STAGES.findIndex(s => s.id === client.stage);

  const toggle = (stId, i) => {
    const updated = {
      ...client,
      tasks: { ...client.tasks, [stId]: client.tasks[stId].map((v,j) => j===i ? !v : v) }
    };
    update(updated);
  };

  const advance = () => {
    if (si < STAGES.length - 1) update({ ...client, stage: STAGES[si+1].id });
  };

  const saveField = (field, val) => update({ ...client, [field]: val });

  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', height:'100%', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={back} style={{ border:'1px solid #e5e5e5', background:'#fff', cursor:'pointer',
          color:'#555', fontSize:12, padding:'5px 10px', borderRadius:7 }}>← Retour</button>
        <div style={{ flex:1 }} />
        {!confirm
          ? <button onClick={() => setConfirm(true)}
              style={{ border:'1px solid #fca5a5', background:'#fef2f2', color:'#991b1b',
                cursor:'pointer', fontSize:11, padding:'5px 10px', borderRadius:7 }}>Supprimer</button>
          : <>
              <span style={{ fontSize:11, color:'#991b1b' }}>Confirmer ?</span>
              <button onClick={() => remove(client.id)}
                style={{ border:'1px solid #fca5a5', background:'#ef4444', color:'#fff',
                  cursor:'pointer', fontSize:11, padding:'5px 10px', borderRadius:7 }}>Oui, supprimer</button>
              <button onClick={() => setConfirm(false)}
                style={{ border:'1px solid #e5e5e5', background:'#fff', cursor:'pointer',
                  fontSize:11, padding:'5px 10px', borderRadius:7 }}>Annuler</button>
            </>
        }
      </div>

      {/* Identity */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <Av name={client.name} size={48} />
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
            <span style={{ fontSize:17, fontWeight:700 }}>{client.name}</span>
            <SBadge stage={client.stage} />
            <PBadge p={client.priority} />
          </div>
          <div style={{ fontSize:12, color:'#666' }}>{client.company}</div>
        </div>
        {si < STAGES.length - 1 && (
          <button onClick={advance} style={{
            padding:'7px 14px', fontSize:12, borderRadius:8, cursor:'pointer', fontWeight:600,
            background:SC[STAGES[si+1].id].bg, color:SC[STAGES[si+1].id].tc,
            border:`1px solid ${SC[STAGES[si+1].id].bd}`, whiteSpace:'nowrap' }}>
            → {STAGES[si+1].label}
          </button>
        )}
      </div>

      {/* Info grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ background:'#f8f8f8', borderRadius:10, padding:'13px 16px' }}>
          {[['Email',client.email],['Tél.',client.phone],['Créé le',client.created_at],
            ['CA prévu',client.revenue > 0 ? `${client.revenue.toLocaleString('fr')} €` : '—']].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12,
              padding:'5px 0', borderBottom:'1px solid #eee' }}>
              <span style={{ color:'#666' }}>{k}</span>
              <span style={{ fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background:'#f8f8f8', borderRadius:10, padding:'13px 16px' }}>
          <div style={{ fontSize:11, color:'#666', marginBottom:4 }}>Progression globale</div>
          <div style={{ fontSize:28, fontWeight:700, marginBottom:6 }}>{ov} %</div>
          <Bar v={ov} color={SC[client.stage].dot} h={6} />
          <div style={{ marginTop:12, fontSize:11, color:'#666' }}>Prochaine action</div>
          <input value={nxt}
            onChange={e => setNxt(e.target.value)}
            onBlur={() => saveField('nextAction', nxt)}
            style={{ width:'100%', fontSize:12, padding:'4px 0', border:'none',
              background:'transparent', borderBottom:'1px solid #ccc',
              outline:'none', marginTop:3, boxSizing:'border-box' }} />
        </div>
      </div>

      {/* Tasks */}
      <div style={{ background:'#fff', border:'1px solid #e5e5e5', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid #e5e5e5' }}>
          {STAGES.map(s => {
            const c   = SC[s.id];
            const isT = tab === s.id;
            const tp  = pct(client.tasks[s.id]);
            const isCur = client.stage === s.id;
            return (
              <button key={s.id} onClick={() => setTab(s.id)} style={{
                flex:1, padding:'9px 4px', border:'none', cursor:'pointer',
                background: isT ? c.bg : 'transparent',
                borderBottom: isT ? `2px solid ${c.dot}` : '2px solid transparent',
                display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <span style={{ fontSize:10, fontWeight:600, color: isT ? c.tc : '#888' }}>{s.label}</span>
                <span style={{ fontSize:10, color: isT ? c.tc : '#aaa' }}>{tp} %</span>
                {isCur && <span style={{ width:4, height:4, borderRadius:'50%', background:c.dot }} />}
              </button>
            );
          })}
        </div>
        <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:2 }}>
          {TASKS[tab].map((task, i) => {
            const done = client.tasks[tab][i];
            return (
              <label key={i} style={{ display:'flex', alignItems:'center', gap:10,
                cursor:'pointer', padding:'6px 8px', borderRadius:7 }}
                onMouseEnter={e => e.currentTarget.style.background='#f8f8f8'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <input type="checkbox" checked={done} onChange={() => toggle(tab, i)}
                  style={{ width:14, height:14, accentColor:SC[tab].dot, cursor:'pointer', flexShrink:0 }} />
                <span style={{ fontSize:12, color: done ? '#999' : '#111',
                  textDecoration: done ? 'line-through' : 'none' }}>{task}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>Notes</div>
        <textarea value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => saveField('notes', notes)}
          rows={4}
          style={{ width:'100%', borderRadius:8, padding:'9px 12px', fontSize:12,
            resize:'vertical', boxSizing:'border-box', border:'1px solid #e0e0e0',
            fontFamily:'inherit', lineHeight:1.5, outline:'none' }} />
      </div>
    </div>
  );
}

// ── New Client Modal ───────────────────────────────────────────────────────
function NewClientModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name:'', company:'', email:'', phone:'', priority:'medium', revenue:'' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const ok = () => {
    if (!form.name || !form.company) return;
    onCreate({
      ...form,
      revenue: parseInt(form.revenue) || 0,
      tasks: EMPTY_TASKS,
      stage: 'prospection',
      nextAction: 'À définir',
      notes: '',
    });
  };

  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.25)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:'24px', width:360,
        display:'flex', flexDirection:'column', gap:12, boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:15, fontWeight:700 }}>Nouveau dossier</span>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer',
            fontSize:20, color:'#888', lineHeight:1 }}>×</button>
        </div>
        {[['name','Contact *','text'],['company','Entreprise *','text'],
          ['email','Email','email'],['phone','Téléphone','tel'],
          ['revenue','CA prévisionnel (€)','number']].map(([k,l,t]) => (
          <div key={k}>
            <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:3 }}>{l}</label>
            <input type={t} value={form[k]} onChange={e => set(k, e.target.value)}
              style={{ width:'100%', padding:'8px 10px', fontSize:12, borderRadius:8,
                border:'1px solid #ddd', outline:'none', boxSizing:'border-box' }} />
          </div>
        ))}
        <div>
          <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:3 }}>Priorité</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}
            style={{ width:'100%', padding:'8px 10px', fontSize:12, borderRadius:8,
              border:'1px solid #ddd', outline:'none', boxSizing:'border-box' }}>
            <option value="high">Urgent</option>
            <option value="medium">Normal</option>
            <option value="low">Faible</option>
          </select>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:8,
            fontSize:12, cursor:'pointer', border:'1px solid #ddd', background:'#fff' }}>Annuler</button>
          <button onClick={ok} style={{ flex:2, padding:'9px', borderRadius:8, fontSize:12,
            cursor:'pointer', fontWeight:600, background:SC.cloture.bg,
            color:SC.cloture.tc, border:`1px solid ${SC.cloture.bd}` }}>Créer le dossier</button>
        </div>
      </div>
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────
export default function App() {
  const [nav,     setNav]    = useState('dashboard');
  const [clients, setClients]= useState([]);
  const [sel,     setSel]    = useState(null);
  const [modal,   setModal]  = useState(false);
  const [loading, setLoading]= useState(true);

  // Load from SQLite on mount
  useEffect(() => {
    if (api) {
      api.getClients().then(data => {
        setClients(data);
        setLoading(false);
      });
    } else {
      // Fallback for browser dev without Electron
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (c) => {
    if (api) await api.updateClient(c);
    setClients(p => p.map(x => x.id === c.id ? c : x));
    setSel(c);
  }, []);

  const create = useCallback(async (data) => {
    let nc;
    if (api) {
      nc = await api.createClient(data);
      setClients(p => [...p, { ...data, id: nc.id, created_at: new Date().toLocaleDateString('fr-FR') }]);
    } else {
      const id = Math.max(0, ...clients.map(c => c.id)) + 1;
      nc = { id, ...data, created_at: new Date().toLocaleDateString('fr-FR') };
      setClients(p => [...p, nc]);
    }
    setModal(false);
    setNav('pipeline');
  }, [clients]);

  const remove = useCallback(async (id) => {
    if (api) await api.deleteClient(id);
    setClients(p => p.filter(c => c.id !== id));
    setSel(null);
  }, []);

  const open = useCallback(c => setSel(c), []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', fontSize:14, color:'#666' }}>Chargement…</div>
  );

  return (
    <div style={{ display:'flex', height:'100vh', background:'#f0f0f0',
      fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow:'hidden' }}>

      {/* Sidebar */}
      <div style={{ width:200, background:'#fff', borderRight:'1px solid #e5e5e5',
        display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 18px 14px', borderBottom:'1px solid #e5e5e5' }}>
          <div style={{ fontSize:15, fontWeight:700, letterSpacing:-.3 }}>AuditTrack</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{clients.length} dossiers actifs</div>
        </div>

        <div style={{ padding:'10px 8px' }}>
          {[{id:'dashboard',l:'Tableau de bord'},{id:'pipeline',l:'Pipeline'}].map(item => (
            <button key={item.id} onClick={() => { setNav(item.id); setSel(null); }}
              style={{ width:'100%', display:'flex', alignItems:'center', padding:'8px 10px',
                borderRadius:8, border:'none', cursor:'pointer', marginBottom:2, textAlign:'left',
                background: nav===item.id && !sel ? '#f0f0f0' : 'transparent',
                fontWeight: nav===item.id && !sel ? 600 : 400,
                color: nav===item.id && !sel ? '#111' : '#666', fontSize:13 }}>
              {item.l}
            </button>
          ))}
        </div>

        <div style={{ padding:'8px 8px', borderTop:'1px solid #eee', marginTop:'auto' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#aaa', padding:'4px 10px',
            marginBottom:4, letterSpacing:.8, textTransform:'uppercase' }}>Étapes</div>
          {STAGES.map(s => {
            const count = clients.filter(c => c.stage === s.id).length;
            const col   = SC[s.id];
            return (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'4px 10px', fontSize:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:col.dot, flexShrink:0 }} />
                  <span style={{ color:'#666' }}>{s.label}</span>
                </div>
                <span style={{ fontWeight:600, fontSize:11 }}>{count}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding:'10px 8px', borderTop:'1px solid #eee' }}>
          <button onClick={() => setModal(true)} style={{ width:'100%', padding:'8px 10px',
            borderRadius:8, fontSize:12, cursor:'pointer', fontWeight:600,
            background:SC.cloture.bg, color:SC.cloture.tc, border:`1px solid ${SC.cloture.bd}` }}>
            + Nouveau dossier
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:'hidden', position:'relative', minWidth:0 }}>
        {sel
          ? <Detail key={sel.id} client={sel} back={() => setSel(null)} update={update} remove={remove} />
          : nav === 'dashboard'
            ? <Dashboard clients={clients} open={open} />
            : <Pipeline clients={clients} open={open} />
        }
        {modal && <NewClientModal onClose={() => setModal(false)} onCreate={create} />}
      </div>
    </div>
  );
}
