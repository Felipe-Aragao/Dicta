import { useEffect } from "react"; 
import { ArrowLeft, Microphone, SpeakerHigh, ArrowRight,
         MagnifyingGlass, DownloadSimple, CheckCircle,
         ArrowCounterClockwise } from "@phosphor-icons/react";
import { useSpeech } from "../hooks/useSpeech";
import { AudioSettings } from "./AudioSettings";

const SECTIONS = [
  {
    icon: <SpeakerHigh size={22} weight="regular" />,
    title: "Prova: Navegação",
    color: "#4F46E5",
    bg: "#EEF2FF",
    commands: [
      { diga: "próxima",            faz: "Avança para a próxima questão" },
      { diga: "anterior",           faz: "Volta para a questão anterior" },
      { diga: "questão 3",          faz: "Vai direto para a questão informada" },
      { diga: "repetir",            faz: "Lê a questão atual novamente em voz alta" },
      { diga: "ouvir alternativas",   faz: "Lê todas as alternativas da questão atual" },
      { diga: "ouvir resposta",     faz: "Lê a resposta marcada ou gravada" },
      { diga: "ouvir minha resposta", faz: "Lê a resposta marcada ou gravada" },
      { diga: "finalizar",          faz: "Salva a resposta atual e vai para a revisão" },
      { diga: "ajuda",              faz: "Lê os comandos disponíveis na prova" },
    ],
  },
  {
    icon: <Microphone size={22} weight="regular" />,
    title: "Prova: Responder",
    color: "#16A34A",
    bg: "#F0FDF4",
    commands: [
      { diga: "responder",            faz: "Abre o painel de gravação de voz" },
      { diga: "gravar",               faz: "Inicia a gravação da sua resposta" },
      { diga: "parar",                faz: "Para a gravação e exibe a transcrição" },
      { diga: "letra A",              faz: "Seleciona uma alternativa (funciona de A a F)" },
      { diga: "refazer",              faz: "Descarta a gravação e permite gravar novamente" },
    ],
  },
  {
    icon: <MagnifyingGlass size={22} weight="regular" />,
    title: "Revisão",
    color: "#D97706",
    bg: "#FFFBEB",
    commands: [
      { diga: "próxima",              faz: "Move o foco para a próxima questão da revisão" },
      { diga: "anterior",             faz: "Move o foco para a questão anterior" },
      { diga: "questão 3",            faz: "Vai direto para a questão informada" },
      { diga: "repetir",              faz: "Lê o resumo da questão focada" },
      { diga: "ouvir questão",        faz: "Lê o enunciado da questão focada" },
      { diga: "ouvir resposta",       faz: "Lê a resposta da questão focada" },
      { diga: "alterar",              faz: "Volta para editar a questão focada" },
      { diga: "confirmar",            faz: "Entrega o questionário" },
      { diga: "finalizar",            faz: "Entrega o questionário" },
    ],
  },
  {
    icon: <DownloadSimple size={22} weight="regular" />,
    title: "Finalização",
    color: "#0891B2",
    bg: "#ECFEFF",
    commands: [
      { diga: "início",               faz: "Volta para a área inicial do usuário" },
      { diga: "gerar PDF",            faz: "Gera o arquivo PDF com todas as suas respostas" },
      { diga: "gerar o PDF",          faz: "Gera o arquivo PDF com todas as suas respostas" },
    ],
  },
  {
    icon: <ArrowCounterClockwise size={22} weight="regular" />,
    title: "Controles Gerais",
    color: "#7C3AED",
    bg: "#F5F3FF",
    commands: [
      { diga: "ajuda",                faz: "Na prova ou revisão, lê os comandos disponíveis" },
      { diga: "voltar",               faz: "Na revisão, volta para editar a questão focada" },
      { diga: "confirmar e finalizar", faz: "Na revisão, entrega o questionário" },
      { diga: "ouvir minha resposta", faz: "Na prova ou revisão, lê a resposta atual" },
    ],
  },
];

function SectionCard({ section }) {
  const { speak } = useSpeech(); 

  const lerSecao = () => {
    let textoCompleto = `Seção: ${section.title}. `;
    
    section.commands.forEach((cmd) => {
      textoCompleto += `Comando: ${cmd.diga}. Função: ${cmd.faz}. `;
    });

    speak(textoCompleto);
  };

  return (
    <section className="voice-command-card">
      <div className="voice-command-card-header" style={{ background: section.bg }}>
        <button
          onClick={lerSecao}
          aria-label={`Ouvir comandos de ${section.title}`}
          title={`Ouvir comandos de ${section.title}`}
          className="voice-command-listen-btn"
          style={{
            background: section.color,
          }}
        >
          {section.icon}
        </button>

        <h2 className="voice-command-card-title">{section.title}</h2>
      </div>

      <div className="voice-command-list">
        {section.commands.map((cmd, i) => (
          <div key={i} className="voice-command-row">
            <div className="voice-command-phrase-wrap">
              <Microphone size={14} color="var(--text-3)" weight="regular" />
              <span
                className="voice-command-phrase"
                style={{
                  color: section.color,
                  background: section.bg,
                  borderColor: `${section.color}30`,
                }}
              >
                "{cmd.diga}"
              </span>
            </div>

            <ArrowRight className="voice-command-arrow" size={14} color="var(--text-3)" weight="regular" />

            <p className="voice-command-desc">{cmd.faz}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VoiceCommandsScreen({ onClose, isIntro, onContinue }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { speak } = useSpeech(); 

  useEffect(() => {
    window.scrollTo(0, 0);

    const welcome = "Página de comandos de voz. " +
                       "O sistema é totalmente operável por comandos falados. " +
                       "Para ouvir a lista completa, consulte os cards na tela," +
                       "como prova, revisão e finalização.";

    setTimeout(() => speak(welcome), 500);
  }, [speak]);

  return (
    <div className="page page-anim voice-commands-page">
      <div className="page-wide">
        <header className="voice-commands-header">
          <div className="voice-commands-kicker">
            <CheckCircle size={14} weight="fill" />
            Acessibilidade por voz
          </div>
          <h1>Comandos de Voz</h1>
          <p>
            O Dicta pode ser operado por fala. Use os comandos abaixo em português
            para navegar, responder, revisar e finalizar questionários.
          </p>
        </header>

        <AudioSettings />

        <div className="voice-commands-note">
          <SpeakerHigh size={18} color="#D97706" weight="regular" />
          <p>
            <strong>Como usar:</strong> certifique-se que o microfone está ativo e diga o comando claramente em português.
            O Dicta reconhece variações — por exemplo, "próxima questão" e "próxima" funcionam da mesma forma.
          </p>
        </div>

        <div className="voice-command-grid">
          {SECTIONS.map((s, i) => (
            <SectionCard key={i} section={s} />
          ))}
        </div>

        <div className="voice-commands-actions">
          {isIntro ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={onContinue}
              aria-label="Avançar para a tela inicial"
            >
              Avançar
              <ArrowRight size={18} weight="regular" />
            </button>
                
          ) : (
            <button
              className="btn btn-primary btn-lg"
              onClick={onClose}
              aria-label="Fechar e voltar"
            >
              <ArrowLeft size={18} weight="regular" />
              Voltar 
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
