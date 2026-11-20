import { useEffect, useRef, useState } from 'react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const SUGGESTIONS = [
  'What’s driving my growth, and what should I focus on next?',
  'Which city should I target first?',
  'How are my fans reacting to my latest release?',
];

export default function Conversation({ artistId, name }: { artistId: string; name: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [msgs, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(next);
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
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      setMsgs([...next, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.', error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page chat">
      <div className="topbar">
        <div className="crumbs">Workspace&nbsp;&nbsp;/&nbsp;&nbsp;Conversation</div>
      </div>
      <h1 className="page-title">Ask me anything about {name}</h1>
      <p className="page-sub">Ask about streams, fans and releases. Answers use demo data for {name}.</p>

      <div className="chat-log" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}${m.error ? ' err' : ''}`}>
            {m.content.split('\n').map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        ))}
        {busy && <div className="bubble assistant typing">Thinking…</div>}
        <div ref={endRef} />
      </div>

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
          ask(input);
        }}
      >
        <input value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your music…" aria-label="Your question" />
        <button className="btn-solid" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
