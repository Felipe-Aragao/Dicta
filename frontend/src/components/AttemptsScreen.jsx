import { useCallback, useEffect, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { getAttemptPdf, listAnswers, listAttempts } from "../services/attemptService";
import { downloadBlob, getFilenameFromDisposition } from "../utils/download";

// Formata data e hora
const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
};

// Define o nome exibido da tentativa
const getAttemptLabel = (attempt) => {
  if (attempt?.visitor_name) return `Visitante: ${attempt.visitor_name}`;
  if (attempt?.aluno_name) return attempt.aluno_name;
  return "Aluno";
};

// Define badge de status
const getStatusMeta = (status) => {
  if (status === "concluido") return { label: "Concluido", className: "badge badge-green" };
  if (status === "em progresso") return { label: "Em progresso", className: "badge badge-zinc" };
  return { label: status || "-", className: "badge badge-zinc" };
};

// Tela de tentativas
export function AttemptsScreen({ activity, onBack, onResume, alunoId }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  // Carrega tentativas da atividade
  const fetchAttempts = useCallback(async () => {
    if (!activity?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await listAttempts({ activityId: activity.id, alunoId, limit: 200 });
      setAttempts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message ?? "Falha ao carregar tentativas.");
    } finally {
      setLoading(false);
    }
  }, [activity?.id, alunoId]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  // Carrega respostas da tentativa
  const fetchAnswers = useCallback(async (attemptId) => {
    if (!attemptId) return;
    setAnswersLoading(true);
    setAnswersError("");
    try {
      const data = await listAnswers(attemptId);
      setAnswers(Array.isArray(data) ? data : []);
    } catch (err) {
      setAnswersError(err?.message ?? "Falha ao carregar respostas.");
      setAnswers([]);
    } finally {
      setAnswersLoading(false);
    }
  }, []);

  // Abre modal de respostas
  const handleOpenAttempt = useCallback((attempt) => {
    setSelectedAttempt(attempt);
    fetchAnswers(attempt?.id);
  }, [fetchAnswers]);

  // Download do PDF da tentativa
  const downloadAttemptPdf = useCallback(async (attempt) => {
    if (!attempt?.id) return;
    setDownloadingId(attempt.id);
    setError("");
    try {
      const { blob, headers } = await getAttemptPdf(attempt.id, "Falha ao baixar PDF.");
      const filename = getFilenameFromDisposition(headers.get("content-disposition"), "respostas.pdf");
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err?.message ?? "Falha ao baixar PDF.");
      setTimeout(() => setError(""), 3200);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Formata texto da resposta
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

  // Guarda para atividade vazia
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
                  <th scope="col" style={{ width: 60 }}>PDF</th>
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
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                      <button
                        className="icon-btn"
                        onClick={() => downloadAttemptPdf(attempt)}
                        aria-label="Baixar PDF da tentativa"
                        title="Baixar PDF"
                        disabled={downloadingId === attempt.id}
                      >
                        <DownloadSimple size={14} weight="regular" />
                      </button>
                    </td>
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

      {/* Modal de respostas */}
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
              
              {/*Só aparece se estiver em progresso */}
              {selectedAttempt.status === "em progresso" && onResume && alunoId && selectedAttempt.aluno_id === alunoId && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setSelectedAttempt(null); // Fecha o modal
                    onResume(selectedAttempt); // Dispara a função do App.jsx
                  }}
                >
                  Continuar Tentativa
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
