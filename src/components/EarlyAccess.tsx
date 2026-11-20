import Modal from './Modal';

export default function EarlyAccess({ source = 'signup', onClose }: { source?: string; onClose: () => void }) {
  return (
    <Modal title="Sign up for free" onClose={onClose}>
      <p className="modal-text">onsombl is in early access. Leave your details and we’ll invite you when accounts open.</p>
      <iframe
        className="tally-frame"
        src={`https://tally.so/embed/q5RZj2?hideTitle=1&transparentBackground=1&dynamicHeight=0&source=${encodeURIComponent(source)}`}
        title="Early access sign-up"
        loading="lazy"
      />
      <div className="modal-actions">
        <button type="button" className="btn-soft light" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
