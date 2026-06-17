import { useCallback, useEffect, useMemo, useState, useRef} from "react";
import { ArrowRight, Article, ClockCounterClockwise, Plus, User, MagnifyingGlass, Trash } from "@phosphor-icons/react";
import { ActivityCreateModal, ActivityPdfModal, ActivityPreviewModal } from "./ActivityModals";
import { deleteActivity, getActivity, listActivitiesByOwner } from "../services/activityService";
import { listAttemptsByAluno } from "../services/attemptService";
import { listQuestionsByActivity } from "../services/questionService";
import { useActivityCreationFlow } from "../hooks/useActivityCreationFlow";
import { ActivityPreviewDetailsModal } from "./activity/ActivityPreviewDetailsModal";
import { ActivitySearchFilters } from "./activity/ActivitySearchFilters";
import { buildActivityFilterOptions, matchesActivityFilters } from "../utils/activityFilters";
import {
  groupAttemptsByActivity,
  getDetailsBadgeClass,
  mergeOwnedAndAttemptedActivities,
  normalizeStudentOwnedActivity,
} from "../utils/activityFormatters";
import { useSpeech } from "../hooks/useSpeech";

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
export function HistoryScreen({ username, onLogout, onOpenActivity, onOpenActivityCode, onOpenAttempts, userId }) {
  const { stopRec, speak } = useSpeech();
  const initialWarning = useRef(false);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ professor: "", discipline: "", status: "" });
  const [viewingActivity, setViewingActivity] = useState(null);
  const [viewingQuestions, setViewingQuestions] = useState([]);
  const [viewingQuestionsLoading, setViewingQuestionsLoading] = useState(false);
  const [viewingQuestionsError, setViewingQuestionsError] = useState("");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [activityCode, setActivityCode] = useState("");
  const [activityCodeError, setActivityCodeError] = useState("");
  const [activityCodeLoading, setActivityCodeLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const creation = useActivityCreationFlow({
    userId,
    username,
    isShareable: false,
    ownerFallback: "Aluno",
    normalizeActivity: normalizeStudentOwnedActivity,
    onCreated: (activity) => setActivities((prev) => [activity, ...prev]),
    setError,
  });

  const fetchActivities = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const [attemptsData, ownedData] = await Promise.all([
        listAttemptsByAluno(userId, 1000),
        listActivitiesByOwner(userId, 1000),
      ]);
      const attemptedActivities = Array.isArray(attemptsData) ? groupAttemptsByActivity(attemptsData) : [];
      const ownedActivities = Array.isArray(ownedData) ? ownedData.map((item) => normalizeStudentOwnedActivity(item, username)) : [];
      setActivities(mergeOwnedAndAttemptedActivities(ownedActivities, attemptedActivities));
    } catch (err) {
      setError(err?.message ?? "Falha ao carregar atividades.");
    } finally {
      setLoading(false);
    }
  }, [userId, username]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);


  const fetchQuestionsForActivity = useCallback(async (activityId) => {
    if (!activityId) return;
    setViewingQuestionsLoading(true);
    setViewingQuestionsError("");
    try {
      const [questions, activity] = await Promise.all([
        listQuestionsByActivity(activityId),
        getActivity(activityId),
      ]);
      setViewingQuestions(questions);
      setViewingActivity((current) => (
        current?.id === activityId ? { ...current, activityStatus: activity?.status } : current
      ));
    } catch (err) {
      setViewingQuestionsError(err?.message ?? "Falha ao carregar questoes.");
      setViewingQuestions([]);
    } finally {
      setViewingQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!viewingActivity?.id) {
      setViewingQuestions([]);
      setViewingQuestionsError("");
      return;
    }
    fetchQuestionsForActivity(viewingActivity.id);
  }, [fetchQuestionsForActivity, viewingActivity?.id]);

  useEffect(() => {
    stopRec(); 
  }, [stopRec]);

  useEffect(() => {
    if (!initialWarning.current) {
      const timer = setTimeout(() => {
        speak("Bem-vindo ao dicta. Certifique-se de que seu microfone está habilitado para que o reconhecimento de voz funcione.");
        initialWarning.current = true;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [speak]);

  const handleOpenCodeModal = () => {
    setActivityCode("");
    setActivityCodeError("");
    setShowCodeModal(true);
  };

  const handleCodeConfirm = async () => {
    if (!activityCode.trim()) {
      return;
    }
    setActivityCodeLoading(true);
    setActivityCodeError("");
    
    let idFinal = activityCode.trim();
    if (idFinal.includes("?activity=")) {
      idFinal = idFinal.split("?activity=")[1].split("#")[0];
    }
    
    let opened = false;
    if (onOpenActivityCode) {
      opened = await onOpenActivityCode(idFinal);
    }
    setActivityCodeLoading(false);

    if (opened) {
      setShowCodeModal(false);
      setActivityCode(""); 
      return;
    }

    setActivityCodeError("Código não encontrado, inativo ou atividade indisponível.");
  };

  const canDeleteActivity = (activity) => (
    Boolean(activity?.ownerId && userId && String(activity.ownerId) === String(userId))
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setError("");
    try {
      await deleteActivity(deleteTarget.id);

      setActivities((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (viewingActivity?.id === deleteTarget.id) setViewingActivity(null);
      setDeleteTarget(null);
      setDeleteMode(false);
    } catch (err) {
      setError(err?.message ?? "Falha ao excluir atividade.");
    } finally {
      setDeleting(false);
    }
  };

  const filterOptions = useMemo(() => (
    buildActivityFilterOptions(activities, {
      professor: (activity) => activity.professor || "Prof. Ana Lima",
      discipline: (activity) => activity.disciplina || "Prog. Orientada a Objetos",
      status: (activity) => activity.status,
    })
  ), [activities]);

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ professor: "", discipline: "", status: "" });
  };

  const filtered = activities.filter((h) => {
    const s = search.toLowerCase();
    // Busca ampla em todos os campos
    const matchesSearch = (
      (h.name || "").toLowerCase().includes(s) ||
      (h.professor || "Prof. Ana Lima").toLowerCase().includes(s) ||
      (h.disciplina || "Prog. Orientada a Objetos").toLowerCase().includes(s) ||
      (h.criadoem || "12/05/2026").toLowerCase().includes(s)
    );

    return matchesSearch && matchesActivityFilters(h, filters, {
      professor: (activity) => activity.professor || "Prof. Ana Lima",
      discipline: (activity) => activity.disciplina || "Prog. Orientada a Objetos",
      status: (activity) => activity.status,
    });
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
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setDeleteMode((prev) => !prev)}
                    aria-pressed={deleteMode}
                  >
                    Excluir atividades
                  </button>
                </div>
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
                <ActivitySearchFilters
                  idPrefix="student-history"
                  filters={filters}
                  options={filterOptions}
                  open={filtersOpen}
                  onToggle={() => setFiltersOpen((current) => !current)}
                  onClose={() => setFiltersOpen(false)}
                  onChange={handleFilterChange}
                  onClear={clearFilters}
                />
                
                <div style={{ display: "flex", gap: "10px", marginLeft: "10px" }}>
                  
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={creation.handleOpenCreate}
                    aria-label="Criar nova atividade"
                  >
                    <Plus size={16} weight="bold" />
                    Criar Atividade
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleOpenCodeModal}
                    aria-label="Inserir codigo de atividade"
                  >
                    <Plus size={16} weight="bold" />
                    Inserir código
                  </button>
                </div>
              </div>
            </div>

            <div className="card table-card">
              {error && (
                <div style={{ padding: "14px 22px", color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
                  {error}
                </div>
              )}
              {!loading && filtered.length > 0 ? (
                <table className="data-table history-activity-table" role="table" aria-label="Histórico de questionários respondidos">
                  <thead>
                    <tr>
                      <th scope="col">Questionário</th>
                      <th scope="col">Professor · Disciplina</th>
                      <th scope="col">Detalhes</th>
                      <th scope="col">Tentativas</th>
                      <th scope="col" style={{ width: 56 }}></th>
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
                          <div className="activity-title-cell" title={h.name}>
                            <ClockCounterClockwise size={15} color="var(--text-3)" weight="regular" />
                            <span className="activity-title-text">{h.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="activity-meta-cell">
                            <span className="activity-meta-title">
                              {h.professor || "Prof. Ana Lima"}
                            </span>
                            <span className="activity-meta-subtitle">
                              {h.disciplina || "Prog. Orientada a Objetos"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="activity-meta-cell activity-details-cell">
                            <span className="activity-details-badge-row">
                              <span className={getDetailsBadgeClass(h.status)}>{h.status}</span>
                            </span>
                            <span className="activity-meta-subtitle">{h.criadoem || "12/05/2026"}</span>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {onOpenAttempts && (
                            <button
                              className="attempts-icon-btn"
                              onClick={() => { onOpenAttempts({ id: h.id, name: h.name, discipline: h.disciplina }); }}
                              aria-label={`Ver ${h.attemptsCount || 0} tentativa${h.attemptsCount !== 1 ? "s" : ""}`}
                              title={`${h.attemptsCount || 0} tentativa${h.attemptsCount !== 1 ? "s" : ""}`}
                            >
                              <Article size={15} weight="regular" />
                              <span>{h.attemptsCount || 0}</span>
                            </button>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                          {deleteMode && canDeleteActivity(h) && (
                            <button
                              className="icon-btn icon-btn-danger"
                              onClick={() => setDeleteTarget(h)}
                              aria-label="Excluir atividade"
                              title="Excluir atividade"
                              disabled={deleting}
                            >
                              <Trash size={14} weight="bold" />
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
      
      <ActivityPreviewDetailsModal
        activity={viewingActivity}
        questions={viewingQuestions}
        loading={viewingQuestionsLoading}
        error={viewingQuestionsError}
        onClose={() => setViewingActivity(null)}
        onOpenActivity={onOpenActivity}
        canOpenActivity={Boolean(
          onOpenActivity &&
          viewingActivity?.rawStatus !== "encerrado" &&
          viewingActivity?.activityStatus !== "encerrado"
        )}
        getTitle={(activity) => activity.name}
        getProfessor={(activity) => activity.professor || "Prof. Ana Lima"}
        getDiscipline={(activity) => activity.disciplina || "Prog. Orientada a Objetos"}
      />

      {creation.showModal && (
        <ActivityCreateModal
          ownerName={creation.ownerName}
          onClose={creation.closeCreateModal}
          onPreview={creation.handlePreview}
          initialData={creation.previewData}
          showQuestionCount={false}
        />
      )}

      {creation.showPdfModal && (
        <ActivityPdfModal
          onClose={() => creation.setShowPdfModal(false)}
          onStart={creation.handleExtractActivityPdf}
          uploadStatus={creation.uploadStatus}
          uploadError={creation.uploadError}
          uploadFileName={creation.uploadFileName}
          onFileSelected={creation.resetUploadStatus}
        />
      )}

      {}
      {creation.previewData && !creation.showModal && (
        <ActivityPreviewModal
          activity={{
            name: creation.previewData.name,
            discipline: creation.previewData.discipline,
            ownerName: creation.ownerName,
          }}
          questions={creation.previewQuestions}
          onBack={(savedQuestions) => {
            creation.setPreviewData((prev) => ({ ...prev, questions: savedQuestions }));
            creation.setShowModal(true);
          }}
          onConfirm={creation.handleConfirm}
          saving={creation.saving}
        />
      )}

      {showCodeModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget && !activityCodeLoading) setShowCodeModal(false); }}>
          <div className="modal-card">
            <h2 className="modal-title" style={{ marginBottom: 10 }}>Inserir código</h2>
            <div className="field-group" style={{ marginBottom: 8 }}>
              <div className="field-wrap">
                <label className="field-label" htmlFor="activity-code">Código ou link da atividade</label>
                <input
                  id="activity-code"
                  className="text-input"
                  type="text"
                  value={activityCode}
                  onChange={(e) => {
                    setActivityCode(e.target.value);
                    setActivityCodeError("");
                  }}
                  placeholder="Cole o código ou link aqui"
                  autoFocus
                  disabled={activityCodeLoading}
                />
                {activityCodeError && (
                  <p className="field-error" role="status">{activityCodeError}</p>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCodeModal(false)} disabled={activityCodeLoading}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCodeConfirm}
                disabled={activityCode.trim().length === 0 || activityCodeLoading}
              >
                {activityCodeLoading ? "Verificando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2 className="modal-title" style={{ marginBottom: 10 }}>Excluir atividade</h2>
            <p style={{ color: "var(--text-3)", marginBottom: 18 }}>
              Tem certeza que deve excluir?
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
