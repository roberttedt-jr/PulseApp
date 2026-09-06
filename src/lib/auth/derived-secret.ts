import { createHash } from "node:crypto";

/**
 * Stable across serverless isolates when a Postgres URL is present and
 * BETTER_AUTH_SECRET is unset. Never log `databaseUrl` or the digest.
 */
export function deriveAuthSecret(databaseUrl: string): string {
  return createHash("sha256")
    .update("pulse.better-auth.v1")
    .update("\0")
    .update(databaseUrl)
    .digest("hex");
}
