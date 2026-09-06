/**
 * Resolve a Postgres connection URL from the env names Neon / Vercel inject.
 *
 * Neon "Connect to Vercel" may set DATABASE_URL, POSTGRES_URL, the unpooled
 * variants, or a combination. Preview keeps PGLite when none of these are set.
 *
 * Runtime prefers the pooled URL. Migrations prefer the direct/unpooled URL
 * (DDL + multi-statement files are unreliable through PgBouncer).
 *
 * Callers MUST NOT log `url`. Logging `key` (the env var NAME) is fine.
 */
export const RUNTIME_DATABASE_URL_KEYS = Object.freeze([
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
]);

export const MIGRATE_DATABASE_URL_KEYS = Object.freeze([
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
]);

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} env
 * @param {string} key
 * @returns {string | undefined}
 */
export function readEnv(env, key) {
  const value = typeof env?.[key] === "string" ? env[key].trim() : "";
  return value ? value : undefined;
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} env
 * @param {readonly string[]} [keys]
 * @returns {{ key: string | null, url: string | undefined }}
 */
export function resolveDatabaseUrlFrom(env, keys = RUNTIME_DATABASE_URL_KEYS) {
  for (const key of keys) {
    const url = readEnv(env, key);
    if (url) return { key, url };
  }
  return { key: null, url: undefined };
}

