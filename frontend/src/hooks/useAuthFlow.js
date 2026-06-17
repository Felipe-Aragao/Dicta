import { useCallback, useEffect, useState } from "react";
import { setUnauthorizedHandler } from "../services/apiClient";
import * as authService from "../services/authService";
import { ROUTES, getHomePathForRole } from "../routes";

const shouldRedirectRestoredSession = () => {
  const pathname = window.location.pathname;
  return (
    pathname === "/" ||
    pathname === ROUTES.login ||
    pathname === ROUTES.visitorName ||
    pathname.startsWith("/entrar/")
  );
};

export function useAuthFlow({ role, navigate, showToast, onRoleChange }) {
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

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

  useEffect(() => {
    let active = true;

    const session = authService.restoreSession();
    if (!session?.user) {
      setAuthReady(true);
      return undefined;
    }

    applyUser(session.user);
    onRoleChange?.(session.user.role);
    if (shouldRedirectRestoredSession()) {
      navigate(getHomePathForRole(session.user.role), { replace: true });
    }

    authService.getCurrentUser()
      .then((user) => {
        if (!active) return;
        applyUser(user);
        onRoleChange?.(user.role);
        if (shouldRedirectRestoredSession()) {
          navigate(getHomePathForRole(user.role), { replace: true });
        }
      })
      .catch(() => {
        if (!active) return;
        clearLocalAuth();
        onRoleChange?.(null);
        navigate(ROUTES.login, { replace: true });
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, [applyUser, clearLocalAuth, navigate, onRoleChange]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearLocalAuth();
      onRoleChange?.(null);
      setAuthReady(true);
      showToast("Sessão expirada. Entre novamente.");
      navigate(ROUTES.login, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [clearLocalAuth, navigate, onRoleChange, showToast]);

  const handleRoleSelect = useCallback((papel) => {
    setAuthError("");
    onRoleChange?.(papel);
    if (papel === "visitante") {
      authService.clearSession();
      navigate(ROUTES.visitorName);
    }
    else navigate(ROUTES.credentials(papel));
  }, [navigate, onRoleChange]);

  const handleLogin = useCallback(async ({ email, password }) => {
    if (!role) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const user = await authService.login({ email, password, role });
      applyUser(user);
      onRoleChange?.(user.role || role);
      setAuthError("");
      navigate(ROUTES.voiceIntro, { replace: true });
    } catch (error) {
      setAuthError(error?.message ?? "Falha ao entrar.");
      showToast(error?.message ?? "Falha ao entrar.");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [applyUser, navigate, onRoleChange, role, showToast]);

  const handleRegister = useCallback(async ({ name, email, password }) => {
    if (!role) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const user = await authService.register({ name, email, password, role });
      applyUser(user);
      onRoleChange?.(user.role || role);
      setAuthError("");
      navigate(ROUTES.voiceIntro, { replace: true });
    } catch (error) {
      setAuthError(error?.message ?? "Falha ao cadastrar.");
      showToast(error?.message ?? "Falha ao cadastrar.");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [applyUser, navigate, onRoleChange, role, showToast]);

  const handleVisitorName = useCallback((nome) => {
    setUsername(nome);
    onRoleChange?.("visitante");
    navigate(ROUTES.voiceIntro, { replace: true });
  }, [navigate, onRoleChange]);

  const resetAuth = useCallback(() => {
    clearLocalAuth();
    onRoleChange?.(null);
    setAuthReady(true);
  }, [clearLocalAuth, onRoleChange]);

  return {
    username,
    setUsername,
    currentUser,
    authLoading,
    authReady,
    authError,
    handleRoleSelect,
    handleLogin,
    handleRegister,
    handleVisitorName,
    resetAuth,
  };
}
