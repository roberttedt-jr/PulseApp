import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canViewDiscoverPost,
  canViewWorkoutPost,
  COMMENT_MAX,
  decodeCursor,
  encodeCursor,
  formatHandle,
  inspectUsername,
  looksLikeEmail,
  normalizeUsername,
  parseFeedKind,
  parseWorkoutVisibility,
  sanitizeSearchQuery,
  sanitizeSocialText,
  TEXT_POST_MAX,
  notificationCopy,
  sanitizeOptionalText,
  CAPTION_MAX,
  validateBio,
  validateDisplayName,
  validateUsername,
} from "./social.ts";

describe("username", () => {
  it("normalizes case and leading @", () => {
    assert.equal(normalizeUsername("@Roberto"), "roberto");
    assert.equal(formatHandle("Roberto"), "@roberto");
  });
  it("rejects empty, short, spaces, emails and reserved words", () => {
    assert.equal(inspectUsername("").code, "empty");
    assert.equal(inspectUsername("ab").message, "Elige entre 3 y 20 caracteres");
    assert.equal(inspectUsername("ro berto").code, "format");
    assert.equal(inspectUsername("ada@email.com").code, "format");
    assert.equal(inspectUsername("admin").message, "Este usuario ya está en uso");
    assert.equal(inspectUsername("compare").code, "reserved");
    assert.equal(inspectUsername("_rob").code, "format");
    assert.throws(() => validateUsername("ab"), /3 y 20/);
  });
  it("accepts a safe handle", () => {
    assert.equal(validateUsername("@roberto_1"), "roberto_1");
    assert.equal(validateUsername("1lift"), "1lift");
  });
});

describe("profile fields", () => {
  it("trims names and bios", () => {
    assert.equal(validateDisplayName("  Ana  Luz "), "Ana Luz");
    assert.equal(validateBio("  hola  "), "hola");
    assert.throws(() => validateDisplayName("   "), /vacío/);
  });
  it("defaults workout visibility to me", () => {
    assert.equal(parseWorkoutVisibility("nope"), "me");
    assert.equal(parseWorkoutVisibility("public"), "public");
  });
});

describe("search", () => {
  it("rejects emails and empty queries", () => {
    assert.equal(looksLikeEmail("ada@email.com"), true);
    assert.equal(looksLikeEmail("@roberto"), false);
    assert.throws(() => sanitizeSearchQuery("ada@email.com"), /correo/);
    assert.throws(() => sanitizeSearchQuery("  "), /Escribe/);
    assert.equal(sanitizeSearchQuery("@Roberto"), "Roberto");
    assert.equal(sanitizeSearchQuery("leo_1"), "leo_1");
  });
});

describe("visibility", () => {
  it("hides me posts from everyone else", () => {
    assert.equal(
      canViewWorkoutPost({
        viewerId: "b",
        authorId: "a",
        visibility: "me",
        profileVisibility: "public",
        followStatus: "accepted",
        blocked: false,
        deleted: false,
        hidden: false,
        context: "following",
      }),
      false,
    );
  });
  it("shows follower posts only to accepted follows", () => {
    const base = {
      viewerId: "b",
      authorId: "a",
      visibility: "followers" as const,
      profileVisibility: "private" as const,
      blocked: false,
      deleted: false,
      hidden: false,
      context: "following" as const,
    };
    assert.equal(canViewWorkoutPost({ ...base, followStatus: "pending" }), false);
    assert.equal(canViewWorkoutPost({ ...base, followStatus: "accepted" }), true);
  });
  it("hides blocked, deleted and hidden posts", () => {
    const ok = {
      viewerId: "b",
      authorId: "a",
      visibility: "public" as const,
      profileVisibility: "public" as const,
      followStatus: "accepted" as const,
      blocked: false,
      deleted: false,
      hidden: false,
      context: "following" as const,
    };
    assert.equal(canViewWorkoutPost({ ...ok, blocked: true }), false);
    assert.equal(canViewWorkoutPost({ ...ok, deleted: true }), false);
    assert.equal(canViewWorkoutPost({ ...ok, hidden: true }), false);
  });
  it("locks a private profile from non-followers even for public posts", () => {
    assert.equal(
      canViewWorkoutPost({
        viewerId: "b",
        authorId: "a",
        visibility: "public",
        profileVisibility: "private",
        followStatus: null,
        blocked: false,
        deleted: false,
        hidden: false,
        context: "profile",
      }),
      false,
    );
  });
  it("lets the author see a solo-yo post on their profile", () => {
    assert.equal(
      canViewWorkoutPost({
        viewerId: "a",
        authorId: "a",
        visibility: "me",
        profileVisibility: "private",
        followStatus: null,
        blocked: false,
        deleted: false,
        hidden: false,
        context: "profile",
      }),
      true,
    );
    assert.equal(
      canViewWorkoutPost({
        viewerId: "a",
        authorId: "a",
        visibility: "me",
        profileVisibility: "private",
        followStatus: null,
        blocked: false,
        deleted: false,
        hidden: false,
        context: "following",
      }),
      false,
    );
  });
});

describe("discover / para ti", () => {
  const base = {
    viewerId: "b",
    authorId: "a",
    visibility: "public" as const,
    profileVisibility: "public" as const,
    blocked: false,
    deleted: false,
    hidden: false,
  };
  it("shows recent public posts from public profiles", () => {
    assert.equal(canViewDiscoverPost(base), true);
    assert.equal(canViewDiscoverPost({ ...base, viewerId: "a" }), true);
  });
  it("excludes private visibility, private profiles, blocks, hidden and deleted", () => {
    assert.equal(canViewDiscoverPost({ ...base, visibility: "followers" }), false);
    assert.equal(canViewDiscoverPost({ ...base, visibility: "me" }), false);
    assert.equal(canViewDiscoverPost({ ...base, profileVisibility: "private" }), false);
    assert.equal(canViewDiscoverPost({ ...base, blocked: true }), false);
    assert.equal(canViewDiscoverPost({ ...base, hidden: true }), false);
    assert.equal(canViewDiscoverPost({ ...base, deleted: true }), false);
  });
});

describe("text sanitization", () => {
  it("strips tags and control chars, keeps short text", () => {
    assert.equal(sanitizeSocialText("  hola <b>mundo</b>  ", TEXT_POST_MAX), "hola mundo");
    assert.equal(sanitizeSocialText("un comentario", COMMENT_MAX), "un comentario");
    assert.equal(sanitizeSocialText("<img src=x onerror=alert(1)>hola", 280), "hola");
    assert.throws(() => sanitizeSocialText("   ", 280), /Escribe/);
    assert.throws(() => sanitizeSocialText("x".repeat(281), 280), /280/);
  });
  it("parses feed kinds", () => {
    assert.equal(parseFeedKind("text"), "text");
    assert.equal(parseFeedKind("routine"), "routine");
    assert.equal(parseFeedKind("workout"), "workout");
    assert.equal(parseFeedKind("nope"), "workout");
  });
});

describe("cursor", () => {
  it("round-trips", () => {
    const raw = encodeCursor("2026-01-01T00:00:00.000Z", "abc");
    assert.deepEqual(decodeCursor(raw), { createdAt: "2026-01-01T00:00:00.000Z", id: "abc" });
  });
});

describe("captions and notifications", () => {
  it("allows empty captions and rejects overflow", () => {
    assert.equal(sanitizeOptionalText("   ", CAPTION_MAX), "");
    assert.equal(sanitizeOptionalText("  Día de pierna  ", CAPTION_MAX), "Día de pierna");
    assert.throws(() => sanitizeOptionalText("x".repeat(CAPTION_MAX + 1), CAPTION_MAX), /280/);
  });
  it("writes Hevy-style notification copy", () => {
    assert.match(
      notificationCopy({ type: "like", handle: "@ana", workoutTitle: "Push" }),
      /@ana le ha dado me gusta a tu entrenamiento Push/,
    );
    assert.match(
      notificationCopy({ type: "comment", handle: "@leo", commentPreview: "brutal" }),
      /@leo ha comentado en tu entrenamiento: 'brutal'/,
    );
    assert.equal(notificationCopy({ type: "follow", handle: "@mia" }), "@mia ha comenzado a seguirte");
    assert.equal(notificationCopy({ type: "follow_request", handle: "@mia" }), "@mia quiere seguirte");
  });
});
