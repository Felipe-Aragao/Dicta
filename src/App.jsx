import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, SpeakerHigh } from "@phosphor-icons/react";

import { LoginScreen }          from "./components/LoginScreen";
import { CredentialsScreen }    from "./components/CredentialsScreen";
import { VisitorNameScreen }    from "./components/VisitorNameScreen";
import { ProfessorScreen }      from "./components/ProfessorScreen";
import { UploadScreen }         from "./components/UploadScreen";
import { ExtractingScreen }     from "./components/ExtractingScreen";
import { QuestionScreen }       from "./components/QuestionScreen";
import { DoneScreen }           from "./components/DoneScreen";
import { HistoryScreen }        from "./components/HistoryScreen";
import { VoiceCommandsScreen }  from "./components/VoiceCommandsScreen";

import { useSpeech } from "./hooks/useSpeech";
import { useToast }  from "./hooks/useToast";

import { DEMO_QUESTIONS } from "./data/demoData";
import "./App.css";

// ── Logo reutilizável ────────────────────────────────────────────
function DictaLogo({ height = 100, onClick }) {
  return (
    <div
    className="topbar-logo"
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) onClick(); }}
    >
    <img src="/dicta_logo.png" alt="Dicta" style={{ height }} />
    </div>
  );
}

export default function App() {
  const [role, setRole]         = useState(null);
  const [page, setPage]         = useState("login");
  const [username, setUsername] = useState("");
  const [answers, setAnswers]   = useState([]);
  // Guarda de onde o usuário veio antes de abrir os comandos de voz
  const [prevPage, setPrevPage] = useState(null);

  const { stopSpeak }               = useSpeech();
  const { toasts, show: showToast } = useToast();

  // ── Browser history ────────────────────────────────────────────
  useEffect(() => {
    window.history.replaceState({ page: "login", role: null }, "", "#login");
    const handlePop = (e) => {
      if (e.state) {
        stopSpeak();
        setPage(e.state.page);
        setRole(e.state.role ?? null);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const navigate = useCallback((destino, novoRole = null) => {
    stopSpeak();
    const nextRole = novoRole !== null ? novoRole : role;
    window.history.pushState({ page: destino, role: nextRole }, "", `#${destino}`);
    setPage(destino);
    if (novoRole !== null) setRole(novoRole);
  }, [role, stopSpeak]);

    // ── Abre a tela de comandos de voz guardando a origem ──────────
    const openVoiceCommands = useCallback(() => {
      setPrevPage(page);
      navigate("voice-commands");
    }, [page, navigate]);

    const closeVoiceCommands = useCallback(() => {
      navigate(prevPage || "login");
    }, [prevPage, navigate]);

    // ── Handlers de autenticação ───────────────────────────────────
    const handleRoleSelect = (papel) => {
      if (papel === "visitante") navigate("visitor-name", "visitante");
      else navigate("credentials", papel);
    };

      const handleLogin = () => navigate(role === "professor" ? "professor-home" : "history");

      const handleVisitorName = (nome) => { setUsername(nome); navigate("upload"); };

      const handleLogout = useCallback(() => {
        stopSpeak();
        setRole(null); setUsername(""); setAnswers([]);
        window.history.pushState({ page: "login", role: null }, "", "#login");
        setPage("login");
      }, [stopSpeak]);

      // ── Handlers do fluxo de questionário ─────────────────────────
      const handleStart    = () => { navigate("extracting"); setTimeout(() => navigate("question"), 2300); };
      const handleComplete = (res) => { setAnswers(res); navigate("done"); };
      const handleGenerate = () => {
        showToast("PDF gerado com sucesso!");
        setTimeout(() => navigate(role === "aluno" ? "history" : "upload"), 2600);
      };

      // ── Topbar ─────────────────────────────────────────────────────
      const renderTopbar = () => {
        // Telas de auth — só logo
        if (["login", "credentials", "visitor-name"].includes(page)) {
          return (
            <header className="topbar" role="banner">
            <DictaLogo />
            </header>
          );
        }

        // Tela de comandos de voz — botão fechar
        if (page === "voice-commands") {
          return (
            <header className="topbar" role="banner">
            <DictaLogo onClick={closeVoiceCommands} />
            <button
            className="topbar-back-btn"
            onClick={closeVoiceCommands}
            aria-label="Fechar ajuda de comandos de voz"
            >
            <ArrowLeft size={16} weight="regular" />
            Voltar
            </button>
            </header>
          );
        }

        // Área do professor (sidebar cuida do logout)
        if (page === "professor-home") {
          return (
            <header className="topbar" role="banner">
            <DictaLogo onClick={() => navigate("professor-home")} />
            <div className="topbar-area">
            <span className="topbar-area-label">Área do Professor</span>
            </div>
            </header>
          );
        }

        // Home do aluno (sidebar cuida do logout)
        if (page === "history" && role === "aluno") {
          return (
            <header className="topbar" role="banner">
            <DictaLogo onClick={() => navigate("history")} />
            <div className="topbar-area">
            <span className="topbar-area-label">Minha Área</span>
            {/* Atalho para comandos de voz */}
            <button
            className="nav-btn"
            onClick={openVoiceCommands}
            aria-label="Ver comandos de voz disponíveis"
            title="Comandos de voz"
            >
            <SpeakerHigh size={18} weight="regular" />
            Comandos de Voz
            </button>
            </div>
            </header>
          );
        }

        // Fluxo do questionário
        // BUG FIX: visitante deve voltar para "login", não para "upload"
        const backLabel = role === "aluno"      ? "Minha Área"
        : role === "visitante"  ? "Início"
        :                         "Início";
        const backDest  = role === "aluno"      ? "history"
        : role === "visitante"  ? "login"     // ← correção
        :                         "login";

        return (
          <header className="topbar" role="banner">
          <DictaLogo onClick={() => navigate(backDest)} />
          <nav className="nav-btns" aria-label="Navegação">
          {/* Atalho para comandos de voz no fluxo de questões */}
          {(role === "aluno" || role === "visitante") && (
            <button
            className="nav-btn"
            onClick={openVoiceCommands}
            aria-label="Ver comandos de voz disponíveis"
            title="Comandos de voz"
            >
            <SpeakerHigh size={18} weight="regular" />
            Comandos de Voz
            </button>
          )}
          <button
          className="topbar-back-btn"
          onClick={() => navigate(backDest)}
          aria-label={`Voltar para ${backLabel}`}
          >
          <ArrowLeft size={16} weight="regular" />
          {backLabel}
          </button>
          </nav>
          </header>
        );
      };

      return (
        <div className="vq-shell">
        {renderTopbar()}

        {page === "login" && <LoginScreen onSelect={handleRoleSelect} />}

        {page === "credentials" && (role === "professor" || role === "aluno") && (
          <CredentialsScreen role={role} onLogin={handleLogin} onBack={() => navigate("login", null)} />
        )}

        {page === "visitor-name" && role === "visitante" && (
          <VisitorNameScreen onContinue={handleVisitorName} onBack={() => navigate("login", null)} />
        )}

        {page === "professor-home" && role === "professor" && (
          <ProfessorScreen username={username || "Professor"} onLogout={handleLogout} />
        )}

        {page === "history" && role === "aluno" && (
          <HistoryScreen
          username={username || "Aluno"}
          onLogout={handleLogout}
          onNewQuestionnaire={() => navigate("upload")}
          />
        )}

        {page === "upload"     && (role === "aluno" || role === "visitante") && <UploadScreen onStart={handleStart} />}
        {page === "extracting" && (role === "aluno" || role === "visitante") && <ExtractingScreen />}
        {page === "question"   && (role === "aluno" || role === "visitante") && (
          <QuestionScreen questions={DEMO_QUESTIONS} onComplete={handleComplete} />
        )}

        {page === "done" && (role === "aluno" || role === "visitante") && (
          <DoneScreen
          role={role}
          onEdit={()     => navigate("question")}
          onGenerate={handleGenerate}
          onHome={()     => navigate(role === "aluno" ? "history" : "upload")}
          />
        )}

        {page === "voice-commands" && (
          <VoiceCommandsScreen onClose={closeVoiceCommands} />
        )}

        {toasts.length > 0 && (
          <div className="toast-wrap" role="alert" aria-live="assertive">
          {toasts.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}
          </div>
        )}
        </div>
      );
}
