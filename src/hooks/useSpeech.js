import { useRef, useCallback } from "react";

/**
 * useSpeech
 * Encapsula a Web Speech API (síntese de voz + reconhecimento de fala).
 *
 * Retorna:
 *  - speak(text)          → lê o texto em voz alta (pt-BR)
 *  - stopSpeak()          → interrompe a leitura atual
 *  - startRec(onResult, onEnd) → inicia gravação; chama onResult(text) a cada atualização
 *  - stopRec()            → para a gravação manualmente
 */
export function useSpeech() {
  const recRef = useRef(null);

  // ── Síntese de voz ──────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();         // cancela leitura anterior
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeak = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // ── Reconhecimento de fala ──────────────────────────────────────
  const startRec = useCallback((onResult, onEnd) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Navegador não suporta (ex: Firefox sem flag)
      alert("Reconhecimento de voz não suportado neste navegador. Use o Chrome.");
      return false;
    }

    const rec = new SpeechRecognition();
    rec.lang            = "pt-BR";
    rec.continuous      = false;   // para automaticamente após silêncio
    rec.interimResults  = true;    // retorna texto parcial enquanto fala

    rec.onresult = (event) => {
      let texto = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        texto += event.results[i][0].transcript;
      }
      onResult(texto);
    };

    rec.onend   = onEnd;
    rec.onerror = onEnd;   // em caso de erro, trata como fim da gravação

    rec.start();
    recRef.current = rec;
    return true;
  }, []);

  const stopRec = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
  }, []);

  return { speak, stopSpeak, startRec, stopRec };
}
