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

// Modal de criacao de atividade
export function ActivityCreateModal({ ownerName, onClose, onPreview, loading = false }) {
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState("");

  const canNext = name.trim().length > 0 && discipline.trim().length > 0;

  const handleNext = () => {
    if (!canNext || loading) return;
    onPreview({ name: name.trim(), discipline: discipline.trim(), ownerName });
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-h"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="modal-card">
        <h2 className="modal-title" id="modal-h">Nova Atividade</h2>

        <div className="field-group">
          <div className="field-wrap">
            <label className="field-label" htmlFor="ativ-nome">Nome da atividade</label>
            <input
              id="ativ-nome"
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Atividade 1, Prova Final..."
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="field-wrap">
            <label className="field-label" htmlFor="ativ-disc">Disciplina</label>
            <input
              id="ativ-disc"
              className="text-input"
              type="text"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              placeholder="Ex: Programacao 3"
              disabled={loading}
            />
          </div>
        </div>

        {ownerName && (
          <p style={{ fontSize: "0.88rem", color: "var(--text-3)", marginBottom: 16 }}>
            Criado por: {ownerName}
          </p>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" disabled={!canNext || loading} onClick={handleNext}>
            <Eye size={17} weight="regular" />
            {loading ? "Carregando..." : "Pre-visualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de pre-visualizacao de atividade
export function ActivityPreviewModal({ activity, questions = [], onBack, onConfirm, saving = false }) {
  if (!activity) return null;
  const [draftQuestions, setDraftQuestions] = useState(() => normalizeQuestions(questions));
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

  const handleConfirm = () => {
    if (saving) return;
    const cleaned = draftQuestions.map((q) => ({
      ...q,
      text: (q?.text ?? "").trim(),
      options: Array.isArray(q?.options)
        ? q.options.map((opt) => (opt ?? "").trim())
        : [],
    }));
    onConfirm?.(cleaned);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="preview-h">
      <div className="modal-card modal-card-wide">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
              Pre-visualizacao
            </p>
            <h2 className="modal-title" id="preview-h" style={{ marginBottom: 4 }}>
              {activity.name}
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
              {activity.ownerName} · {activity.discipline}
            </p>
          </div>
          <span className="badge badge-indigo">{questionCount} questoes</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
          {draftQuestions.map((q, i) => (
            <div key={q.id ?? i} className="preview-question-item">
              <p className="preview-question-num">
                Questao {i + 1} · {q.type === "multiple" ? "Multipla escolha" : "Dissertativa"}
              </p>
              <textarea
                className="text-input"
                value={q.text}
                rows={3}
                disabled={saving}
                aria-label={`Questao ${i + 1}`}
                onChange={(e) => updateQuestionText(i, e.target.value)}
              />
              {q.type === "multiple" && q.options && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.options.map((opt, j) => (
                    <div key={j} className="preview-alt">
                      <span className="preview-alt-letter">
                        {OPTION_LETTERS[j] ?? String(j + 1)}
                      </span>
                      <input
                        className="text-input"
                        type="text"
                        value={opt}
                        disabled={saving}
                        aria-label={`Alternativa ${OPTION_LETTERS[j] ?? String(j + 1)}`}
                        onChange={(e) => updateOptionText(i, j, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onBack} aria-label="Voltar e editar" disabled={saving}>
            <ArrowLeft size={16} weight="regular" />
            Voltar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} aria-label="Confirmar e publicar atividade" disabled={saving}>
            <CheckCircle size={17} weight="regular" />
            {saving ? "Salvando..." : "Confirmar e Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
