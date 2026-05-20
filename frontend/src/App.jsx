import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, SpeakerHigh } from "@phosphor-icons/react";

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ── Logo reutilizável ────────────────────────────────────────────
function DictaLogo({ height = 40  , onClick }) {
  return (
    <div
    className="topbar-logo"
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) onClick(); }}
    >
    <img src="/dicta_logo.svg" alt="Dicta" style={{ height }} />
    </div>
  );
}

export default function App() {
  const [role, setRole]         = useState(null);
  const [page, setPage]         = useState("login");
  const [username, setUsername] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [answers, setAnswers]   = useState([]);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
 
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

  const resetUploadStatus = useCallback(() => {
    setUploadStatus("idle");
    setUploadError("");
  }, []);

  useEffect(() => {
    if (page === "upload") resetUploadStatus();
  }, [page, resetUploadStatus]);

    
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

      const handleLogin = useCallback(async ({ email, password }) => {
        if (!role) return;
        setAuthLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
          });

          if (!response.ok) {
            let detail = "Falha ao entrar.";
            try {
              const data = await response.json();
              if (data?.detail) detail = data.detail;
            } catch {
              
            }
            throw new Error(detail);
          }

          const user = await response.json();
          if (user.role && user.role !== role) {
            throw new Error("Perfil selecionado nao corresponde ao usuario.");
          }
          setUsername(user.name || "");
          navigate("voice-commands-intro");
        } catch (error) {
          showToast(error?.message ?? "Falha ao entrar.");
          throw error;
        } finally {
          setAuthLoading(false);
        }
      }, [navigate, role, showToast]);

      const handleRegister = useCallback(async ({ name, email, password }) => {
        if (!role) return;
        setAuthLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role,
              name,
              email: email.trim().toLowerCase(),
              password,
            }),
          });

          if (!response.ok) {
            let detail = "Falha ao cadastrar.";
            try {
              const data = await response.json();
              if (data?.detail) detail = data.detail;
            } catch {
              
            }
            throw new Error(detail);
          }

          const user = await response.json();
          if (user.role && user.role !== role) {
            throw new Error("Perfil selecionado nao corresponde ao usuario.");
          }
          setUsername(user.name || "");
          navigate("voice-commands-intro");
        } catch (error) {
          showToast(error?.message ?? "Falha ao cadastrar.");
          throw error;
        } finally {
          setAuthLoading(false);
        }
      }, [navigate, role, showToast]);

      const handleVisitorName = (nome) => { setUsername(nome); navigate("voice-commands-intro"); };

      const handleLogout = useCallback(() => {
        stopSpeak();
        setRole(null); setUsername(""); setAnswers([]);
        window.history.pushState({ page: "login", role: null }, "", "#login");
        setPage("login");
      }, [stopSpeak]);

     
      const handleSkipIntro = () => {
        if (role === "professor") navigate("professor-home");
        else if (role === "visitante") navigate("upload");
        else navigate("history");
      };

      // ── Handlers do fluxo de questionário ─────────────────────────
      const handleStart    = async (file) => {
        if (!file) {
          setUploadStatus("error");
          setUploadError("Selecione um PDF.");
          return;
        }

        setUploadStatus("loading");
        setUploadError("");

        const formData = new FormData();
        formData.append("pdf", file);

        try {
          const response = await fetch(`${API_BASE_URL}/pdf/receive`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            let detail = "Falha ao enviar PDF.";
            try {
              const data = await response.json();
              if (data?.detail) detail = data.detail;
            } catch {
              
            }
            throw new Error(detail);
          }

          await response.json();
          setUploadStatus("success");
          setTimeout(() => {
            navigate("extracting");
            setTimeout(() => navigate("question"), 2300);
          }, 400);
        } catch (error) {
          setUploadStatus("error");
          setUploadError(error?.message ?? "Falha ao enviar PDF.");
        }
      };
      const handleComplete = (res) => { setAnswers(res); navigate("done"); };
      const handleGenerate = () => {
        showToast("PDF gerado com sucesso!");
        setTimeout(() => navigate(role === "aluno" ? "history" : "upload"), 2600);
      };

      // ── Topbar ─────────────────────────────────────────────────────
      const renderTopbar = () => {
        
        // 1. Telas de auth normais — só logo
        if (["login", "credentials", "visitor-name"].includes(page)) {
          return (
            <header className="topbar" role="banner">
              <DictaLogo />
            </header>
          );
        }

        // 2. Tela de Introdução aos comandos de voz — Logo + Botão Pular
        if (page === "voice-commands-intro") {
          return (
            <header className="topbar" role="banner">
              <DictaLogo />
              <button
                className="topbar-back-btn"
                onClick={handleSkipIntro}
                aria-label="Pular introdução"
              >
                Pular
                <ArrowRight size={16} weight="regular" />
              </button>
            </header>
          );
        }

        // 3. Tela de comandos de voz (ajuda) — Logo + Botão Voltar
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

        
        const backLabel = role === "aluno"      ? "Minha Área"
                : role === "visitante"  ? "Início"
                : role === "professor"  ? "Área do Professor" 
                : "Início";

        const backDest  = role === "aluno"      ? "history"
                : role === "visitante"  ? "login"
                : role === "professor"  ? "professor-home" 
                : "login";                      "login";

        return (
          <header className="topbar" role="banner">
          <DictaLogo onClick={() => navigate(backDest)} />
          <nav className="nav-btns" aria-label="Navegação">
          
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
          <CredentialsScreen
            role={role}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onBack={() => navigate("login", null)}
            loading={authLoading}
          />
        )}

        {page === "visitor-name" && role === "visitante" && (
          <VisitorNameScreen onContinue={handleVisitorName} onBack={() => navigate("login", null)} />
        )}

        {page === "professor-home" && role === "professor" && (
          <ProfessorScreen 
            username={username || "Professor"} 
            onLogout={handleLogout} 
            onOpenActivity={() => navigate("question")} 
          />
        )}

        {page === "history" && role === "aluno" && (
          <HistoryScreen
            username={username || "Aluno"}
            onLogout={handleLogout}
            onNewQuestionnaire={() => navigate("upload")}
            onOpenActivity={() => navigate("question")} 
          />
        )}

        

        {page === "upload"     && (role === "aluno" || role === "visitante") && (
          <UploadScreen
            onStart={handleStart}
            uploadStatus={uploadStatus}
            uploadError={uploadError}
            onFileSelected={resetUploadStatus}
          />
        )}
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

        {page === "voice-commands-intro" && (
          <VoiceCommandsScreen 
            isIntro={true} 
            onContinue={handleSkipIntro} 
          />
        )}

        {toasts.length > 0 && (
          <div className="toast-wrap" role="alert" aria-live="assertive">
          {toasts.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}
          </div>
        )}
        </div>
      );
}