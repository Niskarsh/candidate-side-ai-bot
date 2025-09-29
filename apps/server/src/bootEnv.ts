// apps/server/src/bootEnv.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try common locations relative to this file AND the process CWD
const candidates = [
  path.resolve(__dirname, "../.env"),        // apps/server/.env  ← expected
  path.resolve(__dirname, "../../.env"),     // apps/.env
  path.resolve(process.cwd(), ".env")        // CWD/.env (when running via scripts)
];

const found = candidates.find(p => fs.existsSync(p));

if (found) {
  dotenv.config({ path: found });
  console.log(`[ENV] loaded: ${found}`);
} else {
  console.warn("[ENV] .env not found. Tried:\n" + candidates.join("\n"));
}
