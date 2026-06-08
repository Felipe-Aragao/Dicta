import { jsonOptions, requestJson } from "./apiClient";
import { normalizeQuestions } from "../utils/questions";

export const listQuestionsByActivity = async (activityId) => {
  const data = await requestJson(`/questions?activity_id=${activityId}`, {}, "Falha ao carregar questões.");
  return normalizeQuestions(data);
};

export const createQuestion = (payload) => (
  requestJson("/questions", jsonOptions("POST", payload), "Falha ao salvar questao.")
);

export const createQuestionOption = (payload) => (
  requestJson("/question-options", jsonOptions("POST", payload), "Falha ao salvar alternativa.")
);
