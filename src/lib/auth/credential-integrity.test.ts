import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyPasswordHash } from "./password-hash-kind.ts";

describe("classifyPasswordHash", () => {
  it("flags empty", () => {
    assert.equal(classifyPasswordHash(null), "empty");
    assert.equal(classifyPasswordHash(""), "empty");
  });
  it("flags Better Auth scrypt salt:hex", () => {
    assert.equal(classifyPasswordHash("ab".repeat(16) + ":" + "cd".repeat(64)), "scrypt_colon");
  });
  it("flags encrypted OAuth envelopes, not passwords", () => {
    assert.equal(classifyPasswordHash("$ba$abc"), "encrypted_ba");
  });
  it("flags anything else as other", () => {
    assert.equal(classifyPasswordHash("pbkdf2$..."), "other");
  });
});
