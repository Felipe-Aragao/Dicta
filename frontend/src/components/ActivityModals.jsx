import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Eye, Trash, Plus } from "@phosphor-icons/react";
import { UploadScreen } from "./UploadScreen";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const normalizeQuestions = (items = []) => (
  items.map((q) => ({
    ...q,
    text: q?.text ?? q?.prompt ?? "",
    options: Array.isArray(q?.options) ? [...q.options] : [],
  }))
);

// Modal de criacao de atividade
export function ActivityCreateModal({ ownerName, onClose, onPreview, loading = false, initialData, showQuestionCount = true }) {
  const [name, setName] = useState(initialData?.name || "");
  const [discipline, setDiscipline] = useState(initialData?.discipline || "");
  const [numQuestions, setNumQuestions] = useState(initialData?.numQuestions || 5);

  const canNext = name.trim().length > 0 && discipline.trim().length > 0 && (!showQuestionCount || numQuestions > 0);

  const handleNext = () => {
    if (!canNext || loading) return;
    onPreview({ 
      name: name.trim(), 
      discipline: discipline.trim(), 
      ownerName,
      ...(showQuestionCount ? { numQuestions } : {})
    });
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
            <input id="ativ-nome" className="text-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Atividade 1, Prova Final..." autoFocus disabled={loading} />
          </div>
          
          <div className="field-wrap">
            <label className="field-label" htmlFor="ativ-disc">Disciplina</label>
            <input id="ativ-disc" className="text-input" type="text" value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Ex: Programacao 3" disabled={loading} />
          </div>
          
          {showQuestionCount && (
            <div className="field-wrap">
              <label className="field-label" htmlFor="ativ-qtd">Quantidade de questões</label>
              <input id="ativ-qtd" className="text-input" type="number" min="1" max="20" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} disabled={loading} />
            </div>
          )}
        </div>

        {ownerName && (
          <p style={{ fontSize: "0.88rem", color: "var(--text-3)", marginBottom: 16 }}>Criado por: {ownerName}</p>
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

export function ActivityPdfModal({
  onClose,
  onStart,
  uploadStatus = "idle",
  uploadError = "",
  onFileSelected,
}) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-pdf-h"
      onClick={(e) => { if (e.target === e.currentTarget && uploadStatus !== "loading") onClose?.(); }}
    >
      <div className="modal-card modal-card-wide">
        <UploadScreen
          onStart={onStart}
          uploadStatus={uploadStatus}
          uploadError={uploadError}
          onFileSelected={onFileSelected}
          showQuestionCount={false}
          title="Adicionar PDF"
          description="Envie o PDF da atividade para extrair as questões automaticamente."
          actionLabel="Extrair questões"
        />
      </div>
    </div>
  );
}

// Modal de pre-visualizacao de atividade (AGORA COM EDIÇÃO DINÂMICA)
export function ActivityPreviewModal({ activity, questions = [], onBack, onConfirm, saving = false }) {
  if (!activity) return null;
  const [draftQuestions, setDraftQuestions] = useState(() => normalizeQuestions(questions));
  const questionCount = draftQuestions.length;

  useEffect(() => {
    setDraftQuestions(normalizeQuestions(questions));
  }, [questions]);

  // Atualiza enunciado
  const updateQuestionText = (index, value) => {
    setDraftQuestions((prev) => prev.map((q, i) => (
      i === index ? { ...q, text: value } : q
    )));
  };

  // Atualiza texto da alternativa
  const updateOptionText = (questionIndex, optionIndex, value) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      const nextOptions = Array.isArray(q.options) ? [...q.options] : [];
      nextOptions[optionIndex] = value;
      return { ...q, options: nextOptions };
    }));
  };

  // Troca o tipo da questão
  const changeQuestionType = (index, newType) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== index) return q;
      return {
        ...q,
        type: newType,
        // Se mudou para múltipla, garante que tenha 4 opções em branco
        options: newType === "multiple" && (!q.options || q.options.length === 0) 
          ? ["", "", "", ""] 
          : q.options
      };
    }));
  };

  // Adiciona uma nova letra (A, B, C, D, E...)
  const addOption = (questionIndex) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      if (q.options.length >= OPTION_LETTERS.length) return q; // Limite de 6 (F)
      return { ...q, options: [...(q.options || []), ""] };
    }));
  };

  // Remove uma letra
  const removeOption = (questionIndex, optionIndex) => {
    setDraftQuestions((prev) => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      return { ...q, options: q.options.filter((_, j) => j !== optionIndex) };
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

  const handleConfirm = () => {
    if (saving) return;
    const cleaned = draftQuestions.map((q) => ({
      ...q,
      text: (q?.text ?? "").trim(),
      options: Array.isArray(q?.options) && q.type === "multiple"
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
              Criando Questionário
            </p>
            <h2 className="modal-title" id="preview-h" style={{ marginBottom: 4 }}>
              {activity.name}
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
              {activity.ownerName} · {activity.discipline}
            </p>
          </div>
          <span className="badge badge-indigo">{questionCount} questões</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 8 }}>
          {draftQuestions.map((q, i) => (
            <div key={q.id ?? i} className="preview-question-item" style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "8px" }}>
              
              {/* Cabeçalho da Questão com Seletor de Tipo */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <p className="preview-question-num" style={{ margin: 0 }}>
                  Questão {i + 1}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    value={q.type}
                    onChange={(e) => changeQuestionType(i, e.target.value)}
                    className="text-input"
                    style={{ width: "auto", padding: "4px 8px", fontSize: "0.85rem", height: "auto" }}
                    disabled={saving}
                  >
                    <option value="open">Dissertativa</option>
                    <option value="multiple">Múltipla Escolha</option>
                  </select>
                  <button
                    className="icon-btn"
                    style={{ color: "var(--red-500)", padding: "8px" }}
                    onClick={() => removeQuestion(i)}
                    disabled={saving || draftQuestions.length <= 1}
                    title="Remover questão"
                    aria-label={`Remover questão ${i + 1}`}
                  >
                    <Trash size={18} weight="bold" />
                  </button>
                </div>
              </div>

              <textarea
                className="text-input"
                placeholder="Digite o enunciado da questão aqui..."
                value={q.text}
                rows={3}
                disabled={saving}
                aria-label={`Questao ${i + 1}`}
                onChange={(e) => updateQuestionText(i, e.target.value)}
                style={{ resize: "vertical" }}
              />
              
              {/* Renderiza as Alternativas Dinâmicas se for Múltipla Escolha */}
              {q.type === "multiple" && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {(q.options || []).map((opt, j) => (
                    <div key={j} className="preview-alt" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="preview-alt-letter" style={{ flexShrink: 0 }}>
                        {OPTION_LETTERS[j] ?? String(j + 1)}
                      </span>
                      <input
                        className="text-input"
                        type="text"
                        placeholder={`Digite a alternativa ${OPTION_LETTERS[j]}`}
                        value={opt}
                        disabled={saving}
                        onChange={(e) => updateOptionText(i, j, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="icon-btn"
                        style={{ color: "var(--red-500)", padding: "8px" }}
                        onClick={() => removeOption(i, j)}
                        disabled={saving || q.options.length <= 2}
                        title="Remover alternativa"
                      >
                        <Trash size={18} weight="bold" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Botão de Adicionar Letra */}
                  {q.options.length < OPTION_LETTERS.length && (
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ alignSelf: "flex-start", marginTop: "4px" }}
                      onClick={() => addOption(i)}
                      disabled={saving}
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
            disabled={saving}
          >
            <Plus size={14} weight="bold" />
            Adicionar Questão
          </button>
        </div>

        <div className="modal-actions" style={{ marginTop: "24px" }}>
          {}
          <button className="btn btn-outline" onClick={() => onBack(draftQuestions)} aria-label="Voltar e editar" disabled={saving}>
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
