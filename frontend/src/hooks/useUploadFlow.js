import { useCallback, useEffect, useState } from "react";
import { extractQuestionsFromPdf } from "../services/pdfService";

export function useUploadFlow({ page, role, navigate, prepareExtractedQuestions }) {
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [previewTitle, setPreviewTitle] = useState("Mock test");

  const resetUploadStatus = useCallback(() => {
    setUploadStatus("idle");
    setUploadError("");
  }, []);

  useEffect(() => {
    if (page === "upload") resetUploadStatus();
  }, [page, resetUploadStatus]);

  const handleStart = useCallback(async (file, numQuestions) => {
    const nextAfterExtracting = role === "visitante" ? "preview" : "question";
    if (!file) return;

    setUploadStatus("loading");
    setUploadError("");

    try {
      const questions = await extractQuestionsFromPdf(file, numQuestions);
      setUploadStatus("success");
      setPreviewTitle(file?.name ? file.name.replace(/\.[^.]+$/, "") : "Prova");
      prepareExtractedQuestions(questions);

      setTimeout(() => {
        navigate("extracting");
        setTimeout(() => navigate(nextAfterExtracting), 2300);
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
