import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

export interface Msg {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
  at: number;
}

const SUGGESTIONS = [
  'What’s driving my growth, and what should I focus on next?',
  'Which city should I target first?',
  'How are my fans reacting to my latest release?',
];

// Shows a freshly arrived reply gradually; older replies appear instantly.
function Reveal({ text, animate }: { text: string; animate: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length);
  const end = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => {
      setN((v) => {
        const next = Math.min(text.length, v + 6);
        if (next >= text.length) window.clearInterval(id);
        return next;
      });
      end.current?.scrollIntoView({ block: 'nearest' });
    }, 20);
    return () => window.clearInterval(id);
  }, [animate, text]);
  return (
    <>
      {text.slice(0, n).split('\n').map((line, j) =>
        line.startsWith('- ') ? (
          <p key={j} className="bullet">{line.slice(2)}</p>
        ) : (
          <p key={j}>{line}</p>
        ),
      )}
      <span ref={end} />
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy-btn"
      aria-label="Copy reply"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          },
          () => undefined,
        );
      }}
    >
      {done ? (
        'Copied'
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
      )}
    </button>
  );
}

interface Props {
  artistId: string;
  name: string;
  msgs: Msg[];
  onMsgs: (m: Msg[]) => void;
  autoAsk?: { q: string; n: number } | null;
}

export type ChatAction =
  | { type: 'add_task'; title: string; category: string; note: string; due: string; priority: string }
  | { type: 'update_task_status'; id: string; status: string };

export default function Conversation({ artistId, name, msgs, onMsgs, autoAsk }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastAuto = useRef(0);
  const first = name.startsWith('The ') ? name : name.split(' ')[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [msgs, busy]);

  useEffect(() => {
    if (autoAsk && autoAsk.n !== lastAuto.current) {
      lastAuto.current = autoAsk.n;
      void ask(autoAsk.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAsk]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: q, at: Date.now() }];
    onMsgs(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          artist: artistId,
          messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) throw new Error('Your session expired. Please refresh the page and try again.');
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      onMsgs([...next, { role: 'assistant', content: data.reply, at: Date.now() }]);
    } catch (e) {
      onMsgs([...next, { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.', error: true, at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page chat">
      <div className="topbar">
        <div className="crumbs">Workspace&nbsp;&nbsp;/&nbsp;&nbsp;Chat</div>
        <div className="topbar-actions">
          <button className="btn-soft light" onClick={() => (msgs.length ? setConfirmNew(true) : undefined)} disabled={!msgs.length}>
            New chat
          </button>
        </div>
      </div>

      {msgs.length === 0 && (
        <div className="chat-intro">
          <h1 className="page-title">Ask me anything about {first}.</h1>
          <p className="page-sub">Ask about streams, fans and releases. Answers use demo data for {name}.</p>
        </div>
      )}

      <div className="chat-log" aria-live="polite">
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="msg user">
              {m.content}
            </div>
          ) : (
            <div key={i} className={`msg assistant${m.error ? ' err' : ''}`}>
              <Reveal text={m.content} animate={!m.error && Date.now() - m.at < 2000} />
              {!m.error && <CopyButton text={m.content} />}
            </div>
          ),
        )}
        {busy && <div className="msg assistant typing">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="chat-dock">
        <div className="chat-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" disabled={busy} onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your music…" aria-label="Your question" />
          <button className="send" type="submit" disabled={busy || !input.trim()} aria-label="Send">
            ↑
          </button>
        </form>
      </div>

      {confirmNew && (
        <Modal title="Clear this chat?" onClose={() => setConfirmNew(false)}>
          <p className="modal-text">This clears the conversation on screen.</p>
          <div className="modal-actions">
            <button className="btn-soft light" onClick={() => setConfirmNew(false)}>
              Cancel
            </button>
            <button
              className="btn-solid btn-small"
              onClick={() => {
                onMsgs([]);
                setConfirmNew(false);
              }}
            >
              Clear chat
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
