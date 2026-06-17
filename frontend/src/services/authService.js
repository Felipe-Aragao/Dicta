import {
  buildApiUrl,
  clearAuthSession,
  clearVisitorSession,
  createApiError,
  getStoredAuthSession,
  jsonOptions,
  requestJson,
  saveAuthSession,
} from "./apiClient";

const persistAuthResponse = (data) => {
  const user = data?.user;
  const accessToken = data?.access_token;
  if (!user || !accessToken) {
    throw new Error("Resposta de autenticação inválida.");
  }
  saveAuthSession({ accessToken, user });
  return user;
};

export const login = async ({ email, password, role }) => {
  clearVisitorSession();
  const response = await fetch(buildApiUrl("/auth/login"), jsonOptions("POST", {
    email: email.trim().toLowerCase(),
    password,
    role,
  }));

  if (!response.ok) {
    if (response.status === 422) throw new Error("Email ou senha inválidos.");
    throw await createApiError(response, "Falha ao entrar.");
  }

  const user = persistAuthResponse(await response.json());
  if (user.role && user.role !== role) {
    clearAuthSession();
    throw new Error("Perfil selecionado não corresponde ao usuário.");
  }
  return user;
};

export const register = async ({ name, email, password, role }) => {
  clearVisitorSession();
  const data = await requestJson(
    "/auth/register",
    jsonOptions("POST", {
      role,
      name,
      email: email.trim().toLowerCase(),
      password,
    }),
    "Falha ao cadastrar.",
  );

  const user = persistAuthResponse(data);
  if (user.role && user.role !== role) {
    clearAuthSession();
    throw new Error("Perfil selecionado não corresponde ao usuário.");
  }
  return user;
};

export const getCurrentUser = () => (
  requestJson("/auth/me", { handleUnauthorized: false }, "Sessão expirada. Entre novamente.")
);

export const updateProfile = async ({ name, profileImageUrl }) => {
  const user = await requestJson(
    "/auth/me",
    jsonOptions("PATCH", {
      name,
      profile_image_url: profileImageUrl,
    }),
    "Falha ao atualizar perfil.",
  );
  const session = getStoredAuthSession();
  saveAuthSession({ accessToken: session?.token, user });
  return user;
};

export const deleteCurrentUser = async () => {
  await requestJson("/auth/me", { method: "DELETE" }, "Falha ao excluir conta.");
  clearSession();
};

export const restoreSession = () => getStoredAuthSession();

export const clearSession = () => {
  clearAuthSession();
  clearVisitorSession();
};

export const clearUserSession = () => clearAuthSession();
