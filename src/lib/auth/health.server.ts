import { dbSource, getSql } from "../db";

export type AuthHealth = {
  ok: true;
  dbSource: typeof dbSource;
  hasDatabaseUrl: boolean;
  betterAuthHost: string | null;
  schema: {
    hasUserTable: boolean;
    hasAccountTable: boolean;
    hasPasswordColumn: boolean;
    migrations: string[];
  };
  counts: {
    users: number;
    accounts: number;
    sessions: number;
    credentialAccounts: number;
    credentialWithPassword: number;
    credentialMissingPassword: number;
    usersWithoutPasswordLogin: number;
  };
  providers: { providerId: string; accounts: number; withPassword: number }[];
  hashKinds: { kind: string; n: number }[];
};

function runtimeEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function hostOnly(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

/**
 * Aggregate, no-PII snapshot of the auth tables on the SAME SQL client the
 * app uses (`getSql()` → Neon when DATABASE_URL is set).
 */
export async function getAuthHealth(): Promise<AuthHealth> {
  const sql = await getSql();

  const tables = await sql.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name in ('user', 'account', 'session', '_migrations')`,
  );
  const names = new Set(tables.map((t) => t.table_name));
  const columns = await sql.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'account' and column_name = 'password'`,
  );

  let migrations: string[] = [];
  if (names.has("_migrations")) {
    const rows = await sql.query<{ name: string }>(
      `select name from _migrations order by name`,
    );
    migrations = rows.map((r) => r.name);
  }

  const empty: AuthHealth["counts"] = {
    users: 0,
    accounts: 0,
    sessions: 0,
    credentialAccounts: 0,
    credentialWithPassword: 0,
    credentialMissingPassword: 0,
    usersWithoutPasswordLogin: 0,
  };

  if (!names.has("user") || !names.has("account")) {
    return {
      ok: true,
      dbSource,
      hasDatabaseUrl: Boolean(runtimeEnv("DATABASE_URL")),
      betterAuthHost: hostOnly(runtimeEnv("BETTER_AUTH_URL")),
      schema: {
        hasUserTable: names.has("user"),
        hasAccountTable: names.has("account"),
        hasPasswordColumn: columns.length > 0,
        migrations,
      },
      counts: empty,
      providers: [],
      hashKinds: [],
    };
  }

  const [counts] = await sql.query<{
    users: number;
    accounts: number;
    sessions: number;
    credential_accounts: number;
    credential_with_password: number;
    credential_missing_password: number;
    users_without_password_login: number;
  }>(`
    select
      (select count(*)::int from "user") as users,
      (select count(*)::int from "account") as accounts,
      (select count(*)::int from "session") as sessions,
      (select count(*)::int from "account" where "providerId" = 'credential') as credential_accounts,
      (select count(*)::int from "account"
        where "providerId" = 'credential' and password is not null and length(password) > 0
      ) as credential_with_password,
      (select count(*)::int from "account"
        where "providerId" = 'credential' and (password is null or length(password) = 0)
      ) as credential_missing_password,
      (select count(*)::int from "user" u
        where not exists (
          select 1 from "account" a
          where a."userId" = u.id
            and a."providerId" = 'credential'
            and a.password is not null
            and length(a.password) > 0
        )
      ) as users_without_password_login
  `);

  const providers = await sql.query<{
    providerId: string;
    accounts: number;
    withPassword: number;
  }>(`
    select
      "providerId" as "providerId",
      count(*)::int as accounts,
      count(*) filter (
        where password is not null and length(password) > 0
      )::int as "withPassword"
    from "account"
    group by "providerId"
    order by "providerId"
  `);

  const hashKinds = await sql.query<{ kind: string; n: number }>(`
    select
      case
        when password is null or length(password) = 0 then 'empty'
        when password like '$ba$%' then 'encrypted_ba'
        when position(':' in password) > 0 then 'scrypt_colon'
        else 'other'
      end as kind,
      count(*)::int as n
    from "account"
    where "providerId" = 'credential'
    group by 1
    order by 1
  `);

  return {
    ok: true,
    dbSource,
    hasDatabaseUrl: Boolean(runtimeEnv("DATABASE_URL")),
    betterAuthHost: hostOnly(runtimeEnv("BETTER_AUTH_URL")),
    schema: {
      hasUserTable: true,
      hasAccountTable: true,
      hasPasswordColumn: columns.length > 0,
      migrations,
    },
    counts: {
      users: counts?.users ?? 0,
      accounts: counts?.accounts ?? 0,
      sessions: counts?.sessions ?? 0,
      credentialAccounts: counts?.credential_accounts ?? 0,
      credentialWithPassword: counts?.credential_with_password ?? 0,
      credentialMissingPassword: counts?.credential_missing_password ?? 0,
      usersWithoutPasswordLogin: counts?.users_without_password_login ?? 0,
    },
    providers,
    hashKinds,
  };
}
