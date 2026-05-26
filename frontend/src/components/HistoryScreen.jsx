import { useCallback, useEffect, useState } from "react";
import { DownloadSimple, ArrowRight, ClockCounterClockwise, Plus, User, MagnifyingGlass } from "@phosphor-icons/react";
import { DEMO_QUESTIONS } from "../data/demoData";
import { normalizeQuestions } from "../utils/questions";
import { ActivityCreateModal, ActivityPreviewModal } from "./ActivityModals";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Formata data para exibicao
const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

// Normaliza dados de atividade
const normalizeActivity = (activity, ownerName) => {
  const statusMap = {
    ativo: "Ativo",
    encerrado: "Encerrado",
    rascunho: "Rascunho",
  };

  return {
    id: activity.id,
    name: activity.name || "Atividade",
    professor: ownerName || "Aluno",
    disciplina: activity.discipline || "Geral",
    criadoem: formatDate(activity.created_at),
    status: statusMap[activity.status] || "Ativo",
  };
};

// Menu lateral do aluno
function Sidebar({ username, onLogout }) {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <div className="sidebar-avatar" aria-hidden="true">
        <User size={30} weight="regular" color="white" />
      </div>
      <p className="sidebar-welcome">Bem vindo,<br />{username || "Aluno"}!</p>
      <p className="sidebar-role">Aluno</p>
      <button className="sidebar-logout" onClick={onLogout} aria-label="Sair da conta">
        Sair
      </button>
    </aside>
  );
}

// Tela de historico do aluno
export function HistoryScreen({ onNewQuestionnaire, username, onLogout, onOpenActivity, onOpenAttempts, userId, apiBaseUrl }) {
  const [search, setSearch] = useState("");
  const [viewingActivity, setViewingActivity] = useState(null);
  const [viewingQuestions, setViewingQuestions] = useState([]);
  const [viewingQuestionsLoading, setViewingQuestionsLoading] = useState(false);
  const [viewingQuestionsError, setViewingQuestionsError] = useState("");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/activities?owner_id=${userId}`);
      if (!response.ok) throw new Error("Falha ao carregar atividades.");
      const data = await response.json();
      setActivities(data.map((item) => normalizeActivity(item, username)));
    } catch (err) {
      setError(err?.message ?? "Falha ao carregar atividades.");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, userId, username]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);


  const fetchQuestionsForActivity = useCallback(async (activityId) => {
    if (!activityId) return;
    setViewingQuestionsLoading(true);
    setViewingQuestionsError("");
    try {
      const response = await fetch(`${apiBaseUrl}/questions?activity_id=${activityId}`);
      if (!response.ok) throw new Error("Falha ao carregar questoes.");
      const data = await response.json();
      setViewingQuestions(normalizeQuestions(data));
    } catch (err) {
      setViewingQuestionsError(err?.message ?? "Falha ao carregar questoes.");
      setViewingQuestions([]);
    } finally {
      setViewingQuestionsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!viewingActivity?.id) {
      setViewingQuestions([]);
      setViewingQuestionsError("");
      return;
    }
    fetchQuestionsForActivity(viewingActivity.id);
  }, [fetchQuestionsForActivity, viewingActivity?.id]);

  const handlePreview = (data) => {
    setShowModal(false);
    setPreviewData(data);
  };

  const createQuestionsForActivity = useCallback(async (activityId, questions = []) => {
    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      const prompt = (question?.text ?? "").trim();
      if (!prompt) continue;

      const questionResponse = await fetch(`${apiBaseUrl}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          position: i + 1,
          type: question?.type === "multiple" ? "multiple" : "open",
          prompt,
        }),
      });

      if (!questionResponse.ok) {
        let detail = "Falha ao salvar questao.";
        try {
          const data = await questionResponse.json();
          if (data?.detail) detail = data.detail;
        } catch {
          
        }
        throw new Error(detail);
      }

      const createdQuestion = await questionResponse.json();

      if (question?.type === "multiple" && Array.isArray(question?.options)) {
        for (let j = 0; j < question.options.length; j += 1) {
          const optionText = (question.options[j] ?? "").trim();
          if (!optionText) continue;

          const optionResponse = await fetch(`${apiBaseUrl}/question-options`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question_id: createdQuestion.id,
              letter: OPTION_LETTERS[j] ?? String(j + 1),
              text: optionText,
            }),
          });

          if (!optionResponse.ok) {
            let detail = "Falha ao salvar alternativa.";
            try {
              const data = await optionResponse.json();
              if (data?.detail) detail = data.detail;
            } catch {
              
            }
            throw new Error(detail);
          }
        }
      }
    }
  }, [apiBaseUrl]);

  const handleConfirm = async (editedQuestions) => {
    if (!previewData || !userId) return;
    setSaving(true);
    let createdActivity = null;
    try {
      const response = await fetch(`${apiBaseUrl}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: userId,
          name: previewData.name,
          discipline: previewData.discipline,
          status: "ativo",
          is_shareable: true,
        }),
      });

      if (!response.ok) {
        let detail = "Falha ao criar atividade.";
        try {
          const data = await response.json();
          if (data?.detail) detail = data.detail;
        } catch {
          
        }
        throw new Error(detail);
      }

      createdActivity = await response.json();
      await createQuestionsForActivity(createdActivity.id, editedQuestions ?? DEMO_QUESTIONS);
      setActivities((prev) => [normalizeActivity(createdActivity, username), ...prev]);
      setPreviewData(null);
    } catch (err) {
      if (createdActivity?.id) {
        try {
          await fetch(`${apiBaseUrl}/activities/${createdActivity.id}`, { method: "DELETE" });
        } catch {
          
        }
      }
      setError(err?.message ?? "Falha ao criar atividade.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = activities.filter((h) => {
    const s = search.toLowerCase();
    // Busca ampla em todos os campos
    return (
      (h.name || "").toLowerCase().includes(s) ||
      (h.professor || "Prof. Ana Lima").toLowerCase().includes(s) ||
      (h.disciplina || "Prog. Orientada a Objetos").toLowerCase().includes(s) ||
      (h.criadoem || "12/05/2026").toLowerCase().includes(s)
    );
  });

  return (
    <div className="auth-layout page-anim">
      <Sidebar username={username} onLogout={onLogout} />

      <div className="sidebar-main">
        <div className="page">
          <div className="page-wide">

            {/* Cabecalho e busca */}
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Histórico de Questionários</h2>
                <p className="section-sub">Atividades respondidas</p>
              </div>

              <div className="section-header-right" style={{ flex: 1, justifyContent: "flex-end" }}>
                <div className="search-wrap" role="search">
                  <span className="search-icon" aria-hidden="true">
                    <MagnifyingGlass size={17} weight="regular" />
                  </span>
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Buscar atividade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar no histórico"
                  />
                </div>
                
                <div style={{ display: "flex", gap: "10px", marginLeft: "10px" }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => alert("Exportar PDF — integração futura")}
                    aria-label="Exportar histórico como PDF"
                  >
                    <DownloadSimple size={16} weight="regular" />
                    Exportar PDF
                  </button>
                  
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowModal(true)}
                    aria-label="Criar nova atividade"
                  >
                    <Plus size={16} weight="bold" />
                    Criar Atividade
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={onNewQuestionnaire}
                    aria-label="Responder novo questionário"
                  >
                    <Plus size={16} weight="bold" />
                    Responder Atividade
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {error && (
                <div style={{ padding: "14px 22px", color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
                  {error}
                </div>
              )}
              {!loading && filtered.length > 0 ? (
                <table className="data-table" role="table" aria-label="Histórico de questionários respondidos">
                  <thead>
                    <tr>
                      <th scope="col">Questionário</th>
                      <th scope="col">Professor · Disciplina</th>
                      <th scope="col">Criado em</th>
                      <th scope="col">Status</th>
                      <th scope="col">Tentativas</th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((h, i) => (
                      <tr key={i} className="data-row" tabIndex={0}
                        onClick={() => setViewingActivity(h)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setViewingActivity(h); }}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap"}}>
                            <ClockCounterClockwise size={15} color="var(--text-3)" weight="regular" />
                            {h.name}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.92rem" }}>
                              {h.professor || "Prof. Ana Lima"}
                            </span>
                            <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
                              {h.disciplina || "Prog. Orientada a Objetos"}
                            </span>
                          </div>
                        </td>
                        <td>{h.criadoem || "12/05/2026"}</td>
                        <td><span className="badge badge-green">{h.status}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {onOpenAttempts && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => { onOpenAttempts({ id: h.id, name: h.name, discipline: h.disciplina }); }}
                            >
                              Ver tentativas
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <ArrowRight size={15} color="var(--text-3)" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : !loading ? (
                <div style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                  {search ? `Nenhum resultado para "${search}".` : "Você ainda não respondeu nenhum questionário."}
                </div>
              ) : (
                <div style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                  Carregando atividades...
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      
      {/* Modal de pre-visualizacao */}
      {viewingActivity && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setViewingActivity(null); }}>
          <div className="modal-card modal-card-wide">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
                  Pré-visualização
                </p>
                <h2 className="modal-title" style={{ marginBottom: 4 }}>
                  {viewingActivity.name}
                </h2>
                <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
                  {viewingActivity.professor || "Prof. Ana Lima"} · {viewingActivity.disciplina || "Prog. Orientada a Objetos"}
                </p>
              </div>
              <span className="badge badge-indigo">
                {viewingQuestionsLoading ? "Carregando..." : `${viewingQuestions.length} questões`}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28, maxHeight: "50vh", overflowY: "auto" }}>
              {viewingQuestionsError && (
                <div style={{ color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
                  {viewingQuestionsError}
                </div>
              )}
              {!viewingQuestionsLoading && viewingQuestions.length === 0 && !viewingQuestionsError && (
                <div style={{ color: "var(--text-3)", fontSize: "0.9rem" }} role="status">
                  Nenhuma questão cadastrada.
                </div>
              )}
              {viewingQuestions.map((q, i) => (
                <div key={q.id ?? i} className="preview-question-item">
                  <p className="preview-question-num">
                    Questão {i + 1} · {q.type === "multiple" ? "Múltipla escolha" : "Dissertativa"}
                  </p>
                  <p className="preview-question-text">{q.text}</p>
                  {q.type === "multiple" && q.options && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {q.options.map((opt, j) => (
                        <div key={j} className="preview-alt">
                          <span className="preview-alt-letter">
                            {["A","B","C","D"][j]}
                          </span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 0 }}>
              {onOpenActivity && (
                <button
                  className="btn btn-primary"
                  onClick={() => { onOpenActivity(viewingActivity.id); setViewingActivity(null); }}
                  disabled={viewingQuestionsLoading}
                >
                  Responder questionario
                </button>
              )}
              <button className="btn btn-outline" style={{ width: "100%" }} onClick={() => setViewingActivity(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ActivityCreateModal
          ownerName={username || "Aluno"}
          onClose={() => setShowModal(false)}
          onPreview={handlePreview}
        />
      )}

      {previewData && (
        <ActivityPreviewModal
          activity={{
            name: previewData.name,
            discipline: previewData.discipline,
            ownerName: username || "Aluno",
          }}
          questions={DEMO_QUESTIONS}
          onBack={() => { setPreviewData(null); setShowModal(true); }}
          onConfirm={handleConfirm}
          saving={saving}
        />
      )}

    </div>
  );
}