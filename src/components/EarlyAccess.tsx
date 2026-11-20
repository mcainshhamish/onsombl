import Modal from './Modal';

export type AccessMode = 'login' | 'signup';

const FORM_ID = 'q5RZj2';

export default function EarlyAccess({ mode, onClose }: { mode: AccessMode; onClose: () => void }) {
  const title = mode === 'login' ? 'Log in' : 'Sign up for free';
  const source = mode === 'login' ? 'login' : 'signup';
  const src = `https://tally.so/embed/${FORM_ID}?hideTitle=1&transparentBackground=1&dynamicHeight=0&source=${source}`;

  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-text">
        {mode === 'login'
          ? 'Accounts aren’t open yet, so there’s nothing to log in to. Leave your email and we’ll let you know when they are.'
          : 'ensemble is in early access. Leave your details and we’ll invite you when accounts open.'}
      </p>
      <iframe className="tally-frame" src={src} title="Early access sign-up" loading="lazy" />
      <div className="modal-actions">
        <button type="button" className="btn-soft light" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
