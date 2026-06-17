import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AttemptsScreen } from "./components/AttemptsScreen";
import { CredentialsScreen } from "./components/CredentialsScreen";
import { DoneScreen } from "./components/DoneScreen";
import { ExtractingScreen } from "./components/ExtractingScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { LoginScreen } from "./components/LoginScreen";
import { PreviewScreen } from "./components/PreviewScreen";
import { ProfessorScreen } from "./components/ProfessorScreen";
import { QuestionScreen } from "./components/QuestionScreen";
import { ReviewScreen } from "./components/ReviewScreen";
import { UploadScreen } from "./components/UploadScreen";
import { VisitorNameScreen } from "./components/VisitorNameScreen";
import { VoiceCommandsScreen } from "./components/VoiceCommandsScreen";
import { AppShell } from "./components/layout/AppShell";
import { LockedAttemptModal } from "./components/layout/LockedAttemptModal";
import { ToastHost } from "./components/layout/ToastHost";
import { Topbar } from "./components/layout/Topbar";
import { useActivityAccess } from "./hooks/useActivityAccess";
import { useAttemptFlow } from "./hooks/useAttemptFlow";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { useSpeech } from "./hooks/useSpeech";
import { useToast } from "./hooks/useToast";
import { useUploadFlow } from "./hooks/useUploadFlow";
import {
  PENDING_ACTIVITY_CODE_KEY,
  ROUTES,
  getHomePathForRole,
  getPageKeyFromPath,
  getRoleFromPath,
} from "./routes";
import "./App.css";

function LoadingRoute() {
  return (
    <div className="page page-anim">
      <div className="page-narrow">
        <div className="card" role="status" aria-live="polite">
          Carregando...
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ auth, role, children }) {
  if (!auth.authReady) return <LoadingRoute />;
  if (!auth.currentUser) return <Navigate to={ROUTES.login} replace />;
  if (role && auth.currentUser.role !== role) {
    return <Navigate to={getHomePathForRole(auth.currentUser.role)} replace />;
  }
  return children;
}

function RequireVisitor({ role, username, children }) {
  if (role !== "visitante") return <Navigate to={ROUTES.login} replace />;
  if (!username?.trim()) return <Navigate to={ROUTES.visitorName} replace />;
  return children;
}

function RequireAttemptState({ role, attempt, children }) {
  const hasQuestionState = attempt.questionSet.length > 0;
  const hasAttemptState = Boolean(attempt.activeAttemptId);

  if (hasQuestionState || hasAttemptState) return children;
  return <Navigate to={getHomePathForRole(role)} replace />;
}

function CredentialsRoute({ auth, setSelectedRole, navigate }) {
  const { role } = useParams();
  const normalizedRole = role === "professor" || role === "aluno" ? role : null;
  const pendingCode = normalizedRole === "aluno"
    ? sessionStorage.getItem(PENDING_ACTIVITY_CODE_KEY)
    : "";

  useEffect(() => {
    setSelectedRole(normalizedRole);
  }, [normalizedRole, setSelectedRole]);

  if (!normalizedRole) return <Navigate to={ROUTES.login} replace />;
  if (auth.currentUser) {
    return (
      <Navigate
        to={auth.currentUser.role === "aluno" && pendingCode
          ? ROUTES.activityCode(pendingCode)
          : getHomePathForRole(auth.currentUser.role)}
        replace
      />
    );
  }

  return (
    <CredentialsScreen
      role={normalizedRole}
      onLogin={auth.handleLogin}
      onRegister={auth.handleRegister}
      onBack={() => navigate(ROUTES.login, { replace: true })}
      loading={auth.authLoading}
      authError={auth.authError}
    />
  );
}

function ActivityCodeRoute({ auth, activityAccess, setSelectedRole, showToast, navigate }) {
  const { code } = useParams();
  const { handleOpenActivityCode } = activityAccess;

  useEffect(() => {
    if (!auth.authReady || !code) return;

    if (!auth.currentUser) {
      sessionStorage.setItem(PENDING_ACTIVITY_CODE_KEY, code);
      setSelectedRole("aluno");
      navigate(ROUTES.credentials("aluno"), { replace: true });
      return;
    }

    if (auth.currentUser.role !== "aluno") {
      sessionStorage.removeItem(PENDING_ACTIVITY_CODE_KEY);
      showToast("Entre como aluno para responder atividades por código.");
      navigate(getHomePathForRole(auth.currentUser.role), { replace: true });
      return;
    }

    let active = true;
    sessionStorage.removeItem(PENDING_ACTIVITY_CODE_KEY);
    handleOpenActivityCode(code).then((opened) => {
      if (active && !opened) navigate(ROUTES.studentHome, { replace: true });
    });

    return () => {
      active = false;
    };
  }, [auth.authReady, auth.currentUser, code, handleOpenActivityCode, navigate, setSelectedRole, showToast]);

  return <LoadingRoute />;
}

function ActivityResponderRoute({ auth, role, activityAccess, attempt }) {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const { handleOpenActivityReference } = activityAccess;
  const canUseCurrentState = attempt.questionSet.length > 0 || attempt.questionsLoading;
  const canBootstrapActivity = auth.currentUser?.role === "aluno" && activityId && activityId !== "local";

  useEffect(() => {
    if (canUseCurrentState || opening || !canBootstrapActivity) return;

    let active = true;
    setOpening(true);
    handleOpenActivityReference(activityId, { replace: true }).then((opened) => {
      if (active && !opened) navigate(ROUTES.studentHome, { replace: true });
    }).finally(() => {
      if (active) setOpening(false);
    });

    return () => {
      active = false;
    };
  }, [activityId, canBootstrapActivity, canUseCurrentState, handleOpenActivityReference, navigate, opening]);

  if (role === "visitante") {
    return (
      <RequireVisitor role={role} username={auth.username}>
        <RequireAttemptState role={role} attempt={attempt}>
          <QuestionScreen
            questions={attempt.questionSet}
            loading={attempt.questionsLoading}
            error={attempt.questionsError}
            onComplete={attempt.handleComplete}
            onProgress={attempt.handleProgress}
            initialAnswers={attempt.answers}
            initialIndex={attempt.questionStartIndex}
            resetKey={attempt.questionSessionId}
          />
        </RequireAttemptState>
      </RequireVisitor>
    );
  }

  return (
    <RequireAuth auth={auth} role="aluno">
      {opening || attempt.questionsLoading || (canBootstrapActivity && !canUseCurrentState) ? (
        <LoadingRoute />
      ) : (
        <RequireAttemptState role="aluno" attempt={attempt}>
          <QuestionScreen
            questions={attempt.questionSet}
            loading={attempt.questionsLoading}
            error={attempt.questionsError}
            onComplete={attempt.handleComplete}
            onProgress={attempt.handleProgress}
            initialAnswers={attempt.answers}
            initialIndex={attempt.questionStartIndex}
            resetKey={attempt.questionSessionId}
          />
        </RequireAttemptState>
      )}
    </RequireAuth>
  );
}

function AttemptsRoute({ auth, role, activityAccess, attempt, navigate }) {
  const { activityId } = useParams();
  const [loading, setLoading] = useState(false);
  const { attemptsActivity, loadAttemptsActivity } = activityAccess;
  const needsActivity = Boolean(activityId && String(attemptsActivity?.id) !== String(activityId));

  useEffect(() => {
    if (!needsActivity) return;
    let active = true;
    setLoading(true);
    loadAttemptsActivity(activityId).then((activity) => {
      if (active && !activity) navigate(role === "professor" ? ROUTES.professorHome : ROUTES.studentHome, { replace: true });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activityId, loadAttemptsActivity, navigate, needsActivity, role]);

  return (
    <RequireAuth auth={auth} role={role === "professor" ? "professor" : "aluno"}>
      {loading || needsActivity ? (
        <LoadingRoute />
      ) : (
        <AttemptsScreen
          activity={attemptsActivity}
          onBack={() => navigate(role === "professor" ? ROUTES.professorHome : ROUTES.studentHome)}
          onResume={attempt.handleResumeAttempt}
          alunoId={role === "aluno" ? auth.currentUser?.id : null}
        />
      )}
    </RequireAuth>
  );
}

export default function App() {
  const { toasts, show: showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { stopSpeak } = useSpeech();
  const [selectedRole, setSelectedRole] = useState(() => getRoleFromPath(window.location.pathname));

  const page = getPageKeyFromPath(location.pathname);

  const auth = useAuthFlow({
    role: selectedRole,
    navigate,
    showToast,
    onRoleChange: setSelectedRole,
  });

  const role = useMemo(
    () => auth.currentUser?.role ?? selectedRole ?? getRoleFromPath(location.pathname),
    [auth.currentUser?.role, location.pathname, selectedRole]
  );

  useEffect(() => {
    const pathRole = getRoleFromPath(location.pathname);
    if (pathRole && !auth.currentUser) setSelectedRole(pathRole);
  }, [auth.currentUser, location.pathname]);

  useEffect(() => {
    if (!auth.currentUser || auth.currentUser.role !== "aluno") return;
    const pendingCode = sessionStorage.getItem(PENDING_ACTIVITY_CODE_KEY);
    if (!pendingCode) return;
    sessionStorage.removeItem(PENDING_ACTIVITY_CODE_KEY);
    navigate(ROUTES.activityCode(pendingCode), { replace: true });
  }, [auth.currentUser, navigate]);

  const attempt = useAttemptFlow({
    role,
    page,
    currentUser: auth.currentUser,
    username: auth.username,
    navigate,
    showToast,
  });

  const upload = useUploadFlow({
    isUploadPage: location.pathname === ROUTES.upload,
    role,
    navigate,
    prepareExtractedQuestions: attempt.prepareExtractedQuestions,
  });

  const activityAccess = useActivityAccess({
    role,
    navigate,
    showToast,
    startActivityAttempt: attempt.startActivityAttempt,
  });

  const handleSkipIntro = () => {
    navigate(getHomePathForRole(role), { replace: true });
  };

  const handleLogout = () => {
    stopSpeak();
    auth.resetAuth();
    attempt.resetAllAttemptState();
    activityAccess.resetActivityAccess();
    navigate(ROUTES.login, { replace: true });
  };

  const openVoiceCommands = () => {
    stopSpeak();
    navigate(ROUTES.voiceCommands, { state: { from: location.pathname } });
  };

  const closeVoiceCommands = () => {
    stopSpeak();
    navigate(location.state?.from || getHomePathForRole(role), { replace: true });
  };

  return (
    <AppShell>
      <Topbar
        page={page}
        role={role}
        navigate={navigate}
        openVoiceCommands={openVoiceCommands}
        closeVoiceCommands={closeVoiceCommands}
        onSkipIntro={handleSkipIntro}
        onDoneBack={attempt.resetAttemptFlow}
      />

      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
        <Route
          path={ROUTES.login}
          element={
            auth.currentUser
              ? <Navigate to={getHomePathForRole(auth.currentUser.role)} replace />
              : <LoginScreen onSelect={auth.handleRoleSelect} />
          }
        />
        <Route
          path={ROUTES.credentials()}
          element={<CredentialsRoute auth={auth} setSelectedRole={setSelectedRole} navigate={navigate} />}
        />
        <Route
          path={ROUTES.visitorName}
          element={
            <VisitorNameScreen
              onContinue={auth.handleVisitorName}
              onBack={() => navigate(ROUTES.login, { replace: true })}
            />
          }
        />
        <Route
          path={ROUTES.professorHome}
          element={
            <RequireAuth auth={auth} role="professor">
              <ProfessorScreen
                username={auth.username || "Professor"}
                onLogout={handleLogout}
                onOpenAttempts={activityAccess.handleOpenAttempts}
                userId={auth.currentUser?.id}
              />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.studentHome}
          element={
            <RequireAuth auth={auth} role="aluno">
              <HistoryScreen
                username={auth.username || "Aluno"}
                onLogout={handleLogout}
                onOpenActivity={activityAccess.handleOpenActivity}
                onOpenActivityCode={activityAccess.handleOpenActivityCode}
                onOpenAttempts={activityAccess.handleOpenAttempts}
                userId={auth.currentUser?.id}
              />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.upload}
          element={
            role === "aluno" ? (
              <RequireAuth auth={auth} role="aluno">
                <UploadScreen
                  onStart={upload.handleStart}
                  uploadStatus={upload.uploadStatus}
                  uploadError={upload.uploadError}
                  selectedFileName={upload.uploadFileName}
                  onFileSelected={upload.resetUploadStatus}
                  showQuestionCount
                />
              </RequireAuth>
            ) : (
              <RequireVisitor role={role} username={auth.username}>
                <UploadScreen
                  onStart={upload.handleStart}
                  uploadStatus={upload.uploadStatus}
                  uploadError={upload.uploadError}
                  selectedFileName={upload.uploadFileName}
                  onFileSelected={upload.resetUploadStatus}
                  showQuestionCount={false}
                />
              </RequireVisitor>
            )
          }
        />
        <Route
          path={ROUTES.extracting}
          element={
            upload.uploadStatus === "loading" ? (
              <ExtractingScreen />
            ) : (
              <RequireAttemptState role={role} attempt={attempt}>
                <ExtractingScreen />
              </RequireAttemptState>
            )
          }
        />
        <Route
          path={ROUTES.preview}
          element={
            <RequireVisitor role={role} username={auth.username}>
              <RequireAttemptState role={role} attempt={attempt}>
                <PreviewScreen
                  title={upload.previewTitle}
                  questions={attempt.questionSet}
                  onBack={() => navigate(ROUTES.upload)}
                  onStart={(editedQuestions) => attempt.handlePreviewStart({
                    editedQuestions,
                    previewTitle: upload.previewTitle,
                    setUploadStatus: upload.setUploadStatus,
                    setUploadError: upload.setUploadError,
                  })}
                />
              </RequireAttemptState>
            </RequireVisitor>
          }
        />
        <Route
          path={ROUTES.activityCode()}
          element={
            <ActivityCodeRoute
              auth={auth}
              activityAccess={activityAccess}
              setSelectedRole={setSelectedRole}
              showToast={showToast}
              navigate={navigate}
            />
          }
        />
        <Route
          path={ROUTES.activityResponder()}
          element={<ActivityResponderRoute auth={auth} role={role} activityAccess={activityAccess} attempt={attempt} />}
        />
        <Route
          path={ROUTES.attemptReview()}
          element={
            <RequireAttemptState role={role} attempt={attempt}>
              <ReviewScreen
                questions={attempt.questionSet}
                answers={attempt.answers}
                onEdit={attempt.handleReviewEdit}
                onConfirm={attempt.handleReviewConfirm}
              />
            </RequireAttemptState>
          }
        />
        <Route
          path={ROUTES.attemptDone()}
          element={
            <RequireAttemptState role={role} attempt={attempt}>
              <DoneScreen
                role={role}
                onGenerate={attempt.handleGenerate}
                onHome={attempt.handleDoneHome}
              />
            </RequireAttemptState>
          }
        />
        <Route
          path={ROUTES.attempts()}
          element={
            <AttemptsRoute
              auth={auth}
              role={role}
              activityAccess={activityAccess}
              attempt={attempt}
              navigate={navigate}
            />
          }
        />
        <Route path={ROUTES.voiceCommands} element={<VoiceCommandsScreen onClose={closeVoiceCommands} />} />
        <Route
          path={ROUTES.voiceIntro}
          element={<VoiceCommandsScreen isIntro onContinue={handleSkipIntro} />}
        />
        <Route
          path="*"
          element={<Navigate to={auth.currentUser ? getHomePathForRole(auth.currentUser.role) : ROUTES.login} replace />}
        />
      </Routes>

      <ToastHost toasts={toasts} />
      <LockedAttemptModal
        notice={attempt.lockedAttemptNotice}
        onClose={attempt.closeLockedAttemptNotice}
      />
    </AppShell>
  );
}
