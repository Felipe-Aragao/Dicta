import { useEffect } from "react"; 
import { ArrowLeft, Microphone, SpeakerHigh, ArrowRight,
         MagnifyingGlass, DownloadSimple, CheckCircle,
         ArrowCounterClockwise } from "@phosphor-icons/react";

// Tela de comandos de voz

// Dados de comandos por secao
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

// Card de secao
function SectionCard({ section }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)",
      overflow: "hidden",
    }}>
      {/* Cabecalho colorido */}
      <div style={{
        background: section.bg,
        padding: "18px 24px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          width: 44, height: 44,
          borderRadius: "var(--r-md)",
          background: section.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", flexShrink: 0,
        }}>
          {section.icon}
        </div>
        <h2 style={{
          fontFamily: "var(--font)",
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "var(--text-1)",
          letterSpacing: "-0.2px",
        }}>
          {section.title}
        </h2>
      </div>

      {/* Lista de comandos */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {section.commands.map((cmd, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 24px",
            borderBottom: i < section.commands.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            {/* Comando */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              flex: "0 0 auto",
              minWidth: 200,
            }}>
              <Microphone size={14} color="var(--text-3)" weight="regular" />
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: section.color,
                background: section.bg,
                padding: "4px 12px",
                borderRadius: "99px",
                border: `1px solid ${section.color}30`,
                whiteSpace: "nowrap",
              }}>
                "{cmd.diga}"
              </span>
            </div>

            <ArrowRight size={14} color="var(--text-3)" weight="regular" style={{ flexShrink: 0 }} />

            {/* O que faz */}
            <p style={{
              fontSize: "0.95rem",
              color: "var(--text-2)",
              lineHeight: 1.5,
              flex: 1,
            }}>
              {cmd.faz}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tela principal
export function VoiceCommandsScreen({ onClose, isIntro, onContinue }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page page-anim" style={{ paddingTop: "20px" }}>
      
      

      <div className="page-wide">

        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
          borderRadius: "var(--r-xl)",
          padding: "48px 52px",
          marginBottom: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.15)",
              borderRadius: "99px", padding: "5px 16px",
              marginBottom: 16,
            }}>
              <CheckCircle size={14} color="white" weight="fill" />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: ".08em" }}>
                Acessibilidade por Voz
              </span>
            </div>
            <h1 style={{
              fontFamily: "var(--font)",
              fontSize: "2rem",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.5px",
              marginBottom: 12,
              lineHeight: 1.2,
            }}>
              Comandos de Voz
            </h1>
            <p style={{
              fontSize: "1rem",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.65,
              maxWidth: 480,
            }}>
              O Dicta foi desenvolvido para ser totalmente operável por voz.
              Abaixo estão todos os comandos disponíveis — diga em voz alta para ativar.
            </p>
          </div>

          {/* Icone decorativo */}
          <div style={{
            width: 100, height: 100,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Microphone size={52} color="white" weight="thin" />
          </div>
        </div>

        {/* Aviso de uso */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 14,
          background: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: "var(--r-md)",
          padding: "16px 20px",
          marginBottom: 32,
        }}>
          <SpeakerHigh size={20} color="#D97706" weight="regular" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: "0.92rem", color: "#92400E", lineHeight: 1.6 }}>
            <strong>Como usar:</strong> certifique-se que o microfone está ativo e diga o comando claramente em português.
            O Dicta reconhece variações — por exemplo, "próxima questão" e "próxima" funcionam da mesma forma.
          </p>
        </div>

        {/* Secoes de comandos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          {SECTIONS.map((s, i) => (
            <SectionCard key={i} section={s} />
          ))}
        </div>

        {/* Botao de fechar ou avancar */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {isIntro ? (
            <button
              className="btn btn-primary btn-lg"
              style={{ minWidth: 240 }}
              onClick={onContinue}
              aria-label="Avançar para a tela inicial"
            >
              Avançar
              <ArrowRight size={18} weight="regular" />
            </button>
                
          ) : (
            <button
              className="btn btn-primary btn-lg"
              style={{ minWidth: 240 }}
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