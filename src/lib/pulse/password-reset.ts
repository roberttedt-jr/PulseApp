import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

async function sha256Hex(value: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value).digest("hex");
}

function hashCode(code: string, sha: (v: string) => Promise<string>): Promise<string> {
  return sha(code.trim().toUpperCase());
}

async function mintCode(): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  const raw = randomBytes(4).toString("hex").toUpperCase();
  return `PULSE-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

async function ensureTable() {
  const sql = await getSql();
  await sql.query(
    `create table if not exists recovery_codes (
      user_id text primary key,
      code_hash text not null,
      created_at timestamptz not null default now()
    )`,
  );
  return sql;
}

/** Issue (or rotate) a recovery code for the signed-in user. Shown once. */
export const issueRecoveryCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await ensureTable();
    const code = await mintCode();
    const codeHash = await hashCode(code, sha256Hex);
    await sql.query(
      `insert into recovery_codes (user_id, code_hash, created_at)
       values ($1, $2, now())
       on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now()`,
      [context.userId, codeHash],
    );
    return { code };
  });

type ResetInput = { email: string; recoveryCode: string; newPassword: string };

export const resetWithRecovery = createServerFn({ method: "POST" })
  .validator((d: ResetInput) => d)
  .handler(async ({ data }) => {
    const email = String(data?.email ?? "")
      .trim()
      .toLowerCase();
    const recoveryCode = String(data?.recoveryCode ?? "").trim();
    const newPassword = String(data?.newPassword ?? "");
    if (!email || !recoveryCode || newPassword.length < 8) {
      throw new Error("Datos incompletos");
    }

    const sql = await ensureTable();
    const users = await sql.query<{ id: string }>(`select id from "user" where email = $1 limit 1`, [email]);
    const user = users[0];
    if (!user) throw new Error("Código no válido");

    const rows = await sql.query<{ code_hash: string }>(
      `select code_hash from recovery_codes where user_id = $1 limit 1`,
      [user.id],
    );
    const expected = await hashCode(recoveryCode, sha256Hex);
    if (!rows[0] || rows[0].code_hash !== expected) {
      throw new Error("Código no válido");
    }

    const { hashPassword } = await import("better-auth/crypto");
    const passwordHash = await hashPassword(newPassword);
    const updated = await sql.query<{ id: string }>(
      `update "account"
       set password = $1, "updatedAt" = now()
       where "userId" = $2 and "providerId" = 'credential'
       returning id`,
      [passwordHash, user.id],
    );
    if (!updated[0]) {
      await sql.query(
        `insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $2, $3, now(), now())`,
        [crypto.randomUUID(), user.id, passwordHash],
      );
    }
    return { ok: true as const };
  });
