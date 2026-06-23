import { useState, useEffect, useRef, useCallback } from "react";
import {
  SpeakerHigh,
  Microphone,
  StopCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ArrowCounterClockwise,
  PencilSimple,
  ListNumbers,
  X,
} from "@phosphor-icons/react";
import { useSpeech } from "../hooks/useSpeech";
import { SlidersHorizontal } from "@phosphor-icons/react";
import { AudioSettings } from "./AudioSettings"; 
import { FloatingMicButton } from "./FloatingMicButton";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
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
  const digitMatch = text.match(/questao(?:\s+numero)?\s+(\d+)/);
  if (digitMatch) return Number(digitMatch[1]);

  const wordMatch = text.match(/questao(?:\s+numero)?\s+([a-z]+)/);
  return NUMBER_WORDS[wordMatch?.[1]] ?? null;
};

// ─── Alternativas ────────────────────────────────────────────────
function Alternatives({ options, selectedAlt, onSelect }) {
  return (
    <div className="alts" role="radiogroup" aria-label="Alternativas de resposta">
      {options.map((opt, i) => (
        <button
          key={i}
          className={`alt-btn${selectedAlt === i ? " selected" : ""}`}
          role="radio"
          aria-checked={selectedAlt === i}
          onClick={() => onSelect(i)}
          aria-label={`Alternativa ${LETTERS[i]}: ${opt}`}
        >
          <span className="alt-letter" aria-hidden="true">{LETTERS[i]}</span>
          <span>{opt}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Painel de Voz ───────────────────────────────────────────────
function VoicePanel({ recording, transcription, interimText, onToggle }) {
  return (
    <div className="voice-panel">
      {recording && (
        <div className="waveform" aria-hidden="true">
          {[...Array(7)].map((_, i) => <div key={i} className="wave-bar" />)}
        </div>
      )}
      <button
        className={`mic-btn${recording ? " rec" : ""}`}
        onClick={onToggle}
        aria-label={recording ? "Parar gravação" : "Iniciar gravação de voz"}
        aria-pressed={recording}
      >
        {recording
          ? <StopCircle size={32} weight="regular" />
          : <Microphone size={32} weight="regular" />}
      </button>
      <p
        className={`voice-label${recording ? " rec" : ""}`}
        role="status"
        aria-live="polite"
      >
        {recording
          ? "Gravando — diga 'parar' ou clique"
          : transcription
          ? "Gravação concluída"
          : "Diga 'gravar' ou clique para responder"}
      </p>

      {/* Texto em tempo real aparecendo em cinza */}
      {recording && interimText && (
        <p style={{ color: "gray", fontStyle: "italic", marginTop: "10px", fontSize: "0.9rem" }}>
          Ouvindo: {interimText}
        </p>
      )}
    </div>
  );
}

// ─── Tela principal ──────────────────────────────────────────────
export function QuestionScreen({
  questions,
  onComplete,
  onProgress,
  loading = false,
  error = "",
  initialAnswers = [],
  initialIndex = 0,
  resetKey = 0,
}) {
  const [idx, setIdx]                     = useState(0);
  const [answerMode, setAnswerMode]       = useState(false); 
  const [recording, setRecording]         = useState(false);
  const [transcription, setTranscription] = useState("");
  const [interimText, setInterimText]     = useState(""); 
  const [selectedAlt, setSelectedAlt]     = useState(null);
  const [answers, setAnswers]             = useState([]);
  const [savingAnswer, setSavingAnswer]   = useState(false);
  const [showHelp, setShowHelp]           = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [questionNavOpen, setQuestionNavOpen] = useState(false);

  const { speak, startRec, stopRec, setCommands, recognitionError, clearRecognitionError } = useSpeech();

  const q          = questions?.[idx];
  const isLast     = idx === (questions?.length ?? 0) - 1;
  const isMultiple = q?.type === "multiple";
  const pct        = questions?.length ? Math.round(((idx + 1) / questions.length) * 100) : 0;

  const isRecordingRef = useRef(false);
  const savingAnswerRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = recording;
  }, [recording]);

  // LIGA O MICROFONE E CAPTURA TEXTO (Com filtro anti-vazamento de comandos)
  useEffect(() => {
    if (!micEnabled || recognitionError) {
      stopRec();
      return undefined;
    }

    const timer = setTimeout(() => {
      const started = startRec((textoFinal, textoTemporario) => {
        if (!isRecordingRef.current) return; 

        if (textoFinal) {
          // Filtro Regex: Remove "gravar" ou "parar" se eles vierem de bônus no início do texto
          const textoLimpo = textoFinal
            .replace(/^gravar\s*/i, "")
            .replace(/^parar\s*/i, "");

          if (textoLimpo.trim()) {
            setTranscription((prev) => prev + (prev ? " " : "") + textoLimpo);
          }
        }
        
        // Aplica a limpeza também no texto cinza temporário
        const temporarioLimpo = textoTemporario
          .replace(/^gravar\s*/i, "")
          .replace(/^parar\s*/i, "");
        setInterimText(temporarioLimpo || "");
      });

      if (!started) {
        setRecording(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      stopRec();
    };
  }, [micEnabled, recognitionError, startRec, stopRec]);

  useEffect(() => {
    const normalizedIndex = Math.max(0, Math.min(initialIndex ?? 0, Math.max((questions?.length ?? 1) - 1, 0)));

    setIdx(normalizedIndex);
    setAnswerMode(false);
    setRecording(false);
    setTranscription("");
    setInterimText("");
    setSelectedAlt(null);
  }, [initialIndex, questions, resetKey]);

  useEffect(() => {
    setAnswers(Array.isArray(initialAnswers) ? [...initialAnswers] : []);
  }, [initialAnswers]);

  const getStoredAnswer = useCallback((questionId, questionIndex) => (
    answers.find((item) => item?.questionId === questionId) ||
    answers.find((item) => item?.qIdx === questionIndex)
  ), [answers]);

  const isQuestionAnswered = useCallback((question, questionIndex) => {
    const answer = getStoredAnswer(question?.id, questionIndex);
    if (!answer) return false;
    if (answer?.chosenLetter) return true;

    const responseText = String(answer?.responseText ?? "").trim();
    return Boolean(responseText && responseText !== "(sem resposta)");
  }, [getStoredAnswer]);

  const initialWarning = useRef(false);

  useEffect(() => {
    if (!q) return;
    setAnswerMode(false);
    
    const timer = setTimeout(() => {
      // Se for a primeira questão e o aviso ainda não tiver tocado
      if (idx === 0 && !initialWarning.current) {
        speak(`Caso esqueça de algum comando, diga ajuda. ${q.text}`);
        initialWarning.current = true; // Marca que já avisou
      } else {
        // Para todas as outras questões, lê normalmente
        speak(q.text);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [idx, q, speak]);

  useEffect(() => {
    if (!q) return;
    const stored = getStoredAnswer(q?.id, idx);

    if (q?.type === "multiple") {
      const storedLetter = stored?.chosenLetter ?? null;
      const byLetter = storedLetter ? LETTERS.indexOf(storedLetter) : -1;
      const byText = stored?.responseText
        ? q.options.findIndex((opt) => opt === stored.responseText)
        : -1;
      const nextIndex = byLetter >= 0 ? byLetter : byText;
      setSelectedAlt(nextIndex >= 0 ? nextIndex : null);
      setTranscription("");
    } else {
      setTranscription(stored?.responseText ?? "");
      setSelectedAlt(null);
    }
    setRecording(false);
    setInterimText("");
  }, [getStoredAnswer, idx, q]);

  const toggleRec = () => {
    if (!micEnabled || recognitionError) return;
    setRecording(!recording);
  };

  const toggleMicListening = () => {
    if (recognitionError) {
      clearRecognitionError();
      setMicEnabled(true);
      return;
    }

    setMicEnabled((enabled) => {
      const nextEnabled = !enabled;
      if (!nextEnabled) {
        setRecording(false);
        setInterimText("");
      }
      return nextEnabled;
    });
  };

  const handleSelectAlt = useCallback((i) => {
    setSelectedAlt(i);
    speak(q.options[i]);
  }, [q, speak]);

  const buildCurrentAnswer = useCallback(() => {
    if (!q) return null;

    const chosenLetter = isMultiple && selectedAlt !== null ? LETTERS[selectedAlt] ?? null : null;
    const responseText = isMultiple
      ? q.options?.[selectedAlt] ?? "(sem resposta)"
      : transcription || "(sem resposta)";

    return {
      qIdx: idx,
      questionId: q?.id ?? null,
      type: isMultiple ? "multiple" : "open",
      responseText,
      chosenLetter,
    };
  }, [idx, isMultiple, q, selectedAlt, transcription]);

  const mergeAnswer = useCallback((currentAnswers, answer) => {
    const nextAnswers = [...currentAnswers];
    const existingIndex = nextAnswers.findIndex((item) => (
      item?.questionId && answer.questionId
        ? item.questionId === answer.questionId
        : item?.qIdx === answer.qIdx
    ));

    if (existingIndex >= 0) nextAnswers[existingIndex] = answer;
    else nextAnswers.push(answer);
    return nextAnswers;
  }, []);

  const resetQuestionDraft = useCallback(() => {
    setTranscription("");
    setInterimText("");
    setSelectedAlt(null);
    setRecording(false);
  }, []);

  const saveCurrentAnswer = useCallback(async ({ complete = false, targetIndex = null } = {}) => {
    if (savingAnswerRef.current || !q) return;
    savingAnswerRef.current = true;
    setSavingAnswer(true);

    try {
      const ans = buildCurrentAnswer();
      const nextAnswers = mergeAnswer(answers, ans);
      setAnswers(nextAnswers);

      if (complete) {
        await onComplete(nextAnswers);
        return;
      }

      if (onProgress) {
        await onProgress(nextAnswers);
      }

      const shouldMove = typeof targetIndex === "number" && targetIndex !== idx;
      if (shouldMove) {
        setIdx(targetIndex);
        resetQuestionDraft();
      }
    } catch {
      return;
    } finally {
      savingAnswerRef.current = false;
      setSavingAnswer(false);
    }
  }, [answers, buildCurrentAnswer, idx, mergeAnswer, onComplete, onProgress, q, resetQuestionDraft]);

  const saveAndNext = useCallback(async () => {
    await saveCurrentAnswer({
      complete: isLast,
      targetIndex: isLast ? null : idx + 1,
    });
  }, [idx, isLast, saveCurrentAnswer]);

  const goToQuestionIndex = useCallback(async (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= (questions?.length ?? 0)) {
      speak("Essa questão não existe.");
      return;
    }

    await saveCurrentAnswer({ targetIndex });
    setQuestionNavOpen(false);
  }, [questions?.length, saveCurrentAnswer, speak]);

  const goToSpokenQuestion = useCallback(async (spokenText) => {
    const questionNumber = parseQuestionNumber(spokenText);
    if (!questionNumber) {
      speak("Essa questão não existe.");
      return;
    }

    await goToQuestionIndex(questionNumber - 1);
  }, [goToQuestionIndex, speak]);

  const finishFromVoice = useCallback(async () => {
    await saveCurrentAnswer({ complete: true });
  }, [saveCurrentAnswer]);

  const goBack = useCallback(() => {
    if (idx <= 0) return;
    setIdx((i) => i - 1);
    resetQuestionDraft();
  }, [idx, resetQuestionDraft]);

  const hasQuestionNumberCommand = useCallback((cleanText) => (
    parseQuestionNumber(cleanText) !== null
  ), []);

  //  Bloqueia ações de navegação se "recording" for verdadeiro
  useEffect(() => {
    setCommands([
      { phrase: "proxima", action: () => { if (!recording && !savingAnswerRef.current) saveAndNext(); } },
      { phrase: "proxima questao", action: () => { if (!recording && !savingAnswerRef.current) saveAndNext(); } },
      { phrase: "anterior", action: () => { if (!recording) goBack(); } },
      { phrase: "repetir", action: () => { if (!recording && q) speak(q.text); } },
      { phrase: "repet", action: () => { if (!recording && q) speak(q.text); } }, 
      { phrase: "ouvir alternativas", action: () => {
        if (!recording && isMultiple && q?.options) {
          const textoOpcoes = q.options.map((opt, i) => `Letra ${LETTERS[i]}, ${opt}`).join(". ");
          speak(`As alternativas são: ${textoOpcoes}`);
        }
      } },
      { phrase: "ouvir minha resposta", action: () => {
        if (!recording) {
          if (isMultiple && selectedAlt !== null) speak(q.options[selectedAlt]);
          else if (!isMultiple && transcription) speak(transcription);
        }
      } },
      { phrase: "ouvir resposta", action: () => {
        if (!recording) {
          if (isMultiple && selectedAlt !== null) speak(q.options[selectedAlt]);
          else if (!isMultiple && transcription) speak(transcription);
        }
      } },
      { phrase: "ajuda", action: () => { 
        if (!recording) {
          if (!isMultiple) {
            speak(
              "Diga responder para abrir a tela de resposta. " +
              "Diga gravar para iniciar a sua resposta. " +
              "Ao finalizar, diga parar para interromper a gravação. " +
              "Se desejar alterar, diga refazer para apagar o progresso. " + 
              "Diga ouvir minha resposta para ouvir sua resposta. " +
              "Diga próxima para avançar o questionário. " + 
              "Diga anterior para voltar na questão anterior. "
            );
          } else {
            speak(
              "Diga responder para visualizar as opções. " +
              "Diga ouvir alternativas para escutar os itens. " +
              "E use os comandos letra A, letra B ou a alternativa desejada para marcar. " +
              "Diga ouvir minha resposta para ouvir sua resposta. " +
              "Diga próxima para avançar o questionário. " + 
              "Diga anterior para uma voltar na questão anterior. "
            );
          }
        }
      } },
      { phrase: "voltar", action: () => { 
        if (showHelp) { 
          setShowHelp(false); 
        } 
      } },
      { phrase: "responder", action: () => { if (!recording) setAnswerMode(true); } },
      { phrase: "gravar", action: () => { if (micEnabled && !recognitionError) setRecording(true); } }, 
      { phrase: "parar", action: () => setRecording(false) }, 
      { phrase: "refazer", action: () => { setTranscription(""); setInterimText(""); setRecording(false); } },
      { phrase: "finalizar", action: () => { if (!recording && !savingAnswerRef.current) finishFromVoice(); } },
      { phrase: "letra a", action: () => { if (!recording && isMultiple) handleSelectAlt(0); } },
      { phrase: "letra b", action: () => { if (!recording && isMultiple) handleSelectAlt(1); } },
      { phrase: "letra c", action: () => { if (!recording && isMultiple) handleSelectAlt(2); } },
      { phrase: "letra d", action: () => { if (!recording && isMultiple) handleSelectAlt(3); } },
      { phrase: "letra e", action: () => { if (!recording && isMultiple) handleSelectAlt(4); } },
      { phrase: "letra f", action: () => { if (!recording && isMultiple) handleSelectAlt(5); } },
      {
        matcher: hasQuestionNumberCommand,
        action: (cleanText) => { if (!recording && !savingAnswerRef.current) goToSpokenQuestion(cleanText); },
      },
    ]);
  }, [answerMode, finishFromVoice, goBack, goToSpokenQuestion, handleSelectAlt, hasQuestionNumberCommand, isMultiple, micEnabled, recognitionError, recording, saveAndNext, selectedAlt, setCommands, showHelp, speak, transcription, q]);

  const micStatus = recognitionError ? "unavailable" : micEnabled ? "active" : "muted";

  if (loading) {
    return (
      <div className="page page-anim">
        <div className="page-narrow">
          <div className="card" role="status" aria-live="polite">
            Carregando questoes...
          </div>
        </div>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <div className="page page-anim">
        <div className="page-narrow">
          <div className="card" role="status" aria-live="polite">
            {error || "Nenhuma questao encontrada."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <FloatingMicButton status={micStatus} onToggle={toggleMicListening} />
      <button
        type="button"
        className="question-nav-toggle"
        onClick={() => setQuestionNavOpen(true)}
        aria-label="Abrir lista de questões"
        title="Abrir lista de questões"
      >
        <ListNumbers size={28} weight="bold" />
      </button>

      {questionNavOpen && (
        <div
          className="question-nav-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setQuestionNavOpen(false);
          }}
        >
          <aside className="question-nav-panel" aria-label="Selecionar questão">
            <div className="question-nav-head">
              <div>
                <p className="question-nav-kicker">Prova</p>
                <h2>Questões</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setQuestionNavOpen(false)}
                aria-label="Fechar lista de questões"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="question-nav-list">
              {questions.map((question, questionIndex) => {
                const isCurrent = questionIndex === idx;
                const answered = isQuestionAnswered(question, questionIndex);

                return (
                  <button
                    key={question?.id ?? questionIndex}
                    type="button"
                    className={`question-nav-item${isCurrent ? " current" : ""}`}
                    onClick={() => goToQuestionIndex(questionIndex)}
                    disabled={savingAnswer}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span>Questão {questionIndex + 1}</span>
                    <span className={`badge ${answered ? "badge-green" : "badge-yellow"}`}>
                      {answered ? "Respondida" : "Sem resposta"}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      <div className="prog-bar-wrap">
        <div className="prog-bar-inner" style={{ maxWidth: "var(--shell-max)" }}>
          <div className="prog-meta">
            <span className="prog-label">Questão {idx + 1} de {questions.length}</span>
            <span className="prog-pct">{pct}%</span>
          </div>
          <div className="prog-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="prog-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="page page-anim">
        <div className="page-wide">

          {!answerMode && (
            <div className="question-reading">
              <div className="card">
                <div className="q-meta">
                  <span className="q-meta-badge">
                    {isMultiple ? "Múltipla escolha" : "Dissertativa"}
                  </span>
                </div>
                <p className="q-text">{q.text}</p>

                <div className="reading-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => speak(q.text)} aria-label="Ouvir questão em voz alta">
                    <SpeakerHigh size={17} weight="regular" /> Ouvir questão
                  </button>

                  {/* BOTÃO DE AJUSTES */}
                  <button 
                    className="btn btn-outline btn-sm" 
                    onClick={() => setShowSettings(!showSettings)} 
                    aria-label="Ajustar velocidade e voz"
                  >
                    <SlidersHorizontal size={17} weight="regular" /> Ajustes de Voz
                  </button>

                  <button className="btn btn-primary" onClick={() => setAnswerMode(true)} aria-label="Ir para o campo de resposta">
                    <PencilSimple size={17} weight="regular" /> Responder
                  </button>
                </div>
              </div>

              {/*  PAINEL DE CONFIGURAÇÕES */}
              {showSettings && (
                <div style={{ marginTop: "16px" }}>
                  <AudioSettings />
                </div>
              )}

              <div className="nav-row">
              </div>

              <div className="nav-row">
                <button className="btn btn-outline" disabled={idx === 0} onClick={goBack} aria-label="Questão anterior">
                  <ArrowLeft size={16} weight="regular" /> Anterior
                </button>
                <button className="btn btn-primary" onClick={saveAndNext} disabled={savingAnswer} aria-label={isLast ? "Finalizar questionário" : "Próxima questão"}>
                  {isLast ? <><Check size={16} weight="bold" /> Finalizar</> : <>Próxima <ArrowRight size={16} weight="regular" /></>}
                </button>
              </div>
            </div>
          )}

          {answerMode && (
            <>
              <div className="question-layout">
                <div className="card">
                  <div className="q-meta">
                    <span className="q-meta-badge">
                      {isMultiple ? "Múltipla escolha" : "Dissertativa"}
                    </span>
                  </div>
                  <p className="q-text">{q.text}</p>

                  <div className="action-row">
                    <button className="btn btn-outline btn-sm" onClick={() => speak(q.text)} aria-label="Ouvir questão em voz alta">
                      <SpeakerHigh size={15} weight="regular" /> Ouvir questão
                    </button>
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => setShowSettings(!showSettings)} 
                      aria-label="Ajustar velocidade e voz"
                    >
                      <SlidersHorizontal size={15} weight="regular" /> Ajustes
                    </button>
                    {}
                    {((isMultiple && selectedAlt !== null) || (!isMultiple && transcription.trim().length > 0)) && (
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => {
                          if (isMultiple) speak(q.options[selectedAlt]);
                          else speak(transcription);
                        }} 
                        aria-label="Ouvir minha resposta atual"
                      >
                        <SpeakerHigh size={15} weight="regular" /> Ouvir minha resposta
                      </button>
                    )}
                    {isMultiple && selectedAlt !== null && (
                      <button className="btn btn-outline btn-sm" onClick={() => speak(q.options[selectedAlt])} aria-label="Ouvir alternativa selecionada">
                        <SpeakerHigh size={15} weight="regular" /> Ouvir alternativa
                      </button>
                    )}
                  </div>
                </div>
                {showSettings && (
                  <div style={{ marginTop: "16px" }}>
                    <AudioSettings />
                  </div>
                )}
                <div className="card">
                  <p style={{
                    fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 16,
                  }}>
                    Sua resposta
                  </p>

                  {isMultiple ? (
                    <Alternatives options={q.options} selectedAlt={selectedAlt} onSelect={handleSelectAlt} />
                  ) : (
                    <>
                      <VoicePanel
                        recording={recording}
                        transcription={transcription}
                        interimText={interimText}
                        onToggle={toggleRec}
                      />
                      {transcription && (
                        <div className="trans-box">
                          <span className="trans-label">Transcrição</span>
                          {transcription}
                        </div>
                      )}
                      {transcription && (
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => { setTranscription(""); setInterimText(""); setRecording(false); }} aria-label="Refazer gravação">
                          <ArrowCounterClockwise size={14} weight="regular" /> Refazer
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="nav-row">
                <button className="btn btn-outline" onClick={() => setAnswerMode(false)} aria-label="Voltar para a leitura da questão">
                  <ArrowLeft size={16} weight="regular" /> Voltar
                </button>
                <button className="btn btn-primary" onClick={saveAndNext} disabled={savingAnswer} aria-label={isLast ? "Finalizar questionário" : "Próxima questão"}>
                  {isLast ? <><Check size={16} weight="bold" /> Finalizar</> : <>Próxima <ArrowRight size={16} weight="regular" /></>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
