import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAvatarDataUrl } from "./avatar-store.ts";

describe("avatar store", () => {
  it("parses a valid jpeg data url", () => {
    const bytes = Buffer.alloc(64, 7);
    const url = `data:image/jpeg;base64,${bytes.toString("base64")}`;
    const parsed = parseAvatarDataUrl(url);
    assert.equal(parsed.mime, "image/jpeg");
    assert.equal(parsed.bytes.length, 64);
  });

  it("rejects non-image payloads", () => {
    assert.throws(() => parseAvatarDataUrl("data:text/plain;base64,aaaa"), /no válido/);
  });

  it("rejects oversized payloads", () => {
    const bytes = Buffer.alloc(2 * 1024 * 1024 + 8, 1);
    const url = `data:image/webp;base64,${bytes.toString("base64")}`;
    assert.throws(() => parseAvatarDataUrl(url), /2 MB/);
  });
});
