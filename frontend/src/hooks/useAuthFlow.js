import { useCallback, useState } from "react";
import * as authService from "../services/authService";

export function useAuthFlow({ role, navigate, showToast }) {
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleRoleSelect = useCallback((papel) => {
    setAuthError("");
    if (papel === "visitante") navigate("visitor-name", "visitante");
    else navigate("credentials", papel);
  }, [navigate]);

  const handleLogin = useCallback(async ({ email, password }) => {
    if (!role) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const user = await authService.login({ email, password, role });
      setCurrentUser(user);
      setUsername(user.name || "");
      setAuthError("");
      navigate("voice-commands-intro");
    } catch (error) {
      setAuthError(error?.message ?? "Falha ao entrar.");
      showToast(error?.message ?? "Falha ao entrar.");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [navigate, role, showToast]);

  const handleRegister = useCallback(async ({ name, email, password }) => {
    if (!role) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const user = await authService.register({ name, email, password, role });
      setCurrentUser(user);
      setUsername(user.name || "");
      setAuthError("");
      navigate("voice-commands-intro");
    } catch (error) {
      setAuthError(error?.message ?? "Falha ao cadastrar.");
      showToast(error?.message ?? "Falha ao cadastrar.");
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [navigate, role, showToast]);

  const handleVisitorName = useCallback((nome) => {
    setUsername(nome);
    navigate("voice-commands-intro");
  }, [navigate]);

  const resetAuth = useCallback(() => {
    setUsername("");
    setCurrentUser(null);
    setAuthError("");
  }, []);

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
