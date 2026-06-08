import { AppShell } from "./components/layout/AppShell";
import { LockedAttemptModal } from "./components/layout/LockedAttemptModal";
import { ScreenRenderer } from "./components/layout/ScreenRenderer";
import { ToastHost } from "./components/layout/ToastHost";
import { Topbar } from "./components/layout/Topbar";
import { useActivityAccess } from "./hooks/useActivityAccess";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useAttemptFlow } from "./hooks/useAttemptFlow";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { useToast } from "./hooks/useToast";
import { useUploadFlow } from "./hooks/useUploadFlow";
import "./App.css";

export default function App() {
  const { toasts, show: showToast } = useToast();
  const navigation = useAppNavigation();
  const auth = useAuthFlow({
    role: navigation.role,
    navigate: navigation.navigate,
    showToast,
  });
  const attempt = useAttemptFlow({
    role: navigation.role,
    page: navigation.page,
    currentUser: auth.currentUser,
    username: auth.username,
    navigate: navigation.navigate,
    showToast,
  });
  const upload = useUploadFlow({
    page: navigation.page,
    role: navigation.role,
    navigate: navigation.navigate,
    prepareExtractedQuestions: attempt.prepareExtractedQuestions,
  });
  const activityAccess = useActivityAccess({
    role: navigation.role,
    page: navigation.page,
    currentUser: auth.currentUser,
    navigate: navigation.navigate,
    showToast,
    startActivityAttempt: attempt.startActivityAttempt,
  });

  const handleSkipIntro = () => {
    if (navigation.role === "professor") navigation.navigate("professor-home");
    else if (navigation.role === "visitante") navigation.navigate("upload");
    else navigation.navigate("history");
  };

  const handleLogout = () => {
    navigation.stopSpeak();
    auth.resetAuth();
    attempt.resetAllAttemptState();
    activityAccess.resetActivityAccess();
    navigation.resetToLogin();
  };

  return (
    <AppShell>
      <Topbar
        page={navigation.page}
        role={navigation.role}
        navigate={navigation.navigate}
        openVoiceCommands={navigation.openVoiceCommands}
        closeVoiceCommands={navigation.closeVoiceCommands}
        onSkipIntro={handleSkipIntro}
        onDoneBack={attempt.resetAttemptFlow}
      />

      <ScreenRenderer
        page={navigation.page}
        role={navigation.role}
        auth={auth}
        attempt={attempt}
        upload={upload}
        activityAccess={activityAccess}
        navigate={navigation.navigate}
        closeVoiceCommands={navigation.closeVoiceCommands}
        handleLogout={handleLogout}
        handleSkipIntro={handleSkipIntro}
      />

      <ToastHost toasts={toasts} />
      <LockedAttemptModal
        notice={attempt.lockedAttemptNotice}
        onClose={attempt.closeLockedAttemptNotice}
      />
    </AppShell>
  );
}
