import { useState, useEffect } from 'react';
import { card, cardH, lbl, inp, iconBtn, overlay, modal, btnPrimary, btnSec } from '../styles';
import Badge from '../components/Badge';
// ══════════════════════════════════════════════════════════════════
// RESSOURCES — Base de connaissances / Formations / Réseau
// ══════════════════════════════════════════════════════════════════

function Ressources({ api }) {
  const [tab, setTab] = useState('connaissances');
  const TABS = [
    { key: 'connaissances', label: '📚 Base de connaissances' },
    { key: 'formations', label: '🎓 Formations & Veille' },
    { key: 'partenaires', label: '🤝 Réseau & Partenaires' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ background: 'var(--surface,#FFFDF8)', borderBottom: `1px solid var(--border,#DDD5B8)`, padding: '18px 28px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text,#0D1520)', margin: 0 }}>Ressources</h1>
          <p style={{ color: 'var(--muted,#64748b)', fontSize: 12, margin: '3px 0 0' }}>Base de connaissances · Formations · Réseau professionnel</p>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#C9A84C' : 'var(--muted,#6b7280)',
              borderBottom: `2px solid ${tab === t.key ? '#C9A84C' : 'transparent'}`,
              whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 28px' }}>
        {tab === 'connaissances' && <BaseConnaissances api={api} />}
        {tab === 'formations' && <FormationsVeille api={api} />}
        {tab === 'partenaires' && <ReseauPartenaires api={api} />}
      </div>
    </div>
  );
}

// ── Catégories ────────────────────────────────────────────────────
const CONNAISSANCE_CATS = [
  { key: 'menu', label: 'Ingénierie Menu', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'financier', label: 'Analyse Financière', color: '#059669', bg: '#d1fae5' },
  { key: 'achat', label: 'Achats & Fournisseurs', color: '#d97706', bg: '#fef3c7' },
  { key: 'management', label: 'Management', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'marketing', label: 'Marketing & Prix', color: '#dc2626', bg: '#fee2e2' },
  { key: 'reglementation', label: 'Réglementation', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'general', label: 'Général', color: '#6b7280', bg: '#f3f4f6' },
];
const FORMATION_TYPES = [
  { key: 'article', label: 'Article', icon: '📰' },
  { key: 'formation', label: 'Formation', icon: '🎓' },
  { key: 'livre', label: 'Livre', icon: '📖' },
  { key: 'podcast', label: 'Podcast', icon: '🎙️' },
  { key: 'video', label: 'Vidéo', icon: '▶️' },
];
const FORMATION_STATUTS = [
  { key: 'a_lire', label: 'À lire/voir', color: '#d97706', bg: '#fef3c7' },
  { key: 'en_cours', label: 'En cours', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'lu', label: 'Lu ✓', color: '#059669', bg: '#d1fae5' },
];
const PARTENAIRE_CATS = [
  { key: 'prescripteur', label: 'Prescripteur', color: '#C9A84C', bg: '#FAF3E0' },
  { key: 'fournisseur', label: 'Fournisseur', color: '#059669', bg: '#d1fae5' },
  { key: 'expert_comptable', label: 'Expert-comptable', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'avocat', label: 'Avocat / Juridique', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'prestataire', label: 'Prestataire', color: '#d97706', bg: '#fef3c7' },
  { key: 'autre', label: 'Autre', color: '#6b7280', bg: '#f3f4f6' },
];

const connCatOf = k => CONNAISSANCE_CATS.find(c => c.key === k) || CONNAISSANCE_CATS[6];
const formTypeOf = k => FORMATION_TYPES.find(t => t.key === k) || FORMATION_TYPES[0];
const formStatOf = k => FORMATION_STATUTS.find(s => s.key === k) || FORMATION_STATUTS[0];
const partCatOf = k => PARTENAIRE_CATS.find(c => c.key === k) || PARTENAIRE_CATS[5];

// ── Base de connaissances ─────────────────────────────────────────
function BaseConnaissances({ api }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getConnaissances()) || []); }

  const filtered = items.filter(i => {
    if (catFilter !== 'all' && i.categorie !== catFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return i.titre?.toLowerCase().includes(q) || i.contenu?.toLowerCase().includes(q) || i.tags?.toLowerCase().includes(q);
  }).sort((a, b) => (b.favori ? 1 : 0) - (a.favori ? 1 : 0));

  if (showForm || editing) return (
    <ConnaissanceForm data={editing} onSave={async d => { await api.saveConnaissance(d); setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );

  if (selected) return (
    <ConnaissanceDetail item={selected} onBack={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onDelete={() => setShowDel(selected)} />
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, maxWidth: 280 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          <button onClick={() => setCatFilter('all')} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(catFilter === 'all' ? { background: '#FAF3E0', borderColor: '#C9A84C', color: '#0D1520' } : {}) }}>Toutes</button>
          {CONNAISSANCE_CATS.map(c => (
            <button key={c.key} onClick={() => setCatFilter(c.key)} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(catFilter === c.key ? { background: c.bg, borderColor: c.color, color: c.color, fontWeight: 700 } : {}) }}>{c.label}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Nouvelle fiche</button>
      </div>

      {filtered.length === 0 ? (
        <div onClick={() => setShowForm(true)} style={{ border: '2px dashed var(--border,#DDD5B8)', borderRadius: 10, padding: 48, textAlign: 'center', cursor: 'pointer', color: 'var(--faint,#94a3b8)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border,#DDD5B8)'}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📚</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted,#64748b)' }}>Base de connaissances vide</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Ajoutez vos fiches conseil, benchmarks, recettes de succès…</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {filtered.map(item => {
            const cat = connCatOf(item.categorie);
            return (
              <div key={item.id} onClick={() => setSelected(item)}
                style={{ ...card, padding: '14px 16px', cursor: 'pointer', borderLeft: `3px solid ${cat.color}`, transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <Badge color={cat.color} bg={cat.bg} small>{cat.label}</Badge>
                  {item.favori && <span style={{ fontSize: 14 }}>⭐</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text,#0D1520)', marginBottom: 4, lineHeight: 1.3 }}>{item.titre}</div>
                <div style={{ fontSize: 12, color: 'var(--muted,#64748b)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.contenu}</div>
                {item.tags && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--faint,#94a3b8)' }}>🏷️ {item.tags}</div>}
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer cette fiche" message={`Supprimer "${showDel.titre}" ?`}
        onConfirm={async () => { await api.deleteConnaissance(showDel.id); setShowDel(null); load(); }}
        onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function ConnaissanceDetail({ item, onBack, onEdit, onDelete }) {
  const cat = connCatOf(item.categorie);
  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onBack} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h2 style={{ flex: 1, margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text,#0D1520)' }}>{item.titre}</h2>
        <button onClick={onEdit} style={btnSec}>Modifier</button>
        <button onClick={onDelete} style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}>Supprimer</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Badge color={cat.color} bg={cat.bg}>{cat.label}</Badge>
        {item.favori && <Badge color='#d97706' bg='#fef3c7'>⭐ Favori</Badge>}
      </div>
      <div style={{ ...card, padding: '18px 20px', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14, color: 'var(--text,#1e293b)' }}>{item.contenu}</div>
      {item.tags && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted,#64748b)' }}>🏷️ {item.tags}</div>}
      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--faint,#94a3b8)' }}>Créé le {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : '—'}</div>
    </div>
  );
}

function ConnaissanceForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({ titre: '', categorie: 'general', contenu: '', tags: '', favori: false, ...(data || {}) });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text,#0D1520)' }}>{data?.id ? 'Modifier la fiche' : 'Nouvelle fiche'}</h3>
        <button onClick={() => onSave(form)} disabled={!form.titre || !form.contenu} style={{ ...btnPrimary, opacity: form.titre && form.contenu ? 1 : 0.5 }}>Enregistrer</button>
      </div>
      <div style={card}>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Titre *</label><input value={form.titre} onChange={e => set('titre', e.target.value)} style={inp} placeholder="Ex: Comment réduire un CMV élevé sur les viandes" /></div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Catégorie</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
            {CONNAISSANCE_CATS.map(c => (
              <button key={c.key} onClick={() => set('categorie', c.key)} style={{ padding: '4px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.categorie === c.key ? c.color : 'var(--border,#DDD5B8)'}`, background: form.categorie === c.key ? c.bg : 'var(--surface,#FFFDF8)', color: form.categorie === c.key ? c.color : 'var(--muted,#6b7280)' }}>{c.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Contenu *</label>
          <p style={{ fontSize: 11, color: 'var(--faint,#94a3b8)', margin: '2px 0 6px' }}>Votre savoir-faire, vos conseils, vos observations terrain…</p>
          <textarea rows={10} value={form.contenu} onChange={e => set('contenu', e.target.value)}
            style={{ ...inp, resize: 'vertical', minHeight: 200, fontFamily: 'inherit', lineHeight: 1.7 }}
            placeholder={"Exemple :\n• Quand le CMV viande dépasse 35%, vérifier d'abord les grammages…\n• Benchmark : dans un bistrot parisien moyen, le CMV global tourne entre 28-32%\n• Levier 1 : renégocier les contrats fournisseurs en fin de trimestre\n• Levier 2 : retravailler les recettes des plats à forte rotation"} />
        </div>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Tags (séparés par des virgules)</label><input value={form.tags || ''} onChange={e => set('tags', e.target.value)} style={inp} placeholder="CMV, viande, fournisseur, négociation" /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.favori || false} onChange={e => set('favori', e.target.checked)} style={{ accentColor: '#C9A84C', width: 15, height: 15 }} />
          <span style={{ fontSize: 13, color: 'var(--text,#0D1520)' }}>⭐ Marquer comme favori</span>
        </label>
      </div>
    </div>
  );
}

// ── Formations & Veille ───────────────────────────────────────────
function FormationsVeille({ api }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [statFilter, setStatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getFormations()) || []); }

  async function toggleStatut(item) {
    const next = { a_lire: 'en_cours', en_cours: 'lu', lu: 'a_lire' };
    await api.saveFormation({ ...item, statut: next[item.statut] || 'a_lire' });
    load();
  }

  const filtered = items.filter(i => {
    if (statFilter !== 'all' && i.statut !== statFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return i.titre?.toLowerCase().includes(q) || i.source?.toLowerCase().includes(q);
  });

  const counts = { a_lire: items.filter(i => i.statut === 'a_lire').length, en_cours: items.filter(i => i.statut === 'en_cours').length, lu: items.filter(i => i.statut === 'lu').length };

  if (showForm || editing) return (
    <FormationForm data={editing} onSave={async d => { await api.saveFormation(d); setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {FORMATION_STATUTS.map(s => (
          <div key={s.key} onClick={() => setStatFilter(statFilter === s.key ? 'all' : s.key)}
            style={{ ...card, padding: '12px 14px', cursor: 'pointer', borderLeft: `3px solid ${s.color}`, background: statFilter === s.key ? s.bg : 'var(--surface,#FFFDF8)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4 }}>{counts[s.key]}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, maxWidth: 280 }} />
        <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, marginLeft: 'auto' }}>+ Ajouter</button>
      </div>

      {filtered.length === 0 ? (
        <div onClick={() => setShowForm(true)} style={{ border: '2px dashed var(--border,#DDD5B8)', borderRadius: 10, padding: 48, textAlign: 'center', cursor: 'pointer', color: 'var(--faint,#94a3b8)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted,#64748b)' }}>Aucune ressource</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Articles, formations, livres, podcasts…</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const type = formTypeOf(item.type);
            const stat = formStatOf(item.statut);
            return (
              <div key={item.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{type.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)', marginBottom: 2 }}>{item.titre}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted,#64748b)' }}>
                    {item.source && <span>{item.source}</span>}
                    {item.date_ajout && <span> · {new Date(item.date_ajout).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  {item.notes && <div style={{ fontSize: 11, color: 'var(--faint,#94a3b8)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                  <Badge color={stat.color} bg={stat.bg} small>{stat.label}</Badge>
                  {item.lien && (
                    <button onClick={() => window.electronAPI.openExternal(item.lien)} style={{ ...btnSec, padding: '3px 8px', fontSize: 11, color: '#0369a1' }}>🔗 Ouvrir</button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button onClick={() => toggleStatut(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 10 }} title="Changer le statut">→</button>
                  <button onClick={() => setEditing(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11 }}>✎</button>
                  <button onClick={() => setShowDel(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer" message={`Supprimer "${showDel.titre}" ?`}
        onConfirm={async () => { await api.deleteFormation(showDel.id); setShowDel(null); load(); }}
        onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function FormationForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({ titre: '', type: 'article', source: '', lien: '', statut: 'a_lire', notes: '', date_ajout: new Date().toISOString().split('T')[0], ...(data || {}) });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ maxWidth: 580 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text,#0D1520)' }}>{data?.id ? 'Modifier' : 'Ajouter une ressource'}</h3>
        <button onClick={() => onSave(form)} disabled={!form.titre} style={{ ...btnPrimary, opacity: form.titre ? 1 : 0.5 }}>Enregistrer</button>
      </div>
      <div style={card}>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Titre *</label><input value={form.titre} onChange={e => set('titre', e.target.value)} style={inp} placeholder="Titre de l'article, du livre, de la formation…" /></div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Type</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
            {FORMATION_TYPES.map(t => (
              <button key={t.key} onClick={() => set('type', t.key)} style={{ padding: '4px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.type === t.key ? '#C9A84C' : 'var(--border,#DDD5B8)'}`, background: form.type === t.key ? '#FAF3E0' : 'var(--surface,#FFFDF8)', color: form.type === t.key ? '#C9A84C' : 'var(--muted,#6b7280)' }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>Source / Auteur</label><input value={form.source || ''} onChange={e => set('source', e.target.value)} style={inp} placeholder="Ex: L'Hôtellerie Restauration" /></div>
          <div><label style={lbl}>Date d'ajout</label><input type="date" value={form.date_ajout} onChange={e => set('date_ajout', e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Lien (URL)</label><input value={form.lien || ''} onChange={e => set('lien', e.target.value)} style={inp} placeholder="https://…" /></div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Statut</label>
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            {FORMATION_STATUTS.map(s => (
              <button key={s.key} onClick={() => set('statut', s.key)} style={{ padding: '4px 11px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.statut === s.key ? s.color : 'var(--border,#DDD5B8)'}`, background: form.statut === s.key ? s.bg : 'var(--surface,#FFFDF8)', color: form.statut === s.key ? s.color : 'var(--muted,#6b7280)' }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div><label style={lbl}>Notes</label><textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} placeholder="Ce que vous en avez retenu, points clés…" /></div>
      </div>
    </div>
  );
}

// ── Réseau & Partenaires ──────────────────────────────────────────
function ReseauPartenaires({ api }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getPartenaires()) || []); }

  const filtered = items.filter(i => {
    if (catFilter !== 'all' && i.categorie !== catFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return i.nom?.toLowerCase().includes(q) || i.entreprise?.toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q);
  });

  const recommandes = items.filter(i => i.recommande).length;

  if (showForm || editing) return (
    <PartenaireForm data={editing} onSave={async d => { await api.savePartenaire(d); setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, maxWidth: 250 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button onClick={() => setCatFilter('all')} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(catFilter === 'all' ? { background: '#FAF3E0', borderColor: '#C9A84C', color: '#0D1520' } : {}) }}>Tous ({items.length})</button>
          {PARTENAIRE_CATS.map(c => {
            const count = items.filter(i => i.categorie === c.key).length;
            if (!count && catFilter !== c.key) return null;
            return (
              <button key={c.key} onClick={() => setCatFilter(c.key)} style={{ ...btnSec, fontSize: 11, padding: '4px 10px', ...(catFilter === c.key ? { background: c.bg, borderColor: c.color, color: c.color, fontWeight: 700 } : {}) }}>{c.label} {count > 0 ? `(${count})` : ''}</button>
            );
          })}
        </div>
        <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, marginLeft: 'auto' }}>+ Ajouter</button>
      </div>

      {recommandes > 0 && (
        <div style={{ ...card, marginBottom: 14, padding: '10px 14px', borderLeft: '3px solid #C9A84C', background: 'rgba(201,168,76,0.06)' }}>
          <span style={{ fontSize: 12, color: 'var(--muted,#64748b)' }}>⭐ <strong style={{ color: 'var(--text,#0D1520)' }}>{recommandes} contact{recommandes > 1 ? 's' : ''}</strong> marqué{recommandes > 1 ? 's' : ''} comme recommandé{recommandes > 1 ? 's' : ''}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div onClick={() => setShowForm(true)} style={{ border: '2px dashed var(--border,#DDD5B8)', borderRadius: 10, padding: 48, textAlign: 'center', cursor: 'pointer', color: 'var(--faint,#94a3b8)' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted,#64748b)' }}>Aucun contact</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Fournisseurs, experts-comptables, prescripteurs…</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 10 }}>
          {filtered.map(item => {
            const cat = partCatOf(item.categorie);
            return (
              <div key={item.id} style={{ ...card, padding: '14px 16px', borderLeft: `3px solid ${cat.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text,#0D1520)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.nom} {item.recommande && <span style={{ fontSize: 13 }}>⭐</span>}
                    </div>
                    {item.entreprise && <div style={{ fontSize: 12, color: 'var(--muted,#64748b)', marginTop: 2 }}>{item.entreprise}</div>}
                  </div>
                  <Badge color={cat.color} bg={cat.bg} small>{cat.label}</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                  {item.email && <div style={{ fontSize: 12, color: 'var(--muted,#64748b)' }}>📧 {item.email}</div>}
                  {item.telephone && <div style={{ fontSize: 12, color: 'var(--muted,#64748b)' }}>📱 {item.telephone}</div>}
                </div>
                {item.notes && <div style={{ fontSize: 11, color: 'var(--faint,#94a3b8)', borderTop: `1px solid var(--border,#DDD5B8)`, paddingTop: 6, lineHeight: 1.5 }}>{item.notes}</div>}
                <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                  {item.email && <button onClick={() => window.electronAPI.openExternal(`mailto:${item.email}`)} style={{ ...btnSec, padding: '4px 9px', fontSize: 11, color: '#0369a1' }}>✉️ Email</button>}
                  <button onClick={() => setEditing(item)} style={{ ...btnSec, padding: '4px 9px', fontSize: 11 }}>Modifier</button>
                  <button onClick={() => setShowDel(item)} style={{ ...btnSec, padding: '4px 9px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer ce contact" message={`Supprimer "${showDel.nom}" ?`}
        onConfirm={async () => { await api.deletePartenaire(showDel.id); setShowDel(null); load(); }}
        onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function PartenaireForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({ nom: '', entreprise: '', categorie: 'autre', email: '', telephone: '', notes: '', recommande: false, ...(data || {}) });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text,#0D1520)' }}>{data?.id ? 'Modifier' : 'Nouveau contact'}</h3>
        <button onClick={() => onSave(form)} disabled={!form.nom} style={{ ...btnPrimary, opacity: form.nom ? 1 : 0.5 }}>Enregistrer</button>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>Nom *</label><input value={form.nom} onChange={e => set('nom', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Entreprise</label><input value={form.entreprise || ''} onChange={e => set('entreprise', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Email</label><input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Téléphone</label><input value={form.telephone || ''} onChange={e => set('telephone', e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Catégorie</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
            {PARTENAIRE_CATS.map(c => (
              <button key={c.key} onClick={() => set('categorie', c.key)} style={{ padding: '4px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.categorie === c.key ? c.color : 'var(--border,#DDD5B8)'}`, background: form.categorie === c.key ? c.bg : 'var(--surface,#FFFDF8)', color: form.categorie === c.key ? c.color : 'var(--muted,#6b7280)' }}>{c.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Notes</label><textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} placeholder="Spécialités, contexte de la relation, à contacter pour…" /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.recommande || false} onChange={e => set('recommande', e.target.checked)} style={{ accentColor: '#C9A84C', width: 15, height: 15 }} />
          <span style={{ fontSize: 13, color: 'var(--text,#0D1520)' }}>⭐ Contact recommandable à mes clients</span>
        </label>
      </div>
    </div>
  );
}


export default Ressources;