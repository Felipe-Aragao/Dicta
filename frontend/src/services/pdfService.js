import { requestJson } from "./apiClient";
import { normalizeQuestions } from "../utils/questions";

export const validatePdfUpload = async (file) => {
  const formData = new FormData();
  formData.append("pdf", file);

  await requestJson(
    "/pdf/validate",
    {
      method: "POST",
      body: formData,
    },
    "Arquivo PDF inválido.",
  );
};

export const extractQuestionsFromPdf = async (file, numQuestions) => {
  const formData = new FormData();
  formData.append("pdf", file);
  if (numQuestions) formData.append("num_questions", numQuestions);

  const data = await requestJson(
    "/pdf/receive",
    {
      method: "POST",
      body: formData,
    },
    "Falha ao enviar PDF.",
  );

  const extractedQuestions = Array.isArray(data?.questions) ? data.questions : [];
  if (extractedQuestions.length === 0) {
    throw new Error("Nenhuma questão foi identificada no PDF.");
  }

  return normalizeQuestions(extractedQuestions);
};
