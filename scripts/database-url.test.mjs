import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIGRATE_DATABASE_URL_KEYS,
  RUNTIME_DATABASE_URL_KEYS,
  resolveDatabaseUrlFrom,
} from "./database-url.mjs";

describe("resolveDatabaseUrlFrom", () => {
  it("treats empty and whitespace as unset", () => {
    const r = resolveDatabaseUrlFrom({ DATABASE_URL: "   ", POSTGRES_URL: "" });
    assert.equal(r.key, null);
    assert.equal(r.url, undefined);
  });

  it("prefers DATABASE_URL for runtime", () => {
    const r = resolveDatabaseUrlFrom(
      {
        DATABASE_URL: "postgres://pool",
        POSTGRES_URL: "postgres://alias",
      },
      RUNTIME_DATABASE_URL_KEYS,
    );
    assert.equal(r.key, "DATABASE_URL");
    assert.equal(r.url, "postgres://pool");
  });

  it("falls back to POSTGRES_URL when DATABASE_URL is missing", () => {
    const r = resolveDatabaseUrlFrom(
      { POSTGRES_URL: "postgres://alias" },
      RUNTIME_DATABASE_URL_KEYS,
    );
    assert.equal(r.key, "POSTGRES_URL");
    assert.equal(r.url, "postgres://alias");
  });

  it("prefers unpooled for migrations", () => {
    const r = resolveDatabaseUrlFrom(
      {
        DATABASE_URL: "postgres://pool",
        DATABASE_URL_UNPOOLED: "postgres://direct",
      },
      MIGRATE_DATABASE_URL_KEYS,
    );
    assert.equal(r.key, "DATABASE_URL_UNPOOLED");
    assert.equal(r.url, "postgres://direct");
  });
});
