import { useCallback, useEffect, useState } from "react";
import { extractQuestionsFromPdf } from "../services/pdfService";
import { ROUTES } from "../routes";

export function useUploadFlow({ isUploadPage, role, navigate, prepareExtractedQuestions }) {
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [previewTitle, setPreviewTitle] = useState("Mock test");

  const resetUploadStatus = useCallback(() => {
    setUploadStatus("idle");
    setUploadError("");
    setUploadFileName("");
  }, []);

  useEffect(() => {
    if (isUploadPage) resetUploadStatus();
  }, [isUploadPage, resetUploadStatus]);

  const handleStart = useCallback(async (file, numQuestions) => {
    const nextAfterExtracting = role === "visitante" ? ROUTES.preview : ROUTES.activityResponder("local");
    if (!file) return;

    setUploadStatus("loading");
    setUploadError("");
    setUploadFileName(file.name || "");
    navigate(ROUTES.extracting, { replace: true });

    try {
      const questions = await extractQuestionsFromPdf(file, numQuestions);
      setUploadStatus("success");
      setPreviewTitle(file?.name ? file.name.replace(/\.[^.]+$/, "") : "Prova");
      prepareExtractedQuestions(questions);
      navigate(nextAfterExtracting, { replace: true });
    } catch (error) {
      setUploadStatus("error");
      setUploadError(error?.message ?? "Falha ao enviar PDF.");
      navigate(ROUTES.upload, { replace: true });
    }
  }, [navigate, prepareExtractedQuestions, role]);

  return {
    uploadStatus,
    uploadError,
    uploadFileName,
    previewTitle,
    setUploadStatus,
    setUploadError,
    resetUploadStatus,
    handleStart,
  };
}
