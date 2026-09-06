import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveAuthSecret } from "./auth/derived-secret.ts";
import { classifyAuthSecretSource } from "./runtime-env.ts";

describe("deriveAuthSecret", () => {
  it("is stable, hex, and long enough for Better Auth", () => {
    const a = deriveAuthSecret("postgres://example.invalid/db");
    const b = deriveAuthSecret("postgres://example.invalid/db");
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{64}$/);
  });

  it("changes when the connection string changes", () => {
    const a = deriveAuthSecret("postgres://example.invalid/one");
    const b = deriveAuthSecret("postgres://example.invalid/two");
    assert.notEqual(a, b);
  });
});

describe("classifyAuthSecretSource", () => {
  it("is derived when a URL is present and the env secret is not", () => {
    const prev = process.env["BETTER_AUTH_SECRET"];
    delete process.env["BETTER_AUTH_SECRET"];
    try {
      assert.equal(classifyAuthSecretSource("postgres://example.invalid/db"), "derived");
      assert.equal(classifyAuthSecretSource(undefined), "ephemeral");
    } finally {
      if (prev != null) process.env["BETTER_AUTH_SECRET"] = prev;
    }
  });
});
