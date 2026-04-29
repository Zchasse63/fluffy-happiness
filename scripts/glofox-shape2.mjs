import "dotenv/config";

const branch = process.env.GLOFOX_BRANCH_ID;
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": branch,
  "Content-Type": "application/json",
};

const r = await fetch("https://gf-api.aws.glofox.com/prod/2.0/clients?limit=3", { headers: HEADERS });
const j = await r.json();
console.log("Top-level keys:", Object.keys(j).join(", "));
console.log("\nFirst client full keys:");
console.log(Object.keys(j.data[0]).join(", "));
console.log("\nFirst client (truncated values):");
const c = j.data[0];
for (const [k, v] of Object.entries(c)) {
  const s = typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v);
  console.log(`  ${k.padEnd(28)} ${s}`);
}
