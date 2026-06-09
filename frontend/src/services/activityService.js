import { jsonOptions, requestJson } from "./apiClient";

export const listActivitiesByOwner = (ownerId, limit) => {
  const suffix = limit ? `?limit=${limit}` : "";
  return requestJson(`/activities${suffix}`, {}, "Falha ao carregar atividades.");
};

export const createActivity = (payload) => (
  requestJson("/activities", jsonOptions("POST", payload), "Falha ao criar atividade.")
);

export const deleteActivity = (activityId) => (
  requestJson(`/activities/${activityId}`, { method: "DELETE" }, "Falha ao excluir atividade.")
);

export const getActivityByCode = (code) => (
  requestJson(
    `/activities/by-code/${encodeURIComponent(code)}`,
    {},
    "Código inválido ou atividade indisponível.",
  )
);

export const getActivity = (activityId) => (
  requestJson(`/activities/${activityId}`, {}, "Atividade não encontrada.")
);

export const updateActivity = (activityId, payload, fallback) => (
  requestJson(`/activities/${activityId}`, jsonOptions("PUT", payload), fallback)
);

export const regenerateShareCode = (activityId) => (
  requestJson(`/activities/${activityId}/regenerate-code`, { method: "POST" }, "Falha ao gerar novo código.")
);
