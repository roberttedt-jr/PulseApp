import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { avatarInitials, validateAvatarFile } from "./image.ts";

function fake(type: string, size: number, name = "a.jpg"): File {
  const buf = new Uint8Array(Math.max(size, 0));
  return new File([buf], name, { type });
}

describe("avatar validation", () => {
  it("rejects empty and svg", () => {
    assert.match(validateAvatarFile(fake("image/jpeg", 8)) ?? "", /vacío/);
    assert.match(validateAvatarFile(fake("image/svg+xml", 120, "x.svg")) ?? "", /SVG/);
  });

  it("rejects oversized input", () => {
    assert.match(validateAvatarFile(fake("image/jpeg", 9 * 1024 * 1024)) ?? "", /8 MB/);
  });

  it("accepts jpeg/png/webp", () => {
    assert.equal(validateAvatarFile(fake("image/jpeg", 400)), null);
    assert.equal(validateAvatarFile(fake("image/png", 400)), null);
    assert.equal(validateAvatarFile(fake("image/webp", 400)), null);
  });

  it("builds initials from the name", () => {
    assert.equal(avatarInitials("QA Pulse"), "QP");
    assert.equal(avatarInitials("Alex"), "AL");
    assert.equal(avatarInitials("  "), "P");
  });
});
