import { jsonOptions, requestBlob, requestJson } from "./apiClient";
import { normalizeQuestions } from "../utils/questions";

export const listAttempts = ({ activityId, alunoId, limit = 200 }) => {
  const params = new URLSearchParams({
    activity_id: activityId,
    limit: String(limit),
  });
  if (alunoId) params.set("aluno_id", alunoId);
  return requestJson(`/attempts?${params.toString()}`, {}, "Falha ao carregar tentativas.");
};

export const listAttemptsByAluno = (alunoId, limit = 1000) => (
  requestJson(`/attempts?aluno_id=${alunoId}&limit=${limit}`, {}, "Falha ao carregar atividades.")
);

export const createAttempt = (payload) => (
  requestJson("/attempts", jsonOptions("POST", payload), "Falha ao criar tentativa.")
);

export const createVisitorAttempt = async (payload) => {
  const data = await requestJson(
    "/attempts/visitor",
    jsonOptions("POST", payload),
    "Falha ao preparar tentativa do visitante.",
  );
  return {
    ...data,
    questions: normalizeQuestions(data?.questions ?? []),
  };
};

export const listAnswers = (attemptId, limit = 200) => (
  requestJson(`/answers?attempt_id=${attemptId}&limit=${limit}`, {}, "Falha ao carregar respostas.")
);

export const saveAnswer = ({ answerId, payload }) => (
  requestJson(
    answerId ? `/answers/${answerId}` : "/answers",
    jsonOptions(answerId ? "PUT" : "POST", payload),
    "Falha ao salvar respostas.",
  )
);

export const updateAttempt = (attemptId, payload, fallback = "Falha ao atualizar tentativa.") => (
  requestJson(`/attempts/${attemptId}`, jsonOptions("PUT", payload), fallback)
);

export const markAttemptConcluded = (attemptId) => (
  updateAttempt(
    attemptId,
    {
      status: "concluido",
      submitted_at: new Date().toISOString(),
    },
    "Falha ao finalizar tentativa.",
  )
);

export const getAttemptPdf = (attemptId, fallback = "Falha ao gerar PDF.") => (
  requestBlob(`/attempts/${attemptId}/pdf`, {}, fallback)
);

export const saveAnswers = async (attemptId, answerList = []) => {
  if (!attemptId || !Array.isArray(answerList) || answerList.length === 0) return;

  let existing = [];
  try {
    existing = await listAnswers(attemptId);
  } catch {
    // Continua salvando novas respostas se a listagem falhar silenciosamente, como antes.
  }

  const answerByQuestion = new Map(
    existing
      .filter((item) => item?.question_id)
      .map((item) => [item.question_id, item])
  );

  for (const answer of answerList) {
    if (!answer?.questionId) continue;

    const payload = {
      response_text: answer.responseText ?? null,
      chosen_letter: answer.chosenLetter ?? null,
    };
    const existingAnswer = answerByQuestion.get(answer.questionId);

    await saveAnswer({
      answerId: existingAnswer?.id,
      payload: existingAnswer
        ? payload
        : {
            attempt_id: attemptId,
            question_id: answer.questionId,
            ...payload,
          },
    });
  }

  await updateAttempt(attemptId, {
    last_saved_at: new Date().toISOString(),
  });
};
