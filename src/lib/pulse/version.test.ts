import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PULSE_TAGLINE, PULSE_VERSION, PULSE_VERSION_NAME } from "./version.ts";

describe("Pulse 3.7 identity", () => {
  it("exports a single version source of truth", () => {
    assert.equal(PULSE_VERSION, "3.7");
    assert.equal(PULSE_VERSION_NAME, "Native");
    assert.match(PULSE_TAGLINE, /Entrenamiento/);
  });

  it("wires About to the version module", () => {
    const account = readFileSync(new URL("../../routes/account.tsx", import.meta.url), "utf8");
    assert.match(account, /PULSE_VERSION/);
    assert.match(account, /PULSE_VERSION_NAME/);
    assert.match(account, /PulseLogo/);
    assert.match(account, /Diseñada por/);
    assert.match(account, /Copyright/);
    assert.doesNotMatch(account, /Comunidad de atletas/);
    assert.doesNotMatch(account, /muro de texto/);
    assert.doesNotMatch(account, /Versión 3\.3[^\.]/);
  });

  it("hides linear loaders and uses a heartbeat splash", () => {
    const splash = readFileSync(new URL("../../components/pulse/splash.tsx", import.meta.url), "utf8");
    assert.match(splash, /pulse-splash-logo/);
    assert.match(splash, /@keyframes heartbeat/);
    assert.match(splash, /pulse-icon\.png/);
    assert.match(splash, /1\.35s/);
    assert.match(splash, /scale\(1\.06\)/);
    assert.match(splash, /#nprogress/);
    assert.match(splash, /display:none!important/);
    assert.doesNotMatch(splash, /linear-gradient\([^)]*#nprogress/);
    assert.doesNotMatch(splash, /<svg/);
  });

  it("preloads the official Pulse PNG on first paint", () => {
    const root = readFileSync(new URL("../../routes/__root.tsx", import.meta.url), "utf8");
    assert.match(root, /rel="preload"/);
    assert.match(root, /as="image"/);
    assert.match(root, /href="\/pulse-icon\.png"/);
  });

  it("parallelizes bootstrap queries", () => {
    const fns = readFileSync(new URL("./fns.ts", import.meta.url), "utf8");
    const start = fns.indexOf("export const getBootstrap");
    const end = fns.indexOf("export const updateProfile");
    const body = fns.slice(start, end);
    assert.match(body, /await Promise\.all\(/);
    assert.equal((body.match(/await sql/g) || []).length, 0);
  });

  it("uses Liquid Glass 2.0 tokens", () => {
    const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
    assert.match(css, /blur\(30px\) saturate\(180%\)/);
    assert.match(css, /rgb\(255 45 85 \/ 0\.18\)/);
    assert.match(css, /rgb\(18 18 22 \/ 0\.65\)/);
  });
});
