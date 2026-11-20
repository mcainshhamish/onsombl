import { useEffect, useState } from 'react';
import { PERSONAS } from './data';
import Conversation from './components/Conversation';
import { DataError, loadArtistData, type ArtistData } from './artistData';
import Sidebar, { type View } from './components/Sidebar';
import Analytics from './components/Analytics';
import Modal from './components/Modal';
import Guide from './components/Guide';
import Collaborate from './components/Collaborate';
import EarlyAccess from './components/EarlyAccess';
import type { Msg } from './components/Conversation';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ArtistData; id: string };

export default function App() {
  const [view, setView] = useState<View>('conversation');
  const [personaId, setPersonaId] = useState('maya');
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [access, setAccess] = useState<string | null>(null);
  const [autoAsk, setAutoAsk] = useState<{ q: string; n: number } | null>(null);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];

  const hasChat = Object.values(chats).some((m) => m.length > 0);
  useEffect(() => {
    if (!hasChat) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChat]);

  const ask = (q: string) => {
    setAutoAsk({ q, n: Date.now() });
    setView('conversation');
  };

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
  const suggestions: string[] = data
    ? [
        `Why is ${[...data.tracks].sort((x, y) => y.growth - x.growth)[0].track} growing fastest?`,
        'Which city should I target first?',
        `How can I lift saves on ${[...data.releases].sort((x, y) => x.saveRate - y.saveRate)[0].release}?`,
        'How are my fans reacting to my latest release?',
        'Which platform should I focus on?',
        `Which age group should my next campaign target?`,
      ]
    : [];
  const platformCount = data ? data.accounts.filter((a) => connected[a.name] ?? a.connected).length : 0;

  return (
    <div className="app">
      <Sidebar
        view={view}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onView={setView}
        suggestions={suggestions}
        onAsk={ask}
        persona={persona}
        onPersona={setPersonaId}
        onAddAccounts={open}
        onSignup={() => setAccess('signup')}
        platformCount={platformCount}
        documentCount={data?.overview.indexed_documents ?? '–'}
      />
      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
      <main className="main">
        <header className="app-header">
          <button className="menu-btn" aria-label="Open menu" onClick={() => setNavOpen(true)}>
            <span />
            <span />
            <span />
          </button>
          <button className="btn-solid btn-small" onClick={() => setAccess('signup')}>
            Sign up for free
          </button>
        </header>
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
        {data && view === 'analytics' && <Analytics data={data} name={persona.name} connected={connected} onAddAccounts={open} onAsk={ask} onSignup={setAccess} />}
        {data && view === 'collaborate' && <Collaborate data={data} name={persona.name} onAsk={ask} />}
        {data && view === 'guide' && <Guide data={data} name={persona.name} onAsk={ask} />}
        {data && view === 'conversation' && <Conversation
            key={persona.id}
            artistId={persona.id}
            name={persona.name}
            msgs={chats[persona.id] ?? []}
            onMsgs={(m) => setChats((c) => ({ ...c, [persona.id]: m }))}
            autoAsk={autoAsk}
          />}
      </main>

      {access && <EarlyAccess source={access} onClose={() => setAccess(null)} />}

      {accountsOpen && data && (
        <Modal title="Add your music accounts" onClose={() => setAccountsOpen(false)}>
          <p className="modal-text">Connect the platforms onsombl should learn from. This is a demo, so nothing is actually linked.</p>
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
