import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getLegalDoc, PRIVACY_SECTIONS, TERMS_SECTIONS } from "./legal.ts";

describe("legal documents", () => {
  it("exposes terms and privacy with real sections", () => {
    const terms = getLegalDoc("terms");
    const privacy = getLegalDoc("privacy");
    assert.equal(terms?.title, "Términos y condiciones");
    assert.equal(privacy?.title, "Política de privacidad");
    assert.ok(TERMS_SECTIONS.length >= 6);
    assert.ok(PRIVACY_SECTIONS.length >= 6);
    assert.match(TERMS_SECTIONS.map((s) => s.body.join(" ")).join(" "), /entrenamiento/);
    assert.match(PRIVACY_SECTIONS.map((s) => s.body.join(" ")).join(" "), /correo/);
    assert.equal(getLegalDoc("nope"), null);
    assert.equal(getLegalDoc("terminos")?.id, "terms");
    assert.equal(getLegalDoc("privacidad")?.id, "privacy");
  });

  it("links both documents from Ajustes in small print", () => {
    const account = readFileSync(new URL("../../routes/account.tsx", import.meta.url), "utf8");
    assert.match(account, /Términos y condiciones/);
    assert.match(account, /Política de privacidad/);
    assert.match(account, /\/legal\/\$doc/);
    assert.match(account, /doc: "terms"/);
    assert.match(account, /doc: "privacy"/);
    assert.match(account, /text-\[11px\]/);
  });
});
