import { useState, useEffect, useMemo } from 'react';
import { MOIS_LABELS } from '../constants';
import { isOverdue, parseActionDate, stageOf, formulaOf } from '../utils';
import { card, btnSec } from '../styles';
import Badge from '../components/Badge';

function Dashboard({ clients, api, onClientClick, onNavigate }) {
  const [devis, setDevis] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [activite, setActivite] = useState([]);

  useEffect(() => {
    api.getComptaDevis().then(d => setDevis(d || []));
    api.getAgendaEvents?.().then(e => setAgenda(e || [])).catch(() => { });
    api.getPipelineItems?.().then(p => setPipeline(p || [])).catch(() => { });
    api.getRecentHistory?.().then(h => setActivite(h || [])).catch(() => { });
  }, []);

  const { actifs, retards, retainers, moisLabel, missionsEnCours, relancesAPlanifier, totalAlertes } = useMemo(() => {
    const TASKS_BY_FORMULA = {
      audit_menu: { prospection: 4, questionnaire: 3, audit: 4, cloture: 4 },
      audit_menu_financier: { prospection: 4, questionnaire: 4, audit: 6, cloture: 5 },
      suivi_mensuel: { prospection: 3, questionnaire: 3, audit: 2, cloture: 4 },
    };
    const actifs = clients.filter(c => c.stage !== 'cloture');
    const retards = actifs.filter(c => isOverdue(c.nextAction))
      .sort((a, b) => new Date(parseActionDate(a.nextAction)) - new Date(parseActionDate(b.nextAction)));
    const retainers = clients.filter(c => c.formula === 'suivi_mensuel' && c.stage !== 'cloture');
    const missionsEnCours = actifs
      .filter(c => ['questionnaire', 'audit'].includes(c.stage))
      .map(c => {
        const tasks = c.tasks || {};
        const stageKey = c.stage;
        const fm = c.formula || 'audit_menu';
        const total = TASKS_BY_FORMULA[fm]?.[stageKey] || 4;
        const done = (tasks[stageKey] || []).filter(Boolean).length;
        return { ...c, done, total, pct: Math.round(done / total * 100) };
      })
      .sort((a, b) => a.pct - b.pct);
    const relancesAPlanifier = clients
      .filter(c => {
        if (c.stage !== 'cloture') return false;
        const ref = c.updated_at || c.created_at;
        if (!ref) return false;
        return Math.floor((today - new Date(ref)) / 86400000) > 60;
      })
      .sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at))
      .slice(0, 5)
      .map(c => ({ ...c, jours: Math.floor((today - new Date(c.updated_at || c.created_at)) / 86400000) }));
    return { actifs, retards, retainers, moisLabel: MOIS_LABELS[today.getMonth()], missionsEnCours, relancesAPlanifier, totalAlertes: retards.length };
  }, [clients]);

  const devisSansReponse = useMemo(() => devis
    .filter(d => d.statut === 'envoye')
    .map(d => ({ ...d, jours: Math.floor((today - new Date(d.date_emission)) / 86400000) }))
    .sort((a, b) => b.jours - a.jours),
  [devis]);

  const pipelineBloque = useMemo(() => pipeline
    .filter(p => ['prospect', 'contact', 'devis'].includes(p.statut))
    .filter(p => {
      if (!p.updated_at && !p.created_at) return false;
      return Math.floor((today - new Date(p.updated_at || p.created_at)) / 86400000) > 7;
    })
    .slice(0, 5),
  [pipeline]);

  const agendaProchain = useMemo(() => {
    const in7days = new Date(today); in7days.setDate(today.getDate() + 7);
    return agenda
      .filter(e => { const d = new Date(e.date); return d >= today && d <= in7days; })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [agenda]);

  const SectionTitle = ({ icon, title, count, color = '#0D1520', onAction, actionLabel }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `1.5px solid var(--border,#DDD5B8)` }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: `var(--text,${color})`, flex: 1 }}>{title}</span>
      {count != null && <span style={{ background: count > 0 ? '#dc2626' : '#059669', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 7px', fontWeight: 700 }}>{count}</span>}
      {onAction && <button onClick={onAction} style={{ ...btnSec, fontSize: 11, padding: '3px 10px' }}>{actionLabel || 'Voir tout →'}</button>}
    </div>
  );

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box', overflow: 'auto', height: '100%' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text,#0D1520)', margin: 0 }}>
          Bonjour 👋 — {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        <p style={{ color: 'var(--muted,#64748b)', margin: '4px 0 0', fontSize: 13 }}>
          {actifs.length} dossier{actifs.length > 1 ? 's' : ''} actif{actifs.length > 1 ? 's' : ''}{totalAlertes > 0 ? ` · ${totalAlertes} alerte${totalAlertes > 1 ? 's' : ''} à traiter` : ' · Tout est à jour ✓'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ ...card }}>
            <SectionTitle icon="⚠️" title="Actions en retard" count={retards.length} onAction={() => onNavigate('clients')} />
            {retards.length === 0 ? (
              <div style={{ fontSize: 13, color: '#059669', fontWeight: 600, padding: '8px 0' }}>✓ Aucun retard — tout est à jour</div>
            ) : retards.slice(0, 4).map(c => {
              const d = parseActionDate(c.nextAction);
              const jours = d ? Math.floor((today - d) / 86400000) : 0;
              const st = stageOf(c.stage);
              return (
                <div key={c.id} onClick={() => onClientClick(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border,#F5F0E8)', cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted,#64748b)' }}>{c.company}</div>
                  </div>
                  <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>{jours}j de retard</span>
                </div>
              );
            })}
            {retards.length > 4 && <div style={{ fontSize: 11, color: 'var(--faint,#94a3b8)', marginTop: 6 }}>+{retards.length - 4} autres…</div>}

            {retainers.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border,#DDD5B8)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C', marginBottom: 6 }}>📅 Suivi {moisLabel} à créer ({retainers.length})</div>
                {retainers.slice(0, 3).map(c => (
                  <div key={c.id} onClick={() => onClientClick(c)}
                    style={{ fontSize: 12, color: 'var(--muted,#64748b)', padding: '3px 0', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ color: '#C9A84C' }}>→</span> {c.name} — {c.company}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...card }}>
            <SectionTitle icon="🎯" title="Missions en cours" count={missionsEnCours.length} onAction={() => onNavigate('clients')} />
            {missionsEnCours.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--faint,#94a3b8)', fontStyle: 'italic' }}>Aucune mission en cours</div>
            ) : missionsEnCours.slice(0, 5).map(c => {
              const st = stageOf(c.stage);
              return (
                <div key={c.id} onClick={() => onClientClick(c)}
                  style={{ padding: '8px 0', borderBottom: '1px solid var(--border,#F5F0E8)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)', flex: 1 }}>{c.name}</span>
                    <Badge color={st.color} bg={st.bg} small>{st.label}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--faint,#94a3b8)' }}>{c.done}/{c.total}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border,#EDE8D5)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${c.pct}%`, height: '100%', background: c.pct === 100 ? '#059669' : '#C9A84C', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--faint,#94a3b8)', marginTop: 3 }}>{c.company}</div>
                </div>
              );
            })}
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ ...card }}>
            <SectionTitle icon="📅" title="Agenda — 7 prochains jours" onAction={() => onNavigate('interne', 'agenda')} actionLabel="Agenda →" />
            {agendaProchain.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--faint,#94a3b8)', fontStyle: 'italic' }}>Aucun événement prévu</div>
            ) : agendaProchain.map(e => {
              const d = new Date(e.date);
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={e.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border,#F5F0E8)', alignItems: 'flex-start' }}>
                  <div style={{ background: isToday ? '#C9A84C' : 'var(--bg2,#FAF8F2)', border: `1px solid ${isToday ? '#C9A84C' : 'var(--border,#DDD5B8)'}`, borderRadius: 8, padding: '4px 8px', textAlign: 'center', flexShrink: 0, minWidth: 42 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? '#0D1520' : 'var(--text,#0D1520)', lineHeight: 1 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 9, color: isToday ? '#0D1520' : 'var(--faint,#94a3b8)', textTransform: 'uppercase' }}>{MOIS_LABELS[d.getMonth()].slice(0, 3)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: isToday ? '#C9A84C' : 'var(--text,#0D1520)' }}>{e.title || e.label}</div>
                    {e.time && <div style={{ fontSize: 11, color: 'var(--muted,#64748b)' }}>{e.time}</div>}
                    {e.client_nom && <div style={{ fontSize: 11, color: 'var(--faint,#94a3b8)' }}>{e.client_nom}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ ...card }}>
            <SectionTitle icon="📧" title="Devis sans réponse" count={devisSansReponse.length} onAction={() => onNavigate('comptabilite')} />
            {devisSansReponse.length === 0 ? (
              <div style={{ fontSize: 13, color: '#059669', fontWeight: 600, padding: '8px 0' }}>✓ Aucun devis en attente</div>
            ) : devisSansReponse.slice(0, 4).map(d => {
              const urgent = d.jours > 14;
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border,#F5F0E8)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)' }}>{d.client_nom || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted,#64748b)' }}>{d.numero} · {d.formule || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: urgent ? '#dc2626' : '#d97706' }}>{d.jours}j d'attente</div>
                    <div style={{ fontSize: 10, color: 'var(--faint,#94a3b8)' }}>{d.date_emission ? new Date(d.date_emission).toLocaleDateString('fr-FR') : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ ...card }}>
            <SectionTitle icon="📋" title="Pipeline — prospects bloqués" count={pipelineBloque.length} onAction={() => onNavigate('interne', 'pipeline')} actionLabel="Pipeline →" />
            {pipelineBloque.length === 0 ? (
              <div style={{ fontSize: 13, color: '#059669', fontWeight: 600, padding: '8px 0' }}>✓ Aucun prospect bloqué</div>
            ) : pipelineBloque.map(p => {
              const jours = Math.floor((today - new Date(p.updated_at || p.created_at)) / 86400000);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border,#F5F0E8)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)' }}>{p.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted,#64748b)' }}>{p.entreprise || '—'}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: jours > 14 ? '#dc2626' : '#d97706' }}>{jours}j sans mvt</div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>

        <div style={{ ...card }}>
          <SectionTitle icon="💬" title="Relances à planifier" count={relancesAPlanifier.length} onAction={() => onNavigate('clients')} actionLabel="Dossiers →" />
          {relancesAPlanifier.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--faint,#94a3b8)', fontStyle: 'italic' }}>
              Aucun client clôturé depuis +60 jours — revenez plus tard
            </div>
          ) : relancesAPlanifier.map(c => {
            const fm = formulaOf(c.formula);
            const mois = Math.floor(c.jours / 30);
            return (
              <div key={c.id} onClick={() => onClientClick(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border,#F5F0E8)', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text,#0D1520)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted,#64748b)' }}>{c.company}</div>
                </div>
                <Badge color={fm.color} bg={fm.bg} small>{fm.label}</Badge>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.jours > 120 ? '#dc2626' : '#d97706' }}>
                    {mois > 0 ? `${mois} mois` : `${c.jours}j`}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--faint,#94a3b8)' }}>sans contact</div>
                </div>
              </div>
            );
          })}
          {relancesAPlanifier.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(201,168,76,0.08)', borderRadius: 8, fontSize: 11, color: '#C9A84C' }}>
              💡 Ces clients ont déjà travaillé avec vous — un message de suivi peut déboucher sur un retainer ou un nouvel audit.
            </div>
          )}
        </div>

        <div style={{ ...card }}>
          <SectionTitle icon="🕐" title="Dernière activité" onAction={() => onNavigate('clients')} actionLabel="Clients →" />
          {activite.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--faint,#94a3b8)', fontStyle: 'italic' }}>Aucune activité récente</div>
          ) : activite.slice(0, 6).map((h, i) => {
            const cl = clients.find(c => String(c.id) === String(h.client_id));
            const d = h.created_at ? new Date(h.created_at) : null;
            const isToday = d && d.toDateString() === today.toDateString();
            const isYesterday = d && new Date(d.getTime() + 86400000).toDateString() === today.toDateString();
            const dateLabel = isToday ? "Aujourd'hui" : isYesterday ? 'Hier' : d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
            return (
              <div key={h.id || i} onClick={() => cl && onClientClick(cl)}
                style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border,#F5F0E8)', cursor: cl ? 'pointer' : 'default', alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text,#0D1520)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.action}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted,#64748b)' }}>
                    {cl ? `${cl.name} — ${cl.company}` : ''}
                    {h.utilisateur ? ` · ${h.utilisateur}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--faint,#94a3b8)', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateLabel}</div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
