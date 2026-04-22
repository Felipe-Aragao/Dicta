import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Waveform } from "@phosphor-icons/react";

import { LoginScreen }        from "./components/LoginScreen";
import { CredentialsScreen }  from "./components/CredentialsScreen";
import { VisitorNameScreen }  from "./components/VisitorNameScreen";
import { ProfessorScreen }    from "./components/ProfessorScreen";
import { UploadScreen }       from "./components/UploadScreen";
import { ExtractingScreen }   from "./components/ExtractingScreen";
import { QuestionScreen }     from "./components/QuestionScreen";
import { DoneScreen }         from "./components/DoneScreen";
import { HistoryScreen }      from "./components/HistoryScreen";

import { useSpeech } from "./hooks/useSpeech";
import { useToast }  from "./hooks/useToast";

import { DEMO_QUESTIONS } from "./data/demoData";
import "./App.css";

/*
 * Fluxo por papel:
 * ───────────────────────────────────────────────────────────────
 * login
 *   → professor  → credentials → professor-home (sidebar)
 *   → aluno      → credentials → history/home   (sidebar)
 *                              → upload → extracting → question → done
 *   → visitante  → visitor-name → upload → extracting → question → done
 * ───────────────────────────────────────────────────────────────
 */

export default function App() {
  const [role, setRole]               = useState(null);
  const [page, setPage]               = useState("login");
  const [username, setUsername]       = useState("");
  const [answers, setAnswers]         = useState([]);

  const { stopSpeak }               = useSpeech();
  const { toasts, show: showToast } = useToast();

  // ── Browser history ──────────────────────────────────────────
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

    // ── Handlers ─────────────────────────────────────────────────
    const handleRoleSelect = (papel) => {
      if (papel === "visitante") navigate("visitor-name", "visitante");
      else navigate("credentials", papel);
    };

      const handleLogin = () => {
        navigate(role === "professor" ? "professor-home" : "history");
      };

      const handleVisitorName = (nome) => {
        setUsername(nome);
        navigate("upload");
      };

      const handleLogout = useCallback(() => {
        stopSpeak();
        setRole(null);
        setUsername("");
        setAnswers([]);
        window.history.pushState({ page: "login", role: null }, "", "#login");
        setPage("login");
      }, [stopSpeak]);

      const handleStart = () => {
        navigate("extracting");
        setTimeout(() => navigate("question"), 2300);
      };

      const handleComplete = (res) => { setAnswers(res); navigate("done"); };

      const handleGenerate = () => {
        showToast("PDF gerado com sucesso!");
        setTimeout(() => navigate(role === "aluno" ? "history" : "upload"), 2600);
      };

      // ── Topbar ───────────────────────────────────────────────────
      // Nas telas com sidebar (professor-home, history) a topbar é minimalista.
      // Nas telas de questão (upload, question, etc.) mantém navegação leve.
      const renderTopbar = () => {
        // Telas de auth inicial — topbar minimalista
        if (["login", "credentials", "visitor-name"].includes(page)) {
          return (
            <header className="topbar" role="banner">
            <div className="logo">
            <div className="logo-mark" aria-hidden="true">
            <Waveform size={16} weight="bold" color="white" />
            </div>
            ***
            </div>
            </header>
          );
        }

        // Telas com sidebar — topbar só com título da área
        if (page === "professor-home") {
          return (
            <header className="topbar" role="banner">
            <div className="topbar-area">
            <button
            className="topbar-back-btn"
            onClick={handleLogout}
            aria-label="Voltar ao login"
            >
            <ArrowLeft size={18} weight="regular" />
            </button>
            <div className="topbar-divider" aria-hidden="true" />
            <span className="topbar-area-label">Área do Professor</span>
            </div>
            </header>
          );
        }

        if (page === "history" && role === "aluno") {
          return (
            <header className="topbar" role="banner">
            <div className="logo">
            <div className="logo-mark" aria-hidden="true">
            <Waveform size={16} weight="bold" color="white" />
            </div>
            Minha Área
            </div>
            </header>
          );
        }

        // Telas de fluxo do questionário (aluno / visitante)
        return (
          <header className="topbar" role="banner">
          <div className="logo">
          <div className="logo-mark" aria-hidden="true">
          <Waveform size={16} weight="bold" color="white" />
          </div>
          {username ? `Olá, ${username}` : "***"}
          </div>
          <nav className="nav-btns" aria-label="Navegação">
          {role === "aluno" && (
            <button
            className="nav-btn"
            onClick={() => navigate("history")}
            aria-label="Voltar ao início"
            >
            Minha Área
            </button>
          )}
          </nav>
          </header>
        );
      };

      return (
        <div className="vq-shell">
        {renderTopbar()}

        {page === "login" && (
          <LoginScreen onSelect={handleRoleSelect} />
        )}

        {page === "credentials" && (role === "professor" || role === "aluno") && (
          <CredentialsScreen
          role={role}
          onLogin={handleLogin}
          onBack={() => navigate("login", null)}
          />
        )}

        {page === "visitor-name" && role === "visitante" && (
          <VisitorNameScreen
          onContinue={handleVisitorName}
          onBack={() => navigate("login", null)}
          />
        )}

        {page === "professor-home" && role === "professor" && (
          <ProfessorScreen
          username={username || "Professor"}
          onLogout={handleLogout}
          />
        )}

        {page === "history" && role === "aluno" && (
          <HistoryScreen
          username={username || "Aluno"}
          onLogout={handleLogout}
          onNewQuestionnaire={() => navigate("upload")}
          />
        )}

        {page === "upload" && (role === "aluno" || role === "visitante") && (
          <UploadScreen onStart={handleStart} />
        )}

        {page === "extracting" && (role === "aluno" || role === "visitante") && (
          <ExtractingScreen />
        )}

        {page === "question" && (role === "aluno" || role === "visitante") && (
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

        {toasts.length > 0 && (
          <div className="toast-wrap" role="alert" aria-live="assertive">
          {toasts.map((t) => (
            <div key={t.id} className="toast">{t.msg}</div>
          ))}
          </div>
        )}
        </div>
      );
}
