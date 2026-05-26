import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, SpeakerHigh } from "@phosphor-icons/react";

import { LoginScreen }          from "./components/LoginScreen";
import { CredentialsScreen }    from "./components/CredentialsScreen";
import { VisitorNameScreen }    from "./components/VisitorNameScreen";
import { ProfessorScreen }      from "./components/ProfessorScreen";
import { UploadScreen }         from "./components/UploadScreen";
import { ExtractingScreen }     from "./components/ExtractingScreen";
import { QuestionScreen }       from "./components/QuestionScreen";
import { ReviewScreen }         from "./components/ReviewScreen";
import { DoneScreen }           from "./components/DoneScreen";
import { HistoryScreen }        from "./components/HistoryScreen";
import { VoiceCommandsScreen }  from "./components/VoiceCommandsScreen";
import { AttemptsScreen }       from "./components/AttemptsScreen";

import { useSpeech } from "./hooks/useSpeech";
import { useToast }  from "./hooks/useToast";

import { DEMO_QUESTIONS } from "./data/demoData";
import { normalizeQuestions } from "./utils/questions";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Logo da aplicacao
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
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [answers, setAnswers]   = useState([]);
  const [questionSet, setQuestionSet] = useState(DEMO_QUESTIONS);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [activeActivityId, setActiveActivityId] = useState(null);
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [attemptsActivity, setAttemptsActivity] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [questionSessionId, setQuestionSessionId] = useState(0);
  const [lockedAttemptNotice, setLockedAttemptNotice] = useState(null);
  const [attemptConcluded, setAttemptConcluded] = useState(false);
 
  const [prevPage, setPrevPage] = useState(null);

  const { stopSpeak }               = useSpeech();
  const { toasts, show: showToast } = useToast();

  const isAttemptLockedError = (error) => {
    const message = String(error?.message ?? "").toLowerCase();
    return error?.status === 409 || message.includes("conclu");
  };

  // Historico do navegador
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

  // Navegacao entre telas
  const navigate = useCallback((destino, novoRole = null) => {
    stopSpeak();
    const nextRole = novoRole !== null ? novoRole : role;
    window.history.pushState({ page: destino, role: nextRole }, "", `#${destino}`);
    setPage(destino);
    if (novoRole !== null) setRole(novoRole);
  }, [role, stopSpeak]);

  // Reset de status de upload
  const resetUploadStatus = useCallback(() => {
    setUploadStatus("idle");
    setUploadError("");
  }, []);

  const fetchQuestionsByActivity = useCallback(async (activityId) => {
    if (!activityId) return;
    setQuestionsLoading(true);
    setQuestionsError("");
    try {
      const response = await fetch(`${API_BASE_URL}/questions?activity_id=${activityId}`);
      if (!response.ok) {
        let detail = "Falha ao carregar questoes.";
        try {
          const data = await response.json();
          if (data?.detail) detail = data.detail;
        } catch {
          
        }
        throw new Error(detail);
      }
      const data = await response.json();
      const normalized = normalizeQuestions(data);
      if (normalized.length > 0) {
        setQuestionSet(normalized);
      } else if (role !== "visitante") {
        setQuestionSet(DEMO_QUESTIONS);
      }
    } catch (error) {
      setQuestionsError(error?.message ?? "Falha ao carregar questoes.");
      if (role !== "visitante") setQuestionSet(DEMO_QUESTIONS);
      showToast(error?.message ?? "Falha ao carregar questoes.");
    } finally {
      setQuestionsLoading(false);
    }
  }, [API_BASE_URL, role, showToast]);

  useEffect(() => {
    if (page === "upload") resetUploadStatus();
  }, [page, resetUploadStatus]);

  useEffect(() => {
    if (!activeActivityId) return;
    fetchQuestionsByActivity(activeActivityId);
  }, [activeActivityId, fetchQuestionsByActivity]);

  useEffect(() => {
    if (!attemptConcluded) return;
    if (page !== "question" && page !== "review") return;
    if (!lockedAttemptNotice) {
      setLockedAttemptNotice("Esta tentativa ja foi concluida e nao pode ser editada.");
    }
  }, [attemptConcluded, lockedAttemptNotice, page]);

  const createAttempt = useCallback(async (activityId) => {
    if (!activityId) return null;

    const payload = {
      activity_id: activityId,
      status: "em progresso",
      started_at: new Date().toISOString(),
    };

    if (role === "aluno" && currentUser?.id) {
      payload.aluno_id = currentUser.id;
    } else if (role === "visitante" && username) {
      payload.visitor_name = username;
    } else {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = "Falha ao criar tentativa.";
        try {
          const data = await response.json();
          if (data?.detail) detail = data.detail;
        } catch {
          
        }
        throw new Error(detail);
      }

      const attempt = await response.json();
      setActiveAttemptId(attempt?.id ?? null);
      setAttemptConcluded(false);
      setLockedAttemptNotice(null);
      return attempt;
    } catch (error) {
      showToast(error?.message ?? "Falha ao criar tentativa.");
      return null;
    }
  }, [API_BASE_URL, currentUser?.id, role, showToast, username]);

  const createVisitorAttempt = useCallback(async ({ fileName, questions }) => {
    const visitorName = (username || "Visitante").trim();
    if (!visitorName) return null;

    const payload = {
      visitor_name: visitorName,
      activity_name: fileName ? String(fileName).replace(/\.[^.]+$/, "").trim() : null,
      questions: (Array.isArray(questions) ? questions : []).map((q, index) => ({
        prompt: q?.text ?? q?.prompt ?? "",
        type: q?.type === "multiple" ? "multiple" : "open",
        position: index + 1,
        options: Array.isArray(q?.options) ? q.options : [],
      })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/attempts/visitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = "Falha ao preparar tentativa do visitante.";
        try {
          const data = await response.json();
          if (data?.detail) detail = data.detail;
        } catch {
          
        }
        throw new Error(detail);
      }

      const data = await response.json();
      const attempt = data?.attempt ?? null;
      const serverQuestions = normalizeQuestions(data?.questions ?? []);

      setActiveActivityId(attempt?.activity_id ?? null);
      setActiveAttemptId(attempt?.id ?? null);
      if (serverQuestions.length > 0) setQuestionSet(serverQuestions);
      setAttemptConcluded(false);
      setLockedAttemptNotice(null);

      return data;
    } catch (error) {
      showToast(error?.message ?? "Falha ao preparar tentativa do visitante.");
      return null;
    }
  }, [API_BASE_URL, showToast, username]);

  const saveAnswers = useCallback(async (attemptId, answerList = []) => {
    if (!attemptId || !Array.isArray(answerList) || answerList.length === 0) return;

    let existing = [];
    try {
      const response = await fetch(`${API_BASE_URL}/answers?attempt_id=${attemptId}&limit=200`);
      if (response.ok) existing = await response.json();
    } catch {
      
    }

    const answerByQuestion = new Map(
      existing
        .filter((item) => item?.question_id)
        .map((item) => [item.question_id, item])
    );

    for (const answer of answerList) {
      if (!answer?.questionId) continue;

      const payload = {
        response_text: answer.responseText ?? null,
        chosen_letter: answer.chosenLetter ?? null,
      };

      const existingAnswer = answerByQuestion.get(answer.questionId);
      const endpoint = existingAnswer
        ? `${API_BASE_URL}/answers/${existingAnswer.id}`
        : `${API_BASE_URL}/answers`;

      const response = await fetch(endpoint, {
        method: existingAnswer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          existingAnswer
            ? payload
            : {
                attempt_id: attemptId,
                question_id: answer.questionId,
                ...payload,
              }
        ),
      });

      if (!response.ok) {
        let detail = "Falha ao salvar respostas.";
        try {
          const data = await response.json();
          if (data?.detail) detail = data.detail;
        } catch {
          
        }
        const error = new Error(detail);
        error.status = response.status;
        throw error;
      }
    }

    const updateResponse = await fetch(`${API_BASE_URL}/attempts/${attemptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_saved_at: new Date().toISOString(),
      }),
    });

    if (!updateResponse.ok) {
      let detail = "Falha ao atualizar tentativa.";
      try {
        const data = await updateResponse.json();
        if (data?.detail) detail = data.detail;
      } catch {
        
      }
      const error = new Error(detail);
      error.status = updateResponse.status;
      throw error;
    }
  }, [API_BASE_URL]);

  const markAttemptConcluded = useCallback(async (attemptId) => {
    if (!attemptId) return;
    const response = await fetch(`${API_BASE_URL}/attempts/${attemptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "concluido",
        submitted_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      let detail = "Falha ao finalizar tentativa.";
      try {
        const data = await response.json();
        if (data?.detail) detail = data.detail;
      } catch {
        
      }
      const error = new Error(detail);
      error.status = response.status;
      throw error;
    }
  }, [API_BASE_URL]);

    
    // Abertura/fechamento de comandos de voz
    const openVoiceCommands = useCallback(() => {
      setPrevPage(page);
      navigate("voice-commands");
    }, [page, navigate]);

    const closeVoiceCommands = useCallback(() => {
      navigate(prevPage || "login");
    }, [prevPage, navigate]);

    // Fluxo de autenticacao
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
            body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
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
          setCurrentUser(user);
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
          setCurrentUser(user);
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
        setRole(null); setUsername(""); setAnswers([]); setCurrentUser(null);
        setQuestionSet(DEMO_QUESTIONS); setActiveActivityId(null); setQuestionsError("");
        setActiveAttemptId(null); setAttemptsActivity(null);
        setQuestionSessionId(0);
        setAttemptConcluded(false);
        setLockedAttemptNotice(null);
        window.history.pushState({ page: "login", role: null }, "", "#login");
        setPage("login");
      }, [stopSpeak]);

      const resetAttemptFlow = useCallback(() => {
        setActiveAttemptId(null);
        setAttemptConcluded(false);
        setAnswers([]);
        setQuestionSessionId((prev) => prev + 1);
        setLockedAttemptNotice(null);
      }, []);


      // Navegacao inicial por perfil
      const handleSkipIntro = () => {
        if (role === "professor") navigate("professor-home");
        else if (role === "visitante") navigate("upload");
        else navigate("history");
      };

      // Fluxo do questionario
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
          setAttemptConcluded(false);
          setLockedAttemptNotice(null);
          setAnswers([]);
          setQuestionSessionId((prev) => prev + 1);
          setQuestionsError("");

          if (role === "visitante") {
            const bootstrap = await createVisitorAttempt({
              fileName: file?.name,
              questions: DEMO_QUESTIONS,
            });
            if (!bootstrap?.attempt) {
              setUploadStatus("error");
              setUploadError("Falha ao preparar tentativa do visitante.");
              return;
            }
          } else {
            setQuestionSet(DEMO_QUESTIONS);
            setActiveActivityId(null);
          }

          setTimeout(() => {
            navigate("extracting");
            setTimeout(() => navigate("question"), 2300);
          }, 400);
        } catch (error) {
          setUploadStatus("error");
          setUploadError(error?.message ?? "Falha ao enviar PDF.");
        }
      };
      const handleComplete = async (res) => {
        setAnswers(res);
        try {
          const attemptId = activeAttemptId ?? (await createAttempt(activeActivityId))?.id;
          if (attemptId) await saveAnswers(attemptId, res);
        } catch (error) {
          if (isAttemptLockedError(error)) {
            setAttemptConcluded(true);
            setActiveAttemptId(null);
            setLockedAttemptNotice("Esta tentativa ja foi concluida e nao pode ser editada.");
            return;
          }
          showToast(error?.message ?? "Falha ao salvar respostas.");
        }
        navigate("review");
      };

      const handleReviewEdit = () => {
        setQuestionSessionId((prev) => prev + 1);
        navigate("question");
      };

      const handleReviewConfirm = async () => {
        let attemptId = activeAttemptId;
        try {
          attemptId = attemptId ?? (await createAttempt(activeActivityId))?.id;
          if (attemptId) {
            await saveAnswers(attemptId, answers);
            await markAttemptConcluded(attemptId);
          }
        } catch (error) {
          if (isAttemptLockedError(error)) {
            setAttemptConcluded(true);
            setActiveAttemptId(null);
            setLockedAttemptNotice("Esta tentativa ja foi concluida e nao pode ser editada.");
            return;
          }
          showToast(error?.message ?? "Falha ao salvar respostas.");
          return;
        }
        setAttemptConcluded(true);
        setActiveAttemptId(attemptId ?? null);
        setAnswers([]);
        setQuestionSessionId((prev) => prev + 1);
        navigate("done");
      };

      const handleGenerate = async () => {
        const attemptId = activeAttemptId;
        if (!attemptId) {
          showToast("Tentativa nao encontrada.");
          return;
        }
        try {
          const response = await fetch(`${API_BASE_URL}/attempts/${attemptId}/pdf`);
          if (!response.ok) {
            let detail = "Falha ao gerar PDF.";
            try {
              const data = await response.json();
              if (data?.detail) detail = data.detail;
            } catch {
              
            }
            throw new Error(detail);
          }

          const blob = await response.blob();
          let filename = "respostas.pdf";
          const disposition = response.headers.get("content-disposition") ?? "";
          const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(disposition);
          if (match) {
            const rawName = match[1] ? decodeURIComponent(match[1]) : match[2];
            if (rawName) filename = rawName;
          }

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          showToast("PDF gerado com sucesso!");
        } catch (error) {
          showToast(error?.message ?? "Falha ao gerar PDF.");
        }
      };

      const handleDoneHome = useCallback(() => {
        resetAttemptFlow();
        navigate(role === "aluno" ? "history" : "upload");
      }, [navigate, resetAttemptFlow, role]);

      const handleOpenActivity = useCallback(async (activityId) => {
        if (!activityId) return;
        setAnswers([]);
        setActiveActivityId(activityId);
        setActiveAttemptId(null);
        setQuestionSessionId((prev) => prev + 1);
        setAttemptConcluded(false);
        setLockedAttemptNotice(null);
        await createAttempt(activityId);
        navigate("question");
      }, [createAttempt, navigate]);

      const handleOpenAttempts = useCallback((activity) => {
        if (!activity?.id) return;
        setAttemptsActivity(activity);
        navigate("attempts");
      }, [navigate]);

      // Topbar e navegacao
      const renderTopbar = () => {
        
        // Telas de auth: so logo
        if (["login", "credentials", "visitor-name"].includes(page)) {
          return (
            <header className="topbar" role="banner">
              <DictaLogo />
            </header>
          );
        }

        // Intro de comandos: logo + pular
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

        // Ajuda de comandos: logo + voltar
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

        // Area do professor
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

        // Home do aluno
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

        const handleBack = () => {
          if (page === "done") resetAttemptFlow();
          navigate(backDest);
        };

        return (
          <header className="topbar" role="banner">
          <DictaLogo onClick={handleBack} />
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
          onClick={handleBack}
          aria-label={`Voltar para ${backLabel}`}
          >
          <ArrowLeft size={16} weight="regular" />
          {backLabel}
          </button>
          </nav>
          </header>
        );
      };

      // Render principal
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
            onOpenActivity={handleOpenActivity} 
            onOpenAttempts={handleOpenAttempts}
            userId={currentUser?.id}
            apiBaseUrl={API_BASE_URL}
          />
        )}

        {page === "history" && role === "aluno" && (
          <HistoryScreen
            username={username || "Aluno"}
            onLogout={handleLogout}
            onOpenActivity={handleOpenActivity} 
            onOpenAttempts={handleOpenAttempts}
            userId={currentUser?.id}
            apiBaseUrl={API_BASE_URL}
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
          <QuestionScreen
            questions={questionSet}
            loading={questionsLoading}
            error={questionsError}
            onComplete={handleComplete}
            initialAnswers={answers}
            resetKey={questionSessionId}
          />
        )}

        {page === "review" && (role === "aluno" || role === "visitante") && (
          <ReviewScreen
            questions={questionSet}
            answers={answers}
            onEdit={handleReviewEdit}
            onConfirm={handleReviewConfirm}
          />
        )}

        {page === "done" && (role === "aluno" || role === "visitante") && (
          <DoneScreen
          role={role}
          onGenerate={handleGenerate}
          onHome={handleDoneHome}
          />
        )}

        {page === "attempts" && (
          <AttemptsScreen
            activity={attemptsActivity}
            apiBaseUrl={API_BASE_URL}
            onBack={() => navigate(role === "professor" ? "professor-home" : "history")}
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

        {lockedAttemptNotice && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card">
              <h2 className="modal-title" style={{ marginBottom: 10 }}>Tentativa concluida</h2>
              <p style={{ color: "var(--text-3)", marginBottom: 18 }}>
                {lockedAttemptNotice}
              </p>
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setLockedAttemptNotice(null);
                    setActiveAttemptId(null);
                    setAnswers([]);
                    setQuestionSessionId((prev) => prev + 1);
                    navigate(role === "aluno" ? "history" : "upload");
                  }}
                >
                  Voltar ao inicio
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      );
}