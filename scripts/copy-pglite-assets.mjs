import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * PGLite wasm (~16MB) is only needed when the app falls back to the embedded
 * database. Production (Vercel + DATABASE_URL / Neon) never loads it — copying
 * the assets into `__server.func` inflates the serverless zip and is the
 * dominant cold-start cost for /api/auth/*.
 */
const hasNeon =
  Boolean(process.env.VERCEL) || Boolean(process.env.DATABASE_URL?.trim());
if (hasNeon) process.exit(0);

const srcDir = join(process.cwd(), "node_modules/@electric-sql/pglite/dist");
const destDir = join(process.cwd(), ".vercel/output/functions/__server.func/_libs");

if (!existsSync(destDir) || !existsSync(srcDir)) process.exit(0);
mkdirSync(destDir, { recursive: true });
for (const file of readdirSync(srcDir)) {
  if (!/\.(data|wasm|fs)$/.test(file)) continue;
  copyFileSync(join(srcDir, file), join(destDir, file));
}
