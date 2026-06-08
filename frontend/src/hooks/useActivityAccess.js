import { useCallback, useEffect, useState } from "react";
import { getActivityByCode } from "../services/activityService";

const getInitialShareCode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("code") || "";
};

export function useActivityAccess({ role, page, currentUser, navigate, showToast, startActivityAttempt }) {
  const [attemptsActivity, setAttemptsActivity] = useState(null);
  const [pendingActivityId, setPendingActivityId] = useState(null);
  const [pendingActivityCode, setPendingActivityCode] = useState(getInitialShareCode);

  useEffect(() => {
    if (!pendingActivityCode || currentUser?.id) return;
    if (page === "credentials" && role === "aluno") return;
    navigate("credentials", "aluno");
  }, [currentUser?.id, navigate, page, pendingActivityCode, role]);

  const handleOpenActivity = useCallback(async (activityId) => {
    const attempt = await startActivityAttempt(activityId);
    if (!attempt?.id) return;
    navigate("question");
  }, [navigate, startActivityAttempt]);

  const handleOpenActivityCode = useCallback(async (codeOrLink) => {
    const value = String(codeOrLink || "").trim();
    if (!value) return false;

    try {
      const activity = await getActivityByCode(value);
      if (!activity?.id) throw new Error("Atividade não encontrada.");
      await handleOpenActivity(activity.id);
      return true;
    } catch (error) {
      showToast(error?.message ?? "Falha ao abrir atividade.");
      return false;
    }
  }, [handleOpenActivity, showToast]);

  useEffect(() => {
    if (currentUser?.id && role === "aluno" && pendingActivityId) {
      handleOpenActivity(pendingActivityId);
      setPendingActivityId(null);
    }
  }, [currentUser, handleOpenActivity, pendingActivityId, role]);

  useEffect(() => {
    if (currentUser?.id && role === "aluno" && pendingActivityCode) {
      handleOpenActivityCode(pendingActivityCode);
      setPendingActivityCode("");
    }
  }, [currentUser?.id, handleOpenActivityCode, pendingActivityCode, role]);

  const handleOpenAttempts = useCallback((activity) => {
    if (!activity?.id) return;
    setAttemptsActivity(activity);
    navigate("attempts");
  }, [navigate]);

  const resetActivityAccess = useCallback(() => {
    setAttemptsActivity(null);
    setPendingActivityCode("");
  }, []);

  return {
    attemptsActivity,
    handleOpenActivity,
    handleOpenActivityCode,
    handleOpenAttempts,
    resetActivityAccess,
  };
}
