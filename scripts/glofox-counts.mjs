/* Verify our updated paths report sane counts. */
import "dotenv/config";

const branch = process.env.GLOFOX_BRANCH_ID;
const ns = process.env.GLOFOX_NAMESPACE;
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": branch,
  "Content-Type": "application/json",
};

const probes = [
  ["members", `/2.0/members?limit=1`, "GET"],
  ["staff", `/2.0/staff?limit=1`, "GET"],
  ["memberships", `/2.0/memberships?limit=1`, "GET"],
  ["events", `/2.0/events?limit=1`, "GET"],
  ["bookings", `/2.2/branches/${branch}/bookings?limit=1`, "GET"],
  ["leads", `/2.1/branches/${branch}/leads/filter`, "POST"],
  ["programs", `/v3.0/locations/${branch}/search-programs`, "POST"],
];

for (const [name, path, method] of probes) {
  const url = `https://gf-api.aws.glofox.com/prod${path}`;
  const init = {
    method,
    headers: HEADERS,
    body: method === "POST" ? JSON.stringify({}) : undefined,
  };
  try {
    const res = await fetch(url, init);
    const j = await res.json();
    if (j.success === false) {
      console.log(`  \x1b[31m✗\x1b[0m  ${name.padEnd(12)} ${j.message}`);
      continue;
    }
    const total =
      j.total_count ??
      j.TransactionsList?.details?.length ??
      (Array.isArray(j) ? j.length : "—");
    const sample =
      j.data?.[0]?.first_name ??
      j.data?.[0]?.name ??
      j.TransactionsList?.details?.[0]?.amount ??
      "—";
    console.log(`  \x1b[32m✓\x1b[0m  ${name.padEnd(12)} total=${total}  sample: ${sample}`);
  } catch (err) {
    console.log(`  \x1b[31m✗\x1b[0m  ${name.padEnd(12)} ${err.message}`);
  }
}
