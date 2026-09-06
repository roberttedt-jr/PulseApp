import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDemoUserId, isDevSeedEnabled, isDevToolsEnabled, slugKey } from "./seed-flags.ts";

describe("demo seed gates", () => {
  it("never treats production as seedable", () => {
    const prev = process.env.NODE_ENV;
    const flag = process.env.PULSE_SEED_DEMO;
    process.env.NODE_ENV = "production";
    process.env.PULSE_SEED_DEMO = "1";
    assert.equal(isDevSeedEnabled(), false);
    process.env.NODE_ENV = prev;
    if (flag === undefined) delete process.env.PULSE_SEED_DEMO;
    else process.env.PULSE_SEED_DEMO = flag;
  });

  it("identifies demo athlete ids", () => {
    assert.equal(isDemoUserId("pulse-demo-sofia"), true);
    assert.equal(isDemoUserId("user-123"), false);
  });

  it("slugs template keys", () => {
    assert.equal(slugKey("Full Body"), "full_body");
    assert.equal(slugKey("Push"), "push");
  });

  it("dev tools stay off in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    assert.equal(isDevToolsEnabled(), false);
    process.env.NODE_ENV = prev;
  });
});
