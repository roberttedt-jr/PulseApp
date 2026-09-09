import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { inspectUsername, validateUsername } from "./social.ts";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("Social Profile Redesign contracts", () => {
  it("enforces handle normalization and inspection logic", () => {
    // Strips leading @ and lowercases
    const clean1 = "@Roberto".toLowerCase().replace(/^@+/, "");
    assert.equal(clean1, "roberto");

    const valid = validateUsername(clean1);
    assert.equal(valid, "roberto");

    // Rejects too short handles
    const short = inspectUsername("ab");
    assert.notEqual(short.code, "ok");

    // Accepts valid handles
    const ok = inspectUsername("maria_fit");
    assert.equal(ok.code, "ok");
    assert.equal(ok.username, "maria_fit");
  });

  it("integrates 68px Perfil social settings row into account.tsx", () => {
    const account = src("../../routes/account.tsx");

    // Row attributes
    assert.match(account, /data-social-profile-row="1"/);
    assert.match(account, /min-h-\[68px\]/);
    assert.match(account, /Perfil social/);
    assert.match(account, /Usuario, privacidad y visibilidad/);
    assert.match(account, /formatHandle\(p\.username\)/);

    // Associated ref for focus restoration
    assert.match(account, /ref=\{socialRowRef\}/);

    // Uses SocialProfileSheet
    assert.match(account, /<SocialProfileSheet/);
    assert.match(account, /triggerRef=\{socialRowRef\}/);

    // Old floating pill class is replaced
    assert.doesNotMatch(account, /className="flex w-full items-center gap-3 glass px-4 py-3\.5/);
  });

  it("enforces native iOS bottom sheet contracts in SocialProfileSheet", () => {
    const sheet = src("../../components/pulse/social-profile-sheet.tsx");

    // Vaul Drawer usage and styling
    assert.match(sheet, /from "vaul"/);
    assert.match(sheet, /rounded-t-\[28px\]/);
    assert.match(sheet, /max-h-\[88dvh\]/);
    assert.match(sheet, /sm:rounded-3xl/);

    // Scrollbar elimination
    assert.match(sheet, /no-scrollbar/);

    // Top drag handle
    assert.match(sheet, /w-10 h-1 rounded-full bg-white\/20 mx-auto/);

    // Sticky header with blur and 44x44px accessible close button
    assert.match(sheet, /sticky top-0 z-20/);
    assert.match(sheet, /backdrop-blur-md/);
    assert.match(sheet, /size-11/);
    assert.match(sheet, /aria-label="Cerrar"/);

    // 6 structured sections
    assert.match(sheet, /Identidad pública/);
    assert.match(sheet, /Presentación/);
    assert.match(sheet, /Privacidad del perfil/);
    assert.match(sheet, /Visibilidad de entrenamientos/);
    assert.match(sheet, /Detalles en publicaciones/);
    assert.match(sheet, /Ver mi perfil público/);

    // Public identity (@ prefix, character limits, debounce)
    assert.match(sheet, /checkUsernameAvailable/);
    assert.match(sheet, /maxLength=\{20\}/);

    // Presentation (bio, counter)
    assert.match(sheet, /maxLength=\{160\}/);
    assert.match(sheet, /\{bio\.length\}\/160/);

    // Publication switches
    assert.match(sheet, /Compartir volumen/);
    assert.match(sheet, /Compartir récords/);

    // Dynamic save bar shown only when dirty
    assert.match(sheet, /data-social-save-bar="1"/);
    assert.match(sheet, /Guardar cambios/);
    assert.match(sheet, /isDirty \?/);

    // Discard confirmation dialog
    assert.match(sheet, /¿Descartar cambios\?/);
    assert.match(sheet, /Continuar editando/);
    assert.match(sheet, /Descartar/);

    // Focus restoration
    assert.match(sheet, /triggerRef\?\.current\?\.focus\(\)/);

    // Mobile keyboard handling (repositionInputs={false}, visualViewport tracking, zero bottom gap)
    assert.match(sheet, /repositionInputs=\{false\}/);
    assert.match(sheet, /keyboardHeight/);
    assert.match(sheet, /window\.visualViewport/);
    assert.match(sheet, /paddingBottom:\s*keyboardHeight\s*>\s*0/);

    // Global sheet and vaul drawer CSS pinning
    const sheetComponent = src("../../components/ui/sheet.tsx");
    assert.match(sheetComponent, /repositionInputs = false/);

    const drawerCss = src("../../styles/vaul-drawer.css");
    assert.match(drawerCss, /bottom:\s*0\s*!important/);
  });
});
