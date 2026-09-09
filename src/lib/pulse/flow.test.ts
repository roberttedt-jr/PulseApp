import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { flowPath, resolveAppFlow } from "./flow.ts";

describe("resolveAppFlow", () => {
  it("sends accounts without a handle to claim one", () => {
    assert.equal(
      resolveAppFlow({ username: null, setupCompletedAt: "2026-09-06T00:00:00.000Z", tutorialCompletedAt: "2026-09-06T00:01:00.000Z" }),
      "handle",
    );
  });
  it("sends new accounts to setup", () => {
    assert.equal(resolveAppFlow({ username: "ada", setupCompletedAt: null, tutorialCompletedAt: null }), "setup");
  });
  it("resumes tutorial after setup", () => {
    assert.equal(
      resolveAppFlow({ username: "ada", setupCompletedAt: "2026-09-06T00:00:00.000Z", tutorialCompletedAt: null }),
      "tutorial",
    );
  });
  it("opens the dashboard when both are done", () => {
    assert.equal(
      resolveAppFlow({
        username: "ada",
        setupCompletedAt: "2026-09-06T00:00:00.000Z",
        tutorialCompletedAt: "2026-09-06T00:01:00.000Z",
      }),
      "app",
    );
  });
  it("ignores a leftover tutorial stamp if setup is still open", () => {
    assert.equal(
      resolveAppFlow({
        username: "ada",
        setupCompletedAt: null,
        tutorialCompletedAt: "2026-09-06T00:01:00.000Z",
      }),
      "setup",
    );
  });
});

describe("flowPath", () => {
  it("maps each phase to a route", () => {
    assert.equal(flowPath("handle"), "/handle");
    assert.equal(flowPath("setup"), "/setup");
    assert.equal(flowPath("tutorial"), "/tutorial");
    assert.equal(flowPath("app"), "/");
  });
});

describe("public onboarding copy", () => {
  it("keeps the welcome carousel to three screens and exact CTAs", () => {
    const welcome = readFileSync(new URL("../../routes/welcome.tsx", import.meta.url), "utf8");
    assert.match(welcome, /total=\{3\}/);
    assert.match(welcome, /El ritmo de tu fuerza/);
    assert.match(welcome, /Registra tus entrenamientos y sigue tu progreso/);
    assert.match(welcome, /Todo tu entrenamiento, en un sitio/);
    assert.match(welcome, /Haz visible tu progreso/);
    assert.match(welcome, /Crear cuenta/);
    assert.match(welcome, /Ya tengo cuenta/);
    assert.doesNotMatch(welcome, /total=\{4\}/);
    assert.doesNotMatch(welcome, /siente cada descanso/);
  });
});
