export const extractApiErrorMessage = (detail, fallback = "Falha na requisição.") => {
  if (typeof detail === "string") {
    const message = detail.trim();
    return message || fallback;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return String(item.msg ?? item.message ?? item.detail ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);

    return messages.join(" ") || fallback;
  }

  if (detail && typeof detail === "object") {
    return extractApiErrorMessage(detail.detail ?? detail.message ?? detail.msg, fallback);
  }

  return fallback;
};