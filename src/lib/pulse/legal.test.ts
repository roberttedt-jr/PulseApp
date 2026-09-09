import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getLegalDoc, PRIVACY_SECTIONS, TERMS_SECTIONS } from "./legal.ts";

describe("legal documents", () => {
  it("exposes terms, privacy, cookies, and comunidad with real sections", () => {
    const terms = getLegalDoc("terms");
    const privacy = getLegalDoc("privacy");
    const cookies = getLegalDoc("cookies");
    const comunidad = getLegalDoc("comunidad");
    assert.equal(terms?.title, "Términos y condiciones");
    assert.equal(privacy?.title, "Política de privacidad");
    assert.equal(cookies?.title, "Política de cookies");
    assert.equal(comunidad?.title, "Normas de la comunidad");
    assert.ok(TERMS_SECTIONS.length >= 6);
    assert.ok(PRIVACY_SECTIONS.length >= 6);
    assert.match(TERMS_SECTIONS.map((s) => s.body.join(" ")).join(" "), /entrenamiento/);
    assert.match(PRIVACY_SECTIONS.map((s) => s.body.join(" ")).join(" "), /correo/);
    assert.equal(getLegalDoc("nope"), null);
    assert.equal(getLegalDoc("terminos")?.id, "terms");
    assert.equal(getLegalDoc("privacidad")?.id, "privacy");
    assert.equal(getLegalDoc("cookies")?.id, "cookies");
    assert.equal(getLegalDoc("comunidad")?.id, "comunidad");
    assert.equal(getLegalDoc("community")?.id, "comunidad");
  });

  it("links both documents from Ajustes in small print", () => {
    const account = readFileSync(new URL("../../routes/account.tsx", import.meta.url), "utf8");
    assert.match(account, /Términos y condiciones/);
    assert.match(account, /Política de privacidad/);
    assert.match(account, /Cookies/);
    assert.match(account, /Normas de la comunidad/);
    assert.match(account, /\/legal\/\$doc/);
    assert.match(account, /doc: "terms"/);
    assert.match(account, /doc: "privacy"/);
    assert.match(account, /doc: "cookies"/);
    assert.match(account, /doc: "comunidad"/);
    assert.match(account, /text-\[11px\]/);
  });
});
