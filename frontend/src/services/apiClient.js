import { API_BASE_URL } from "../config/api";
import { extractApiErrorMessage } from "../utils/apiError";

export const buildApiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
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
  const response = await fetch(buildApiUrl(path), options);
  if (!response.ok) throw await createApiError(response, fallback);
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
};

export const requestBlob = async (path, options = {}, fallback = "Falha na requisição.") => {
  const response = await fetch(buildApiUrl(path), options);
  if (!response.ok) throw await createApiError(response, fallback);
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
