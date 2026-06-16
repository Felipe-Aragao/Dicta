import { useState, useEffect, useRef } from "react";
import {
  SpeakerHigh,
  Microphone,
  StopCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ArrowCounterClockwise,
  PencilSimple,
} from "@phosphor-icons/react";
import { useSpeech } from "../hooks/useSpeech";
import { VoiceCommandsScreen } from "./VoiceCommandsScreen";
import { SlidersHorizontal } from "@phosphor-icons/react";
import { AudioSettings } from "./AudioSettings"; 

const LETTERS = ["A", "B", "C", "D", "E", "F"];

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

  const { speak, startRec, stopRec, setCommands } = useSpeech();

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
    const timer = setTimeout(() => {
      startRec((textoFinal, textoTemporario) => {
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
    }, 500);

    return () => {
      clearTimeout(timer);
      stopRec();
    };
  }, [startRec, stopRec]);

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

  const getStoredAnswer = (questionId, questionIndex) => (
    answers.find((item) => item?.questionId === questionId) ||
    answers.find((item) => item?.qIdx === questionIndex)
  );

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
  }, [answers, idx, q]);

  const toggleRec = () => {
    setRecording(!recording);
  };

  const handleSelectAlt = (i) => {
    setSelectedAlt(i);
    speak(q.options[i]);
  };

  const saveAndNext = async () => {
    if (savingAnswerRef.current || !q) return;
    savingAnswerRef.current = true;
    setSavingAnswer(true);

    try {
      const chosenLetter = isMultiple && selectedAlt !== null ? LETTERS[selectedAlt] ?? null : null;
      const responseText = isMultiple
        ? q.options[selectedAlt] ?? "(sem resposta)"
        : transcription || "(sem resposta)";

      const ans = {
        qIdx: idx,
        questionId: q?.id ?? null,
        type: isMultiple ? "multiple" : "open",
        responseText,
        chosenLetter,
      };

      const nextAnswers = [...answers];
      const existingIndex = nextAnswers.findIndex((item) => (
        item?.questionId && ans.questionId
          ? item.questionId === ans.questionId
          : item?.qIdx === ans.qIdx
      ));

      if (existingIndex >= 0) nextAnswers[existingIndex] = ans;
      else nextAnswers.push(ans);
      setAnswers(nextAnswers);

      if (isLast) {
        await onComplete(nextAnswers);
        return;
      }

      if (onProgress) {
        await onProgress(nextAnswers);
      }

      setIdx((i) => i + 1);
      setTranscription("");
      setInterimText("");
      setSelectedAlt(null);
      setRecording(false);
    } catch {
      return;
    } finally {
      savingAnswerRef.current = false;
      setSavingAnswer(false);
    }
  };

  const goBack = () => {
    if (idx <= 0) return;
    setIdx((i) => i - 1);
    setTranscription("");
    setInterimText("");
    setSelectedAlt(null);
    setRecording(false);
  };

  //  Bloqueia ações de navegação se "recording" for verdadeiro
  useEffect(() => {
    setCommands({
      "proxima": () => { if (!recording && !savingAnswerRef.current) saveAndNext(); },
      "proxima questao": () => { if (!recording && !savingAnswerRef.current) saveAndNext(); },
      "anterior": () => { if (!recording) goBack(); },
      "repetir": () => { if (!recording && q) speak(q.text); },
      "repet": () => { if (!recording && q) speak(q.text); }, 
      "ouvir alternativas": () => {
        if (!recording && isMultiple && q?.options) {
          const textoOpcoes = q.options.map((opt, i) => `Letra ${LETTERS[i]}, ${opt}`).join(". ");
          speak(`As alternativas são: ${textoOpcoes}`);
        }
      },
      "ouvir minha resposta": () => {
        if (!recording) {
          if (isMultiple && selectedAlt !== null) speak(q.options[selectedAlt]);
          else if (!isMultiple && transcription) speak(transcription);
        }
      },
      "ouvir resposta": () => {
        if (!recording) {
          if (isMultiple && selectedAlt !== null) speak(q.options[selectedAlt]);
          else if (!isMultiple && transcription) speak(transcription);
        }
      },
      "ajuda": () => { 
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
              "E use os comandos letra A, letra B ou a alternativa desejada para marcar." +
              "Diga ouvir minha resposta para ouvir sua resposta. " +
              "Diga próxima para avançar o questionário. " + 
              "Diga anterior para uma voltar na questão anterior. "
            );
          }
        }
      },
      "voltar": () => { 
        if (showHelp) { 
          setShowHelp(false); 
        } 
      },
      "responder": () => { if (!recording) setAnswerMode(true); },
      "gravar": () => setRecording(true), 
      "parar": () => setRecording(false), 
      "refazer": () => { setTranscription(""); setInterimText(""); setRecording(false); },
      "finalizar": () => { if (!recording && !savingAnswerRef.current && isLast) saveAndNext(); },
      "letra a": () => { if (!recording && isMultiple) handleSelectAlt(0); },
      "letra b": () => { if (!recording && isMultiple) handleSelectAlt(1); },
      "letra c": () => { if (!recording && isMultiple) handleSelectAlt(2); },
      "letra d": () => { if (!recording && isMultiple) handleSelectAlt(3); },
      "letra e": () => { if (!recording && isMultiple) handleSelectAlt(4); },
      "letra f": () => { if (!recording && isMultiple) handleSelectAlt(5); },
    });
  }, [idx, answerMode, isMultiple, selectedAlt, q, answers, transcription, recording, setCommands, showHelp]);

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
