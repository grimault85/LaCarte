import { useState, useEffect, useRef } from 'react';
import { PALETTE, card, cardH, lbl, inp, iconBtn, overlay, modal, btnPrimary, btnSec } from '../styles';
import Badge from '../components/Badge';
// ══════════════════════════════════════════════════════════════════
// RÉSEAUX SOCIAUX
// ══════════════════════════════════════════════════════════════════

const SOCIAL_THEMES = [
  { key: 'conseil', label: 'Conseil & Tips', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'cas_client', label: 'Cas client', color: '#059669', bg: '#d1fae5' },
  { key: 'coulisses', label: 'Coulisses cabinet', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'benchmark', label: 'Benchmark & Chiffres', color: '#d97706', bg: '#fef3c7' },
  { key: 'tendance', label: 'Tendance CHR', color: '#dc2626', bg: '#fee2e2' },
  { key: 'question', label: 'Question / Sondage', color: '#C9A84C', bg: '#FAF3E0' },
  { key: 'autre', label: 'Autre', color: '#6b7280', bg: '#f3f4f6' },
];
const SOCIAL_STATUTS = [
  { key: 'idee', label: '💡 Idée', color: '#94a3b8', bg: '#f1f5f9' },
  { key: 'brouillon', label: '✏️ Brouillon', color: '#d97706', bg: '#fef3c7' },
  { key: 'programme', label: '📅 Programmé', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'publie', label: '✅ Publié', color: '#059669', bg: '#d1fae5' },
];
const SOCIAL_PLATES = [
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0077b5', bg: '#e8f4fd' },
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#e1306c', bg: '#fce4ec' },
  { key: 'les_deux', label: 'Les deux', icon: '🔗', color: '#7c3aed', bg: '#ede9fe' },
];

const themeOf = k => SOCIAL_THEMES.find(t => t.key === k) || SOCIAL_THEMES[6];
const statutOf2 = k => SOCIAL_STATUTS.find(s => s.key === k) || SOCIAL_STATUTS[0];
const plateOf = k => SOCIAL_PLATES.find(p => p.key === k) || SOCIAL_PLATES[0];

function getWeekNumber(d) {
  const date = new Date(d); date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function ReseauxSociaux({ api }) {
  const [tab, setTab] = useState('banque');
  const [prefilStat, setPrefilStat] = useState(null); // contenu pré-rempli pour stats

  function handleAddStats(contenu) {
    setPrefilStat(contenu);
    setTab('performance');
  }

  const TABS = [
    { key: 'banque', label: '📝 Banque de contenus' },
    { key: 'performance', label: '📊 Suivi performance' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ background: 'var(--surface,#FFFDF8)', borderBottom: `1px solid var(--border,#DDD5B8)`, padding: '18px 28px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text,#0D1520)', margin: 0 }}>Réseaux Sociaux</h1>
          <p style={{ color: 'var(--muted,#64748b)', fontSize: 12, margin: '3px 0 0' }}>Banque de contenus · Suivi performance · LinkedIn & Instagram</p>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#C9A84C' : 'var(--muted,#6b7280)',
              borderBottom: `2px solid ${tab === t.key ? '#C9A84C' : 'transparent'}`,
            }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 28px' }}>
        {tab === 'banque' && <BanqueContenus api={api} onAddStats={handleAddStats} />}
        {tab === 'performance' && <SuiviPerformance api={api} prefilStat={prefilStat} onPrefilUsed={() => setPrefilStat(null)} />}
      </div>
    </div>
  );
}

// ── Banque de contenus ────────────────────────────────────────────
function BanqueContenus({ api, onAddStats }) {
  const [items, setItems] = useState([]);
  const [statFilter, setStatFilter] = useState('all');
  const [platFilter, setPlatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getSocialContenus()) || []); }

  async function handlePublish(item) {
    await api.saveSocialContenu({ ...item, statut: 'publie', date_publi: new Date().toISOString().split('T')[0] });
    load();
  }

  const filtered = items.filter(i => {
    if (statFilter !== 'all' && i.statut !== statFilter) return false;
    if (platFilter !== 'all' && i.plateforme !== platFilter && i.plateforme !== 'les_deux') return false;
    return true;
  });

  const counts = {};
  SOCIAL_STATUTS.forEach(s => counts[s.key] = items.filter(i => i.statut === s.key).length);
  const pipeline = items.filter(i => i.statut !== 'publie').length;

  if (showForm || editing) return (
    <ContenuForm data={editing} onSave={async d => {
      let saveData = { ...d };
      // Upload image si fichier local sélectionné
      if (d._localImagePath) {
        const uploaded = await window.electronAPI.uploadComptaFile({ filePath: d._localImagePath, type: 'social' });
        if (uploaded) { saveData.image_path = uploaded.path; saveData.image_name = uploaded.name; }
      }
      delete saveData._localImagePath;
      await api.saveSocialContenu(saveData);
      setShowForm(false); setEditing(null); load();
    }} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );
  if (selected) return (
    <ContenuDetail item={selected} onBack={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onDelete={() => setShowDel(selected)} onPublish={() => handlePublish(selected)} onAddStats={() => onAddStats(selected)} />
  );

  return (
    <div>
      {/* Pipeline visuel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
        {SOCIAL_STATUTS.map(s => (
          <div key={s.key} onClick={() => setStatFilter(statFilter === s.key ? 'all' : s.key)}
            style={{ ...card, padding: '12px 14px', cursor: 'pointer', borderTop: `3px solid ${s.color}`, background: statFilter === s.key ? s.bg : 'var(--surface,#FFFDF8)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 6 }}>{counts[s.key] || 0}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Filtre plateforme */}
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setPlatFilter('all')} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(platFilter === 'all' ? { background: '#FAF3E0', borderColor: '#C9A84C' } : {}) }}>Toutes</button>
          {SOCIAL_PLATES.map(p => (
            <button key={p.key} onClick={() => setPlatFilter(p.key)} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(platFilter === p.key ? { background: p.bg, borderColor: p.color, color: p.color, fontWeight: 700 } : {}) }}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, marginLeft: 'auto' }}>+ Nouveau contenu</button>
      </div>

      {filtered.length === 0 ? (
        <div onClick={() => setShowForm(true)} style={{ border: '2px dashed var(--border,#DDD5B8)', borderRadius: 10, padding: 48, textAlign: 'center', cursor: 'pointer', color: 'var(--faint,#94a3b8)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted,#64748b)' }}>Banque de contenus vide</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Commencez par capturer vos idées de posts</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const theme = themeOf(item.theme);
            const statut = statutOf2(item.statut);
            const plat = plateOf(item.plateforme);
            return (
              <div key={item.id} onClick={() => setSelected(item)}
                style={{ ...card, padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{plat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)', marginBottom: 3 }}>{item.titre}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Badge color={theme.color} bg={theme.bg} small>{theme.label}</Badge>
                    <Badge color={statut.color} bg={statut.bg} small>{statut.label}</Badge>
                    {item.date_publi && <span style={{ fontSize: 10, color: 'var(--faint,#94a3b8)' }}>📅 {new Date(item.date_publi).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                {item.contenu && (
                  <div style={{ fontSize: 11, color: 'var(--faint,#94a3b8)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.contenu.slice(0, 80)}…
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {item.statut !== 'publie' && (
                    <button onClick={() => handlePublish(item)} style={{ ...btnSec, padding: '4px 9px', fontSize: 11, color: '#059669', borderColor: '#6ee7b7' }}>✓ Publier</button>
                  )}
                  <button onClick={() => setEditing(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11 }}>✎</button>
                  <button onClick={() => setShowDel(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer ce contenu" message={`Supprimer "${showDel.titre}" ?`}
        onConfirm={async () => { await api.deleteSocialContenu(showDel.id); setShowDel(null); load(); }}
        onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function ContenuDetail({ item, onBack, onEdit, onDelete, onPublish, onAddStats }) {
  const theme = themeOf(item.theme);
  const statut = statutOf2(item.statut);
  const plat = plateOf(item.plateforme);
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h2 style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text,#0D1520)' }}>{item.titre}</h2>
        {item.statut !== 'publie' && <button onClick={onPublish} style={{ ...btnPrimary, background: '#059669' }}>✓ Marquer publié</button>}
        {item.statut === 'publie' && <button onClick={onAddStats} style={{ ...btnPrimary, background: '#7c3aed' }}>📊 Ajouter les stats</button>}
        <button onClick={onEdit} style={btnSec}>Modifier</button>
        <button onClick={onDelete} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
        <Badge color={plat.color} bg={plat.bg}>{plat.icon} {plat.label}</Badge>
        <Badge color={theme.color} bg={theme.bg}>{theme.label}</Badge>
        <Badge color={statut.color} bg={statut.bg}>{statut.label}</Badge>
        {item.date_publi && <Badge color='#6b7280' bg='#f3f4f6'>📅 {new Date(item.date_publi).toLocaleDateString('fr-FR')}</Badge>}
      </div>

      {item.contenu && (
        <div style={{ ...card, padding: '18px 20px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Texte du post</div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text,#1e293b)', whiteSpace: 'pre-wrap' }}>{item.contenu}</div>
        </div>
      )}

      {item.image_path && (
        <div style={{ ...card, padding: '14px 16px', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>🖼️ Visuel du post</div>
          <img src={`https://eqkpugvccpolkgtnmpxs.supabase.co/storage/v1/object/public/attachments/${item.image_path}`}
            alt={item.image_name || 'Visuel'}
            style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, border: '1px solid var(--border,#DDD5B8)', objectFit: 'contain' }} />
          <div style={{ fontSize: 11, color: 'var(--faint,#94a3b8)', marginTop: 6 }}>{item.image_name}</div>
        </div>
      )}

      {item.visuel_notes && (
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #C9A84C' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>🎨 Notes visuelles</div>
          <div style={{ fontSize: 13, color: 'var(--text,#374151)', whiteSpace: 'pre-wrap' }}>{item.visuel_notes}</div>
        </div>
      )}
    </div>
  );
}

function ContenuForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({
    titre: '', plateforme: 'linkedin', theme: 'conseil', statut: 'idee',
    contenu: '', visuel_notes: '', date_publi: '', image_path: '', image_name: '', ...(data || {})
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const charCount = form.contenu?.length || 0;
  const linkedinLimit = 3000;
  const instaLimit = 2200;
  const limit = form.plateforme === 'instagram' ? instaLimit : linkedinLimit;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text,#0D1520)' }}>{data?.id ? 'Modifier' : 'Nouveau contenu'}</h3>
        <button onClick={() => onSave(form)} disabled={!form.titre} style={{ ...btnPrimary, opacity: form.titre ? 1 : 0.5 }}>Enregistrer</button>
      </div>

      <div style={card}>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Titre (usage interne) *</label>
          <input value={form.titre} onChange={e => set('titre', e.target.value)} style={inp} placeholder="Ex: Post CMV — Erreur que font 80% des restaurateurs" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Plateforme</label>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {SOCIAL_PLATES.map(p => (
                <button key={p.key} onClick={() => set('plateforme', p.key)} style={{ flex: 1, padding: '5px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.plateforme === p.key ? p.color : 'var(--border,#DDD5B8)'}`, background: form.plateforme === p.key ? p.bg : 'var(--surface,#FFFDF8)', color: form.plateforme === p.key ? p.color : 'var(--muted,#6b7280)' }}>{p.icon}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Statut</label>
            <select value={form.statut} onChange={e => set('statut', e.target.value)} style={{ ...inp, marginTop: 4 }}>
              {SOCIAL_STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Date de publication</label>
            <input type="date" value={form.date_publi || ''} onChange={e => set('date_publi', e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Thème</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
            {SOCIAL_THEMES.map(t => (
              <button key={t.key} onClick={() => set('theme', t.key)} style={{ padding: '3px 9px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.theme === t.key ? t.color : 'var(--border,#DDD5B8)'}`, background: form.theme === t.key ? t.bg : 'var(--surface,#FFFDF8)', color: form.theme === t.key ? t.color : 'var(--muted,#6b7280)' }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={lbl}>Texte du post</label>
            <span style={{ fontSize: 10, color: charCount > limit ? '#dc2626' : 'var(--faint,#94a3b8)' }}>{charCount} / {limit} caractères</span>
          </div>
          <textarea rows={10} value={form.contenu || ''} onChange={e => set('contenu', e.target.value)}
            style={{ ...inp, resize: 'vertical', minHeight: 180, fontFamily: 'inherit', lineHeight: 1.7, borderColor: charCount > limit ? '#dc2626' : undefined }}
            placeholder={`Rédigez votre post ${form.plateforme === 'instagram' ? 'Instagram' : 'LinkedIn'}…\n\nAstuce : commencez par une accroche forte sur la première ligne.`} />
        </div>

        <div>
          <label style={lbl}>Notes visuelles (description du visuel à créer)</label>
          <textarea rows={3} value={form.visuel_notes || ''} onChange={e => set('visuel_notes', e.target.value)}
            style={{ ...inp, resize: 'vertical', marginTop: 4 }}
            placeholder="Ex: Fond navy avec texte blanc, stat en or centré, logo La Carte en bas à droite" />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Visuel (image du post)</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
            <button type="button" onClick={async () => {
              const f = await window.electronAPI.pickFile();
              if (f) { set('_localImagePath', f); set('image_name', f.split(/[/\\]/).pop()); }
            }} style={{ ...btnSec, display: 'flex', alignItems: 'center', gap: 7 }}>
              🖼️ {form._localImagePath ? form.image_name : (form.image_path ? 'Changer le visuel' : 'Ajouter un visuel')}
            </button>
            {(form._localImagePath || form.image_path) && (
              <button type="button" onClick={() => { set('_localImagePath', ''); set('image_path', ''); set('image_name', ''); }}
                style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5', padding: '5px 10px' }}>✕ Retirer</button>
            )}
          </div>
          {form.image_path && !form._localImagePath && (
            <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>✓ Visuel actuel : {form.image_name}</div>
          )}
          {form._localImagePath && (
            <div style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }}>📎 {form.image_name} — sera uploadé à l'enregistrement</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Suivi Performance ─────────────────────────────────────────────
function SuiviPerformance({ api, prefilStat, onPrefilUsed }) {
  const [stats, setStats] = useState([]);
  const [contenus, setContenus] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [viewSource, setViewSource] = useState(null); // contenu source affiché
  const [platFilter, setPlatFilter] = useState('all');

  useEffect(() => { load(); }, []);

  // Ouvrir le form pré-rempli si préfil reçu
  useEffect(() => {
    if (prefilStat) {
      setEditing({
        contenu_id: prefilStat.id,
        titre: prefilStat.titre,
        plateforme: prefilStat.plateforme === 'les_deux' ? 'linkedin' : prefilStat.plateforme,
        date_publi: prefilStat.date_publi || new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      onPrefilUsed?.();
    }
  }, [prefilStat]);
  async function load() {
    const [s, c] = await Promise.all([api.getSocialStats(), api.getSocialContenus()]);
    setStats(s || []);
    setContenus(c || []);
  }

  const filtered = platFilter === 'all' ? stats : stats.filter(s => s.plateforme === platFilter);

  // Totaux
  const totaux = {
    vues: filtered.reduce((s, i) => s + (+i.vues || 0), 0),
    likes: filtered.reduce((s, i) => s + (+i.likes || 0), 0),
    comms: filtered.reduce((s, i) => s + (+i.commentaires || 0), 0),
    abonnes: filtered.reduce((s, i) => s + (+i.nouveaux_abonnes || 0), 0),
    posts: filtered.length,
  };
  const engagMoyen = totaux.vues > 0 ? (((totaux.likes + totaux.comms) / totaux.vues) * 100).toFixed(1) : '—';

  // Meilleur post
  const bestPost = [...filtered].sort((a, b) => (b.vues || 0) - (a.vues || 0))[0];

  if (showForm || editing) return (
    <StatForm data={editing} contenus={contenus} onSave={async d => { await api.saveSocialStat(d); setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );

  // Panel contenu source
  if (viewSource) {
    const src = contenus.find(c => String(c.id) === String(viewSource));
    return (
      <div style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <button onClick={() => setViewSource(null)} style={{ ...btnSec, padding: '6px 12px' }}>← Retour aux stats</button>
          <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text,#0D1520)' }}>Contenu source</h3>
        </div>
        {src ? (
          <div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
              <Badge color={plateOf(src.plateforme).color} bg={plateOf(src.plateforme).bg}>{plateOf(src.plateforme).icon} {plateOf(src.plateforme).label}</Badge>
              <Badge color={themeOf(src.theme).color} bg={themeOf(src.theme).bg}>{themeOf(src.theme).label}</Badge>
              {src.date_publi && <Badge color='#6b7280' bg='#f3f4f6'>📅 {new Date(src.date_publi).toLocaleDateString('fr-FR')}</Badge>}
            </div>
            {src.image_path && (
              <div style={{ ...card, padding: '14px', marginBottom: 12, textAlign: 'center' }}>
                <img src={`https://eqkpugvccpolkgtnmpxs.supabase.co/storage/v1/object/public/attachments/${src.image_path}`}
                  alt={src.image_name || 'Visuel'} style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8, objectFit: 'contain' }} />
              </div>
            )}
            {src.contenu && (
              <div style={{ ...card, padding: '18px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Texte du post</div>
                <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text,#1e293b)', whiteSpace: 'pre-wrap' }}>{src.contenu}</div>
              </div>
            )}
          </div>
        ) : <div style={{ color: 'var(--faint,#94a3b8)', fontStyle: 'italic' }}>Contenu introuvable</div>}
      </div>
    );
  }

  return (
    <div>
      {/* Filtre plateforme */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setPlatFilter('all')} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(platFilter === 'all' ? { background: '#FAF3E0', borderColor: '#C9A84C' } : {}) }}>Toutes</button>
          {SOCIAL_PLATES.filter(p => p.key !== 'les_deux').map(p => (
            <button key={p.key} onClick={() => setPlatFilter(p.key)} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(platFilter === p.key ? { background: p.bg, borderColor: p.color, color: p.color, fontWeight: 700 } : {}) }}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, marginLeft: 'auto' }}>+ Ajouter un résultat</button>
      </div>

      {/* KPIs globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Posts publiés', val: totaux.posts, color: '#0D1520', icon: '📝' },
          { label: 'Vues totales', val: totaux.vues.toLocaleString('fr-FR'), color: '#0369a1', icon: '👁️' },
          { label: 'Likes', val: totaux.likes.toLocaleString('fr-FR'), color: '#dc2626', icon: '❤️' },
          { label: 'Commentaires', val: totaux.comms.toLocaleString('fr-FR'), color: '#7c3aed', icon: '💬' },
          { label: 'Taux d\'engagement', val: `${engagMoyen}%`, color: '#C9A84C', icon: '📈' },
        ].map((k, i) => (
          <div key={i} style={{ ...card, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--faint,#94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Meilleur post */}
      {bestPost && (
        <div style={{ ...card, marginBottom: 16, padding: '12px 16px', borderLeft: '3px solid #C9A84C', background: 'rgba(201,168,76,0.05)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>🏆 Meilleure performance</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)' }}>{bestPost.titre || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--muted,#64748b)', marginTop: 2 }}>
            {plateOf(bestPost.plateforme).icon} {new Date(bestPost.date_publi).toLocaleDateString('fr-FR')} · {(+bestPost.vues || 0).toLocaleString('fr-FR')} vues · {+bestPost.likes || 0} likes
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div onClick={() => setShowForm(true)} style={{ border: '2px dashed var(--border,#DDD5B8)', borderRadius: 10, padding: 48, textAlign: 'center', cursor: 'pointer', color: 'var(--faint,#94a3b8)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted,#64748b)' }}>Aucun résultat enregistré</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Ajoutez les stats de vos publications après chaque post</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0D1520' }}>
                {['Plateforme', 'Post', 'Date', 'Vues', 'Likes', 'Commentaires', 'Partages', 'Nvx abonnés', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === '' ? 'center' : 'left', fontSize: 9, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => new Date(b.date_publi) - new Date(a.date_publi)).map(s => {
                const plat = plateOf(s.plateforme);
                const engagement = s.vues > 0 ? (((+s.likes || 0) + (+s.commentaires || 0)) / s.vues * 100).toFixed(1) : null;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border,#EEE6C9)' }}>
                    <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 16 }}>{plat.icon}</span></td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text,#0D1520)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titre || '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted,#64748b)', whiteSpace: 'nowrap' }}>{s.date_publi ? new Date(s.date_publi).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0369a1' }}>{(+s.vues || 0).toLocaleString('fr-FR')}</td>
                    <td style={{ padding: '8px 10px', color: '#dc2626' }}>{+s.likes || 0}</td>
                    <td style={{ padding: '8px 10px', color: '#7c3aed' }}>{+s.commentaires || 0}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted,#64748b)' }}>{+s.partages || 0}</td>
                    <td style={{ padding: '8px 10px', color: '#059669', fontWeight: 600 }}>{+s.nouveaux_abonnes > 0 ? `+${s.nouveaux_abonnes}` : '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      {engagement && <span style={{ fontSize: 10, background: '#FAF3E0', color: '#C9A84C', borderRadius: 5, padding: '2px 6px', fontWeight: 700, marginRight: 5 }}>{engagement}%</span>}
                      {s.contenu_id && <button onClick={() => setViewSource(s.contenu_id)} style={{ ...btnSec, padding: '3px 7px', fontSize: 11, marginRight: 4, color: '#7c3aed', borderColor: '#c4b5fd' }} title="Voir le contenu source">🔗</button>}
                      <button onClick={() => setEditing(s)} style={{ ...btnSec, padding: '3px 7px', fontSize: 11, marginRight: 4 }}>✎</button>
                      <button onClick={() => setShowDel(s)} style={{ ...btnSec, padding: '3px 7px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer ces stats" message="Supprimer ce résultat ?"
        onConfirm={async () => { await api.deleteSocialStat(showDel.id); setShowDel(null); load(); }}
        onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function StatForm({ data, contenus, onSave, onCancel }) {
  const [form, setForm] = useState({
    plateforme: 'linkedin', titre: '', date_publi: new Date().toISOString().split('T')[0],
    vues: 0, likes: 0, commentaires: 0, partages: 0, nouveaux_abonnes: 0, notes: '', contenu_id: null,
    ...(data || {})
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const publies = contenus.filter(c => c.statut === 'publie');

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text,#0D1520)' }}>{data?.id ? 'Modifier' : 'Nouveau résultat'}</h3>
        <button onClick={() => onSave(form)} style={btnPrimary}>Enregistrer</button>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Plateforme</label>
            <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
              {SOCIAL_PLATES.filter(p => p.key !== 'les_deux').map(p => (
                <button key={p.key} onClick={() => set('plateforme', p.key)} style={{ flex: 1, padding: '6px', borderRadius: 8, cursor: 'pointer', fontSize: 13, border: `1px solid ${form.plateforme === p.key ? p.color : 'var(--border,#DDD5B8)'}`, background: form.plateforme === p.key ? p.bg : 'var(--surface,#FFFDF8)' }}>{p.icon} {p.label}</button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Date de publication</label><input type="date" value={form.date_publi} onChange={e => set('date_publi', e.target.value)} style={{ ...inp, marginTop: 4 }} /></div>
        </div>

        {publies.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Lier à un contenu (optionnel)</label>
            <select value={form.contenu_id || ''} onChange={e => {
              set('contenu_id', e.target.value || null);
              const c = contenus.find(c => String(c.id) === e.target.value);
              if (c) set('titre', c.titre);
            }} style={{ ...inp, marginTop: 4 }}>
              <option value="">— Sélectionner un post publié —</option>
              {publies.map(c => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 12 }}><label style={lbl}>Titre du post</label><input value={form.titre || ''} onChange={e => set('titre', e.target.value)} style={inp} placeholder="Titre ou description du post" /></div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { k: 'vues', l: '👁️ Vues' }, { k: 'likes', l: '❤️ Likes' }, { k: 'commentaires', l: '💬 Comms' },
            { k: 'partages', l: '🔄 Partages' }, { k: 'nouveaux_abonnes', l: '➕ Abonnés' }
          ].map(f => (
            <div key={f.k}>
              <label style={lbl}>{f.l}</label>
              <input type="number" value={form[f.k] || 0} onChange={e => set(f.k, +e.target.value)} style={{ ...inp, textAlign: 'center' }} min="0" />
            </div>
          ))}
        </div>
        <div><label style={lbl}>Notes</label><textarea rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} placeholder="Observations, contexte, ce qui a bien fonctionné…" /></div>
      </div>
    </div>
  );
}


export default ReseauxSociaux;