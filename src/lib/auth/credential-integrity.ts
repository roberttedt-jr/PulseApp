import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { classifyPasswordHash } from "./password-hash-kind";

const LOG = "[auth-credential]";

type Body = { email?: unknown; password?: unknown };

function normalizeEmail(body: Body | undefined): void {
  if (!body || typeof body.email !== "string") return;
  body.email = body.email.trim().toLowerCase();
}

/**
 * Same Better Auth instance as sign-up / sign-in.
 *
 * After sign-up: if the user row exists but the credential account / password
 * hash is missing or cannot verify the password that was just submitted, write
 * the hash with `ctx.context.password.hash` (the same hasher login uses).
 *
 * After a failed sign-in: log the failure class (no email, hash, or password)
 * so production can tell "user missing" from "hash mismatch".
 */
export function credentialIntegrity(): BetterAuthPlugin {
  return {
    id: "pulse-credential-integrity",
    hooks: {
      before: [
        {
          matcher: (ctx: { path?: string }) =>
            ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email",
          handler: createAuthMiddleware(async (ctx) => {
            normalizeEmail(ctx.body as Body);
          }),
        },
      ],
      after: [
        {
          matcher: (ctx: { path?: string }) => ctx.path === "/sign-up/email",
          handler: createAuthMiddleware(async (ctx) => {
            const password = (ctx.body as Body | undefined)?.password;
            if (typeof password !== "string" || password.length < 8) return;

            const returned = ctx.context.returned as
              | { user?: { id?: string }; token?: string | null }
              | undefined;
            const userId =
              ctx.context.newSession?.user.id ?? returned?.user?.id ?? null;
            if (!userId) return;

            try {
              await ensureCredentialHash(ctx, userId, password);
            } catch (err) {
              console.error(`${LOG} signup integrity failed`, {
                reason: err instanceof Error ? err.name : "unknown",
              });
            }
          }),
        },
        {
          matcher: (ctx: { path?: string }) => ctx.path === "/sign-in/email",
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned as
              | { status?: string; body?: { code?: string }; code?: string }
              | undefined;
            const code =
              returned?.code ??
              returned?.body?.code ??
              (typeof returned?.status === "string" ? returned.status : "");
            const failed =
              code === "INVALID_EMAIL_OR_PASSWORD" ||
              String(returned?.status ?? "").toUpperCase() === "UNAUTHORIZED";
            if (!failed) return;

            const email = (ctx.body as Body | undefined)?.email;
            const password = (ctx.body as Body | undefined)?.password;
            if (typeof email !== "string" || typeof password !== "string") {
              console.warn(`${LOG} sign-in rejected`, { reason: "malformed_body" });
              return;
            }
            try {
              const found = await ctx.context.internalAdapter.findUserByEmail(email, {
                includeAccounts: true,
              });
              if (!found?.user) {
                console.warn(`${LOG} sign-in rejected`, { reason: "no_user" });
                return;
              }
              const cred = found.accounts?.find((a) => a.providerId === "credential");
              if (!cred) {
                console.warn(`${LOG} sign-in rejected`, { reason: "no_credential" });
                return;
              }
              const kind = classifyPasswordHash(cred.password);
              if (kind === "empty") {
                console.warn(`${LOG} sign-in rejected`, { reason: "no_password", kind });
                return;
              }
              try {
                const ok = await ctx.context.password.verify({
                  hash: cred.password as string,
                  password,
                });
                console.warn(`${LOG} sign-in rejected`, {
                  reason: ok ? "unexpected_after_verify" : "hash_mismatch",
                  kind,
                });
              } catch {
                console.warn(`${LOG} sign-in rejected`, {
                  reason: "hash_unreadable",
                  kind,
                });
              }
            } catch (err) {
              console.error(`${LOG} sign-in diagnostic failed`, {
                reason: err instanceof Error ? err.name : "unknown",
              });
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}

type IntegrityCtx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

async function ensureCredentialHash(
  ctx: IntegrityCtx,
  userId: string,
  password: string,
): Promise<void> {
  const accounts = await ctx.context.internalAdapter.findAccounts(userId);
  const cred = accounts.find((a) => a.providerId === "credential");
  const stored = cred?.password ?? null;
  const kind = classifyPasswordHash(stored);

  if (stored && kind === "scrypt_colon") {
    try {
      const ok = await ctx.context.password.verify({ hash: stored, password });
      if (ok) {
        console.info(`${LOG} signup credential ok`, { kind });
        return;
      }
      console.warn(`${LOG} signup hash did not verify — rewriting`, { kind });
    } catch {
      console.warn(`${LOG} signup hash unreadable — rewriting`, { kind });
    }
  } else if (!cred) {
    console.warn(`${LOG} signup missing credential account — creating`);
  } else {
    console.warn(`${LOG} signup credential hash missing or unexpected — writing`, {
      kind,
    });
  }

  const hash = await ctx.context.password.hash(password);
  if (cred) {
    await ctx.context.internalAdapter.updatePassword(userId, hash);
  } else {
    await ctx.context.internalAdapter.linkAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hash,
    });
  }

  const again = await ctx.context.internalAdapter.findAccounts(userId);
  const written = again.find((a) => a.providerId === "credential")?.password ?? null;
  const writtenKind = classifyPasswordHash(written);
  if (!written) {
    console.error(`${LOG} credential write produced empty password`);
    return;
  }
  const verified = await ctx.context.password.verify({ hash: written, password });
  console.info(`${LOG} signup credential ${verified ? "repaired" : "still_broken"}`, {
    kind: writtenKind,
  });
}
