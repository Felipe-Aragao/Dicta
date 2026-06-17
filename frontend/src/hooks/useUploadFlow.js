import { useCallback, useEffect, useState } from "react";
import { extractQuestionsFromPdf } from "../services/pdfService";
import { ROUTES } from "../routes";

export function useUploadFlow({ isUploadPage, role, navigate, prepareExtractedQuestions }) {
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [previewTitle, setPreviewTitle] = useState("Mock test");

  const resetUploadStatus = useCallback(() => {
    setUploadStatus("idle");
    setUploadError("");
  }, []);

  useEffect(() => {
    if (isUploadPage) resetUploadStatus();
  }, [isUploadPage, resetUploadStatus]);

  const handleStart = useCallback(async (file, numQuestions) => {
    const nextAfterExtracting = role === "visitante" ? ROUTES.preview : ROUTES.activityResponder("local");
    if (!file) return;

    setUploadStatus("loading");
    setUploadError("");

    try {
      const questions = await extractQuestionsFromPdf(file, numQuestions);
      setUploadStatus("success");
      setPreviewTitle(file?.name ? file.name.replace(/\.[^.]+$/, "") : "Prova");
      prepareExtractedQuestions(questions);

      setTimeout(() => {
        navigate(ROUTES.extracting, { replace: true });
        setTimeout(() => navigate(nextAfterExtracting, { replace: true }), 2300);
      }, 400);
    } catch (error) {
      setUploadStatus("error");
      setUploadError(error?.message ?? "Falha ao enviar PDF.");
    }
  }, [navigate, prepareExtractedQuestions, role]);

  return {
    uploadStatus,
    uploadError,
    previewTitle,
    setUploadStatus,
    setUploadError,
    resetUploadStatus,
    handleStart,
  };
}
