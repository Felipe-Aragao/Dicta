import { useState, useEffect, useCallback } from "react";
import { SignOut, ArrowLeft, Waveform } from "@phosphor-icons/react";

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
  Fluxo:
  ──────────────────────────────────────────────────────────────
  login
    → professor   → credentials → professor-home
    → aluno       → credentials → history (home) → upload → … → done
    → visitante   → visitor-name → upload → … → done
  ──────────────────────────────────────────────────────────────
*/

export default function App() {
  const [role, setRole]             = useState(null);
  const [page, setPage]             = useState("login");
  const [visitorName, setVisitorName] = useState("");
  const [answers, setAnswers]       = useState([]);

  const { stopSpeak }               = useSpeech();
  const { toasts, show: showToast } = useToast();

  // ── Browser history ─────────────────────────────────────────────
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

  // ── navigate + pushState ────────────────────────────────────────
  const navigate = useCallback((destino, novoRole = null) => {
    stopSpeak();
    const nextRole = novoRole !== null ? novoRole : role;
    window.history.pushState({ page: destino, role: nextRole }, "", `#${destino}`);
    setPage(destino);
    if (novoRole !== null) setRole(novoRole);
  }, [role, stopSpeak]);

  // ── Seleção de papel ────────────────────────────────────────────
  const handleRoleSelect = (papel) => {
    if (papel === "visitante") {
      navigate("visitor-name", "visitante");
    } else {
      navigate("credentials", papel);
    }
  };

  // ── Login (professor / aluno) ───────────────────────────────────
  const handleLogin = () => {
    navigate(role === "professor" ? "professor-home" : "history");
  };

  // ── Nome do visitante confirmado ────────────────────────────────
  const handleVisitorName = (nome) => {
    setVisitorName(nome);
    navigate("upload");
  };

  // ── Logout ──────────────────────────────────────────────────────
  const handleLogout = () => {
    stopSpeak();
    setRole(null);
    setVisitorName("");
    setAnswers([]);
    window.history.pushState({ page: "login", role: null }, "", "#login");
    setPage("login");
  };

  // ── Fluxo questionário ──────────────────────────────────────────
  const handleStart = () => {
    navigate("extracting");
    setTimeout(() => navigate("question"), 2300);
  };

  const handleComplete = (res) => {
    setAnswers(res);
    navigate("done");
  };

  const handleGenerate = () => {
    showToast("PDF gerado com sucesso!");
    setTimeout(() => {
      navigate(role === "aluno" ? "history" : "upload");
    }, 2600);
  };

  // ── Topbar ───────────────────────────────────────────────────────
  const renderTopbar = () => {
    if (page === "login" || page === "credentials" || page === "visitor-name") {
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

    if (role === "professor") {
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
          <button className="nav-btn" onClick={handleLogout} aria-label="Sair">
            <SignOut size={17} weight="regular" />
            Sair
          </button>
        </header>
      );
    }

    // Aluno e Visitante
    return (
      <header className="topbar" role="banner">
        <div className="logo">
          <div className="logo-mark" aria-hidden="true">
            <Waveform size={16} weight="bold" color="white" />
          </div>
          {visitorName ? `Olá, ${visitorName}` : "***"}
        </div>
        <nav className="nav-btns" aria-label="Navegação">
          {role === "aluno" && (
            <>
              <button
                className={`nav-btn${page === "history" ? " active" : ""}`}
                onClick={() => navigate("history")}
                aria-label="Meus questionários"
              >
                Meus questionários
              </button>
              <button
                className={`nav-btn${page === "upload" ? " active" : ""}`}
                onClick={() => navigate("upload")}
                aria-label="Novo questionário"
              >
                Novo questionário
              </button>
            </>
          )}
          <div className="topbar-divider" aria-hidden="true" style={{ margin: "0 6px" }} />
          <button className="nav-btn" onClick={handleLogout} aria-label="Sair">
            <SignOut size={17} weight="regular" />
            Sair
          </button>
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
        <ProfessorScreen />
      )}

      {page === "history" && role === "aluno" && (
        <HistoryScreen onNewQuestionnaire={() => navigate("upload")} />
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
