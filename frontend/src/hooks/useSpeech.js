import { useRef, useCallback, useState, useEffect } from "react";

export function useSpeech() {
  const recRef = useRef(null);
  const shouldListenRef = useRef(false);
  const commandsRef = useRef({});
  const onResultRef = useRef(null);
  const lastCommandTimeRef = useRef(0);

  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(localStorage.getItem("dicta_voice") || "");
  const [rate, setRate] = useState(parseFloat(localStorage.getItem("dicta_rate")) || 0.95);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Filtra apenas as vozes em português
      const ptVoices = availableVoices.filter(v => v.lang.startsWith("pt"));
      setVoices(ptVoices);
      
      // Se não tiver voz selecionada ainda, pega a primeira da lista
      if (!localStorage.getItem("dicta_voice") && ptVoices.length > 0) {
        setSelectedVoiceURI(ptVoices[0].voiceURI);
      }
    };

    loadVoices();
    // O Chrome carrega as vozes com atraso, então precisamos deste evento:
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const changeRate = useCallback((newRate) => {
    setRate(newRate);
    localStorage.setItem("dicta_rate", newRate);
  }, []);

  const changeVoice = useCallback((voiceURI) => {
    setSelectedVoiceURI(voiceURI);
    localStorage.setItem("dicta_voice", voiceURI);
  }, []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Para a fala atual antes de começar a nova

    // Pegamos os valores direto do navegador no momento do disparo
    const atualRate = parseFloat(localStorage.getItem("dicta_rate")) || 0.95;
    const atualVoiceURI = localStorage.getItem("dicta_voice") || "";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = atualRate; // Aplica a velocidade atualizada na hora

    // Busca as vozes disponíveis e aplica a correta
    const disponiveis = window.speechSynthesis.getVoices();
    if (atualVoiceURI && disponiveis.length > 0) {
      const chosenVoice = disponiveis.find(v => v.voiceURI === atualVoiceURI);
      if (chosenVoice) utterance.voice = chosenVoice;
    }

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

          // COMANDO POR VOZ: "MUDAR VOZ" ou "ALTERAR VOZ"
          if (cleanText.includes("mudar voz") || cleanText.includes("alterar voz") || cleanText.includes("trocar voz")) {
            const disponiveis = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("pt"));
            const atualURI = localStorage.getItem("dicta_voice") || "";
            
            if (disponiveis.length > 1) {
              const indexAtual = disponiveis.findIndex(v => v.voiceURI === atualURI);
              const proximoIndex = (indexAtual + 1) % disponiveis.length;
              const proximaVoz = disponiveis[proximoIndex];
              
              changeVoice(proximaVoz.voiceURI);
              comandoExecutado = true;
              
              // Feedback falado imediato com a nova voz instalada
              setTimeout(() => {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance("Voz alterada.");
                utterance.lang = "pt-BR";
                utterance.voice = proximaVoz;
                utterance.rate = parseFloat(localStorage.getItem("dicta_rate")) || 0.95;
                window.speechSynthesis.speak(utterance);
              }, 100);
            }
          }

          // COMANDO POR VOZ: "VELOCIDADE [NÚMERO]" (Ex: "velocidade 1.3" ou "velocidade 2")
          // A API do navegador é otimizada para transcrever números falados diretamente como dígitos (ex: "1.5" ou "1,5")
          const matchVelocidade = cleanText.match(/velocidade\s*(\d+([.,]\d+)?)/);
          if (matchVelocidade) {
            const valorTexto = matchVelocidade[1].replace(",", "."); // Padroniza o separador decimal
            const novoRate = parseFloat(valorTexto);
            
            // Limita a velocidade entre os parâmetros seguros da  UI (0.5x até 2.0x)
            if (!isNaN(novoRate) && novoRate >= 0.5 && novoRate <= 2.0) {
              changeRate(novoRate);
              comandoExecutado = true;
              
              // Feedback falado na velocidade configurada
              setTimeout(() => {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(`Velocidade ${novoRate}.`);
                utterance.lang = "pt-BR";
                utterance.rate = novoRate;
                
                const disponiveis = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("pt"));
                const atualURI = localStorage.getItem("dicta_voice") || "";
                const chosenVoice = disponiveis.find(v => v.voiceURI === atualURI);
                if (chosenVoice) utterance.voice = chosenVoice;
                
                window.speechSynthesis.speak(utterance);
              }, 100);
            }
          }

          // Se um comando de ajuste de áudio foi executado, reinicia o buffer e encerra
          if (comandoExecutado) {
            try { rec.stop(); } catch {}
            return;
          }

          Object.keys(commandsRef.current).forEach((cmdKey) => {
            if (comandoExecutado) return;

            if (cleanText.includes(sanitizeText(cmdKey))) {
              const now = Date.now();
              if (now - lastCommandTimeRef.current > 1000) {
                commandsRef.current[cmdKey]();
                lastCommandTimeRef.current = now;
                comandoExecutado = true;
              }
            }
          });

          if (comandoExecutado) {
            try { rec.stop(); } catch {}
            return;
          }

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
              try { recRef.current.start(); } catch {}
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
  }, [changeRate, changeVoice]);

  const stopRec = useCallback(() => {
    shouldListenRef.current = false;
    if (recRef.current) {
      recRef.current.onend = null;
      try { recRef.current.stop(); } catch {
        // Ignora falha do navegador ao parar reconhecimento.
      }
      recRef.current = null;
    }
  }, []);

  return { 
    speak, 
    stopSpeak, 
    startRec, 
    stopRec, 
    setCommands,
    voices,       
    changeVoice,  // Função para mudar a voz
    selectedVoiceURI,
    rate,         
    changeRate    // Função para mudar a velocidade
  };
}
