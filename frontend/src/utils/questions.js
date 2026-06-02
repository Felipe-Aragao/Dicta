// Normaliza questoes da API
export const normalizeQuestions = (items = []) => {
  const sorted = [...items].sort((a, b) => {
    const aPos = a?.position ?? 0;
    const bPos = b?.position ?? 0;
    if (aPos !== bPos) return aPos - bPos;
    const aDate = new Date(a?.created_at ?? 0).getTime();
    const bDate = new Date(b?.created_at ?? 0).getTime();
    return aDate - bDate;
  });

  return sorted.map((q) => {
    const options = Array.isArray(q?.options)
      ? [...q.options]
          .sort((a, b) => String(a?.letter || "").localeCompare(String(b?.letter || "")))
          .map((opt) => typeof opt === "string" ? opt : opt?.text ?? "")
      : [];

    return {
      id: q?.id,
      type: q?.type === "multiple" ? "multiple" : "open",
      text: q?.prompt ?? q?.text ?? "",
      options,
    };
  });
};
