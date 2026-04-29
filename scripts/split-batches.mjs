/*
 * Split each multi-statement SQL file into per-batch files so the MCP
 * execute_sql tool can apply them one at a time without hitting the
 * payload limit.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const IN = "/tmp/meridian-backfill/upsert";
const OUT = "/tmp/meridian-backfill/batches";
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(IN)) {
  if (!file.endsWith(".sql")) continue;
  const sql = readFileSync(`${IN}/${file}`, "utf8").trim();
  // Statements are separated by two newlines.
  const stmts = sql.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  const base = file.replace(".sql", "");
  for (let i = 0; i < stmts.length; i++) {
    const out = `${OUT}/${base}_${String(i + 1).padStart(2, "0")}.sql`;
    writeFileSync(out, stmts[i] + "\n");
  }
  console.log(`${file} → ${stmts.length} batch file(s)`);
}
