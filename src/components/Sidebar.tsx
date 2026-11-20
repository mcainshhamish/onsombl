import { useEffect, useRef, useState } from 'react';
import { PERSONAS, type Persona } from '../data';
import { AnalyticsIcon, ChevronDown, ConversationIcon, GuideIcon, ProjectIcon, SettingsIcon } from './Icons';
import avatarMayaCard from '../assets/avatar-maya-card.png';
import avatarMaya from '../assets/avatar-maya.png';
import avatarDev from '../assets/avatar-dev.png';
import avatarOwls from '../assets/avatar-owls.png';

export type View = 'conversation' | 'analytics' | 'projects' | 'guide';

const AVATARS: Record<string, string> = { maya: avatarMaya, dev: avatarDev, owls: avatarOwls };

interface Props {
  open: boolean;
  onClose: () => void;
  view: View;
  onView: (v: View) => void;
  persona: Persona;
  onPersona: (id: string) => void;
  onAddAccounts: () => void;
  onSignup: () => void;
  onAsk: (question: string) => void;
  suggestions: string[];
  platformCount: number;
  documentCount: string;
  lastSynced: string;
}

const NAV: { id: View; label: string; Icon: typeof ConversationIcon }[] = [
  { id: 'conversation', label: 'Chat', Icon: ConversationIcon },
  { id: 'analytics', label: 'My audience', Icon: AnalyticsIcon },
  { id: 'projects', label: 'Project management', Icon: ProjectIcon },
  { id: 'guide', label: 'Guide', Icon: GuideIcon },
];

export default function Sidebar({ open, onClose, view, onView, persona, onPersona, onAddAccounts, onSignup, onAsk, suggestions, platformCount, documentCount, lastSynced }: Props) {
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
    <aside className={`sidebar sb${open ? ' open' : ''}`} aria-label="Workspace navigation">
      <div className="sb-head">
        <div className="sb-brand">onsombl</div>
        <div className="sb-tagline">MUSIC INTELLIGENCE</div>
      </div>

      <div className="sb-label">DEMO ARTISTS</div>
      <div className="sb-card" ref={menuRef}>
        <img className="sb-card-avatar" src={avatarMayaCard} alt="" />
        <div className="sb-card-text">
          <div className="sb-card-name">{persona.name}</div>
          <div className="sb-card-kind">{persona.kind}</div>
        </div>
        <button className="switch-pill sb-switch" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
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
            <button
              role="menuitem"
              className="menu-cta"
              onClick={() => {
                setMenuOpen(false);
                onSignup();
              }}
            >
              + Add your account
              <span>Sign up for early access</span>
            </button>
          </div>
        )}
      </div>

      <div className="sb-personas">
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
        <button className="persona-cta" onClick={onSignup}>
          <span className="persona-add">+</span>
          <span className="persona-hint">Add your account</span>
        </button>
      </div>

      <nav className="sb-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={`sb-nav-item${view === id ? ' active' : ''}`} onClick={() => {
              onView(id);
              onClose();
            }} aria-current={view === id ? 'page' : undefined}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sb-label sb-recent-label">SUGGESTED QUESTIONS</div>
      <div className="sb-recents">
        {suggestions.map((c) => (
          <button key={c} title={c} className="sb-link" onClick={() => {
              onAsk(c);
              onClose();
            }}>
            {c}
          </button>
        ))}
      </div>

      <div className="sb-foot">
        <div className="sb-know">
          {platformCount} platforms · {documentCount} documents · synced {lastSynced}
        </div>
        <button className="btn-solid sb-add" onClick={onAddAccounts}>
          +&nbsp;&nbsp;Add your music accounts
        </button>
        <div className="sb-account">
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
