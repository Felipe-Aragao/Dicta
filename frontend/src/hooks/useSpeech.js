import { useRef, useCallback } from "react";

export function useSpeech() {
  const recRef = useRef(null);
  const shouldListenRef = useRef(false);
  const commandsRef = useRef({});
  const onResultRef = useRef(null);
  const lastCommandTimeRef = useRef(0);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeak = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const sanitizeText = (text) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,!?]/g, "").trim();
  };

  const setCommands = useCallback((commands) => {
    commandsRef.current = commands;
  }, []);

  const startRec = useCallback((onResult) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    onResultRef.current = onResult;
    shouldListenRef.current = true;

    const createRecognition = () => {
      const rec = new SpeechRecognition();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event) => {
        let textoFinal = "";
        let textoIntermediario = "";

        // Separa o que já foi confirmado do que ainda está sendo dito
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            textoFinal += event.results[i][0].transcript;
          } else {
            textoIntermediario += event.results[i][0].transcript;
          }
        }

        const textoParaAvaliar = textoFinal || textoIntermediario;

        if (textoParaAvaliar) {
          const cleanText = sanitizeText(textoParaAvaliar);
          let comandoExecutado = false;

          // Verifica se a frase dita é um comando
          Object.keys(commandsRef.current).forEach((cmdKey) => {
            if (comandoExecutado) return; // Se já achou um comando, ignora o resto

            if (cleanText.includes(sanitizeText(cmdKey))) {
              const now = Date.now();
              // Trava de segurança de 1 segundo
              if (now - lastCommandTimeRef.current > 1000) {
                commandsRef.current[cmdKey]();
                lastCommandTimeRef.current = now;
                comandoExecutado = true;
              }
            }
          });

          //  Limpar a memória do navegador 
          if (comandoExecutado) {
            try {
              rec.stop(); // Desliga o microfone para apagar a palavra "próxima" da memória
            } catch (e) {}
            return; // Sai da função para evitar processamento duplicado
          }

          // Se não for comando, envia o texto para a tela de respostas
          if (onResultRef.current) {
            onResultRef.current(textoFinal, textoIntermediario);
          }
        } else if (onResultRef.current) {
          onResultRef.current("", "");
        }
      };

      rec.onend = () => {
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current) {
              recRef.current = createRecognition();
              try { recRef.current.start(); } catch (e) {}
            }
          }, 250);
        }
      };

      return rec;
    };

    if (!recRef.current) {
      recRef.current = createRecognition();
      try { recRef.current.start(); } catch (e) { console.error(e); }
    }
    return true;
  }, []);

  const stopRec = useCallback(() => {
    shouldListenRef.current = false;
    if (recRef.current) {
      recRef.current.onend = null;
      try { recRef.current.stop(); } catch(e){}
      recRef.current = null;
    }
  }, []);

  return { speak, stopSpeak, startRec, stopRec, setCommands };
}