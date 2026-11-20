import { useState } from 'react';
import type { ArtistData } from '../artistData';

interface Props {
  data: ArtistData;
  name: string;
  onAsk: (question: string) => void;
}

export default function Collaborate({ data, name, onAsk }: Props) {
  const [role, setRole] = useState('All');
  const roles = ['All', ...Array.from(new Set(data.scene.map((p) => p.role)))];
  const list = data.scene
    .filter((p) => role === 'All' || p.role === role)
    .sort((a, b) => b.overlap - a.overlap);
  const top = [...data.scene].sort((a, b) => b.overlap - a.overlap)[0];

  return (
    <div className="page">
      <h1 className="page-title">Who to get to know.</h1>
      <p className="page-sub">
        {name} · People and places in your scene, ranked by audience overlap. Demo data with invented names.
      </p>

      {top && (
        <section className="acard collab-top">
          <div className="collab-kicker">Start here</div>
          <h3>{top.name}</h3>
          <p>{top.why}</p>
          <div className="step-actions">
            <button className="link-btn" onClick={() => onAsk(`Draft a short message from me to ${top.name} suggesting we work together.`)}>
              Draft an intro
            </button>
            <button className="link-btn" onClick={() => onAsk(`Who should I get to know in my local scene, and in what order?`)}>
              Ask onsombl for a plan →
            </button>
          </div>
        </section>
      )}

      <div className="collab-filters" role="group" aria-label="Filter by role">
        {roles.map((r) => (
          <button key={r} className={`chip${role === r ? ' on' : ''}`} aria-pressed={role === r} onClick={() => setRole(r)}>
            {r}
          </button>
        ))}
      </div>

      <div className="collab-grid">
        {list.map((p) => (
          <article key={p.name} className="acard collab-card">
            <div className="collab-row">
              <div>
                <h4>{p.name}</h4>
                <div className="muted small">
                  {p.role} · {p.city} · {p.genre}
                </div>
              </div>
              {p.overlap > 0 && (
                <div className="collab-overlap" title={`${p.overlap}% of their listeners also listen to ${name}`}>
                  <strong>{p.overlap}%</strong>
                  <span>audience overlap</span>
                </div>
              )}
            </div>
            {p.overlap > 0 && (
              <div className="collab-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(100, p.overlap * 2)}%` }} />
              </div>
            )}
            <p>{p.why}</p>
            <p className="collab-step">
              <b>First step:</b> {p.firstStep}
            </p>
            <button className="link-btn" onClick={() => onAsk(`Draft a short message from me to ${p.name} (${p.role}, ${p.city}). First step: ${p.firstStep}`)}>
              Draft an intro →
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
