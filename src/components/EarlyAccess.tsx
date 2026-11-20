import { useState, type FormEvent } from 'react';
import Modal from './Modal';

const ACCOUNTS = ['Spotify', 'Apple Music', 'YouTube', 'Instagram', 'TikTok'];

export type AccessMode = 'login' | 'signup';

export default function EarlyAccess({ mode, onClose }: { mode: AccessMode; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [artist, setArtist] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    const form = e.currentTarget as HTMLFormElement;
    const honeypot = (form.elements.namedItem('bot-field') as HTMLInputElement | null)?.value ?? '';
    const body = new URLSearchParams({
      'form-name': 'early-access',
      'bot-field': honeypot,
      email: email.trim(),
      artist: artist.trim(),
      accounts: picked.join(', '),
      source: mode === 'login' ? 'Log in button' : 'Sign up button',
    });
    try {
      const res = await fetch('/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString() });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const title = mode === 'login' ? 'Log in' : 'Sign up for free';

  return (
    <Modal title={title} onClose={onClose}>
      {status === 'done' ? (
        <>
          <p className="modal-text">Thanks! You’re on the early-access list. We’ll email you when accounts open.</p>
          <div className="modal-actions">
            <button className="btn-solid btn-small" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="access-form">
          <p className="modal-text">
            {mode === 'login'
              ? 'Accounts aren’t open yet, so there’s nothing to log in to. Leave your email and we’ll let you know when they are.'
              : 'ensemble is in early access. Leave your details and we’ll invite you when accounts open.'}
          </p>
          <label className="field">
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label className="field">
            <span>Artist or band name</span>
            <input type="text" required value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="e.g. Maya Rivers" />
          </label>
          <fieldset className="field">
            <legend>Which music accounts would you connect? (optional)</legend>
            <div className="checks">
              {ACCOUNTS.map((a) => (
                <label key={a}>
                  <input
                    type="checkbox"
                    checked={picked.includes(a)}
                    onChange={(e) => setPicked((p) => (e.target.checked ? [...p, a] : p.filter((x) => x !== a)))}
                  />
                  {a}
                </label>
              ))}
            </div>
          </fieldset>
          <input name="bot-field" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />
          {status === 'error' && <p className="form-error">Something went wrong sending that. Please try again.</p>}
          <p className="form-note">We’ll only use your email to contact you about early access.</p>
          <div className="modal-actions">
            <button type="button" className="btn-soft light" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-solid btn-small" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Join early access'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
