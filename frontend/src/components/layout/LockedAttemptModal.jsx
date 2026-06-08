export function LockedAttemptModal({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-card">
        <h2 className="modal-title" style={{ marginBottom: 10 }}>Tentativa concluida</h2>
        <p style={{ color: "var(--text-3)", marginBottom: 18 }}>
          {notice}
        </p>
        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={onClose}
          >
            Voltar ao inicio
          </button>
        </div>
      </div>
    </div>
  );
}
