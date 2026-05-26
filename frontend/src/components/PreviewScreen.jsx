import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Eye } from "@phosphor-icons/react";

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

  const handleStart = async () => {
    if (isSubmitting) return;
    const cleaned = draftQuestions.map((q) => ({
      ...q,
      text: (q?.text ?? "").trim(),
      options: Array.isArray(q?.options)
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
                  <p className="preview-question-num">
                    Questão {index + 1} · {question?.type === "multiple" ? "Múltipla escolha" : "Dissertativa"}
                  </p>
                  <textarea
                    className="text-input"
                    value={question?.text ?? ""}
                    rows={3}
                    aria-label={`Questão ${index + 1}`}
                    onChange={(e) => updateQuestionText(index, e.target.value)}
                  />
                  {question?.type === "multiple" && Array.isArray(question?.options) && question.options.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="preview-alt">
                          <span className="preview-alt-letter">
                            {OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1)}
                          </span>
                          <input
                            className="text-input"
                            type="text"
                            value={option}
                            aria-label={`Alternativa ${OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1)}`}
                            onChange={(e) => updateOptionText(index, optionIndex, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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