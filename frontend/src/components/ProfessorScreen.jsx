import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, ArrowRight, Article,
  Link, Check,
  ArrowsClockwise, MagnifyingGlass, PencilSimple, PlayCircle, StopCircle, Trash,
} from "@phosphor-icons/react";
import { ActivityCreateModal, ActivityPdfModal, ActivityPreviewModal } from "./ActivityModals";
import { deleteActivity, listActivitiesByOwner, regenerateShareCode, updateActivity } from "../services/activityService";
import { listQuestionsByActivity } from "../services/questionService";
import { useActivityCreationFlow } from "../hooks/useActivityCreationFlow";
import { ActivityPreviewDetailsModal } from "./activity/ActivityPreviewDetailsModal";
import { ActivitySearchFilters } from "./activity/ActivitySearchFilters";
import { Sidebar } from "./layout/Sidebar";
import { ProfileScreen } from "./ProfileScreen";
import { buildActivityFilterOptions, matchesActivityFilters } from "../utils/activityFilters";
import { getDetailsBadgeClass, normalizeProfessorActivity } from "../utils/activityFormatters";

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

const dateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const timeInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toTimeString().slice(0, 5);
};

function ActivityEditModal({ activity, saving, onClose, onSave }) {
  const [title, setTitle] = useState(activity?.nome || "");
  const initialMaxAttempts = activity?.maxAttemptsPerStudent ?? "";
  const initialEndsAtDate = dateInputValue(activity?.endsAt);
  const initialEndsAtTime = timeInputValue(activity?.endsAt);
  const [attemptLimitMode, setAttemptLimitMode] = useState(initialMaxAttempts ? "limited" : "unlimited");
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts || 1);
  const [endDateMode, setEndDateMode] = useState(initialEndsAtDate ? "limited" : "unlimited");
  const [endsAtDate, setEndsAtDate] = useState(initialEndsAtDate);
  const [endsAtTime, setEndsAtTime] = useState(initialEndsAtTime || "23:59");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  if (!activity) return null;

  const selectedEndsAt = endDateMode === "limited" && endsAtDate && endsAtTime
    ? new Date(`${endsAtDate}T${endsAtTime}:00`)
    : null;
  const hasFutureEndDate = !selectedEndsAt || selectedEndsAt.getTime() > currentTime;
  const hasValidAttemptLimit = attemptLimitMode === "unlimited" || (
    Number.isInteger(Number(maxAttempts)) && Number(maxAttempts) > 0
  );
  const hasValidEndDate = endDateMode === "unlimited" || (
    endsAtDate.length > 0 &&
    endsAtTime.length > 0 &&
    hasFutureEndDate
  );
  const canSave = title.trim().length > 0 && hasValidAttemptLimit && hasValidEndDate && !saving;

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      name: title.trim(),
      max_attempts_per_student: attemptLimitMode === "limited" ? Number(maxAttempts) : null,
      ends_at: selectedEndsAt ? selectedEndsAt.toISOString() : null,
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="modal-card">
        <h2 className="modal-title" style={{ marginBottom: 10 }}>Editar atividade</h2>
        <div className="field-group" style={{ marginBottom: 8 }}>
          <div className="field-wrap">
            <label className="field-label" htmlFor="edit-activity-title">Título</label>
            <input
              id="edit-activity-title"
              className="text-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="field-wrap">
            <label className="field-label" htmlFor="edit-limit-mode">Tentativas por aluno</label>
            <select
              id="edit-limit-mode"
              className="text-input"
              value={attemptLimitMode}
              onChange={(e) => setAttemptLimitMode(e.target.value)}
              disabled={saving}
            >
              <option value="unlimited">Ilimitadas</option>
              <option value="limited">Definir limite</option>
            </select>
          </div>

          {attemptLimitMode === "limited" && (
            <div className="field-wrap">
              <label className="field-label" htmlFor="edit-max-attempts">Número máximo de tentativas</label>
              <input
                id="edit-max-attempts"
                className="text-input"
                type="number"
                min="1"
                step="1"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                disabled={saving}
              />
            </div>
          )}

          <div className="field-wrap">
            <label className="field-label" htmlFor="edit-end-mode">Prazo</label>
            <select
              id="edit-end-mode"
              className="text-input"
              value={endDateMode}
              onChange={(e) => setEndDateMode(e.target.value)}
              disabled={saving}
            >
              <option value="unlimited">Sem prazo</option>
              <option value="limited">Definir prazo</option>
            </select>
          </div>

          {endDateMode === "limited" && (
            <>
              <div className="field-wrap">
                <label className="field-label" htmlFor="edit-ends-at">Data</label>
                <input
                  id="edit-ends-at"
                  className="text-input"
                  type="date"
                  value={endsAtDate}
                  onChange={(e) => setEndsAtDate(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="field-wrap">
                <label className="field-label" htmlFor="edit-ends-time">Horário</label>
                <input
                  id="edit-ends-time"
                  className="text-input"
                  type="time"
                  value={endsAtTime}
                  onChange={(e) => setEndsAtTime(e.target.value)}
                  disabled={saving}
                />
                {endsAtDate && endsAtTime && !hasFutureEndDate && (
                  <p className="field-error" role="status">Escolha uma data e horário futuros.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSave}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tela principal do professor
export function ProfessorScreen({
  username,
  currentUser,
  onLogout,
  onProfileSave,
  onDeleteAccount,
  userId,
  onOpenAttempts,
}) {
  const [questionarios, setQuestionarios] = useState([]);
  const [search, setSearch]               = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState("activities");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ professor: "", discipline: "", status: "" });
  const [viewingActivity, setViewingActivity] = useState(null);
  const [viewingQuestions, setViewingQuestions] = useState([]);
  const [viewingQuestionsLoading, setViewingQuestionsLoading] = useState(false);
  const [viewingQuestionsError, setViewingQuestionsError] = useState("");
  const [loadingList, setLoadingList]     = useState(false);
  const [listError, setListError]         = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editing, setEditing] = useState(false);
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

  const filterOptions = useMemo(() => (
    buildActivityFilterOptions(questionarios, {
      professor: (activity) => activity.professor,
      discipline: (activity) => activity.disciplina,
      status: (activity) => activity.status,
    })
  ), [questionarios]);

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ professor: "", discipline: "", status: "" });
  };

  const filtered = questionarios.filter((q) => {
    const s = search.toLowerCase();
    const matchesSearch = (
      q.nome.toLowerCase().includes(s) ||
      q.professor.toLowerCase().includes(s) ||
      q.disciplina.toLowerCase().includes(s)
    );

    return matchesSearch && matchesActivityFilters(q, filters, {
      professor: (activity) => activity.professor,
      discipline: (activity) => activity.disciplina,
      status: (activity) => activity.status,
    });
  });

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

  const handleEditSave = async (payload) => {
    if (!editTarget?.id) return;
    setEditing(true);
    setListError("");
    const previousEndsAt = editTarget.endsAt || null;
    const nextEndsAt = payload.ends_at || null;
    const shouldReactivate = previousEndsAt !== nextEndsAt;
    try {
      const updated = await updateActivity(
        editTarget.id,
        {
          ...payload,
          ...(shouldReactivate ? { status: "ativo" } : {}),
        },
        "Falha ao editar atividade.",
      );
      updateActivityInList(updated);
      setEditTarget(null);
      setDeleteMode(false);
    } catch (error) {
      setListError(error?.message ?? "Falha ao editar atividade.");
    } finally {
      setEditing(false);
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
          ...(shouldReactivate ? { ends_at: null } : {}),
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
      <div className={`auth-layout page-anim${sidebarCollapsed ? " sidebar-layout-collapsed" : ""}`}>
        <Sidebar
          username={username}
          roleLabel="Professor"
          fallbackName="Professor"
          profileImageUrl={currentUser?.profile_image_url}
          onEditProfile={() => setActivePanel("profile")}
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />

        <div className="sidebar-main">
          {activePanel === "profile" ? (
            <ProfileScreen
              user={currentUser}
              fallbackName="Professor"
              onSave={onProfileSave}
              onDeleteAccount={onDeleteAccount}
              onBack={() => setActivePanel("activities")}
            />
          ) : (
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
                      Editar atividades
                    </button>
                  </div>
                </div>

                <div className="section-header-right activity-header-actions">
                  <div className="activity-search-controls">
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
                    <ActivitySearchFilters
                      idPrefix="professor-activity"
                      filters={filters}
                      options={filterOptions}
                      open={filtersOpen}
                      fields={["discipline", "status"]}
                      onToggle={() => setFiltersOpen((current) => !current)}
                      onClose={() => setFiltersOpen(false)}
                      onChange={handleFilterChange}
                      onClear={clearFilters}
                    />
                  </div>

                  <div className="activity-primary-actions">
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
                      <th scope="col">Prazo e tentativas</th>
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
                            <span className="activity-title-text">{q.nome}</span>
                          </div>
                        </td>
                        <td>
                          <div className="activity-meta-cell activity-details-cell">
                            <span className="activity-details-badge-row">
                              <span className={getDetailsBadgeClass(q.status)}>{q.status}</span>
                            </span>
                            <span className="activity-meta-subtitle">{q.criadoEm}</span>
                          </div>
                        </td>
                        <td>
                          <div className="activity-limits-cell" title={`${q.prazo} · ${q.limiteTentativas}`}>
                            <span>{q.prazo}</span>
                            <span>{q.limiteTentativas}</span>
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
                            <div className="activity-row-actions">
                              <button
                                className="icon-btn"
                                onClick={() => setEditTarget(q)}
                                aria-label="Editar atividade"
                                title="Editar atividade"
                                disabled={editing}
                              >
                                <PencilSimple size={14} weight="bold" />
                              </button>
                              <button
                                className="icon-btn icon-btn-danger"
                                onClick={() => setDeleteTarget(q)}
                                aria-label="Excluir atividade"
                                title="Excluir atividade"
                                disabled={deleting}
                              >
                                <Trash size={14} weight="bold" />
                              </button>
                            </div>
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
          )}
        </div>
      </div>

      {creation.showModal && (
        <ActivityCreateModal
          ownerName={creation.ownerName}
          onClose={creation.closeCreateModal}
          onPreview={creation.handlePreview}
          initialData={creation.previewData}
          showQuestionCount={false}
          showActivityLimits
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

      {editTarget && (
        <ActivityEditModal
          activity={editTarget}
          saving={editing}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
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
    </>
  );
}
