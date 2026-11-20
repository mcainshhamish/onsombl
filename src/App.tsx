import { useEffect, useState } from 'react';
import { PERSONAS } from './data';
import Conversation from './components/Conversation';
import { DataError, loadArtistData, type ArtistData } from './artistData';
import Sidebar, { type View } from './components/Sidebar';
import ProjectBoard from './components/ProjectBoard';
import Analytics from './components/Analytics';
import Modal from './components/Modal';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ArtistData; id: string };

export default function App() {
  const [view, setView] = useState<View>('projects');
  const [personaId, setPersonaId] = useState('maya');
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [autoAsk, setAutoAsk] = useState<{ q: string; n: number } | null>(null);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    loadArtistData(persona.id)
      .then((data) => {
        if (cancelled) return;
        setConnected(Object.fromEntries(data.accounts.map((a) => [a.name, a.connected])));
        setLoad({ status: 'ready', data, id: persona.id });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoad({ status: 'error', message: e instanceof DataError ? e.message : 'Something went wrong while reading the data files.' });
      });
    return () => {
      cancelled = true;
    };
  }, [persona.id]);

  const open = () => setAccountsOpen(true);
  const data = load.status === 'ready' ? load.data : null;
  const platformCount = data ? data.accounts.filter((a) => connected[a.name] ?? a.connected).length : 0;

  return (
    <div className="app">
      <Sidebar
        view={view}
        onView={setView}
        onAsk={(q) => {
          setAutoAsk({ q, n: Date.now() });
          setView('conversation');
        }}
        persona={persona}
        onPersona={setPersonaId}
        onAddAccounts={open}
        platformCount={platformCount}
        documentCount={data?.overview.indexed_documents ?? '–'}
        lastSynced={data?.overview.last_synced.replace(/^Synced /, '') ?? ''}
      />
      <main className="main">
        {load.status === 'loading' && <div className="page status-note">Loading {persona.name}’s data…</div>}
        {load.status === 'error' && (
          <div className="page">
            <div className="data-error" role="alert">
              <strong>We couldn’t read the data files for {persona.name}.</strong>
              <p>{load.message}</p>
              <p className="muted">Fix the file in <code>data/{persona.id}/</code> and refresh the page.</p>
            </div>
          </div>
        )}
        {data && view === 'projects' && <ProjectBoard key={persona.id} data={data} personaId={persona.id} onAddAccounts={open} />}
        {data && view === 'analytics' && <Analytics data={data} name={persona.name} connected={connected} onAddAccounts={open} />}
        {data && view === 'conversation' && <Conversation key={persona.id} artistId={persona.id} name={persona.name} autoAsk={autoAsk} />}
      </main>

      {accountsOpen && data && (
        <Modal title="Add your music accounts" onClose={() => setAccountsOpen(false)}>
          <p className="modal-text">Connect the platforms ensemble should learn from. This is a demo, so nothing is actually linked.</p>
          <ul className="account-list">
            {data.accounts.map((a) => (
              <li key={a.name}>
                <div>
                  <div className="row-title">{a.name}</div>
                  <div className="row-sub">{a.detail}</div>
                </div>
                <button
                  className={connected[a.name] ? 'btn-soft tiny' : 'btn-solid tiny'}
                  onClick={() => setConnected((c) => ({ ...c, [a.name]: !c[a.name] }))}
                >
                  {connected[a.name] ? 'Connected ✓' : 'Connect'}
                </button>
              </li>
            ))}
          </ul>
          <div className="modal-actions">
            <button className="btn-solid btn-small" onClick={() => setAccountsOpen(false)}>
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
