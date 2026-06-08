import { useCallback, useEffect, useRef, useState } from "react";
import * as attemptService from "../services/attemptService";
import { listQuestionsByActivity } from "../services/questionService";
import { downloadBlob, getFilenameFromDisposition } from "../utils/download";

const isAttemptLockedError = (error) => {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.status === 409 || message.includes("conclu");
};

export function useAttemptFlow({ role, page, currentUser, username, navigate, showToast }) {
  const [answers, setAnswers] = useState([]);
  const [questionSet, setQuestionSet] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [activeActivityId, setActiveActivityId] = useState(null);
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [questionSessionId, setQuestionSessionId] = useState(0);
  const [questionStartIndex, setQuestionStartIndex] = useState(0);
  const [lockedAttemptNotice, setLockedAttemptNotice] = useState(null);
  const [attemptConcluded, setAttemptConcluded] = useState(false);
  const activeAttemptIdRef = useRef(null);
  const createAttemptPromiseRef = useRef(null);

  useEffect(() => {
    activeAttemptIdRef.current = activeAttemptId;
  }, [activeAttemptId]);

  const handleLockedAttempt = useCallback(() => {
    setAttemptConcluded(true);
    setActiveAttemptId(null);
    setLockedAttemptNotice("Esta tentativa já foi concluida e não pode ser editada.");
  }, []);

  const fetchQuestionsByActivity = useCallback(async (activityId) => {
    if (!activityId) return;
    setQuestionsLoading(true);
    setQuestionsError("");
    try {
      setQuestionSet(await listQuestionsByActivity(activityId));
    } catch (error) {
      setQuestionsError(error?.message ?? "Falha ao carregar questões.");
      showToast(error?.message ?? "Falha ao carregar questões.");
    } finally {
      setQuestionsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!activeActivityId) return;
    fetchQuestionsByActivity(activeActivityId);
  }, [activeActivityId, fetchQuestionsByActivity]);

  useEffect(() => {
    if (!attemptConcluded) return;
    if (page !== "question" && page !== "review") return;
    setLockedAttemptNotice((current) => current || "Esta tentativa já foi concluida e não pode ser editada.");
  }, [attemptConcluded, page]);

  const createAttempt = useCallback(async (activityId) => {
    if (!activityId) return null;
    if (activeAttemptIdRef.current) return { id: activeAttemptIdRef.current };
    if (createAttemptPromiseRef.current) return createAttemptPromiseRef.current;

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

    createAttemptPromiseRef.current = (async () => {
      const attempt = await attemptService.createAttempt(payload);
      setActiveAttemptId(attempt?.id ?? null);
      setAttemptConcluded(false);
      setLockedAttemptNotice(null);
      activeAttemptIdRef.current = attempt?.id ?? null;
      return attempt;
    })();

    try {
      return await createAttemptPromiseRef.current;
    } catch (error) {
      showToast(error?.message ?? "Falha ao criar tentativa.");
      return null;
    } finally {
      createAttemptPromiseRef.current = null;
    }
  }, [currentUser?.id, role, showToast, username]);

  const createVisitorAttempt = useCallback(async ({ fileName, questions }) => {
    const visitorName = (username || "Visitante").trim();
    if (!visitorName) return null;

    const payload = {
      visitor_name: visitorName,
      activity_name: fileName ? String(fileName).replace(/\.[^.]+$/, "").trim() : null,
      questions: (Array.isArray(questions) ? questions : []).map((question, index) => ({
        prompt: question?.text ?? question?.prompt ?? "",
        type: question?.type === "multiple" ? "multiple" : "open",
        position: index + 1,
        options: Array.isArray(question?.options) ? question.options : [],
      })),
    };

    try {
      const data = await attemptService.createVisitorAttempt(payload);
      const attempt = data?.attempt ?? null;
      setActiveActivityId(attempt?.activity_id ?? null);
      setActiveAttemptId(attempt?.id ?? null);
      if (data.questions.length > 0) setQuestionSet(data.questions);
      setAttemptConcluded(false);
      setLockedAttemptNotice(null);
      return data;
    } catch (error) {
      showToast(error?.message ?? "Falha ao preparar tentativa do visitante.");
      return null;
    }
  }, [showToast, username]);

  const resetAttemptFlow = useCallback(() => {
    setActiveAttemptId(null);
    activeAttemptIdRef.current = null;
    createAttemptPromiseRef.current = null;
    setAttemptConcluded(false);
    setAnswers([]);
    setQuestionStartIndex(0);
    setQuestionSessionId((prev) => prev + 1);
    setLockedAttemptNotice(null);
  }, []);

  const resetAllAttemptState = useCallback(() => {
    setAnswers([]);
    setQuestionSet([]);
    setActiveActivityId(null);
    setQuestionsError("");
    setActiveAttemptId(null);
    activeAttemptIdRef.current = null;
    createAttemptPromiseRef.current = null;
    setQuestionSessionId(0);
    setQuestionStartIndex(0);
    setAttemptConcluded(false);
    setLockedAttemptNotice(null);
  }, []);

  const prepareExtractedQuestions = useCallback((questions) => {
    setAttemptConcluded(false);
    setLockedAttemptNotice(null);
    setAnswers([]);
    setQuestionStartIndex(0);
    setQuestionSessionId((prev) => prev + 1);
    setQuestionsError("");
    setQuestionSet(questions);
    setActiveActivityId(null);
    setActiveAttemptId(null);
    activeAttemptIdRef.current = null;
    createAttemptPromiseRef.current = null;
  }, []);

  const handleComplete = useCallback(async (result) => {
    setAnswers(result);
    try {
      const attemptId = activeAttemptId ?? (await createAttempt(activeActivityId))?.id;
      if (!attemptId) {
        showToast("Tentativa nao encontrada.");
        return;
      }
      await attemptService.saveAnswers(attemptId, result);
    } catch (error) {
      if (isAttemptLockedError(error)) {
        handleLockedAttempt();
        return;
      }
      showToast(error?.message ?? "Falha ao salvar respostas.");
      return;
    }
    navigate("review");
  }, [activeActivityId, activeAttemptId, createAttempt, handleLockedAttempt, navigate, showToast]);

  const handleProgress = useCallback(async (result) => {
    setAnswers(result);
    try {
      const attemptId = activeAttemptId ?? (await createAttempt(activeActivityId))?.id;
      if (!attemptId) throw new Error("Tentativa nao encontrada.");
      await attemptService.saveAnswers(attemptId, result);
    } catch (error) {
      if (isAttemptLockedError(error)) {
        handleLockedAttempt();
        return;
      }
      showToast(error?.message ?? "Falha ao salvar respostas.");
      throw error;
    }
  }, [activeActivityId, activeAttemptId, createAttempt, handleLockedAttempt, showToast]);

  const handleReviewEdit = useCallback(() => {
    setQuestionStartIndex(0);
    setQuestionSessionId((prev) => prev + 1);
    navigate("question");
  }, [navigate]);

  const handleReviewConfirm = useCallback(async () => {
    let attemptId = activeAttemptId;
    try {
      attemptId = attemptId ?? (await createAttempt(activeActivityId))?.id;
      if (!attemptId) {
        showToast("Tentativa nao encontrada.");
        return;
      }
      await attemptService.saveAnswers(attemptId, answers);
      await attemptService.markAttemptConcluded(attemptId);
    } catch (error) {
      if (isAttemptLockedError(error)) {
        handleLockedAttempt();
        return;
      }
      showToast(error?.message ?? "Falha ao salvar respostas.");
      return;
    }
    setAttemptConcluded(true);
    setActiveAttemptId(attemptId ?? null);
    setAnswers([]);
    setQuestionStartIndex(0);
    setQuestionSessionId((prev) => prev + 1);
    navigate("done");
  }, [activeActivityId, activeAttemptId, answers, createAttempt, handleLockedAttempt, navigate, showToast]);

  const handlePreviewStart = useCallback(async ({ editedQuestions = [], previewTitle, setUploadStatus, setUploadError }) => {
    const normalizedQuestions = Array.isArray(editedQuestions) && editedQuestions.length > 0
      ? editedQuestions
      : questionSet;

    setQuestionSet(normalizedQuestions);

    if (role === "visitante") {
      const bootstrap = await createVisitorAttempt({
        fileName: previewTitle,
        questions: normalizedQuestions,
      });
      if (!bootstrap?.attempt) {
        setUploadStatus("error");
        setUploadError("Falha ao preparar tentativa do visitante.");
        return;
      }
    }

    setQuestionStartIndex(0);
    navigate("question");
  }, [createVisitorAttempt, navigate, questionSet, role]);

  const handleGenerate = useCallback(async () => {
    const attemptId = activeAttemptId;
    if (!attemptId) {
      showToast("Tentativa nao encontrada.");
      return;
    }
    try {
      const { blob, headers } = await attemptService.getAttemptPdf(attemptId);
      const filename = getFilenameFromDisposition(headers.get("content-disposition"), "respostas.pdf");
      downloadBlob(blob, filename);
      showToast("PDF gerado com sucesso!");
    } catch (error) {
      showToast(error?.message ?? "Falha ao gerar PDF.");
    }
  }, [activeAttemptId, showToast]);

  const handleDoneHome = useCallback(() => {
    resetAttemptFlow();
    navigate(role === "aluno" ? "history" : "upload");
  }, [navigate, resetAttemptFlow, role]);

  const startActivityAttempt = useCallback(async (activityId) => {
    if (!activityId) return null;
    setAnswers([]);
    setActiveActivityId(activityId);
    setActiveAttemptId(null);
    activeAttemptIdRef.current = null;
    setQuestionStartIndex(0);
    setQuestionSessionId((prev) => prev + 1);
    setAttemptConcluded(false);
    setLockedAttemptNotice(null);
    return createAttempt(activityId);
  }, [createAttempt]);

  const handleResumeAttempt = useCallback(async (attempt) => {
    if (!attempt?.id || !attempt?.activity_id) return;

    try {
      let existingAnswers = [];
      const data = await attemptService.listAnswers(attempt.id);
      existingAnswers = data.map((answer) => ({
        questionId: answer.question_id,
        responseText: answer.response_text || "",
        chosenLetter: answer.chosen_letter || null,
      }));

      setAnswers(existingAnswers);
      setActiveActivityId(attempt.activity_id);
      setActiveAttemptId(attempt.id);
      activeAttemptIdRef.current = attempt.id;
      setQuestionStartIndex(existingAnswers.length);
      setQuestionSessionId((prev) => prev + 1);
      setAttemptConcluded(attempt.status === "concluido");
      setLockedAttemptNotice(attempt.status === "concluido" ? "Esta tentativa já foi concluída e não pode ser editada." : null);
      navigate(attempt.status === "concluido" ? "review" : "question");
    } catch {
      showToast("Falha ao retomar a tentativa.");
    }
  }, [navigate, showToast]);

  const closeLockedAttemptNotice = useCallback(() => {
    setLockedAttemptNotice(null);
    setActiveAttemptId(null);
    activeAttemptIdRef.current = null;
    setAnswers([]);
    setQuestionStartIndex(0);
    setQuestionSessionId((prev) => prev + 1);
    navigate(role === "aluno" ? "history" : "upload");
  }, [navigate, role]);

  return {
    answers,
    questionSet,
    questionsLoading,
    questionsError,
    activeAttemptId,
    questionSessionId,
    questionStartIndex,
    lockedAttemptNotice,
    setQuestionSet,
    setQuestionsError,
    resetAttemptFlow,
    resetAllAttemptState,
    prepareExtractedQuestions,
    handleComplete,
    handleProgress,
    handleReviewEdit,
    handleReviewConfirm,
    handlePreviewStart,
    handleGenerate,
    handleDoneHome,
    startActivityAttempt,
    handleResumeAttempt,
    closeLockedAttemptNotice,
  };
}
