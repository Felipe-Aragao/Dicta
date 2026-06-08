import { useCallback, useEffect, useState } from "react";
import { useSpeech } from "./useSpeech";

export function useAppNavigation() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("login");
  const [prevPage, setPrevPage] = useState(null);
  const { stopSpeak } = useSpeech();

  useEffect(() => {
    window.history.replaceState({ page: "login", role: null }, "", "#login");
    const handlePop = (event) => {
      if (!event.state) return;
      stopSpeak();
      setPage(event.state.page);
      setRole(event.state.role ?? null);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [stopSpeak]);

  const navigate = useCallback((destino, novoRole = null) => {
    stopSpeak();
    const nextRole = novoRole !== null ? novoRole : role;
    window.history.pushState({ page: destino, role: nextRole }, "", `#${destino}`);
    setPage(destino);
    if (novoRole !== null) setRole(novoRole);
  }, [role, stopSpeak]);

  const openVoiceCommands = useCallback(() => {
    setPrevPage(page);
    navigate("voice-commands");
  }, [navigate, page]);

  const closeVoiceCommands = useCallback(() => {
    navigate(prevPage || "login");
  }, [navigate, prevPage]);

  const resetToLogin = useCallback(() => {
    stopSpeak();
    setRole(null);
    window.history.pushState({ page: "login", role: null }, "", "#login");
    setPage("login");
  }, [stopSpeak]);

  return {
    page,
    role,
    setRole,
    navigate,
    openVoiceCommands,
    closeVoiceCommands,
    resetToLogin,
    stopSpeak,
  };
}
