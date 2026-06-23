import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, PencilSimple, SpeakerHigh } from "@phosphor-icons/react";
import { useSpeech } from "../hooks/useSpeech";
import { FloatingMicButton } from "./FloatingMicButton";

// Letras das opcoes
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const NUMBER_WORDS = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
};

const parseQuestionNumber = (text) => {
  if (typeof text === "number") return text;

  const digitMatch = text.match(/questao(?:\s+numero)?\s+(\d+)/);
  if (digitMatch) return Number(digitMatch[1]);

  const wordMatch = text.match(/questao(?:\s+numero)?\s+([a-z]+)/);
  return NUMBER_WORDS[wordMatch?.[1]] ?? null;
};

// Encontra resposta da questao
const getAnswerForQuestion = (answers, question, index) => (
  answers.find((item) => item?.questionId === question?.id) ||
  answers.find((item) => item?.qIdx === index)
);

const isAnswered = (answer) => {
  if (!answer) return false;
  if (answer?.chosenLetter) return true;

  const responseText = String(answer?.responseText ?? "").trim();
  return Boolean(responseText && responseText !== "(sem resposta)");
};

// Formata resposta para exibicao
const formatAnswer = (question, answer) => {
  if (!isAnswered(answer)) return "Sem resposta";

  if (question?.type === "multiple") {
    const letter = answer?.chosenLetter ?? null;
    if (letter) {
      const optionIndex = OPTION_LETTERS.indexOf(letter);
      const optionText = question?.options?.[optionIndex];
      return optionText ? `${letter} - ${optionText}` : letter;
    }
    if (answer?.responseText) return answer.responseText;
  }

  return answer?.responseText || "Sem resposta";
};

// Tela de revisao de respostas
export function ReviewScreen({ questions = [], answers = [], onEdit, onConfirm }) {
  const hasQuestions = Array.isArray(questions) && questions.length > 0;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const itemRefs = useRef([]);

  const { startRec, setCommands, speak, stopRec, recognitionError, clearRecognitionError } = useSpeech();

  const reviewItems = useMemo(() => (
    questions.map((question, index) => {
      const answer = getAnswerForQuestion(answers, question, index);
      return {
        question,
        answer,
        answered: isAnswered(answer),
        formattedAnswer: formatAnswer(question, answer),
      };
    })
  ), [answers, questions]);

  const answeredCount = reviewItems.filter((item) => item.answered).length;
  const unansweredCount = Math.max(reviewItems.length - answeredCount, 0);

  useEffect(() => {
    setFocusedIndex((current) => Math.max(0, Math.min(current, Math.max(questions.length - 1, 0))));
  }, [questions.length]);

  const buildQuestionSummary = useCallback((index) => {
    const item = reviewItems[index];
    if (!item) return "Essa questão não existe.";

    const questionText = item.question?.text || "Questão sem enunciado";
    const typeLabel = item.question?.type === "multiple" ? "múltipla escolha" : "dissertativa";
    const answerText = item.answered
      ? `Sua resposta foi: ${item.formattedAnswer}.`
      : "Esta questão está sem resposta.";

    return `Questão ${index + 1} de ${reviewItems.length}, ${typeLabel}. ${questionText}. ${answerText}`;
  }, [reviewItems]);

  const focusQuestion = useCallback((index, shouldSpeak = true) => {
    if (index < 0 || index >= reviewItems.length) {
      speak("Essa questão não existe.");
      return;
    }

    setFocusedIndex(index);
    itemRefs.current[index]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (shouldSpeak) speak(buildQuestionSummary(index));
  }, [buildQuestionSummary, reviewItems.length, speak]);

  const goToQuestionNumber = useCallback((spokenTextOrNumber) => {
    const questionNumber = parseQuestionNumber(spokenTextOrNumber);
    if (!questionNumber) {
      speak("Essa questão não existe.");
      return;
    }

    focusQuestion(questionNumber - 1);
  }, [focusQuestion, speak]);

  const speakInitialReview = useCallback(() => {
    if (!hasQuestions) {
      speak("Tela de revisão. Nenhuma questão encontrada.");
      return;
    }

    const pendingText = unansweredCount > 0
      ? `Há ${unansweredCount} questão${unansweredCount === 1 ? "" : "ões"} sem resposta. `
      : "Todas as questões têm resposta. ";

    speak(
      `Tela de revisão. Você respondeu ${answeredCount} de ${reviewItems.length} questões. ` +
      pendingText +
      "Diga próxima para revisar uma por uma, questão mais o número para ir direto, alterar para corrigir a questão atual, ou confirmar para entregar."
    );
  }, [answeredCount, hasQuestions, reviewItems.length, speak, unansweredCount]);

  const toggleMicListening = useCallback(() => {
    if (recognitionError) {
      clearRecognitionError();
      setMicEnabled(true);
      return;
    }

    setMicEnabled((enabled) => !enabled);
  }, [clearRecognitionError, recognitionError]);

  useEffect(() => {
    if (!micEnabled || recognitionError) {
      stopRec();
      return undefined;
    }

    const timer = setTimeout(() => {
      startRec(() => {});
      speakInitialReview();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopRec();
    };
  }, [micEnabled, recognitionError, speakInitialReview, startRec, stopRec]);

  useEffect(() => {
    setCommands([
      { phrase: "proxima", action: () => focusQuestion(Math.min(focusedIndex + 1, reviewItems.length - 1)) },
      { phrase: "proxima questao", action: () => focusQuestion(Math.min(focusedIndex + 1, reviewItems.length - 1)) },
      { phrase: "anterior", action: () => focusQuestion(Math.max(focusedIndex - 1, 0)) },
      { phrase: "repetir", action: () => speak(buildQuestionSummary(focusedIndex)) },
      { phrase: "ouvir questao", action: () => speak(reviewItems[focusedIndex]?.question?.text || "Questão sem enunciado") },
      { phrase: "ouvir resposta", action: () => speak(reviewItems[focusedIndex]?.answered ? reviewItems[focusedIndex].formattedAnswer : "Esta questão está sem resposta.") },
      { phrase: "ouvir minha resposta", action: () => speak(reviewItems[focusedIndex]?.answered ? reviewItems[focusedIndex].formattedAnswer : "Esta questão está sem resposta.") },
      { phrase: "alterar questao", action: () => { if (onEdit) onEdit(focusedIndex); } },
      { phrase: "editar questao", action: () => { if (onEdit) onEdit(focusedIndex); } },
      { phrase: "alterar", action: () => { if (onEdit) onEdit(focusedIndex); } },
      { phrase: "voltar", action: () => { if (onEdit) onEdit(focusedIndex); } },
      { phrase: "confirmar e finalizar", action: () => { if (onConfirm) onConfirm(); } },
      { phrase: "confirmar", action: () => { if (onConfirm) onConfirm(); } },
      { phrase: "finalizar", action: () => { if (onConfirm) onConfirm(); } },
      {
        phrase: "ajuda",
        action: () => speak(
          "Na revisão, diga próxima, anterior, questão mais o número, repetir, ouvir questão, ouvir resposta, alterar para corrigir, ou confirmar para entregar."
        ),
      },
      {
        matcher: (cleanText) => parseQuestionNumber(cleanText) !== null,
        action: (cleanText) => goToQuestionNumber(cleanText),
      },
    ]);
  }, [buildQuestionSummary, focusQuestion, focusedIndex, goToQuestionNumber, onConfirm, onEdit, reviewItems, setCommands, speak]);

  const micStatus = recognitionError ? "unavailable" : micEnabled ? "active" : "muted";

  return (
    <>
      <FloatingMicButton status={micStatus} onToggle={toggleMicListening} />
      <div className="page page-anim">
      <div className="page-wide">
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Revisar respostas</h2>
            <p className="section-sub">Confira tudo antes de finalizar</p>
          </div>
        </div>

        <div className="review-summary" role="status" aria-live="polite">
          <span>{reviewItems.length} questões</span>
          <span>{answeredCount} respondidas</span>
          <span>{unansweredCount} sem resposta</span>
        </div>

        {hasQuestions ? (
          <div className="review-list" aria-label="Lista de respostas para revisão">
            {reviewItems.map((item, index) => {
              const isFocused = index === focusedIndex;
              const typeLabel = item.question?.type === "multiple" ? "Múltipla escolha" : "Dissertativa";

              return (
                <article
                  key={item.question?.id ?? index}
                  ref={(node) => { itemRefs.current[index] = node; }}
                  className={`review-item${isFocused ? " focused" : ""}`}
                  aria-current={isFocused ? "true" : undefined}
                >
                  <button
                    type="button"
                    className="review-item-main"
                    onClick={() => focusQuestion(index, false)}
                    aria-label={`Selecionar questão ${index + 1}`}
                  >
                    <span className="review-question-number">Questão {index + 1}</span>
                    <span className="review-question-text">{item.question?.text || "Questão sem enunciado"}</span>
                    <span className="review-answer">{item.formattedAnswer}</span>
                  </button>

                  <div className="review-item-side">
                    <span className="q-meta-badge">{typeLabel}</span>
                    <span className={`badge ${item.answered ? "badge-green" : "badge-yellow"}`}>
                      {item.answered ? "Respondida" : "Sem resposta"}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => speak(buildQuestionSummary(index))}
                      aria-label={`Ouvir resumo da questão ${index + 1}`}
                    >
                      <SpeakerHigh size={15} weight="regular" /> Ouvir
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onEdit?.(index)}
                      aria-label={`Editar questão ${index + 1}`}
                    >
                      <PencilSimple size={15} weight="regular" /> Editar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
            Nenhuma questão encontrada.
          </div>
        )}

        <div className="nav-row" style={{ marginTop: 20 }}>
          <button
            className="btn btn-outline"
            onClick={() => focusQuestion(Math.max(focusedIndex - 1, 0))}
            disabled={!hasQuestions || focusedIndex === 0}
            aria-label="Questão anterior"
          >
            <ArrowLeft size={16} weight="regular" /> Anterior
          </button>
          <button
            className="btn btn-outline"
            onClick={() => focusQuestion(Math.min(focusedIndex + 1, reviewItems.length - 1))}
            disabled={!hasQuestions || focusedIndex >= reviewItems.length - 1}
            aria-label="Próxima questão"
          >
            Próxima <ArrowRight size={16} weight="regular" />
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            aria-label="Confirmar e finalizar questionário"
          >
            <Check size={16} weight="bold" /> Confirmar e finalizar
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
