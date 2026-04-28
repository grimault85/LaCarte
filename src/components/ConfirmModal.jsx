import { overlay, modal, btnSec, btnPrimary } from '../styles';

export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
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
