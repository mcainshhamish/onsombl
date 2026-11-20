import { useEffect, useState } from 'react';
import { PERSONAS } from './data';
import Conversation from './components/Conversation';
import { DataError, loadArtistData, type ArtistData } from './artistData';
import Sidebar, { type View } from './components/Sidebar';
import ProjectBoard from './components/ProjectBoard';
import Analytics from './components/Analytics';
import Modal from './components/Modal';
import Guide from './components/Guide';
import EarlyAccess, { type AccessMode } from './components/EarlyAccess';
import type { Msg, ChatAction } from './components/Conversation';
import type { Task, Status } from './data';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ArtistData; id: string };

export default function App() {
  const [view, setView] = useState<View>('conversation');
  const [personaId, setPersonaId] = useState('maya');
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [access, setAccess] = useState<AccessMode | null>(null);
  const [autoAsk, setAutoAsk] = useState<{ q: string; n: number } | null>(null);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  const recentKey = `ensemble.recent.v1.${personaId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(recentKey);
      const list = raw ? JSON.parse(raw) : [];
      setRecents(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(0, 20) : []);
    } catch {
      setRecents([]);
    }
  }, [recentKey]);

  function addRecent(q: string) {
    setRecents((prev) => {
      const next = [q, ...prev.filter((x) => x !== q)].slice(0, 20);
      try {
        localStorage.setItem(recentKey, JSON.stringify(next));
      } catch {
        /* storage unavailable: keep in memory only */
      }
      return next;
    });
  }
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

  const taskKey = `ensemble.tasks.v2.${personaId}`;
  function readTasks(): Task[] {
    try {
      const raw = localStorage.getItem(taskKey);
      if (raw) return JSON.parse(raw) as Task[];
    } catch {
      /* fall through to the CSV tasks */
    }
    return load.status === 'ready' ? load.data.tasks : [];
  }
  function applyActions(actions: ChatAction[]) {
    let tasks = readTasks();
    const assignee = persona.name.startsWith('The ') ? persona.name.slice(4) : persona.name.split(' ')[0];
    for (const a of actions) {
      if (a.type === 'add_task') {
        let n = tasks.length + 1;
        while (tasks.some((t) => t.id === `t${n}`)) n++;
        const t: Task = { id: `t${n}`, title: a.title, category: a.category, note: a.note, assignee, due: a.due, status: 'todo' };
        if (a.priority === 'High') t.priority = 'High';
        tasks = [...tasks, t];
      } else if (a.type === 'update_task_status') {
        tasks = tasks.map((t) => (t.id === a.id ? { ...t, status: a.status as Status } : t));
      }
    }
    try {
      localStorage.setItem(taskKey, JSON.stringify(tasks));
    } catch {
      /* storage unavailable */
    }
  }

  const open = () => setAccountsOpen(true);
  const data = load.status === 'ready' ? load.data : null;
  const platformCount = data ? data.accounts.filter((a) => connected[a.name] ?? a.connected).length : 0;

  return (
    <div className="app">
      <Sidebar
        view={view}
        onView={setView}
        recents={recents}
        onAsk={ask}
        persona={persona}
        onPersona={setPersonaId}
        onAddAccounts={open}
        platformCount={platformCount}
        documentCount={data?.overview.indexed_documents ?? '–'}
        lastSynced={data?.overview.last_synced.replace(/^Synced /, '') ?? ''}
      />
      <main className="main">
        <header className="app-header">
          <button className="btn-soft light" onClick={() => setAccess('login')}>
            Log in
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
        {data && view === 'projects' && <ProjectBoard key={persona.id} data={data} personaId={persona.id} onAddAccounts={open} />}
        {data && view === 'analytics' && <Analytics data={data} name={persona.name} connected={connected} onAddAccounts={open} />}
        {data && view === 'guide' && <Guide data={data} name={persona.name} onAsk={ask} />}
        {data && view === 'conversation' && <Conversation
            key={persona.id}
            artistId={persona.id}
            name={persona.name}
            msgs={chats[persona.id] ?? []}
            onMsgs={(m) => setChats((c) => ({ ...c, [persona.id]: m }))}
            autoAsk={autoAsk}
            onAsked={addRecent}
            getTasks={readTasks}
            onActions={applyActions}
            onOpenBoard={() => setView('projects')}
          />}
      </main>

      {access && <EarlyAccess mode={access} onClose={() => setAccess(null)} />}

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
