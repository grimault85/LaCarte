import { useState } from 'react';
import { FORMULAS } from '../constants';
import { card, cardH, btnPrimary, btnSec } from '../styles';
import Badge from '../components/Badge';

const GENERATORS = {
  audit_menu: {
    url: 'https://formulaire-audit-menu.lacarte-advisory.workers.dev/',
    available: true,
  },
  audit_menu_financier: {
    url: 'https://formulaire-audit-complet.lacarte-advisory.workers.dev',
    available: true,
  },
  suivi_mensuel: {
    url: 'https://formulaire-suivi-mensuel.lacarte-advisory.workers.dev',
    available: true,
  },
};

export default function RapportAudit({ clients }) {
  const [openFormula, setOpenFormula] = useState('audit_menu');

  const formula = FORMULAS.find(f => f.key === openFormula);
  const gen = GENERATORS[openFormula];
  const filtered = clients.filter(c => c.formula === openFormula && c.stage !== 'cloture');

  function handleGenerate(client) {
    const url = gen.url;
    window.electronAPI.openExternal(url);
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0D1520', letterSpacing: -0.5 }}>Rapport d'audit</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Générez un rapport pour un client selon sa formule de mission.</div>
      </div>

      {/* Sélecteur de formule */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {FORMULAS.map(f => {
          const active = openFormula === f.key;
          const avail = GENERATORS[f.key].available;
          return (
            <button key={f.key} onClick={() => setOpenFormula(f.key)} style={{
              padding: '7px 16px', borderRadius: 20, border: `1px solid ${active ? f.color : '#DDD5B8'}`,
              background: active ? f.bg : '#FFFDF8', color: active ? f.color : '#6b7280',
              fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {f.label}
              {!avail && <span style={{ fontSize: 10, background: '#f1f5f9', color: '#94a3b8', borderRadius: 8, padding: '1px 6px', fontWeight: 600 }}>Bientôt</span>}
            </button>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ ...cardH, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge color={formula.color} bg={formula.bg}>{formula.label}</Badge>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{filtered.length} client{filtered.length !== 1 ? 's' : ''} en cours</span>
          </div>
          {!gen.available && (
            <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Générateur non disponible pour cette formule</span>
          )}
        </div>

        {!gen.available ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔜</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Bientôt disponible</div>
            <div style={{ fontSize: 12 }}>Le générateur de rapport pour la formule <strong>{formula.label}</strong> est en cours de création.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 13 }}>Aucun client actif avec la formule <strong>{formula.label}</strong>.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {filtered.map(client => (
              <div key={client.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 8, border: '1px solid #E8E0C8', background: '#FFFDF8',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1520' }}>{client.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{client.company}</div>
                </div>
                <button
                  onClick={() => handleGenerate(client)}
                  style={{ ...btnPrimary, fontSize: 12, padding: '7px 16px' }}
                >
                  Générer le rapport →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
