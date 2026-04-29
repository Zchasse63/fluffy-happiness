/*
 * Extract just the JSON payload from each backfill JSON file into
 * sub-batches so each `execute_sql` call is small enough to send.
 *
 * Output: /tmp/meridian-backfill/payloads/{entity}_{i}.json
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

const IN = "/tmp/meridian-backfill";
const OUT = `${IN}/payloads`;
mkdirSync(OUT, { recursive: true });

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const ENTITIES = [
  ["members", "members.slim.json", 50],
  ["events", "events.slim.json", 100],
  ["bookings", "bookings.slim.json", 100],
  ["transactions", "transactions.slim.json", 100],
];

for (const [name, file, batchSize] of ENTITIES) {
  const arr = JSON.parse(readFileSync(`${IN}/${file}`, "utf8"));
  const batches = chunk(arr, batchSize);
  batches.forEach((b, i) => {
    const out = `${OUT}/${name}_${String(i + 1).padStart(2, "0")}.json`;
    writeFileSync(out, JSON.stringify(b));
  });
  console.log(`${name}: ${arr.length} rows → ${batches.length} batches`);
}
