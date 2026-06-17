import { useCallback, useEffect, useState } from "react";
import {
  Plus, FilePdf, ArrowRight, Article,
  Link, Check, User,
  ArrowsClockwise, MagnifyingGlass, PlayCircle, StopCircle, Trash,
} from "@phosphor-icons/react";
import { ActivityCreateModal, ActivityPdfModal, ActivityPreviewModal } from "./ActivityModals";
import { deleteActivity, listActivitiesByOwner, regenerateShareCode, updateActivity } from "../services/activityService";
import { listQuestionsByActivity } from "../services/questionService";
import { useActivityCreationFlow } from "../hooks/useActivityCreationFlow";
import { ActivityPreviewDetailsModal } from "./activity/ActivityPreviewDetailsModal";
import { normalizeProfessorActivity } from "../utils/activityFormatters";

// Menu lateral do professor
function Sidebar({ username, onLogout }) {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <div className="sidebar-avatar" aria-hidden="true">
        <User size={30} weight="regular" color="white" />
      </div>
      <p className="sidebar-welcome">Bem vindo,<br />{username || "Professor"}!</p>
      <p className="sidebar-role">Professor</p>
      <button className="sidebar-logout" onClick={onLogout} aria-label="Sair da conta">
        Sair
      </button>
    </aside>
  );
}

function ShareControls({ activity, onToggleStatus, onRegenerate, busy }) {
  const [copied, setCopied] = useState(null);
  const isClosed = activity.rawStatus === "encerrado";
  const copyValue = (e, value, kind) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    });
  };

  return (
    <div className="share-controls" onClick={(e) => e.stopPropagation()}>
      <button
        className={`copy-btn${copied === "code" ? " copied" : ""}`}
        onClick={(e) => copyValue(e, activity.link, "code")}
        aria-label="Copiar link da atividade"
        title={activity.link || "Link indisponível"}
        disabled={!activity.link || busy}
      >
        {copied === "code" ? <Check size={13} weight="bold" /> : <Link size={13} weight="regular" />}
        {activity.shareCode || "Sem código"}
      </button>
      <button
        className="icon-btn"
        onClick={(e) => { e.stopPropagation(); onRegenerate(activity); }}
        aria-label="Gerar novo código"
        title="Gerar novo código"
        disabled={busy || isClosed}
      >
        <ArrowsClockwise size={14} weight="regular" />
      </button>
      <button
        className="icon-btn"
        onClick={(e) => { e.stopPropagation(); onToggleStatus(activity); }}
        aria-label={isClosed ? "Reativar prova" : "Encerrar prova"}
        title={isClosed ? "Reativar prova" : "Encerrar prova"}
        disabled={busy}
      >
        {isClosed
          ? <PlayCircle size={14} weight="regular" />
          : <StopCircle size={14} weight="regular" />}
      </button>
    </div>
  );
}

// Tela principal do professor
export function ProfessorScreen({ username, onLogout, userId, onOpenAttempts }) {
  const [questionarios, setQuestionarios] = useState([]);
  const [search, setSearch]               = useState("");
  const [viewingActivity, setViewingActivity] = useState(null);
  const [viewingQuestions, setViewingQuestions] = useState([]);
  const [viewingQuestionsLoading, setViewingQuestionsLoading] = useState(false);
  const [viewingQuestionsError, setViewingQuestionsError] = useState("");
  const [loadingList, setLoadingList]     = useState(false);
  const [listError, setListError]         = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [shareBusyId, setShareBusyId] = useState(null);
  const creation = useActivityCreationFlow({
    userId,
    username,
    isShareable: true,
    ownerFallback: "Professor",
    normalizeActivity: normalizeProfessorActivity,
    onCreated: (activity) => setQuestionarios((prev) => [activity, ...prev]),
    setError: setListError,
  });

  const fetchActivities = useCallback(async () => {
    if (!userId) return;
    setLoadingList(true);
    setListError("");
    try {
      const data = await listActivitiesByOwner(userId);
      setQuestionarios(Array.isArray(data) ? data.map((item) => normalizeProfessorActivity(item, username)) : []);
    } catch (error) {
      setListError(error?.message ?? "Falha ao carregar atividades.");
    } finally {
      setLoadingList(false);
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
      setViewingQuestions(await listQuestionsByActivity(activityId));
    } catch (error) {
      setViewingQuestionsError(error?.message ?? "Falha ao carregar questoes.");
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

  const filtered = questionarios.filter((q) =>
    q.nome.toLowerCase().includes(search.toLowerCase()) ||
    q.professor.toLowerCase().includes(search.toLowerCase()) ||
    q.disciplina.toLowerCase().includes(search.toLowerCase())
  );

  const canDeleteActivity = (activity) => (
    Boolean(activity?.ownerId && userId && String(activity.ownerId) === String(userId))
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setListError("");
    try {
      await deleteActivity(deleteTarget.id);

      setQuestionarios((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (viewingActivity?.id === deleteTarget.id) setViewingActivity(null);
      setDeleteTarget(null);
      setDeleteMode(false);
    } catch (error) {
      setListError(error?.message ?? "Falha ao excluir atividade.");
    } finally {
      setDeleting(false);
    }
  };

  const updateActivityInList = useCallback((activity) => {
    setQuestionarios((prev) => (
      prev.map((item) => (
        item.id === activity.id ? normalizeProfessorActivity(activity, username) : item
      ))
    ));
    setViewingActivity((prev) => (
      prev?.id === activity.id ? normalizeProfessorActivity(activity, username) : prev
    ));
  }, [username]);

  const handleToggleActivityStatus = async (activity) => {
    if (!activity?.id) return;
    const shouldReactivate = activity.rawStatus === "encerrado";
    setShareBusyId(activity.id);
    setListError("");
    try {
      const updated = await updateActivity(
        activity.id,
        {
          status: shouldReactivate ? "ativo" : "encerrado",
          is_shareable: true,
        },
        shouldReactivate ? "Falha ao reativar prova." : "Falha ao encerrar prova.",
      );
      updateActivityInList(updated);
    } catch (error) {
      setListError(error?.message ?? (shouldReactivate ? "Falha ao reativar prova." : "Falha ao encerrar prova."));
    } finally {
      setShareBusyId(null);
    }
  };

  const handleRegenerateShareCode = async (activity) => {
    if (!activity?.id) return;
    setShareBusyId(activity.id);
    setListError("");
    try {
      updateActivityInList(await regenerateShareCode(activity.id));
    } catch (error) {
      setListError(error?.message ?? "Falha ao gerar novo código.");
    } finally {
      setShareBusyId(null);
    }
  };

  return (
    <>
      <div className="auth-layout page-anim">
        <Sidebar username={username} onLogout={onLogout} />

        <div className="sidebar-main">
          <div className="page">
            <div className="page-wide">

              <div className="section-header">
                <div className="section-header-left">
                  <h2 className="section-title">Gerar Questionários</h2>
                  <p className="section-sub">
                    {questionarios.length} atividade{questionarios.length !== 1 ? "s" : ""} criada{questionarios.length !== 1 ? "s" : ""}
                  </p>
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
                      placeholder="Buscar atividade, professor..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Buscar atividades"
                    />
                  </div>
                  
                  <div style={{ display: "flex", marginLeft: "10px" }}>
                    <button
                      className="btn btn-primary"
                      onClick={creation.handleOpenCreate}
                      aria-label="Criar nova atividade"
                    >
                      <Plus size={17} weight="bold" />
                      Nova Atividade
                    </button>
                  </div>
                </div>
              </div>

              <div className="card table-card">
                {listError && (
                  <div style={{ padding: "14px 22px", color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
                     {listError}
                  </div>
                )}
                <table className="data-table professor-activity-table" role="table" aria-label="Lista de questionários">
                  <thead>
                    <tr>
                      <th scope="col">Questionário</th>
                      <th scope="col">Detalhes</th>
                      <th scope="col">Código</th>
                      <th scope="col">Tentativas</th>
                      <th scope="col" style={{ width: 56 }}></th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((q) => (
                      <tr key={q.id} className="data-row" tabIndex={0}
                        onClick={() => setViewingActivity(q)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setViewingActivity(q); }}
                      >
                        <td>
                          <div className="activity-title-cell" title={q.nome}>
                            <FilePdf size={16} color="var(--text-3)" weight="regular" />
                            <span className="activity-title-text">{q.nome}</span>
                          </div>
                        </td>
                        <td>
                          <div className="activity-meta-cell">
                            <span><span className="badge badge-green">{q.status}</span></span>
                            <span className="activity-meta-subtitle">{q.criadoEm}</span>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <ShareControls
                            activity={q}
                            busy={shareBusyId === q.id}
                            onToggleStatus={handleToggleActivityStatus}
                            onRegenerate={handleRegenerateShareCode}
                          />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {onOpenAttempts && (
                            <button
                              className="attempts-icon-btn"
                              onClick={() => { onOpenAttempts({ id: q.id, name: q.nome, discipline: q.disciplina }); }}
                              aria-label={`Ver ${q.alunos} tentativa${q.alunos !== 1 ? "s" : ""} de ${q.nome}`}
                              title={`${q.alunos} tentativa${q.alunos !== 1 ? "s" : ""}`}
                            >
                              <Article size={15} weight="regular" />
                              <span>{q.alunos}</span>
                            </button>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                          {deleteMode && canDeleteActivity(q) && (
                            <button
                              className="icon-btn icon-btn-danger"
                              onClick={() => setDeleteTarget(q)}
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

                {!loadingList && filtered.length === 0 && (
                  <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                    {search ? `Nenhuma atividade encontrada para "${search}".` : "Nenhuma atividade criada ainda."}
                  </div>
                )}
                {loadingList && (
                  <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                    Carregando atividades...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <ActivityPreviewDetailsModal
        activity={viewingActivity}
        questions={viewingQuestions}
        loading={viewingQuestionsLoading}
        error={viewingQuestionsError}
        onClose={() => setViewingActivity(null)}
        getTitle={(activity) => activity.nome}
        getProfessor={(activity) => activity.professor}
        getDiscipline={(activity) => activity.disciplina}
      />

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
    </>
  );
}
