import { OPTION_LETTERS } from "../../utils/activityFormatters";

export function ActivityPreviewDetailsModal({
  activity,
  questions,
  loading,
  error,
  onClose,
  onOpenActivity,
  onResume,
  canOpenActivity = false,
  getTitle = (item) => item?.name,
  getProfessor = (item) => item?.professor,
  getDiscipline = (item) => item?.disciplina,
}) {
  if (!activity) return null;

  const isClosed = activity?.rawStatus === "encerrado" || activity?.activityStatus === "encerrado";
  const canResumeActivity = Boolean(onResume && activity?.resumeAttempt && !isClosed);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card modal-card-wide">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
              Pré-visualização
            </p>
            <h2 className="modal-title" style={{ marginBottom: 4 }}>
              {getTitle(activity)}
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
              {getProfessor(activity)} · {getDiscipline(activity)}
            </p>
            <div className="activity-preview-meta">
              <span>Prazo: {activity.prazo || "Sem prazo"}</span>
              <span>{activity.limiteTentativas || "Tentativas ilimitadas"}</span>
            </div>
          </div>
          <span className="badge badge-indigo">
            {loading ? "Carregando..." : `${questions.length} questões`}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28, maxHeight: "50vh", overflowY: "auto" }}>
          {error && (
            <div style={{ color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
              {error}
            </div>
          )}
          {!loading && questions.length === 0 && !error && (
            <div style={{ color: "var(--text-3)", fontSize: "0.9rem" }} role="status">
              Nenhuma questão cadastrada.
            </div>
          )}
          {questions.map((question, index) => (
            <div key={question.id ?? index} className="preview-question-item">
              <p className="preview-question-num">
                Questão {index + 1} · {question.type === "multiple" ? "Múltipla escolha" : "Dissertativa"}
              </p>
              <p className="preview-question-text">{question.text}</p>
              {question.type === "multiple" && question.options && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="preview-alt">
                      <span className="preview-alt-letter">
                        {OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1)}
                      </span>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="modal-actions" style={{ marginTop: 0 }}>
          {canResumeActivity ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                onResume(activity.resumeAttempt);
                onClose();
              }}
              disabled={loading}
            >
              Retomar tentativa
            </button>
          ) : canOpenActivity && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onOpenActivity(activity.id);
                onClose();
              }}
              disabled={loading}
            >
              Responder questionario
            </button>
          )}
          <button className="btn btn-outline" style={{ width: "100%" }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
