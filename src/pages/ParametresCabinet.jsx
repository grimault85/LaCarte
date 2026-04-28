import { useState, useEffect } from 'react';
import { card, lbl, inp, btnPrimary } from '../styles';
// ══════════════════════════════════════════════════════════════════
// PARAMÈTRES CABINET
// ══════════════════════════════════════════════════════════════════
function SettingsSection({ title, children }) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0D1520', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #DDD5B8' }}>{title}</h3>
      {children}
    </div>
  );
}

function ParametresCabinet({ api }) {
  const [form, setForm] = useState({
    iban: '', bic: '', banque: '',
    lien_visio: '', lien_google: '', lien_calendly: '',
    adresse: '', code_postal: '', ville: '', telephone: '',
    prefixe_devis: 'DEV', prefixe_facture: 'FA',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.getSettings().then(s => { if (s && Object.keys(s).length) setForm(f => ({ ...f, ...s })); });
  }, []);

  async function handleSave() {
    setSaving(true);
    await api.saveSettings(form);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text,#0D1520)', margin: 0 }}>⚙️ Paramètres cabinet</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Ces informations sont injectées automatiquement dans vos emails et documents.</p>
      </div>

      <SettingsSection title="🏢 Identité cabinet">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ marginBottom: 12, gridColumn: 'span 1' }}>
            <label style={lbl}>Téléphone pro</label>
            <input value={form.telephone || ''} onChange={e => set('telephone', e.target.value)} placeholder="06 XX XX XX XX" style={{ ...inp, marginTop: 4 }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Affiché dans la fiche RDV</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>Adresse</label>
            <input value={form.adresse || ''} onChange={e => set('adresse', e.target.value)} placeholder="Rue, numéro..." style={{ ...inp, marginTop: 4, marginBottom: 6 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
              <input value={form.code_postal || ''} onChange={e => set('code_postal', e.target.value)} placeholder="Code postal" style={{ ...inp }} />
              <input value={form.ville || ''} onChange={e => set('ville', e.target.value)} placeholder="Ville" style={{ ...inp }} />
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Affichée dans la section émetteur des factures</div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="💳 Coordonnées bancaires">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>IBAN</label>
            <input value={form.iban || ''} onChange={e => set('iban', e.target.value)} placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" style={{ ...inp, marginTop: 4 }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Pré-rempli dans les factures et l'email relance facture</div>
          </div>
          <div>
            <label style={lbl}>BIC</label>
            <input value={form.bic || ''} onChange={e => set('bic', e.target.value)} placeholder="XXXXXXXX" style={{ ...inp, marginTop: 4 }} />
          </div>
          <div>
            <label style={lbl}>Banque</label>
            <input value={form.banque || ''} onChange={e => set('banque', e.target.value)} placeholder="Nom de votre banque" style={{ ...inp, marginTop: 4 }} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="📄 Numérotation des documents">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Préfixe devis</label>
            <input value={form.prefixe_devis || 'DEV'} onChange={e => set('prefixe_devis', e.target.value)} placeholder="DEV" style={{ ...inp, marginTop: 4 }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Ex: DEV → DEV-2026-01</div>
          </div>
          <div>
            <label style={lbl}>Préfixe facture</label>
            <input value={form.prefixe_facture || 'FA'} onChange={e => set('prefixe_facture', e.target.value)} placeholder="FA" style={{ ...inp, marginTop: 4 }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Ex: FA → FA-2026-01</div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="🔗 Liens utiles">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>Lien visio par défaut</label>
            <input value={form.lien_visio || ''} onChange={e => set('lien_visio', e.target.value)} placeholder="https://meet.google.com/xxx ou Zoom..." style={{ ...inp, marginTop: 4 }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Injecté dans {'{{' + 'lien_visio' + '}}'} dans vos emails</div>
          </div>
          <div>
            <label style={lbl}>Lien Calendly / prise de RDV</label>
            <input value={form.lien_calendly || ''} onChange={e => set('lien_calendly', e.target.value)} placeholder="https://calendly.com/..." style={{ ...inp, marginTop: 4 }} />
          </div>
          <div>
            <label style={lbl}>Lien Google Business (avis)</label>
            <input value={form.lien_google || ''} onChange={e => set('lien_google', e.target.value)} placeholder="https://g.page/r/..." style={{ ...inp, marginTop: 4 }} />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Injecté dans l'email demande de témoignage</div>
          </div>
        </div>
      </SettingsSection>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {saved && <span style={{ fontSize: 13, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>✓ Enregistré</span>}
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement…' : '💾 Enregistrer'}
        </button>
      </div>
    </div>
  );
}


export default ParametresCabinet;