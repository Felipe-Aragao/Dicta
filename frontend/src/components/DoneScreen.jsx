import { CheckCircle, DownloadSimple, ArrowLeft } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { useSpeech } from "../hooks/useSpeech"; 
import { FloatingMicButton } from "./FloatingMicButton";
// Tela de finalizacao
export function DoneScreen({ role, onGenerate, onHome }) {
  const homeLabel = role === "aluno" ? "Ir para Minha Área" : "Responder outro questionário";
  const [micEnabled, setMicEnabled] = useState(true);
  const { startRec, setCommands, speak, stopRec, recognitionError, clearRecognitionError } = useSpeech();

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
      speak("Diga 'inicio' para retornar a tela do usuário ou 'gerar pdf' para gerar o pdf do questionário.");
    }, 300);

    return () => {
      clearTimeout(timer);
      stopRec(); // 
    };
  }, [micEnabled, recognitionError, startRec, speak, stopRec]);
  
  useEffect(() => {
    setCommands({
      "inicio": () => { if (onHome) onHome(); },
      "início": () => { if (onHome) onHome(); }, 
      "gerar pdf": () => { if (onGenerate) onGenerate(); },
      "gerar o pdf": () => { if (onGenerate) onGenerate(); }
    });
  }, [setCommands, onHome, onGenerate ]);

  const micStatus = recognitionError ? "unavailable" : micEnabled ? "active" : "muted";

  return (
    <>
    <FloatingMicButton status={micStatus} onToggle={toggleMicListening} />
    <div className="page-center page-anim">

    <div className="done-icon-wrap" aria-hidden="true">
    <CheckCircle size={36} weight="regular" />
    </div>

    <h2 className="done-title">Questionário concluído!</h2>
    <p className="done-sub">
    Todas as respostas foram salvas com sucesso.
    <br />
    Você pode gerar o PDF ou voltar ao início.
    </p>

    <div className="done-actions">

   
    <button
    className="btn btn-primary btn-lg btn-full"
    onClick={onGenerate}
    aria-label="Gerar e baixar PDF com as respostas"
    >
    <DownloadSimple size={20} weight="regular" />
    Gerar PDF das Respostas
    </button>

  
    {/* Voltar ao inicio */}
    <button
    className="btn btn-ghost btn-full"
    onClick={onHome}
    aria-label={homeLabel}
    style={{ marginTop: 4 }}
    >
    <ArrowLeft size={16} weight="regular" />
    {homeLabel}
    </button>

    </div>

    </div>
    </>
  );
}
