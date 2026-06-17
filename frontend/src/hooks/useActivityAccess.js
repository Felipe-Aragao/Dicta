import { useCallback, useState } from "react";
import { getActivity, getActivityByCode } from "../services/activityService";
import { ROUTES } from "../routes";

export function useActivityAccess({ role, navigate, showToast, startActivityAttempt }) {
  const [attemptsActivity, setAttemptsActivity] = useState(null);

  const handleOpenActivity = useCallback(async (activityId, options = {}) => {
    if (role !== "aluno" && role !== "visitante") return false;
    try {
      const activity = await getActivity(activityId);
      if (activity?.status === "encerrado") {
        throw new Error("Atividade encerrada.");
      }
      const attempt = await startActivityAttempt(activityId);
      if (!attempt?.id) return false;
      navigate(ROUTES.activityResponder(activityId), options);
      return true;
    } catch (error) {
      showToast(error?.message ?? "Falha ao abrir atividade.");
      return false;
    }
  }, [navigate, role, showToast, startActivityAttempt]);

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
    handleOpenActivityCode,
    handleOpenAttempts,
    loadAttemptsActivity,
    resetActivityAccess,
  };
}
