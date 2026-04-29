import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from './api';
import { MOIS_LABELS } from './constants';
import { isOverdue } from './utils';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ClientsView, { SetupUserModal, RemindersModal } from './pages/ClientsView';
import DossierInterne from './pages/DossierInterne';
import RapportAudit from './pages/RapportAudit';
import Comptabilite from './pages/Comptabilite';
import Ressources from './pages/Ressources';
import ReseauxSociaux from './pages/ReseauxSociaux';
import ParametresCabinet from './pages/ParametresCabinet';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lc_dark') || 'false'); } catch { return false; }
  });
  const [interneTab, setInterneTab] = useState(null);

  useEffect(() => {
    localStorage.setItem('lc_dark', JSON.stringify(darkMode));
    document.body.classList.toggle('lc-dark', darkMode);
  }, [darkMode]);

  const refresh = useCallback(async (keepSelectedId) => {
    const [cls, st] = await Promise.all([api.getClients(), api.getStats()]);
    setClients(cls);
    setStats(st);
    setLoading(false);
    if (keepSelectedId) {
      const updated = cls.find(c => c.id === keepSelectedId);
      setSelected(updated || null);
    }
  }, []);

  useEffect(() => {
    refresh();
    api.getUserName().then(name => {
      setUserName(name || '');
      if (!name) setShowSetup(true);
    });
  }, [refresh]);

  const hasShownReminders = useRef(false);
  useEffect(() => {
    if (!clients.length || hasShownReminders.current) return;
    hasShownReminders.current = true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const r = [];

    const inactifs = clients.filter(c => {
      if (!c.nextAction || c.stage === 'cloture') return false;
      return isOverdue(c.nextAction);
    });
    if (inactifs.length) r.push({
      type: 'warning', icon: '⏰',
      title: `${inactifs.length} client${inactifs.length > 1 ? 's' : ''} en retard`,
      detail: inactifs.slice(0, 3).map(c => c.name).join(', ') + (inactifs.length > 3 ? `… +${inactifs.length - 3}` : ''),
      action: () => setView('clients'),
    });

    const mois = today.getMonth() + 1;
    const annee = today.getFullYear();
    const retainersActifs = clients.filter(c => c.formula === 'suivi_mensuel' && c.stage !== 'cloture');
    if (retainersActifs.length) r.push({
      type: 'gold', icon: '📅',
      title: `${retainersActifs.length} client${retainersActifs.length > 1 ? 's' : ''} en retainer — suivi ${MOIS_LABELS[mois - 1]}`,
      detail: retainersActifs.map(c => c.name).join(', '),
      action: () => setView('clients'),
    });

    if (r.length > 0) {
      setReminders(r);
      setShowReminders(true);
    }
  }, [clients]);

  const overdueCount = useMemo(() => clients.filter(c => isOverdue(c.nextAction)).length, [clients]);

  const handleSidebarView = useCallback(v => { setView(v); if (v !== 'clients') setSelected(null); }, []);
  const handleClientClick = useCallback(c => { setSelected(c); setView('clients'); }, []);
  const handleNavigate = useCallback((v, tab) => { setInterneTab(tab || null); setView(v); }, []);
  const handleSetupUser = useCallback(() => setShowSetup(true), []);
  const handleToggleDark = useCallback(() => setDarkMode(d => !d), []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0D1520', color: '#8A7A5A', fontSize: 15, fontFamily: 'system-ui' }}>
      Chargement…
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg3,#EDE8D5)', fontFamily: '"Segoe UI","Helvetica Neue",Arial,sans-serif', overflow: 'hidden' }}>
      <Sidebar
        view={view}
        setView={handleSidebarView}
        totalClients={clients.length}
        overdueCount={overdueCount}
        userName={userName}
        onSetupUser={handleSetupUser}
        darkMode={darkMode}
        onToggleDark={handleToggleDark}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'dashboard' && (
          <Dashboard
            clients={clients}
            api={api}
            onClientClick={handleClientClick}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'clients' && (
          <ClientsView
            clients={clients}
            setClients={setClients}
            selected={selected}
            setSelected={setSelected}
            refresh={refresh}
            api={api}
          />
        )}
        {view === 'interne' && (
          <DossierInterne api={api} clients={clients} onRefreshClients={refresh} initialTab={interneTab} />
        )}
        {view === 'rapport' && (
          <RapportAudit clients={clients} />
        )}
        {view === 'comptabilite' && (
          <Comptabilite api={api} clients={clients} />
        )}
        {view === 'ressources' && (
          <Ressources api={api} />
        )}
        {view === 'social' && (
          <ReseauxSociaux api={api} />
        )}
        {view === 'parametres' && (
          <ParametresCabinet api={api} />
        )}
      </div>
      {showSetup && (
        <SetupUserModal
          current={userName}
          onSave={async name => {
            await api.setUserName(name);
            setUserName(name);
            setShowSetup(false);
          }}
          onClose={() => setShowSetup(false)}
          required={!userName}
        />
      )}
      {showReminders && !showSetup && (
        <RemindersModal reminders={reminders} onClose={() => setShowReminders(false)} />
      )}
    </div>
  );
}
