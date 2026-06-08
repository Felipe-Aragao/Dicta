import { useCallback, useState } from "react";
import { createActivity, deleteActivity } from "../services/activityService";
import { createQuestion, createQuestionOption } from "../services/questionService";
import { extractQuestionsFromPdf } from "../services/pdfService";
import { OPTION_LETTERS } from "../utils/activityFormatters";

export function useActivityCreationFlow({
  userId,
  username,
  isShareable,
  ownerFallback,
  normalizeActivity,
  onCreated,
  setError,
}) {
  const [showModal, setShowModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleOpenCreate = useCallback(() => {
    setPreviewData(null);
    setUploadStatus("idle");
    setUploadError("");
    setShowPdfModal(true);
  }, []);

  const handleExtractActivityPdf = useCallback(async (file) => {
    if (!file) return;
    setUploadStatus("loading");
    setUploadError("");

    try {
      const questions = await extractQuestionsFromPdf(file);
      setUploadStatus("success");
      setPreviewData({
        name: file?.name ? file.name.replace(/\.[^.]+$/, "") : "",
        discipline: "",
        questions,
      });
      setShowPdfModal(false);
      setShowModal(true);
    } catch (error) {
      setUploadStatus("error");
      setUploadError(error?.message ?? "Falha ao enviar PDF.");
    }
  }, []);

  const handlePreview = useCallback((data) => {
    setShowModal(false);
    const numQuestions = data.numQuestions;

    setPreviewData((prev) => {
      let mergedQuestions = prev?.questions || [];

      if (numQuestions) {
        if (mergedQuestions.length > numQuestions) {
          mergedQuestions = mergedQuestions.slice(0, numQuestions);
        } else if (mergedQuestions.length < numQuestions) {
          const blanks = Array.from({ length: numQuestions - mergedQuestions.length }).map((_, index) => ({
            id: `blank-${mergedQuestions.length + index}`,
            type: "open",
            text: "",
            options: [],
          }));
          mergedQuestions = [...mergedQuestions, ...blanks];
        }
      }

      return { ...prev, ...data, ...(numQuestions ? { numQuestions } : {}), questions: mergedQuestions };
    });
  }, []);

  const createQuestionsForActivity = useCallback(async (activityId, questions = []) => {
    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      const prompt = (question?.text ?? "").trim();
      if (!prompt) continue;

      const createdQuestion = await createQuestion({
        activity_id: activityId,
        position: i + 1,
        type: question?.type === "multiple" ? "multiple" : "open",
        prompt,
      });

      if (question?.type === "multiple" && Array.isArray(question?.options)) {
        for (let j = 0; j < question.options.length; j += 1) {
          const optionText = (question.options[j] ?? "").trim();
          if (!optionText) continue;

          await createQuestionOption({
            question_id: createdQuestion.id,
            letter: OPTION_LETTERS[j] ?? String(j + 1),
            text: optionText,
          });
        }
      }
    }
  }, []);

  const handleConfirm = useCallback(async (editedQuestions) => {
    if (!previewData || !userId) return;
    setSaving(true);
    let createdActivity = null;
    try {
      createdActivity = await createActivity({
        owner_id: userId,
        name: previewData.name,
        discipline: previewData.discipline,
        status: "ativo",
        is_shareable: isShareable,
      });
      await createQuestionsForActivity(createdActivity.id, editedQuestions ?? previewData.questions ?? []);
      onCreated(normalizeActivity(createdActivity, username));
      setPreviewData(null);
    } catch (error) {
      if (createdActivity?.id) {
        try {
          await deleteActivity(createdActivity.id);
        } catch {
          // Ignora falha de rollback para preservar o erro original.
        }
      }
      setError(error?.message ?? "Falha ao criar atividade.");
    } finally {
      setSaving(false);
    }
  }, [createQuestionsForActivity, isShareable, normalizeActivity, onCreated, previewData, setError, userId, username]);

  const closeCreateModal = useCallback(() => {
    setShowModal(false);
    setPreviewData(null);
  }, []);

  const previewQuestions = previewData?.questions || Array.from({ length: previewData?.numQuestions || 0 }).map((_, index) => ({
    id: `blank-${index}`,
    type: "open",
    text: "",
    options: [],
  }));

  return {
    ownerName: username || ownerFallback,
    showModal,
    setShowModal,
    showPdfModal,
    setShowPdfModal,
    uploadStatus,
    uploadError,
    previewData,
    saving,
    previewQuestions,
    handleOpenCreate,
    handleExtractActivityPdf,
    handlePreview,
    handleConfirm,
    closeCreateModal,
    setPreviewData,
    resetUploadStatus: () => {
      setUploadStatus("idle");
      setUploadError("");
    },
  };
}
