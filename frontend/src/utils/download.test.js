import assert from "node:assert/strict";
import { test } from "node:test";

import { getFilenameFromDisposition } from "./download.js";

test("getFilenameFromDisposition reads quoted filenames", () => {
  const disposition = 'attachment; filename="respostas.pdf"';

  assert.equal(getFilenameFromDisposition(disposition), "respostas.pdf");
});

test("getFilenameFromDisposition decodes utf8 filenames", () => {
  const disposition = "attachment; filename*=UTF-8''Prova%20Final.pdf";

  assert.equal(getFilenameFromDisposition(disposition), "Prova Final.pdf");
});

test("getFilenameFromDisposition falls back when header is absent", () => {
  assert.equal(getFilenameFromDisposition(null, "fallback.pdf"), "fallback.pdf");
});
