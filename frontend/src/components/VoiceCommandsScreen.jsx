import { useEffect } from "react"; 
import { ArrowLeft, Microphone, SpeakerHigh, ArrowRight,
         MagnifyingGlass, DownloadSimple, CheckCircle,
         ArrowCounterClockwise } from "@phosphor-icons/react";
import { useSpeech } from "../hooks/useSpeech";
import { AudioSettings } from "./AudioSettings";

const SECTIONS = [
  {
    icon: <SpeakerHigh size={22} weight="regular" />,
    title: "Leitura e Navegação",
    color: "#4F46E5",
    bg: "#EEF2FF",
    commands: [
      { diga: "próxima",            faz: "Avança para a próxima questão" },
      { diga: "anterior",           faz: "Volta para a questão anterior" },
      { diga: "repetir",            faz: "Lê a questão atual novamente em voz alta" },
      { diga: "ouvir alternativas",   faz: "Lê todas as alternativas da questão atual" },
    ],
  },
  {
    icon: <Microphone size={22} weight="regular" />,
    title: "Responder Questões",
    color: "#16A34A",
    bg: "#F0FDF4",
    commands: [
      { diga: "responder",            faz: "Abre o painel de gravação de voz" },
      { diga: "gravar",               faz: "Inicia a gravação da sua resposta" },
      { diga: "parar",                faz: "Para a gravação e exibe a transcrição" },
      { diga: "letra A",              faz: "Seleciona a alternativa A (funciona com B, C, D)" },
      { diga: "refazer",              faz: "Descarta a gravação e permite gravar novamente" },
    ],
  },
  {
    icon: <MagnifyingGlass size={22} weight="regular" />,
    title: "Busca e Filtros",
    color: "#D97706",
    bg: "#FFFBEB",
    commands: [
      { diga: "buscar provas",        faz: "Filtra o histórico mostrando apenas provas" },
      { diga: "buscar atividades",    faz: "Filtra o histórico mostrando apenas atividades" },
      { diga: "limpar filtro",        faz: "Remove o filtro e exibe todos os questionários" },
      { diga: "meus questionários",   faz: "Vai para a página de histórico" },
    ],
  },
  {
    icon: <DownloadSimple size={22} weight="regular" />,
    title: "Finalizar e Exportar",
    color: "#0891B2",
    bg: "#ECFEFF",
    commands: [
      { diga: "finalizar",            faz: "Conclui o questionário e vai para a tela final" },
      { diga: "gerar PDF",            faz: "Gera o arquivo PDF com todas as suas respostas" },
      { diga: "enviar por email",     faz: "Abre a opção de envio do PDF por e-mail" },
      { diga: "revisar respostas",    faz: "Volta para revisar as respostas antes de gerar o PDF" },
    ],
  },
  {
    icon: <ArrowCounterClockwise size={22} weight="regular" />,
    title: "Controles Gerais",
    color: "#7C3AED",
    bg: "#F5F3FF",
    commands: [
      { diga: "voltar",               faz: "Volta para a tela anterior" },
      { diga: "início",               faz: "Vai para a página inicial do Dicta" },
      { diga: "nova atividade",       faz: "Inicia o envio de um novo arquivo PDF" },
      { diga: "ajuda",                faz: "Abre esta página de comandos de voz" },
    ],
  },
];

function SectionCard({ section }) {
  const lerSecao = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const tituloSection = new SpeechSynthesisUtterance(`Seção: ${section.title}`);
    tituloSection.lang = "pt-BR";
    window.speechSynthesis.speak(tituloSection);

    section.commands.forEach((cmd) => {
      const msg = new SpeechSynthesisUtterance(`Comando: ${cmd.diga}. Função: ${cmd.faz}.`);
      msg.lang = "pt-BR";
      msg.rate = 0.95;
      window.speechSynthesis.speak(msg);
    });
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
                       "como navegação, leitura, e responder questões.";

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
