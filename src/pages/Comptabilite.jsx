import { useState, useEffect } from 'react';
import { fmtEur, fmtSize } from '../utils';
import { MOIS_LABELS } from '../constants';
import { PALETTE, card, cardH, lbl, inp, iconBtn, overlay, modal, btnPrimary, btnSec, td } from '../styles';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
// ══════════════════════════════════════════════════════════════════
// COMPTABILITÉ
// ══════════════════════════════════════════════════════════════════

const CHARGES_CATS = [
  { key: 'loyer', label: 'Loyer / Bureau', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'abonnements', label: 'Abonnements & Logiciels', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'telephone', label: 'Téléphone / Internet', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'transport', label: 'Déplacements', color: '#d97706', bg: '#fef3c7' },
  { key: 'materiel', label: 'Matériel & Équipement', color: '#059669', bg: '#d1fae5' },
  { key: 'formation', label: 'Formation', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'compta', label: 'Comptable / Juridique', color: '#dc2626', bg: '#fee2e2' },
  { key: 'marketing', label: 'Marketing & Comm.', color: '#d97706', bg: '#fef3c7' },
  { key: 'cotisations', label: 'Cotisations URSSAF', color: '#dc2626', bg: '#fee2e2' },
  { key: 'autre', label: 'Autre', color: '#6b7280', bg: '#f3f4f6' },
];
const chargeCatOf = k => CHARGES_CATS.find(c => c.key === k) || CHARGES_CATS[9];

const DEVIS_STATUTS_COMPTA = [
  { key: 'envoye', label: 'Envoyé', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'accepte', label: 'Accepté ✓', color: '#059669', bg: '#d1fae5' },
  { key: 'refuse', label: 'Refusé', color: '#dc2626', bg: '#fee2e2' },
  { key: 'expire', label: 'Expiré', color: '#6b7280', bg: '#f3f4f6' },
];
const devisStatutOf = k => DEVIS_STATUTS_COMPTA.find(s => s.key === k) || DEVIS_STATUTS_COMPTA[0];

// Échéances auto-entrepreneur mensuelles
function getEcheancesAE(annee) {
  const echeances = [];
  const today = new Date();
  for (let m = 0; m < 12; m++) {
    // Déclaration CA URSSAF — le 31 du mois suivant (ou dernier jour ouvré)
    const dateDecl = new Date(annee, m + 1, 31);
    echeances.push({
      id: `urssaf_${m}`,
      type: 'urssaf',
      label: `Déclaration CA URSSAF — ${MOIS_LABELS[m]}`,
      date: `${annee}-${String(m + 2).padStart(2, '0')}-28`,
      color: '#dc2626', bg: '#fee2e2', icon: '🏛️',
    });
  }
  // CFE — 15 décembre
  echeances.push({ id: `cfe_${annee}`, type: 'cfe', label: `CFE ${annee}`, date: `${annee}-12-15`, color: '#d97706', bg: '#fef3c7', icon: '🏢' });
  // Déclaration revenus — 31 mai
  echeances.push({ id: `ir_${annee}`, type: 'ir', label: `Déclaration revenus ${annee}`, date: `${annee}-05-31`, color: '#7c3aed', bg: '#ede9fe', icon: '📊' });
  // Formation DIF — 28 février
  echeances.push({ id: `cpf_${annee}`, type: 'cpf', label: `Contribution formation ${annee - 1}`, date: `${annee}-02-28`, color: '#0369a1', bg: '#e0f2fe', icon: '🎓' });
  return echeances.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ── Root Comptabilité ─────────────────────────────────────────────
function Comptabilite({ api, clients }) {
  const [tab, setTab] = useState('devis');

  const TABS = [
    { key: 'devis', label: '📋 Devis émis' },
    { key: 'factures', label: '🧾 Factures' },
    { key: 'charges', label: '💸 Charges' },
    { key: 'notesfrais', label: '🗒️ Notes de frais' },
    { key: 'documents', label: '📁 Documents' },
    { key: 'echeances', label: '🔔 Échéances' },
    { key: 'resultats', label: '📊 Résultats' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ background: '#FFFDF8', borderBottom: '1px solid #DDD5B8', padding: '18px 28px 0', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D1520', margin: 0 }}>Comptabilité</h1>
          <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0' }}>Suivi financier et fiscal du cabinet</p>
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
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 28px' }}>
        {tab === 'devis' && <ComptaDevis api={api} clients={clients} />}
        {tab === 'factures' && <ComptaFactures api={api} clients={clients} />}
        {tab === 'charges' && <ComptaCharges api={api} />}
        {tab === 'notesfrais' && <ComptaNotesfrais api={api} />}
        {tab === 'documents' && <ComptaDocuments api={api} />}
        {tab === 'echeances' && <ComptaEcheances />}
        {tab === 'resultats' && <ComptaResultats api={api} />}
      </div>
    </div>
  );
}

// ── Devis émis ────────────────────────────────────────────────────
function ComptaDevis({ api, clients }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getComptaDevis()) || []); setLoading(false); }

  async function handleSave(data) {
    await api.saveComptaDevis(data);
    setShowForm(false); setEditing(null); load();
  }

  const totalAccepte = items.filter(i => i.statut === 'accepte').reduce((s, i) => s + (+i.montant || 0), 0);
  const totalEnvoye = items.filter(i => i.statut === 'envoye').reduce((s, i) => s + (+i.montant || 0), 0);

  if (showForm || editing) return <ComptaDevisForm api={api} data={editing} clients={clients} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #059669' }}>
          <div style={lbl}>Acceptés</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{fmtEur(totalAccepte)}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{items.filter(i => i.statut === 'accepte').length} devis</div>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #0369a1' }}>
          <div style={lbl}>En attente</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0369a1' }}>{fmtEur(totalEnvoye)}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{items.filter(i => i.statut === 'envoye').length} devis</div>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #DDD5B8' }}>
          <div style={lbl}>Total émis</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0D1520' }}>{items.length}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>tous statuts</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Nouveau devis</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement…</div>
        : items.length === 0 ? (
          <div onClick={() => setShowForm(true)} style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: 48, textAlign: 'center', cursor: 'pointer', color: '#94a3b8' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C9A84C'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD5B8'}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucun devis</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => {
              const st = devisStatutOf(item.statut);
              const cl = clients.find(c => String(c.id) === String(item.client_id));
              return (
                <div key={item.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0D1520' }}>{item.numero}</span>
                      <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {cl?.name || item.client_nom || '—'}{item.formule ? ` · ${item.formule}` : ''}
                    </div>
                    {item.date_emission && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(item.date_emission).toLocaleDateString('fr-FR')}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{fmtEur(item.montant)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                    {item.storage_path && (
                      <button onClick={() => api.openAttachment(item)} style={{ ...btnSec, padding: '4px 10px', fontSize: 11, color: '#7c3aed' }}>📄 Ouvrir</button>
                    )}
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => setEditing(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11 }}>Modifier</button>
                      <button onClick={() => setShowDel(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      {showDel && <ConfirmModal title="Supprimer ce devis" message={`Supprimer le devis ${showDel.numero} ?`} onConfirm={async () => { await api.deleteComptaDevis(showDel.id); setShowDel(null); load(); }} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function ComptaDevisForm({ api, data, clients, onSave, onCancel }) {
  const [loadingNum, setLoadingNum] = useState(!data?.id);
  const [form, setForm] = useState({
    numero: '',
    client_id: '', client_nom: '', formule: '', montant: '',
    statut: 'envoye', date_emission: new Date().toISOString().split('T')[0],
    notes: '', ...(data || {}),
    client_id: data?.client_id != null ? String(data.client_id) : '',
    montant: data?.montant != null ? String(data.montant) : '',
  });
  useEffect(() => {
    if (!data?.id) {
      api.getNextNumero('devis').then(n => { setForm(f => ({ ...f, numero: n })); setLoadingNum(false); });
    } else {
      setLoadingNum(false);
    }
  }, []);
  const [file, setFile] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    let storageData = {};
    if (file) {
      const uploaded = await window.electronAPI.uploadComptaFile({ filePath: file, type: 'devis' });
      if (uploaded) storageData = { storage_path: uploaded.path, filename: uploaded.name, filetype: uploaded.ext, size: uploaded.size };
    }
    onSave({ ...form, ...storageData });
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{data?.id ? 'Modifier' : 'Nouveau devis'}</h3>
        <button onClick={handleSave} disabled={!form.numero || !form.montant || loadingNum} style={{ ...btnPrimary, opacity: form.numero && form.montant && !loadingNum ? 1 : 0.5 }}>{loadingNum ? '…' : 'Enregistrer'}</button>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>N° Devis *</label><input value={form.numero} onChange={e => set('numero', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Montant (€) *</label><input type="number" value={form.montant} onChange={e => set('montant', e.target.value)} style={inp} min="0" /></div>
          <div>
            <label style={lbl}>Client</label>
            <select value={form.client_id} onChange={e => { set('client_id', e.target.value); const cl = clients.find(c => String(c.id) === e.target.value); if (cl) set('client_nom', cl.name); }} style={inp}>
              <option value="">— Sélectionner —</option>
              {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name} — {c.company}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Formule</label><input value={form.formule} onChange={e => set('formule', e.target.value)} style={inp} placeholder="Audit Menu, Audit Complet…" /></div>
          <div><label style={lbl}>Date d'émission</label><input type="date" value={form.date_emission} onChange={e => set('date_emission', e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Statut</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {DEVIS_STATUTS_COMPTA.map(s => (
              <button key={s.key} onClick={() => set('statut', s.key)} style={{ padding: '4px 11px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.statut === s.key ? s.color : '#DDD5B8'}`, background: form.statut === s.key ? s.bg : '#FFFDF8', color: form.statut === s.key ? s.color : '#6b7280' }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>PDF du devis (optionnel)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <button onClick={async () => { const f = await window.electronAPI.pickFile(); if (f) setFile(f); }} style={btnSec}>
              📎 {file ? file.split(/[/\\]/).pop() : (data?.filename || 'Sélectionner un fichier')}
            </button>
            {(file || data?.filename) && <span style={{ fontSize: 11, color: '#059669' }}>✓ Fichier sélectionné</span>}
          </div>
        </div>
        <div><label style={lbl}>Notes</label><textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} /></div>
      </div>
    </div>
  );
}

// ── Factures comptabilité ─────────────────────────────────────────
function ComptaFactures({ api, clients }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getFactures()) || []); setLoading(false); }

  async function handleSave(data) {
    await api.saveFacture(data);
    setEditing(null);
    load();
  }

  const FACT_STATUTS = [
    { key: 'brouillon', label: 'Brouillon', color: '#6b7280', bg: '#f3f4f6' },
    { key: 'envoyee', label: 'Envoyée', color: '#0369a1', bg: '#e0f2fe' },
    { key: 'attente', label: 'En attente', color: '#d97706', bg: '#fef3c7' },
    { key: 'premier_versement', label: '1er versement', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'payee', label: 'Payée ✓', color: '#059669', bg: '#d1fae5' },
    { key: 'retard', label: 'En retard', color: '#dc2626', bg: '#fee2e2' },
  ];
  const factStatutOf = k => FACT_STATUTS.find(s => s.key === k) || FACT_STATUTS[1];

  const totalPayee = items.filter(f => f.statut === 'payee').reduce((s, f) => s + (+f.montant || 0), 0);
  const totalAcompte = items.filter(f => f.statut === 'premier_versement').reduce((s, f) => s + (+f.montant || 0) * .5, 0);
  const totalAttente = items.filter(f => ['envoyee', 'attente'].includes(f.statut)).reduce((s, f) => s + (+f.montant || 0), 0);
  const totalRetard = items.filter(f => f.statut === 'retard').reduce((s, f) => s + (+f.montant || 0), 0);
  const caEncaisse = totalPayee + totalAcompte;

  if (editing) return (
    <ComptaFactureForm
      api={api}
      data={editing === true ? null : editing}
      clients={clients}
      statuts={FACT_STATUTS}
      onSave={handleSave}
      onCancel={() => setEditing(null)}
    />
  );

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #059669' }}>
          <div style={lbl}>CA encaissé</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{fmtEur(caEncaisse)}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>payé + acomptes</div>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #d97706' }}>
          <div style={lbl}>En attente</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>{fmtEur(totalAttente)}</div>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #dc2626' }}>
          <div style={lbl}>En retard</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{fmtEur(totalRetard)}</div>
        </div>
        <div style={{ ...card, padding: '14px 16px', borderLeft: '3px solid #DDD5B8' }}>
          <div style={lbl}>Total émises</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0D1520' }}>{items.length}</div>
        </div>
      </div>

      <div style={{ background: '#FAF3E0', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📎</span>
        <span>Ces factures sont générées depuis <strong>Dossier Interne → Facturation</strong>. Vous pouvez modifier le statut ici.</span>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement…</div>
        : items.length === 0 ? (
          <div style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucune facture</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => {
              const st = factStatutOf(item.statut);
              const cl = clients.find(c => String(c.id) === String(item.client_id));
              const isPv = item.statut === 'premier_versement';
              const montantAff = isPv ? (+item.montant || 0) * .5 : (+item.montant || 0);
              return (
                <div key={item.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0D1520' }}>{item.numero}</span>
                      <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{cl?.name || item.client_nom || '—'}{item.formule ? ` · ${item.formule}` : ''}</div>
                    {item.date_emission && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(item.date_emission).toLocaleDateString('fr-FR')}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: st.color }}>{fmtEur(montantAff)}</div>
                    {isPv && <div style={{ fontSize: 10, color: '#94a3b8' }}>acompte sur {fmtEur(item.montant)}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => api.generateFacturX(item, cl || { name: item.client_nom })} style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>
                      📄 Factur-X
                    </button>
                    <button onClick={() => setEditing(item)} style={{ ...btnSec, padding: '4px 10px', fontSize: 11 }}>
                      Modifier
                    </button>
                    <button onClick={() => setShowDel(item)} style={{ ...btnSec, padding: '4px 10px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      {showDel && (
        <ConfirmModal
          title="Supprimer cette facture"
          message={`Supprimer la facture ${showDel.numero} ?`}
          onConfirm={async () => { await api.deleteFacture(showDel.id); setShowDel(null); load(); }}
          onCancel={() => setShowDel(null)}
        />
      )}
    </div>
  );
}

function ComptaFactureForm({ api, data, clients, statuts, onSave, onCancel }) {
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(!data?.id);
  const [form, setForm] = useState({
    numero: '', client_id: '', client_nom: '', formule: '', montant: '', statut: 'envoyee',
    date_emission: new Date().toISOString().split('T')[0], date_echeance: '', notes: '',
    ...(data || {}),
    client_id: data?.client_id != null ? String(data.client_id) : '',
    montant: data?.montant != null ? String(data.montant) : '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  useEffect(() => {
    if (!data?.id) {
      api.getNextNumero('facture').then(n => { set('numero', n); setLoading(false); });
    }
  }, []);
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onCancel} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{data?.id ? 'Modifier' : 'Nouvelle facture'}</h3>
        <button onClick={() => onSave(form)} disabled={!form.numero || !form.montant || loading} style={{ ...btnPrimary, opacity: form.numero && form.montant && !loading ? 1 : 0.5 }}>{loading ? '…' : 'Enregistrer'}</button>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>N° Facture *</label><input value={form.numero} onChange={e => set('numero', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Montant (€) *</label><input type="number" value={form.montant} onChange={e => set('montant', e.target.value)} style={inp} min="0" /></div>
          <div>
            <label style={lbl}>Client</label>
            <select value={form.client_id} onChange={e => { set('client_id', e.target.value); const cl = clients.find(c => String(c.id) === e.target.value); if (cl) set('client_nom', cl.name); }} style={inp}>
              <option value="">— Sélectionner —</option>
              {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name} — {c.company}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Formule</label><input value={form.formule} onChange={e => set('formule', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Date émission</label><input type="date" value={form.date_emission} onChange={e => set('date_emission', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Date échéance</label><input type="date" value={form.date_echeance || ''} onChange={e => set('date_echeance', e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Statut</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {statuts.map(s => (
              <button key={s.key} onClick={() => set('statut', s.key)} style={{ padding: '4px 11px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.statut === s.key ? s.color : '#DDD5B8'}`, background: form.statut === s.key ? s.bg : '#FFFDF8', color: form.statut === s.key ? s.color : '#6b7280' }}>{s.label}</button>
            ))}
          </div>
        </div>
        <div><label style={lbl}>Notes</label><textarea rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} /></div>
      </div>
    </div>
  );
}

// ── Charges ───────────────────────────────────────────────────────
function ComptaCharges({ api }) {
  const [charges, setCharges] = useState([]);
  const [recurrents, setRecurrents] = useState([]);
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [showRec, setShowRec] = useState(false);

  useEffect(() => { load(); }, [mois, annee]);
  async function load() {
    const [c, r] = await Promise.all([api.getCharges(mois, annee), api.getChargesRecurrentes()]);
    setCharges(c || []);
    setRecurrents(r || []);
  }

  async function handleSave(data) {
    await api.saveCharge({ ...data, mois, annee });
    setShowForm(false); setEditing(null); load();
  }

  async function importerRecurrentes() {
    for (const r of recurrents) {
      const exists = charges.find(c => c.recurrent_id === r.id);
      if (!exists) await api.saveCharge({ ...r, mois, annee, recurrent_id: r.id, id: null });
    }
    load();
  }

  const total = charges.reduce((s, c) => s + (+c.montant || 0), 0);
  const bycat = CHARGES_CATS.map(cat => ({
    ...cat, total: charges.filter(c => c.categorie === cat.key).reduce((s, c) => s + (+c.montant || 0), 0)
  })).filter(c => c.total > 0);

  if (showForm || editing) return <ChargeForm data={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />;

  return (
    <div>
      {/* Sélecteur période */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, ...card, padding: '12px 16px' }}>
        <span style={lbl}>Période</span>
        <select value={mois} onChange={e => setMois(+e.target.value)} style={{ ...inp, maxWidth: 140 }}>
          {MOIS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={annee} onChange={e => setAnnee(+e.target.value)} style={{ ...inp, maxWidth: 90 }} min="2020" max="2035" />
        <span style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C', marginLeft: 'auto' }}>{fmtEur(total)}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>total ce mois</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Ajouter une charge</button>
        {recurrents.length > 0 && (
          <button onClick={importerRecurrentes} style={btnSec} title="Importer les charges récurrentes ce mois">
            🔄 Importer récurrentes ({recurrents.length})
          </button>
        )}
        <button onClick={() => setShowRec(!showRec)} style={{ ...btnSec, marginLeft: 'auto' }}>
          ⚙️ Charges récurrentes
        </button>
      </div>

      {/* Charges récurrentes panel */}
      {showRec && <ChargesRecurrentesPanel api={api} recurrents={recurrents} onReload={load} />}

      {/* Répartition par catégorie */}
      {bycat.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {bycat.map(c => (
            <div key={c.key} style={{ ...card, padding: '10px 12px', borderLeft: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.color, marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0D1520' }}>{fmtEur(c.total)}</div>
            </div>
          ))}
        </div>
      )}

      {charges.length === 0 ? (
        <div style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucune charge pour {MOIS_LABELS[mois - 1]} {annee}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Cliquez "Importer récurrentes" pour les ajouter automatiquement</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {charges.map(c => {
            const cat = chargeCatOf(c.categorie);
            return (
              <div key={c.id} style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0D1520' }}>{c.label}</span>
                    <Badge color={cat.color} bg={cat.bg} small>{cat.label}</Badge>
                    {c.recurrent_id && <span style={{ fontSize: 9, color: '#94a3b8' }}>🔄 récurrente</span>}
                  </div>
                  {c.notes && <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.notes}</div>}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#dc2626', flexShrink: 0 }}>{fmtEur(c.montant)}</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => setEditing(c)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11 }}>✎</button>
                  <button onClick={() => setShowDel(c)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer cette charge" message={`Supprimer "${showDel.label}" ?`} onConfirm={async () => { await api.deleteCharge(showDel.id); setShowDel(null); load(); }} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function ChargesRecurrentesPanel({ api, recurrents, onReload }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function handleSave(data) {
    await api.saveChargeRecurrente(data);
    setShowForm(false); setEditing(null); onReload();
  }

  return (
    <div style={{ ...card, marginBottom: 14, borderLeft: '3px solid #C9A84C' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1520' }}>⚙️ Charges récurrentes — importées automatiquement chaque mois</div>
        <button onClick={() => setShowForm(true)} style={{ ...btnSec, fontSize: 11, padding: '4px 10px' }}>+ Ajouter</button>
      </div>
      {showForm && <ChargeForm data={null} isRecurrente onSave={handleSave} onCancel={() => setShowForm(false)} />}
      {editing && <ChargeForm data={editing} isRecurrente onSave={handleSave} onCancel={() => setEditing(null)} />}
      {recurrents.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Aucune charge récurrente définie</div>
        : recurrents.map(r => {
          const cat = chargeCatOf(r.categorie);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F5F0E8' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: '#0D1520' }}>{r.label}</span>
                <Badge color={cat.color} bg={cat.bg} small style={{ marginLeft: 8 }}>{cat.label}</Badge>
              </div>
              <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{fmtEur(r.montant)}</span>
              <button onClick={() => setEditing(r)} style={{ ...btnSec, padding: '3px 7px', fontSize: 11 }}>✎</button>
              <button onClick={async () => { await api.deleteChargeRecurrente(r.id); onReload(); }} style={{ ...btnSec, padding: '3px 7px', fontSize: 11, color: '#dc2626' }}>✕</button>
            </div>
          );
        })}
    </div>
  );
}

function ChargeForm({ data, onSave, onCancel, isRecurrente }) {
  const [form, setForm] = useState({ label: '', categorie: 'autre', montant: '', notes: '', ...(data || {}), montant: data?.montant != null ? String(data.montant) : '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: '#FAF8F2', border: '1px solid #DDD5B8', borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div><label style={lbl}>Libellé *</label><input value={form.label} onChange={e => set('label', e.target.value)} style={inp} placeholder="Ex: Loyer bureau, Abonnement Supabase…" /></div>
        <div><label style={lbl}>Montant (€) *</label><input type="number" value={form.montant} onChange={e => set('montant', e.target.value)} style={inp} min="0" /></div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Catégorie</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
            {CHARGES_CATS.map(c => (
              <button key={c.key} onClick={() => set('categorie', c.key)} style={{ padding: '3px 9px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.categorie === c.key ? c.color : '#DDD5B8'}`, background: form.categorie === c.key ? c.bg : '#FFFDF8', color: form.categorie === c.key ? c.color : '#6b7280' }}>{c.label}</button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Notes</label><input value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={inp} placeholder="Détail optionnel…" /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSec}>Annuler</button>
        <button onClick={() => onSave(form)} disabled={!form.label || !form.montant} style={{ ...btnPrimary, opacity: form.label && form.montant ? 1 : 0.5 }}>
          {isRecurrente ? 'Enregistrer (récurrente)' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

// ── Notes de frais ────────────────────────────────────────────────
function ComptaNotesfrais({ api }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems((await api.getNotesfrais()) || []); }

  const NF_CATS = [
    { key: 'deplacement', label: 'Déplacement', color: '#0369a1', bg: '#e0f2fe' },
    { key: 'repas', label: 'Repas', color: '#059669', bg: '#d1fae5' },
    { key: 'materiel', label: 'Matériel', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'hebergement', label: 'Hébergement', color: '#d97706', bg: '#fef3c7' },
    { key: 'autre', label: 'Autre', color: '#6b7280', bg: '#f3f4f6' },
  ];
  const nfCatOf = k => NF_CATS.find(c => c.key === k) || NF_CATS[4];
  const total = items.reduce((s, i) => s + (+i.montant || 0), 0);

  if (showForm || editing) return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ ...btnSec, padding: '6px 12px' }}>← Retour</button>
        <h3 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>{editing ? 'Modifier' : 'Nouvelle note de frais'}</h3>
      </div>
      <NotefraisForm data={editing} cats={NF_CATS} onSave={async d => { await api.saveNotefrais(d); setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0D1520' }}>Total : <span style={{ color: '#dc2626' }}>{fmtEur(total)}</span></div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Nouvelle note de frais</button>
      </div>
      {items.length === 0 ? (
        <div style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗒️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucune note de frais</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => {
            const cat = nfCatOf(item.categorie);
            return (
              <div key={item.id} style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0D1520' }}>{item.label}</span>
                    <Badge color={cat.color} bg={cat.bg} small>{cat.label}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}
                    {item.notes ? ` · ${item.notes}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#dc2626', flexShrink: 0 }}>{fmtEur(item.montant)}</div>
                {item.storage_path && <button onClick={() => api.openAttachment(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#7c3aed' }}>📎</button>}
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => setEditing(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11 }}>✎</button>
                  <button onClick={() => setShowDel(item)} style={{ ...btnSec, padding: '4px 8px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDel && <ConfirmModal title="Supprimer" message={`Supprimer "${showDel.label}" ?`} onConfirm={async () => { await api.deleteNotefrais(showDel.id); setShowDel(null); load(); }} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

function NotefraisForm({ data, cats, onSave, onCancel }) {
  const [form, setForm] = useState({ label: '', categorie: 'deplacement', montant: '', date: new Date().toISOString().split('T')[0], notes: '', ...(data || {}), montant: data?.montant != null ? String(data.montant) : '' });
  const [file, setFile] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={card}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={lbl}>Libellé *</label><input value={form.label} onChange={e => set('label', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Montant (€) *</label><input type="number" value={form.montant} onChange={e => set('montant', e.target.value)} style={inp} min="0" /></div>
        <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} /></div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Catégorie</label>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
          {cats.map(c => (
            <button key={c.key} onClick={() => set('categorie', c.key)} style={{ padding: '4px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: `1px solid ${form.categorie === c.key ? c.color : '#DDD5B8'}`, background: form.categorie === c.key ? c.bg : '#FFFDF8', color: form.categorie === c.key ? c.color : '#6b7280' }}>{c.label}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Justificatif (optionnel)</label>
        <button onClick={async () => { const f = await window.electronAPI.pickFile(); if (f) setFile(f); }} style={{ ...btnSec, marginTop: 4, display: 'block' }}>
          📎 {file ? file.split(/[/\\]/).pop() : (data?.filename || 'Joindre un justificatif')}
        </button>
      </div>
      <div style={{ marginBottom: 12 }}><label style={lbl}>Notes</label><input value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={inp} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSec}>Annuler</button>
        <button onClick={async () => {
          let storageData = {};
          if (file) { const u = await window.electronAPI.uploadComptaFile({ filePath: file, type: 'frais' }); if (u) storageData = { storage_path: u.path, filename: u.name, filetype: u.ext, size: u.size }; }
          onSave({ ...form, ...storageData });
        }} disabled={!form.label || !form.montant} style={{ ...btnPrimary, opacity: form.label && form.montant ? 1 : 0.5 }}>Enregistrer</button>
      </div>
    </div>
  );
}

// ── Documents comptables ──────────────────────────────────────────
function ComptaDocuments({ api }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDel, setShowDel] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setDocs((await api.getComptaDocs()) || []); setLoading(false); }

  const DOC_CATS = [
    { key: 'bilan', label: 'Bilan' },
    { key: 'releve', label: 'Relevé bancaire' },
    { key: 'urssaf', label: 'URSSAF' },
    { key: 'contrat', label: 'Contrat' },
    { key: 'autre', label: 'Autre' },
  ];

  const [catFilter, setCatFilter] = useState('all');
  const filtered = catFilter === 'all' ? docs : docs.filter(d => d.categorie === catFilter);

  const EXT_ICONS = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', png: '🖼️', jpg: '🖼️', txt: '📃' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setCatFilter('all')} style={{ ...btnSec, fontSize: 11, padding: '3px 10px', ...(catFilter === 'all' ? { background: '#FAF3E0', borderColor: '#C9A84C', color: '#0D1520' } : {}) }}>Tous</button>
          {DOC_CATS.map(c => <button key={c.key} onClick={() => setCatFilter(c.key)} style={{ ...btnSec, fontSize: 11, padding: '3px 10px', ...(catFilter === c.key ? { background: '#FAF3E0', borderColor: '#C9A84C', color: '#0D1520' } : {}) }}>{c.label}</button>)}
        </div>
        <button onClick={async () => { const f = await window.electronAPI.pickFile(); if (f) { const cat = catFilter === 'all' ? 'autre' : catFilter; await api.uploadComptaDoc({ filePath: f, categorie: cat }); load(); } }} style={btnPrimary}>📎 Ajouter</button>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement…</div>
        : filtered.length === 0 ? (
          <div style={{ border: '2px dashed #DDD5B8', borderRadius: 10, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Aucun document</div>
            <div style={{ fontSize: 12 }}>Bilans, relevés bancaires, courriers URSSAF…</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(d => (
              <div key={d.id} style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{EXT_ICONS[d.filetype] || '📎'}</span>
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
      {showDel && <ConfirmModal title="Supprimer ce document" message={`Supprimer "${showDel.filename}" ?`} onConfirm={async () => { await api.deleteComptaDoc({ id: showDel.id, storage_path: showDel.storage_path }); setShowDel(null); load(); }} onCancel={() => setShowDel(null)} />}
    </div>
  );
}

// ── Tableau de résultats mensuel ─────────────────────────────────
function ComptaResultats({ api }) {
  const [factures, setFactures] = useState([]);
  const [charges, setCharges] = useState([]);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [annee]);

  async function loadAll() {
    setLoading(true);
    const [f, ...moisCharges] = await Promise.all([
      api.getFactures(),
      ...Array.from({ length: 12 }, (_, i) => api.getCharges(i + 1, annee)),
    ]);
    setFactures(f || []);
    // Aplatir charges par mois
    const allCharges = moisCharges.flatMap((c, i) => (c || []).map(x => ({ ...x, mois: i + 1, annee })));
    setCharges(allCharges);
    setLoading(false);
  }

  const today = new Date();
  const moisActuel = today.getMonth() + 1;

  // Calculer résultats par mois
  const moisData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    // CA encaissé ce mois (payé ou premier versement)
    const ca = factures
      .filter(f => {
        const d = new Date(f.date_emission);
        return d.getMonth() + 1 === m && d.getFullYear() === annee &&
          ['payee', 'premier_versement'].includes(f.statut);
      })
      .reduce((s, f) => s + (f.statut === 'premier_versement' ? (+f.montant || 0) * 0.5 : (+f.montant || 0)), 0);

    // Charges ce mois
    const ch = charges.filter(c => c.mois === m).reduce((s, c) => s + (+c.montant || 0), 0);

    const res = ca - ch;
    const tauxMarge = ca > 0 ? (res / ca) * 100 : 0;

    return { mois: m, label: MOIS_LABELS[i].slice(0, 3), ca, charges: ch, resultat: res, tauxMarge, futur: m > moisActuel && annee === today.getFullYear() };
  });

  // Totaux annuels
  const totalCA = moisData.filter(m => !m.futur).reduce((s, m) => s + m.ca, 0);
  const totalCharges = moisData.filter(m => !m.futur).reduce((s, m) => s + m.charges, 0);
  const totalRes = totalCA - totalCharges;
  const tauxAnnuel = totalCA > 0 ? (totalRes / totalCA) * 100 : 0;

  // Max pour le graphe
  const maxCA = Math.max(...moisData.map(m => m.ca), 1);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement…</div>;

  return (
    <div>
      {/* Sélecteur année */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text,#0D1520)', flex: 1 }}>Résultats {annee}</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setAnnee(a => a - 1)} style={{ ...btnSec, padding: '5px 10px' }}>←</button>
          <span style={{ padding: '5px 12px', fontWeight: 700, color: 'var(--text,#0D1520)', fontSize: 14 }}>{annee}</span>
          <button onClick={() => setAnnee(a => a + 1)} style={{ ...btnSec, padding: '5px 10px' }}>→</button>
        </div>
      </div>

      {/* KPIs annuels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ ...card, padding: '16px', borderLeft: '3px solid #059669' }}>
          <div style={lbl}>CA encaissé</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{fmtEur(totalCA)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted,#94a3b8)', marginTop: 2 }}>factures payées</div>
        </div>
        <div style={{ ...card, padding: '16px', borderLeft: '3px solid #dc2626' }}>
          <div style={lbl}>Total charges</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{fmtEur(totalCharges)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted,#94a3b8)', marginTop: 2 }}>charges saisies</div>
        </div>
        <div style={{ ...card, padding: '16px', borderLeft: `3px solid ${totalRes >= 0 ? '#C9A84C' : '#dc2626'}` }}>
          <div style={lbl}>Résultat net</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: totalRes >= 0 ? '#C9A84C' : '#dc2626' }}>{fmtEur(totalRes)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted,#94a3b8)', marginTop: 2 }}>taux : {tauxAnnuel.toFixed(1)}%</div>
        </div>
      </div>

      {/* Graphe barres doubles CA vs Charges */}
      <div style={{ ...card, marginBottom: 20, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
          Évolution CA vs Charges — {annee}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
          {moisData.map((m, i) => {
            const hCA = maxCA > 0 ? Math.max(Math.round(m.ca / maxCA * 100), m.ca > 0 ? 4 : 0) : 0;
            const hCH = maxCA > 0 ? Math.max(Math.round(m.charges / maxCA * 100), m.charges > 0 ? 4 : 0) : 0;
            const isNow = m.mois === moisActuel && annee === today.getFullYear();
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: m.futur ? 0.3 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, width: '100%' }}>
                  <div style={{ flex: 1, height: hCA, background: isNow ? '#C9A84C' : '#C9A84C55', borderRadius: '2px 2px 0 0', minHeight: m.ca > 0 ? 3 : 0 }} />
                  <div style={{ flex: 1, height: hCH, background: '#dc262655', borderRadius: '2px 2px 0 0', minHeight: m.charges > 0 ? 3 : 0 }} />
                </div>
                <div style={{ fontSize: 9, color: isNow ? '#C9A84C' : 'var(--faint,#94a3b8)', fontWeight: isNow ? 700 : 400 }}>{m.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted,#94a3b8)' }}>
            <span style={{ width: 10, height: 10, background: '#C9A84C', borderRadius: 2, display: 'inline-block' }} /> CA
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted,#94a3b8)' }}>
            <span style={{ width: 10, height: 10, background: '#dc262655', borderRadius: 2, display: 'inline-block' }} /> Charges
          </div>
        </div>
      </div>

      {/* Tableau mensuel détaillé */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
          Détail mensuel
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0D1520' }}>
                {['Mois', 'CA encaissé', 'Charges', 'Résultat', 'Taux marge'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Mois' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moisData.map((m, i) => {
                const isNow = m.mois === moisActuel && annee === today.getFullYear();
                const resPos = m.resultat >= 0;
                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border,#EEE6C9)',
                    opacity: m.futur ? 0.4 : 1,
                    background: isNow ? 'rgba(201,168,76,0.07)' : 'transparent',
                  }}>
                    <td style={{ padding: '9px 12px', fontWeight: isNow ? 700 : 500, color: isNow ? '#C9A84C' : 'var(--text,#0D1520)' }}>
                      {MOIS_LABELS[i]} {isNow && <span style={{ fontSize: 9, background: '#C9A84C', color: '#0D1520', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>EN COURS</span>}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: m.ca > 0 ? '#059669' : 'var(--faint,#94a3b8)' }}>{m.ca > 0 ? fmtEur(m.ca) : '—'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: m.charges > 0 ? '#dc2626' : 'var(--faint,#94a3b8)' }}>{m.charges > 0 ? fmtEur(m.charges) : '—'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: m.ca === 0 && m.charges === 0 ? 'var(--faint,#94a3b8)' : resPos ? '#C9A84C' : '#dc2626' }}>
                      {m.ca === 0 && m.charges === 0 ? '—' : (m.resultat >= 0 ? '+' : '') + fmtEur(m.resultat)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: m.tauxMarge > 50 ? '#059669' : m.tauxMarge > 20 ? '#d97706' : m.ca === 0 ? 'var(--faint,#94a3b8)' : '#dc2626' }}>
                      {m.ca === 0 ? '—' : `${m.tauxMarge.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
              {/* Ligne totaux */}
              <tr style={{ background: '#0D1520', fontWeight: 800 }}>
                <td style={{ padding: '10px 12px', color: '#EEE6C9', fontSize: 12 }}>TOTAL {annee}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontSize: 13 }}>{fmtEur(totalCA)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626', fontSize: 13 }}>{fmtEur(totalCharges)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: totalRes >= 0 ? '#C9A84C' : '#dc2626', fontSize: 13 }}>{totalRes >= 0 ? '+' : ''}{fmtEur(totalRes)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#C9A84C', fontSize: 13 }}>{tauxAnnuel.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Échéances auto-entrepreneur ───────────────────────────────────
function ComptaEcheances() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const echeances = getEcheancesAE(annee);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const passees = echeances.filter(e => new Date(e.date) < today);
  const avenir = echeances.filter(e => new Date(e.date) >= today);
  const prochaine = avenir[0];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 800, color: '#0D1520' }}>🔔 Échéances fiscales auto-entrepreneur</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={lbl}>Année</label>
          <input type="number" value={annee} onChange={e => setAnnee(+e.target.value)} style={{ ...inp, maxWidth: 90 }} min="2024" max="2030" />
        </div>
      </div>

      {/* Prochaine échéance */}
      {prochaine && (
        <div style={{ ...card, marginBottom: 18, borderLeft: '4px solid #dc2626', background: '#fff9f9' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>⚡ Prochaine échéance</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1520' }}>{prochaine.label}</div>
          <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginTop: 4 }}>
            {new Date(prochaine.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Dans {Math.ceil((new Date(prochaine.date) - today) / 86400000)} jours
          </div>
        </div>
      )}

      {/* À venir */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        À venir ({avenir.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 24 }}>
        {avenir.map(e => {
          const daysLeft = Math.ceil((new Date(e.date) - today) / 86400000);
          const urgent = daysLeft <= 7;
          return (
            <div key={e.id} style={{ background: urgent ? '#fff9f9' : '#fff', border: `1px solid ${urgent ? '#fca5a5' : '#DDD5B8'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>{e.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0D1520' }}>{e.label}</div>
                <div style={{ fontSize: 12, color: urgent ? '#dc2626' : '#64748b', marginTop: 2 }}>
                  {new Date(e.date).toLocaleDateString('fr-FR')} — dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                </div>
              </div>
              <Badge color={e.color} bg={e.bg} small>{e.type.toUpperCase()}</Badge>
            </div>
          );
        })}
      </div>

      {/* Passées */}
      {passees.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Passées ({passees.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.6 }}>
            {passees.slice(-3).reverse().map(e => (
              <div key={e.id} style={{ background: '#FAF8F2', border: '1px solid #DDD5B8', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>✓</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{e.label} — {new Date(e.date).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 20, padding: '12px 14px', background: '#e0f2fe', border: '1px solid #93c5fd', borderRadius: 10, fontSize: 12, color: '#0369a1' }}>
        ℹ️ <strong>Rappel :</strong> En tant qu'auto-entrepreneur, vous déclarez votre CA chaque mois avant le 28/31 du mois suivant sur <strong>autoentrepreneur.urssaf.fr</strong>
      </div>
    </div>
  );
}


export default Comptabilite;