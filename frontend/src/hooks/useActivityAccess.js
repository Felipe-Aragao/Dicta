import { useCallback, useState } from "react";
import { getActivity, getActivityByCode, resolveActivityByCode } from "../services/activityService";
import { ROUTES } from "../routes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useActivityAccess({ role, navigate, showToast, startActivityAttempt }) {
  const [attemptsActivity, setAttemptsActivity] = useState(null);

  const openActivity = useCallback(async (activity, options = {}) => {
    if (role !== "aluno" && role !== "visitante") return false;
    if (!activity?.id) return false;
    try {
      if (activity?.status === "encerrado") {
        throw new Error("Atividade encerrada.");
      }
      const attempt = await startActivityAttempt(activity.id, activity.share_code ?? null);
      if (!attempt?.id) return false;
      navigate(ROUTES.activityResponder(activity.share_code || activity.id), options);
      return true;
    } catch (error) {
      showToast(error?.message ?? "Falha ao abrir atividade.");
      return false;
    }
  }, [navigate, role, showToast, startActivityAttempt]);

  const handleOpenActivity = useCallback(async (activityId, options = {}) => {
    try {
      return await openActivity(await getActivity(activityId), options);
    } catch (error) {
      showToast(error?.message ?? "Falha ao abrir atividade.");
      return false;
    }
  }, [openActivity, showToast]);

  const handleOpenActivityReference = useCallback(async (activityRef, options = {}) => {
    const value = String(activityRef || "").trim();
    if (!value) return false;
    try {
      const activity = UUID_RE.test(value)
        ? await getActivity(value)
        : await resolveActivityByCode(value);
      return await openActivity(activity, options);
    } catch (error) {
      showToast(error?.message ?? "Falha ao abrir atividade.");
      return false;
    }
  }, [openActivity, showToast]);

  const handleOpenActivityCode = useCallback(async (codeOrLink) => {
    const value = String(codeOrLink || "").trim();
    if (!value) return false;

    try {
      const activity = await getActivityByCode(value);
      if (!activity?.id) throw new Error("Atividade não encontrada.");
      await handleOpenActivity(activity.id, { replace: true });
      return true;
    } catch (error) {
      showToast(error?.message ?? "Falha ao abrir atividade.");
      return false;
    }
  }, [handleOpenActivity, showToast]);

  const handleOpenAttempts = useCallback((activity) => {
    if (!activity?.id) return;
    setAttemptsActivity(activity);
    navigate(ROUTES.attempts(activity.id));
  }, [navigate]);

  const loadAttemptsActivity = useCallback(async (activityId) => {
    if (!activityId) return null;
    if (attemptsActivity?.id && String(attemptsActivity.id) === String(activityId)) return attemptsActivity;
    try {
      const activity = await getActivity(activityId);
      const normalized = {
        id: activity.id,
        name: activity.name,
        discipline: activity.discipline,
      };
      setAttemptsActivity(normalized);
      return normalized;
    } catch (error) {
      showToast(error?.message ?? "Falha ao carregar atividade.");
      return null;
    }
  }, [attemptsActivity, showToast]);

  const resetActivityAccess = useCallback(() => {
    setAttemptsActivity(null);
  }, []);

  return {
    attemptsActivity,
    handleOpenActivity,
    handleOpenActivityReference,
    handleOpenActivityCode,
    handleOpenAttempts,
    loadAttemptsActivity,
    resetActivityAccess,
  };
}
