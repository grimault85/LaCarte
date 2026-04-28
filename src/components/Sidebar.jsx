import { memo } from 'react';
import { PALETTE } from '../styles';
import { IconDash, IconFolder, IconLock, IconCompta, IconRessources, IconSocial } from './Icons';

const Sidebar = memo(function Sidebar({ view, setView, totalClients, overdueCount, userName, onSetupUser, darkMode, onToggleDark }) {
  const items = [
    { key: 'dashboard', label: 'Tableau de bord', icon: <IconDash /> },
    { key: 'clients', label: 'Dossiers clients', icon: <IconFolder />, badge: overdueCount || null },
    { key: 'interne', label: 'Dossier Interne', icon: <IconLock /> },
    { key: 'comptabilite', label: 'Comptabilité', icon: <IconCompta /> },
    { key: 'ressources', label: 'Ressources', icon: <IconRessources /> },
    { key: 'social', label: 'Réseaux Sociaux', icon: <IconSocial /> },
    { key: 'parametres', label: 'Paramètres', icon: '⚙️' },
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
            <div style={{ color: '#334155', fontSize: 10, marginTop: 1 }}>v5.0</div>
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

      <div style={{ padding: '10px 16px', borderTop: '1px solid #1A2535' }}>
        <button onClick={onToggleDark} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px 2px', marginBottom: 6,
        }}>
          <div style={{
            width: 36, height: 20, borderRadius: 10, background: darkMode ? PALETTE.gold : '#1e2d45',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: darkMode ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </div>
          <span style={{ fontSize: 11, color: '#475569' }}>{darkMode ? '🌙 Mode sombre' : '☀️ Mode clair'}</span>
        </button>

        <button onClick={onSetupUser} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          padding: '6px 2px',
        }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: userName ? PALETTE.gold : '#1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: userName ? PALETTE.ink : '#475569', fontSize: 11, fontWeight: 800 }}>
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
});

export default Sidebar;
