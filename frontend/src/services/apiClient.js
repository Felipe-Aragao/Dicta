import { API_BASE_URL } from "../config/api.js";
import { extractApiErrorMessage } from "../utils/apiError.js";

const AUTH_TOKEN_KEY = "dicta.auth.token";
const AUTH_USER_KEY = "dicta.auth.user";
const VISITOR_TOKEN_KEY = "dicta.visitor.token";

let onUnauthorized = null;

export const buildApiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
};

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const getVisitorToken = () => sessionStorage.getItem(VISITOR_TOKEN_KEY);

export const getStoredAuthSession = () => {
  const token = getAuthToken();
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!token || !rawUser) return null;

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const saveAuthSession = ({ accessToken, user }) => {
  if (!accessToken || !user) return;
  clearVisitorSession();
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

export const saveVisitorSession = ({ accessToken }) => {
  if (!accessToken) return;
  clearAuthSession();
  sessionStorage.setItem(VISITOR_TOKEN_KEY, accessToken);
};

export const clearVisitorSession = () => {
  sessionStorage.removeItem(VISITOR_TOKEN_KEY);
};

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const withAuthOptions = (options = {}) => {
  const fetchOptions = { ...options };
  delete fetchOptions.handleUnauthorized;
  const authMode = fetchOptions.authMode;
  delete fetchOptions.authMode;

  const token = authMode === "visitor"
    ? getVisitorToken()
    : getAuthToken() || getVisitorToken();
  if (!token) return fetchOptions;

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return { ...fetchOptions, headers };
};

export const createApiError = async (response, fallback) => {
  let detail = fallback;
  try {
    const data = await response.json();
    detail = extractApiErrorMessage(data?.detail, fallback);
  } catch {
    // Mantem a mensagem padrao quando a API nao retorna JSON.
  }
  const error = new Error(detail);
  error.status = response.status;
  return error;
};

export const requestJson = async (path, options = {}, fallback = "Falha na requisição.") => {
  const response = await fetch(buildApiUrl(path), withAuthOptions(options));
  if (!response.ok) {
    const error = await createApiError(response, fallback);
    if (response.status === 401 && options.handleUnauthorized !== false && onUnauthorized) {
      onUnauthorized(error);
    }
    throw error;
  }
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
};

export const requestBlob = async (path, options = {}, fallback = "Falha na requisição.") => {
  const response = await fetch(buildApiUrl(path), withAuthOptions(options));
  if (!response.ok) {
    const error = await createApiError(response, fallback);
    if (response.status === 401 && options.handleUnauthorized !== false && onUnauthorized) {
      onUnauthorized(error);
    }
    throw error;
  }
  return {
    blob: await response.blob(),
    headers: response.headers,
  };
};

export const jsonOptions = (method, payload) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
