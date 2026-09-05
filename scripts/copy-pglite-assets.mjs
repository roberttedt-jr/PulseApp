import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const srcDir = join(process.cwd(), "node_modules/@electric-sql/pglite/dist");
const destDir = join(process.cwd(), ".vercel/output/functions/__server.func/_libs");

if (!existsSync(destDir) || !existsSync(srcDir)) process.exit(0);
mkdirSync(destDir, { recursive: true });
for (const file of readdirSync(srcDir)) {
  if (!/\.(data|wasm|fs)$/.test(file)) continue;
  copyFileSync(join(srcDir, file), join(destDir, file));
}
