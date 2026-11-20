import { useEffect, useRef, useState } from 'react';
import { PERSONAS, RECENT_CONVERSATIONS, type Persona } from '../data';
import { AnalyticsIcon, ChevronDown, ConversationIcon, ProjectIcon, SettingsIcon } from './Icons';
import avatarMayaCard from '../assets/avatar-maya-card.png';
import avatarMaya from '../assets/avatar-maya.png';
import avatarDev from '../assets/avatar-dev.png';
import avatarOwls from '../assets/avatar-owls.png';

export type View = 'conversation' | 'analytics' | 'projects';

const AVATARS: Record<string, string> = { maya: avatarMaya, dev: avatarDev, owls: avatarOwls };

interface Props {
  view: View;
  onView: (v: View) => void;
  persona: Persona;
  onPersona: (id: string) => void;
  onAddAccounts: () => void;
  platformCount: number;
  documentCount: string;
  lastSynced: string;
}

const NAV: { id: View; label: string; Icon: typeof ConversationIcon }[] = [
  { id: 'conversation', label: 'Conversation', Icon: ConversationIcon },
  { id: 'analytics', label: 'Analytics & overview', Icon: AnalyticsIcon },
  { id: 'projects', label: 'Project management', Icon: ProjectIcon },
];

export default function Sidebar({ view, onView, persona, onPersona, onAddAccounts, platformCount, documentCount, lastSynced }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const pick = (id: string) => {
    onPersona(id);
    setMenuOpen(false);
  };

  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-top">
        <div className="brand">ensemble</div>
        <div className="tagline">MUSIC INTELLIGENCE</div>
        <div className="side-label" style={{ top: 90 }}>
          SWITCH ARTIST · TRY A PERSONA
        </div>

        <div className="artist-card" ref={menuRef}>
          <img className="artist-avatar" src={avatarMayaCard} alt="" />
          <div className="artist-name">{persona.name}</div>
          <div className="artist-kind">{persona.kind}</div>
          <button className="switch-pill" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
            Switch
            <ChevronDown />
          </button>
          {menuOpen && (
            <div className="persona-menu" role="menu">
              {PERSONAS.map((p) => (
                <button key={p.id} role="menuitem" className={p.id === persona.id ? 'on' : ''} onClick={() => pick(p.id)}>
                  {p.name}
                  <span>{p.kind}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="persona-row">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              className={`persona-avatar ${p.id}${p.id === persona.id ? ' selected' : ''}`}
              onClick={() => pick(p.id)}
              aria-label={`Switch to ${p.name}`}
              aria-pressed={p.id === persona.id}
            >
              <img src={AVATARS[p.id]} alt="" />
            </button>
          ))}
          <button className="persona-add" onClick={() => setMenuOpen(true)} aria-label="Try a persona">
            +
          </button>
          <span className="persona-hint">Try a persona</span>
        </div>

        {NAV.map(({ id, label, Icon }, i) => (
          <button
            key={id}
            className={`nav-item${view === id ? ' active' : ''}`}
            style={{ top: 244 + i * 46 }}
            onClick={() => onView(id)}
            aria-current={view === id ? 'page' : undefined}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}

        <div className="side-label" style={{ top: 419, left: 28 }}>
          RECENT CONVERSATIONS
        </div>
        {RECENT_CONVERSATIONS.map((c, i) => (
          <button key={c} className="side-link" style={{ top: 447 + i * 38 }} onClick={() => onView('conversation')}>
            {c}
          </button>
        ))}

        <div className="side-label" style={{ top: 652, left: 28 }}>
          YOUR KNOWLEDGE
        </div>
        <div className="side-text" style={{ top: 685 }}>
          {platformCount} music platforms
        </div>
        <div className="side-text" style={{ top: 714 }}>
          {documentCount} indexed documents
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="sync-box">
          <div className="sync-status">●&nbsp;&nbsp;Knowledge is up to date</div>
          <div className="sync-time">Last synced {lastSynced}</div>
          <button className="btn-solid sync-btn" onClick={onAddAccounts}>
            +&nbsp;&nbsp;Add your music accounts
          </button>
        </div>
        <div className="account-divider" />
        <div className="account-row">
          <div>
            <div className="account-name">{persona.possessive}</div>
            <div className="account-sub">Demo workspace · Example data</div>
          </div>
          <button className="icon-btn" aria-label="Settings">
            <SettingsIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
