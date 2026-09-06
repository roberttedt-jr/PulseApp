import process from "node:process";
import {
  RUNTIME_DATABASE_URL_KEYS,
  resolveDatabaseUrlFrom,
} from "../../scripts/database-url.mjs";

/**
 * Read an env var at RUNTIME.
 *
 * Vite statically replaces `process.env.FOO` (dot access) at build time. On
 * Vercel that inlines `undefined` for secrets that are not `VITE_`-prefixed.
 * Bracket access is not replaced.
 */
export function runtimeEnv(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export type ResolvedDatabaseUrl = {
  key: string | null;
  url: string | undefined;
};

export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedDatabaseUrl {
  return resolveDatabaseUrlFrom(env, RUNTIME_DATABASE_URL_KEYS) as ResolvedDatabaseUrl;
}

export function isVercelProduction(): boolean {
  return runtimeEnv("VERCEL_ENV") === "production";
}

export type AuthSecretSource = "env" | "derived" | "ephemeral";

export function classifyAuthSecretSource(
  databaseUrl: string | undefined = resolveDatabaseUrl().url,
): AuthSecretSource {
  if (runtimeEnv("BETTER_AUTH_SECRET")) return "env";
  if (databaseUrl) return "derived";
  return "ephemeral";
}
