import { useCallback, useEffect, useRef, useState } from "react";
import { setUnauthorizedHandler } from "../services/apiClient";
import * as authService from "../services/authService";

export function useAuthFlow({ role, navigate, showToast }) {
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const restoreAttemptedRef = useRef(false);

  const applyUser = useCallback((user) => {
    setCurrentUser(user);
    setUsername(user?.name || "");
  }, []);

  const clearLocalAuth = useCallback(() => {
    authService.clearSession();
    setUsername("");
    setCurrentUser(null);
    setAuthError("");
  }, []);

  const getHomePageForRole = useCallback((userRole) => {
    if (userRole === "professor") return "professor-home";
    if (userRole === "aluno") return "history";
    return "login";
  }, []);

  useEffect(() => {
    let active = true;
    if (restoreAttemptedRef.current) return undefined;
    restoreAttemptedRef.current = true;

    const session = authService.restoreSession();
    if (!session?.user) return undefined;

    applyUser(session.user);
    navigate(getHomePageForRole(session.user.role), session.user.role);

    authService.getCurrentUser()
      .then((user) => {
        if (!active) return;
        applyUser(user);
        navigate(getHomePageForRole(user.role), user.role);
      })
      .catch(() => {
        if (!active) return;
        clearLocalAuth();
        navigate("login", null);
      });

    return () => {
      active = false;
    };
  }, [applyUser, clearLocalAuth, getHomePageForRole, navigate]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearLocalAuth();
      showToast("Sessão expirada. Entre novamente.");
      navigate("login", null);
    });
    return () => setUnauthorizedHandler(null);
  }, [clearLocalAuth, navigate, showToast]);

  const handleRoleSelect = useCallback((papel) => {
    setAuthError("");
    if (papel === "visitante") {
      authService.clearSession();
      navigate("visitor-name", "visitante");
    }
    else navigate("credentials", papel);
  }, [navigate]);

  const handleLogin = useCallback(async ({ email, password }) => {
    if (!role) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const user = await authService.login({ email, password, role });
      applyUser(user);
      setAuthError("");
      navigate("voice-commands-intro");
    } catch (error) {
      setAuthError(error?.message ?? "Falha ao entrar.");
      showToast(error?.message ?? "Falha ao entrar.");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [applyUser, navigate, role, showToast]);

  const handleRegister = useCallback(async ({ name, email, password }) => {
    if (!role) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const user = await authService.register({ name, email, password, role });
      applyUser(user);
      setAuthError("");
      navigate("voice-commands-intro");
    } catch (error) {
      setAuthError(error?.message ?? "Falha ao cadastrar.");
      showToast(error?.message ?? "Falha ao cadastrar.");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [applyUser, navigate, role, showToast]);

  const handleVisitorName = useCallback((nome) => {
    setUsername(nome);
    navigate("voice-commands-intro");
  }, [navigate]);

  const resetAuth = useCallback(() => {
    clearLocalAuth();
  }, [clearLocalAuth]);

  return {
    username,
    setUsername,
    currentUser,
    authLoading,
    authError,
    handleRoleSelect,
    handleLogin,
    handleRegister,
    handleVisitorName,
    resetAuth,
  };
}
