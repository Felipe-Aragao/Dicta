import { buildApiUrl, createApiError, jsonOptions, requestJson } from "./apiClient";

export const login = async ({ email, password, role }) => {
  const response = await fetch(buildApiUrl("/auth/login"), jsonOptions("POST", {
    email: email.trim().toLowerCase(),
    password,
    role,
  }));

  if (!response.ok) {
    if (response.status === 422) throw new Error("Email ou senha inválidos.");
    throw await createApiError(response, "Falha ao entrar.");
  }

  const user = await response.json();
  if (user.role && user.role !== role) {
    throw new Error("Perfil selecionado não corresponde ao usuário.");
  }
  return user;
};

export const register = async ({ name, email, password, role }) => {
  const user = await requestJson(
    "/auth/register",
    jsonOptions("POST", {
      role,
      name,
      email: email.trim().toLowerCase(),
      password,
    }),
    "Falha ao cadastrar.",
  );

  if (user.role && user.role !== role) {
    throw new Error("Perfil selecionado não corresponde ao usuário.");
  }
  return user;
};
