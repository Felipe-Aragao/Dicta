import assert from "node:assert/strict";
import { test } from "node:test";

import { extractApiErrorMessage } from "./apiError.js";

test("extractApiErrorMessage returns trimmed string details", () => {
  assert.equal(extractApiErrorMessage("  Código inválido.  "), "Código inválido.");
});

test("extractApiErrorMessage joins validation detail arrays", () => {
  const detail = [
    { msg: "Nome obrigatório." },
    { detail: "Email inválido." },
    "Senha curta.",
  ];

  assert.equal(
    extractApiErrorMessage(detail),
    "Nome obrigatório. Email inválido. Senha curta.",
  );
});

test("extractApiErrorMessage falls back for empty or unknown details", () => {
  assert.equal(extractApiErrorMessage(null, "Falha customizada."), "Falha customizada.");
  assert.equal(extractApiErrorMessage([], "Falha customizada."), "Falha customizada.");
});
