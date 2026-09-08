import assert from "node:assert/strict";
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
