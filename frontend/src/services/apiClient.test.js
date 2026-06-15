import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  clearAuthSession,
  clearVisitorSession,
  requestJson,
  saveAuthSession,
  saveVisitorSession,
  setUnauthorizedHandler,
} from "./apiClient.js";

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.items.delete(key);
  }

  clear() {
    this.items.clear();
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();
  setUnauthorizedHandler(null);
});

test("requestJson adds bearer token and parses JSON responses", async () => {
  saveAuthSession({
    accessToken: "user-token",
    user: { id: "1", name: "Aluno" },
  });

  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8000/activities");
    assert.equal(options.headers.get("Authorization"), "Bearer user-token");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const data = await requestJson("/activities");

  assert.deepEqual(data, { ok: true });
});

test("requestJson can use visitor token when requested", async () => {
  saveVisitorSession({ accessToken: "visitor-token" });

  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8000/attempts");
    assert.equal(options.headers.get("Authorization"), "Bearer visitor-token");
    return new Response(null, { status: 204 });
  };

  const data = await requestJson("/attempts", { authMode: "visitor" });

  assert.equal(data, null);
});

test("requestJson throws API detail and notifies unauthorized handler", async () => {
  let notified = false;
  setUnauthorizedHandler(() => {
    notified = true;
  });

  globalThis.fetch = async () => (
    new Response(JSON.stringify({ detail: "Token inválido." }), { status: 401 })
  );

  await assert.rejects(
    () => requestJson("/auth/me", {}, "Falha padrão."),
    /Token inválido\./,
  );
  assert.equal(notified, true);
});

test("session helpers clear competing auth modes", () => {
  saveAuthSession({
    accessToken: "user-token",
    user: { id: "1", name: "Aluno" },
  });
  saveVisitorSession({ accessToken: "visitor-token" });

  assert.equal(globalThis.localStorage.getItem("dicta.auth.token"), null);
  assert.equal(globalThis.sessionStorage.getItem("dicta.visitor.token"), "visitor-token");

  clearVisitorSession();
  clearAuthSession();
  assert.equal(globalThis.sessionStorage.getItem("dicta.visitor.token"), null);
});
