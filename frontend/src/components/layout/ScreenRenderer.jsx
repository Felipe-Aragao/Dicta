import { AttemptsScreen } from "../AttemptsScreen";
import { CredentialsScreen } from "../CredentialsScreen";
import { DoneScreen } from "../DoneScreen";
import { ExtractingScreen } from "../ExtractingScreen";
import { HistoryScreen } from "../HistoryScreen";
import { LoginScreen } from "../LoginScreen";
import { PreviewScreen } from "../PreviewScreen";
import { ProfessorScreen } from "../ProfessorScreen";
import { QuestionScreen } from "../QuestionScreen";
import { ReviewScreen } from "../ReviewScreen";
import { UploadScreen } from "../UploadScreen";
import { VisitorNameScreen } from "../VisitorNameScreen";
import { VoiceCommandsScreen } from "../VoiceCommandsScreen";
import { API_BASE_URL } from "../../config/api";

export function ScreenRenderer({
  page,
  role,
  auth,
  attempt,
  upload,
  activityAccess,
  navigate,
  closeVoiceCommands,
  handleLogout,
  handleSkipIntro,
}) {
  return (
    <>
      {page === "login" && <LoginScreen onSelect={auth.handleRoleSelect} />}

      {page === "credentials" && (role === "professor" || role === "aluno") && (
        <CredentialsScreen
          role={role}
          onLogin={auth.handleLogin}
          onRegister={auth.handleRegister}
          onBack={() => navigate("login", null)}
          loading={auth.authLoading}
          authError={auth.authError}
        />
      )}

      {page === "visitor-name" && role === "visitante" && (
        <VisitorNameScreen onContinue={auth.handleVisitorName} onBack={() => navigate("login", null)} />
      )}

      {page === "professor-home" && role === "professor" && (
        <ProfessorScreen
          username={auth.username || "Professor"}
          onLogout={handleLogout}
          onOpenActivity={activityAccess.handleOpenActivity}
          onOpenAttempts={activityAccess.handleOpenAttempts}
          userId={auth.currentUser?.id}
          apiBaseUrl={API_BASE_URL}
        />
      )}

      {page === "history" && role === "aluno" && (
        <HistoryScreen
          username={auth.username || "Aluno"}
          onLogout={handleLogout}
          onOpenActivity={activityAccess.handleOpenActivity}
          onOpenActivityCode={activityAccess.handleOpenActivityCode}
          onOpenAttempts={activityAccess.handleOpenAttempts}
          userId={auth.currentUser?.id}
          apiBaseUrl={API_BASE_URL}
        />
      )}

      {page === "upload" && (role === "aluno" || role === "visitante") && (
        <UploadScreen
          onStart={upload.handleStart}
          uploadStatus={upload.uploadStatus}
          uploadError={upload.uploadError}
          onFileSelected={upload.resetUploadStatus}
          showQuestionCount={role !== "visitante"}
        />
      )}

      {page === "extracting" && (role === "aluno" || role === "visitante") && <ExtractingScreen />}

      {page === "preview" && role === "visitante" && (
        <PreviewScreen
          title={upload.previewTitle}
          questions={attempt.questionSet}
          onBack={() => navigate("upload")}
          onStart={(editedQuestions) => attempt.handlePreviewStart({
            editedQuestions,
            previewTitle: upload.previewTitle,
            setUploadStatus: upload.setUploadStatus,
            setUploadError: upload.setUploadError,
          })}
        />
      )}

      {page === "question" && (role === "aluno" || role === "visitante") && (
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
      )}

      {page === "review" && (role === "aluno" || role === "visitante") && (
        <ReviewScreen
          questions={attempt.questionSet}
          answers={attempt.answers}
          onEdit={attempt.handleReviewEdit}
          onConfirm={attempt.handleReviewConfirm}
        />
      )}

      {page === "done" && (role === "aluno" || role === "visitante") && (
        <DoneScreen
          role={role}
          onGenerate={attempt.handleGenerate}
          onHome={attempt.handleDoneHome}
        />
      )}

      {page === "attempts" && (
        <AttemptsScreen
          activity={activityAccess.attemptsActivity}
          apiBaseUrl={API_BASE_URL}
          onBack={() => navigate(role === "professor" ? "professor-home" : "history")}
          onResume={attempt.handleResumeAttempt}
          alunoId={role === "aluno" ? auth.currentUser?.id : null}
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
    </>
  );
}
