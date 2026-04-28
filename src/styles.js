export const PALETTE = {
  gold:    '#C9A84C',
  ink:     '#0D1520',
  danger:  '#dc2626',
  success: '#059669',
  muted:   '#6b7280',
  slate:   '#64748b',
  warn:    '#d97706',
  light:   '#94a3b8',
};

export const card     = { background: 'var(--surface)', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(13,21,32,0.07)', border: '1px solid var(--border)' };
export const cardH    = { fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0, letterSpacing: 0.1 };
export const td       = { padding: '10px 12px', fontSize: 13 };
export const lbl      = { fontSize: 10, fontWeight: 700, color: PALETTE.gold, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 4 };
export const inp      = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', color: 'var(--text)' };
export const iconBtn  = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', fontSize: 12, padding: '2px 7px', color: 'var(--muted)' };
export const overlay  = { position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' };
export const modal    = { background: 'var(--surface)', borderRadius: 16, padding: 26, width: '90%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(13,21,32,0.22)', border: '1px solid var(--border)' };
export const btnPrimary = { background: PALETTE.gold, color: PALETTE.ink, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.2 };
export const btnSec   = { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
