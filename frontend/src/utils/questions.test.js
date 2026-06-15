import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeQuestions } from "./questions.js";

test("normalizeQuestions sorts by position and normalizes option text", () => {
  const questions = normalizeQuestions([
    {
      id: "q2",
      position: 2,
      type: "open",
      prompt: "Questão aberta",
    },
    {
      id: "q1",
      position: 1,
      type: "multiple",
      prompt: "Questão objetiva",
      options: [
        { letter: "B", text: "Segunda" },
        { letter: "A", text: "Primeira" },
      ],
    },
  ]);

  assert.deepEqual(questions, [
    {
      id: "q1",
      type: "multiple",
      text: "Questão objetiva",
      options: ["Primeira", "Segunda"],
    },
    {
      id: "q2",
      type: "open",
      text: "Questão aberta",
      options: [],
    },
  ]);
});

test("normalizeQuestions falls back to text and open question type", () => {
  const [question] = normalizeQuestions([
    {
      id: "q1",
      text: "Pergunta importada",
      type: "essay",
      options: ["A", "B"],
    },
  ]);

  assert.equal(question.text, "Pergunta importada");
  assert.equal(question.type, "open");
  assert.deepEqual(question.options, ["A", "B"]);
});
