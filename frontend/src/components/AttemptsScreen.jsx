import { useCallback, useEffect, useState } from "react";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
};

const getAttemptLabel = (attempt) => {
  if (attempt?.visitor_name) return `Visitante: ${attempt.visitor_name}`;
  if (attempt?.aluno_name) return attempt.aluno_name;
  return "Aluno";
};

const getStatusMeta = (status) => {
  if (status === "concluido") return { label: "Concluido", className: "badge badge-green" };
  if (status === "em progresso") return { label: "Em progresso", className: "badge badge-zinc" };
  return { label: status || "-", className: "badge badge-zinc" };
};

export function AttemptsScreen({ activity, apiBaseUrl, onBack }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState("");

  const fetchAttempts = useCallback(async () => {
    if (!activity?.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/attempts?activity_id=${activity.id}&limit=200`);
      if (!response.ok) throw new Error("Falha ao carregar tentativas.");
      const data = await response.json();
      setAttempts(data);
    } catch (err) {
      setError(err?.message ?? "Falha ao carregar tentativas.");
    } finally {
      setLoading(false);
    }
  }, [activity?.id, apiBaseUrl]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const fetchAnswers = useCallback(async (attemptId) => {
    if (!attemptId) return;
    setAnswersLoading(true);
    setAnswersError("");
    try {
      const response = await fetch(`${apiBaseUrl}/answers?attempt_id=${attemptId}&limit=200`);
      if (!response.ok) throw new Error("Falha ao carregar respostas.");
      const data = await response.json();
      setAnswers(Array.isArray(data) ? data : []);
    } catch (err) {
      setAnswersError(err?.message ?? "Falha ao carregar respostas.");
      setAnswers([]);
    } finally {
      setAnswersLoading(false);
    }
  }, [apiBaseUrl]);

  const handleOpenAttempt = useCallback((attempt) => {
    setSelectedAttempt(attempt);
    fetchAnswers(attempt?.id);
  }, [fetchAnswers]);

  const formatAnswerText = (answer) => {
    if (answer?.question_type === "multiple") {
      if (answer?.chosen_letter && answer?.response_text) {
        return `${answer.chosen_letter} - ${answer.response_text}`;
      }
      if (answer?.response_text) return answer.response_text;
      if (answer?.chosen_letter) return answer.chosen_letter;
    }
    return answer?.response_text || "-";
  };

  if (!activity) {
    return (
      <div className="page page-anim">
        <div className="page-narrow">
          <div className="card" role="status" aria-live="polite">
            Nenhuma atividade selecionada.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-anim">
      <div className="page-wide">
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Tentativas</h2>
            <p className="section-sub">{activity.name} · {activity.discipline || "Geral"}</p>
          </div>
          <div className="section-header-right">
            <button className="btn btn-outline" onClick={onBack}>Voltar</button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {error && (
            <div style={{ padding: "14px 22px", color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
              {error}
            </div>
          )}
          {!loading && attempts.length > 0 ? (
            <table className="data-table" role="table" aria-label="Lista de tentativas">
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">Status</th>
                  <th scope="col">Iniciado em</th>
                  <th scope="col">Enviado em</th>
                  <th scope="col">Ultima atualizacao</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr
                    key={attempt.id}
                    className="data-row"
                    tabIndex={0}
                    onClick={() => handleOpenAttempt(attempt)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleOpenAttempt(attempt);
                    }}
                  >
                    <td>{getAttemptLabel(attempt)}</td>
                    <td>
                      <span className={getStatusMeta(attempt.status).className}>
                        {getStatusMeta(attempt.status).label}
                      </span>
                    </td>
                    <td>{formatDateTime(attempt.started_at)}</td>
                    <td>{formatDateTime(attempt.submitted_at)}</td>
                    <td>{formatDateTime(attempt.last_saved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !loading ? (
            <div style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
              Nenhuma tentativa registrada ainda.
            </div>
          ) : (
            <div style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
              Carregando tentativas...
            </div>
          )}
        </div>
      </div>

      {selectedAttempt && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAttempt(null);
          }}
        >
          <div className="modal-card modal-card-wide">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
                  Respostas da tentativa
                </p>
                <h2 className="modal-title" style={{ marginBottom: 4 }}>
                  {getAttemptLabel(selectedAttempt)}
                </h2>
                <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
                  {formatDateTime(selectedAttempt.started_at)} · {getStatusMeta(selectedAttempt.status).label}
                </p>
              </div>
              <span className={getStatusMeta(selectedAttempt.status).className}>
                {getStatusMeta(selectedAttempt.status).label}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18, maxHeight: "50vh", overflowY: "auto" }}>
              {answersError && (
                <div style={{ color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
                  {answersError}
                </div>
              )}
              {answersLoading && (
                <div style={{ color: "var(--text-3)", fontSize: "0.9rem" }} role="status">
                  Carregando respostas...
                </div>
              )}
              {!answersLoading && !answersError && answers.length === 0 && (
                <div style={{ color: "var(--text-3)", fontSize: "0.9rem" }} role="status">
                  Nenhuma resposta registrada para esta tentativa.
                </div>
              )}
              {!answersLoading && answers.length > 0 && answers.map((answer, index) => (
                <div key={answer.id ?? index} className="preview-question-item">
                  <p className="preview-question-num">
                    Questao {index + 1} · {answer?.question_type === "multiple" ? "Multipla escolha" : "Dissertativa"}
                  </p>
                  <p style={{ marginBottom: 8, color: "var(--text-2)", fontSize: "0.96rem" }}>
                    {answer?.question_prompt || "Questao sem enunciado."}
                  </p>
                  <div className="card" style={{ padding: "12px 14px", background: "var(--zinc-100)", borderColor: "var(--zinc-200)" }}>
                    <strong style={{ display: "block", marginBottom: 4, fontSize: "0.82rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                      Resposta
                    </strong>
                    <span>{formatAnswerText(answer)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedAttempt(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
