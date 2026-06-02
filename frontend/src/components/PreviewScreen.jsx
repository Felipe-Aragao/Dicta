import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Eye, Plus, Trash } from "@phosphor-icons/react";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const normalizeQuestions = (items = []) => (
  items.map((q) => ({
    ...q,
    text: q?.text ?? q?.prompt ?? "",
    options: Array.isArray(q?.options) ? [...q.options] : [],
  }))
);

export function PreviewScreen({ title = "Prova", questions = [], onBack, onStart }) {
  const [draftQuestions, setDraftQuestions] = useState(() => normalizeQuestions(questions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionCount = draftQuestions.length;

  useEffect(() => {
    setDraftQuestions(normalizeQuestions(questions));
  }, [questions]);

  const updateQuestionText = (index, value) => {
    setDraftQuestions((prev) => prev.map((q, i) => (
      i === index ? { ...q, text: value } : q
    )));
  };

  const updateOptionText = (questionIndex, optionIndex, value) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      const nextOptions = Array.isArray(q.options) ? [...q.options] : [];
      nextOptions[optionIndex] = value;
      return { ...q, options: nextOptions };
    }));
  };

  const changeQuestionType = (index, newType) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== index) return q;
      return {
        ...q,
        type: newType,
        options: newType === "multiple" && (!q.options || q.options.length === 0)
          ? ["", "", "", ""]
          : q.options,
      };
    }));
  };

  const addQuestion = () => {
    setDraftQuestions((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}-${prev.length}`,
        type: "open",
        text: "",
        options: [],
      },
    ]);
  };

  const removeQuestion = (index) => {
    setDraftQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      if ((q.options || []).length >= OPTION_LETTERS.length) return q;
      return { ...q, options: [...(q.options || []), ""] };
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      return { ...q, options: (q.options || []).filter((_, j) => j !== optionIndex) };
    }));
  };

  const handleStart = async () => {
    if (isSubmitting) return;
    const cleaned = draftQuestions.map((q) => ({
      ...q,
      text: (q?.text ?? "").trim(),
      options: Array.isArray(q?.options) && q.type === "multiple"
        ? q.options.map((opt) => (opt ?? "").trim())
        : [],
    }));

    setIsSubmitting(true);
    try {
      await onStart?.(cleaned);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page page-anim">
      <div className="page-wide">
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Pré-visualização da atividade</h2>
            <p className="section-sub">Confira o material antes de iniciar a atividade.</p>
          </div>
          <span className="badge badge-indigo">{questionCount} questões</span>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
                Material enviado
              </p>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.2px" }}>
                {title}
              </h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {questionCount > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20 }}>
              {draftQuestions.map((question, index) => (
                <div key={question?.id ?? index} className="preview-question-item">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <p className="preview-question-num" style={{ margin: 0 }}>
                      Questão {index + 1}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        value={question?.type}
                        onChange={(e) => changeQuestionType(index, e.target.value)}
                        className="text-input"
                        style={{ width: "auto", padding: "4px 8px", fontSize: "0.85rem", height: "auto" }}
                        disabled={isSubmitting}
                      >
                        <option value="open">Dissertativa</option>
                        <option value="multiple">Múltipla Escolha</option>
                      </select>
                      <button
                        className="icon-btn"
                        style={{ color: "var(--red-500)", padding: "8px" }}
                        onClick={() => removeQuestion(index)}
                        disabled={isSubmitting || draftQuestions.length <= 1}
                        title="Remover questão"
                        aria-label={`Remover questão ${index + 1}`}
                      >
                        <Trash size={18} weight="bold" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="text-input"
                    value={question?.text ?? ""}
                    rows={3}
                    aria-label={`Questão ${index + 1}`}
                    disabled={isSubmitting}
                    onChange={(e) => updateQuestionText(index, e.target.value)}
                  />
                  {question?.type === "multiple" && Array.isArray(question?.options) && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="preview-alt" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="preview-alt-letter">
                            {OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1)}
                          </span>
                          <input
                            className="text-input"
                            type="text"
                            value={option}
                            disabled={isSubmitting}
                            aria-label={`Alternativa ${OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1)}`}
                            onChange={(e) => updateOptionText(index, optionIndex, e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="icon-btn"
                            style={{ color: "var(--red-500)", padding: "8px" }}
                            onClick={() => removeOption(index, optionIndex)}
                            disabled={isSubmitting || question.options.length <= 2}
                            title="Remover alternativa"
                          >
                            <Trash size={18} weight="bold" />
                          </button>
                        </div>
                      ))}
                      {question.options.length < OPTION_LETTERS.length && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ alignSelf: "flex-start", marginTop: 4 }}
                          onClick={() => addOption(index)}
                          disabled={isSubmitting}
                        >
                          <Plus size={14} weight="bold" />
                          Adicionar Alternativa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <button
                className="btn btn-outline btn-sm"
                style={{ alignSelf: "flex-start" }}
                onClick={addQuestion}
                disabled={isSubmitting}
              >
                <Plus size={14} weight="bold" />
                Adicionar Questão
              </button>
            </div>
          ) : (
            <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
              Nenhuma questão encontrada.
            </div>
          )}
        </div>

        <div className="nav-row" style={{ marginTop: 20 }}>
          <button className="btn btn-outline" onClick={onBack} aria-label="Voltar para o upload" disabled={isSubmitting}>
            <ArrowLeft size={16} weight="regular" />
            Voltar
          </button>
          <button className="btn btn-primary" onClick={handleStart} aria-label="Iniciar prova" disabled={isSubmitting}>
            <Eye size={17} weight="regular" />
            <CheckCircle size={17} weight="regular" />
            {isSubmitting ? "Salvando..." : "Iniciar prova"}
          </button>
        </div>
      </div>
    </div>
  );
}
