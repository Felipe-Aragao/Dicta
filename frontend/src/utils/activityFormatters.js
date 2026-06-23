export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

export const normalizeActivityStatus = (status) => {
  const statusMap = {
    ativo: "Ativo",
    encerrado: "Encerrado",
  };
  return statusMap[status] || "Ativo";
};

export const normalizeAttemptStatus = (status) => {
  const statusMap = {
    concluido: "Concluido",
    "em progresso": "Em progresso",
  };
  return statusMap[status] || status || "Em progresso";
};

export const getDetailsBadgeClass = (status) => {
  const statusMap = {
    Ativo: "badge badge-green",
    Encerrado: "badge badge-zinc",
    Privado: "badge badge-purple",
    Concluido: "badge badge-green",
    "Em progresso": "badge badge-yellow",
  };
  return statusMap[status] || "badge badge-zinc";
};

export const getAttemptDateValue = (attempt) => {
  const value = attempt?.submitted_at || attempt?.started_at || attempt?.last_saved_at;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

export const normalizeProfessorActivity = (activity, ownerName) => ({
  id: activity.id,
  ownerId: activity.owner_id,
  shareCode: activity.share_code || "",
  isShareable: Boolean(activity.is_shareable),
  rawStatus: activity.status,
  nome: activity.name || "Atividade",
  professor: ownerName || "Professor",
  disciplina: activity.discipline || "Geral",
  status: normalizeActivityStatus(activity.status),
  criadoEm: formatDate(activity.created_at),
  alunos: activity.total_responses ?? 0,
  link: activity.share_code ? `${window.location.origin}/atividade/codigo/${activity.share_code}` : "",
});

export const normalizeStudentOwnedActivity = (activity, ownerName) => ({
  id: activity.id,
  ownerId: activity.owner_id,
  shareCode: activity.share_code || "",
  name: activity.name || "Atividade",
  professor: ownerName || "Aluno",
  disciplina: activity.discipline || "Geral",
  criadoem: formatDate(activity.created_at),
  sortValue: activity.created_at ? new Date(activity.created_at).getTime() || 0 : 0,
  status: "Privado",
  rawStatus: activity.status,
  attemptsCount: 0,
});

export const normalizeAttemptActivity = (attempts = []) => {
  const latestAttempt = attempts.reduce((latest, attempt) => (
    getAttemptDateValue(attempt) > getAttemptDateValue(latest) ? attempt : latest
  ), attempts[0]);
  const resumeAttempt = attempts
    .filter((attempt) => attempt?.status === "em progresso" && attempt?.activity_status !== "encerrado")
    .reduce((latest, attempt) => (
      !latest || getAttemptDateValue(attempt) > getAttemptDateValue(latest) ? attempt : latest
    ), null);

  return {
    id: latestAttempt.activity_id,
    ownerId: null,
    shareCode: latestAttempt.activity_share_code || "",
    name: latestAttempt.activity_name || "Atividade",
    professor: latestAttempt.professor_name || "Professor",
    disciplina: latestAttempt.activity_discipline || "Geral",
    criadoem: formatDate(latestAttempt.submitted_at || latestAttempt.started_at || latestAttempt.last_saved_at),
    sortValue: getAttemptDateValue(latestAttempt),
    status: latestAttempt.activity_status === "encerrado"
      ? normalizeActivityStatus(latestAttempt.activity_status)
      : normalizeAttemptStatus(latestAttempt.status),
    rawStatus: latestAttempt.activity_status || latestAttempt.status,
    activityStatus: latestAttempt.activity_status,
    attemptStatus: latestAttempt.status,
    attemptsCount: attempts.length,
    resumeAttempt,
  };
};

export const groupAttemptsByActivity = (attempts = []) => {
  const grouped = new Map();
  for (const attempt of attempts) {
    if (!attempt?.activity_id) continue;
    const current = grouped.get(attempt.activity_id) || [];
    current.push(attempt);
    grouped.set(attempt.activity_id, current);
  }
  return Array.from(grouped.values()).map(normalizeAttemptActivity);
};

export const mergeOwnedAndAttemptedActivities = (ownedActivities = [], attemptedActivities = []) => {
  const byId = new Map();
  for (const activity of ownedActivities) byId.set(activity.id, activity);
  for (const activity of attemptedActivities) {
    const existing = byId.get(activity.id);
    byId.set(activity.id, {
      ...activity,
      ...existing,
      attemptsCount: activity.attemptsCount ?? existing?.attemptsCount ?? 0,
      sortValue: Math.max(existing?.sortValue || 0, activity.sortValue || 0),
    });
  }
  return Array.from(byId.values()).sort((a, b) => (
    (b.sortValue || 0) - (a.sortValue || 0)
  ));
};
