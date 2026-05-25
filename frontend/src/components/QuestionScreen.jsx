import { useState, useEffect } from "react";
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

const LETTERS = ["A", "B", "C", "D", "E"];

// Alternativas
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

// Painel de voz
function VoicePanel({ recording, transcription, onToggle }) {
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
          ? "Gravando — clique para parar"
          : transcription
          ? "Gravação concluída"
          : "Clique no microfone para responder"}
      </p>
    </div>
  );
}

// Tela do questionario
export function QuestionScreen({ questions, onComplete, loading = false, error = "" }) {
  const [idx, setIdx]                     = useState(0);
  const [answerMode, setAnswerMode]       = useState(false); // false = lendo, true = respondendo
  const [recording, setRecording]         = useState(false);
  const [transcription, setTranscription] = useState("");
  const [selectedAlt, setSelectedAlt]     = useState(null);
  const [answers, setAnswers]             = useState([]);

  const { speak, startRec, stopRec } = useSpeech();

  const q          = questions?.[idx];
  const isLast     = idx === (questions?.length ?? 0) - 1;
  const isMultiple = q?.type === "multiple";
  const pct        = questions?.length ? Math.round(((idx + 1) / questions.length) * 100) : 0;

  useEffect(() => {
    setIdx(0);
    setAnswerMode(false);
    setRecording(false);
    setTranscription("");
    setSelectedAlt(null);
    setAnswers([]);
  }, [questions]);

  // Volta para modo de leitura ao trocar de questao
  useEffect(() => {
    if (!q) return;
    setAnswerMode(false);
    speak(q.text);
  }, [idx, q, speak]);

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

  const toggleRec = () => {
    if (recording) { stopRec(); setRecording(false); return; }
    const ok = startRec(
      (text) => setTranscription(text),
      ()     => setRecording(false)
    );
    if (ok) setRecording(true);
  };

  const handleSelectAlt = (i) => {
    setSelectedAlt(i);
    speak(q.options[i]);
  };

  const saveAndNext = () => {
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

    const nextAnswers = [...answers, ans];
    setAnswers(nextAnswers);

    if (isLast) { onComplete(nextAnswers); return; }

    setIdx((i) => i + 1);
    setTranscription("");
    setSelectedAlt(null);
    setRecording(false);
  };

  const goBack = () => {
    if (idx <= 0) return;
    setIdx((i) => i - 1);
    setTranscription("");
    setSelectedAlt(null);
    setRecording(false);
  };

  return (
    <>
      {/* Barra de progresso */}
      <div className="prog-bar-wrap">
        <div className="prog-bar-inner" style={{ maxWidth: "var(--shell-max)" }}>
          <div className="prog-meta">
            <span className="prog-label">Questão {idx + 1} de {questions.length}</span>
            <span className="prog-pct">{pct}%</span>
          </div>
          <div
            className="prog-track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="prog-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="page page-anim">
        <div className="page-wide">

          {/* Modo leitura: questao em largura total */}
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
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => speak(q.text)}
                    aria-label="Ouvir questão em voz alta"
                  >
                    <SpeakerHigh size={17} weight="regular" />
                    Ouvir questão
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setAnswerMode(true)}
                    aria-label="Ir para o campo de resposta"
                  >
                    <PencilSimple size={17} weight="regular" />
                    Responder
                  </button>
                </div>
              </div>

              
              <div className="nav-row">
                <button
                  className="btn btn-outline"
                  disabled={idx === 0}
                  onClick={goBack}
                  aria-label="Questão anterior"
                >
                  <ArrowLeft size={16} weight="regular" />
                  Anterior
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveAndNext}
                  aria-label={isLast ? "Finalizar questionário" : "Próxima questão"}
                >
                  {isLast ? (
                    <><Check size={16} weight="bold" /> Finalizar</>
                  ) : (
                    <>Próxima <ArrowRight size={16} weight="regular" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Modo resposta: layout dividido */}
          {answerMode && (
            <>
              <div className="question-layout">

                {/* Painel da questao */}
                <div className="card">
                  <div className="q-meta">
                    <span className="q-meta-badge">
                      {isMultiple ? "Múltipla escolha" : "Dissertativa"}
                    </span>
                  </div>
                  <p className="q-text">{q.text}</p>

                  <div className="action-row">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => speak(q.text)}
                      aria-label="Ouvir questão em voz alta"
                    >
                      <SpeakerHigh size={15} weight="regular" />
                      Ouvir questão
                    </button>
                    {isMultiple && selectedAlt !== null && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => speak(q.options[selectedAlt])}
                        aria-label="Ouvir alternativa selecionada"
                      >
                        <SpeakerHigh size={15} weight="regular" />
                        Ouvir alternativa
                      </button>
                    )}
                  </div>
                </div>

                {/* Painel de resposta */}
                <div className="card">
                  <p style={{
                    fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 16,
                  }}>
                    Sua resposta
                  </p>

                  {isMultiple ? (
                    <Alternatives
                      options={q.options}
                      selectedAlt={selectedAlt}
                      onSelect={handleSelectAlt}
                    />
                  ) : (
                    <>
                      <VoicePanel
                        recording={recording}
                        transcription={transcription}
                        onToggle={toggleRec}
                      />
                      {transcription && (
                        <div className="trans-box">
                          <span className="trans-label">Transcrição</span>
                          {transcription}
                        </div>
                      )}
                      {transcription && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ marginTop: 10 }}
                          onClick={() => { setTranscription(""); setRecording(false); }}
                          aria-label="Refazer gravação"
                        >
                          <ArrowCounterClockwise size={14} weight="regular" />
                          Refazer
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              
              <div className="nav-row">
                <button
                  className="btn btn-outline"
                  onClick={() => setAnswerMode(false)}
                  aria-label="Voltar para a leitura da questão"
                >
                  <ArrowLeft size={16} weight="regular" />
                  Voltar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveAndNext}
                  aria-label={isLast ? "Finalizar questionário" : "Próxima questão"}
                >
                  {isLast ? (
                    <><Check size={16} weight="bold" /> Finalizar</>
                  ) : (
                    <>Próxima <ArrowRight size={16} weight="regular" /></>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
