import "dotenv/config";

const branch = process.env.GLOFOX_BRANCH_ID;
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": branch,
  "Content-Type": "application/json",
};

// Get a user_id from bookings.
const b = await fetch(
  `https://gf-api.aws.glofox.com/prod/2.2/branches/${branch}/bookings?limit=1`,
  { headers: HEADERS },
).then((r) => r.json());
const userId = b.data[0].user_id;
console.log(`Sample user_id from booking: ${userId} (${b.data[0].user_name})`);

// Try various endpoints to fetch that user
const TRIES = [
  `/2.0/users/${userId}`,
  `/2.0/clients/${userId}`,
  `/2.0/members/${userId}`,
  `/2.0/branches/${branch}/users/${userId}`,
  `/2.0/branches/${branch}/clients/${userId}`,
  `/2.0/branches/${branch}/members/${userId}`,
];

for (const path of TRIES) {
  const r = await fetch(`https://gf-api.aws.glofox.com/prod${path}`, {
    headers: HEADERS,
  });
  const j = await r.json();
  const ok = !j.success === false ? r.ok && !(j.success === false) : r.ok;
  const tag = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  let preview = "";
  if (ok) {
    preview = `${j.first_name ?? j.name ?? "?"} ${j.last_name ?? ""} email=${j.email ?? "—"}`;
  } else {
    preview = j.message ?? JSON.stringify(j).slice(0, 80);
  }
  console.log(`${tag} ${r.status} ${path}  ${preview}`);
}

// Also try LIST endpoints for branch members
console.log("\n--- list endpoints ---");
const LISTS = [
  `/2.0/branches/${branch}/members`,
  `/2.0/branches/${branch}/clients/list`,
  `/2.0/branches/${branch}/users`,
  `/2.0/branches/${branch}/active_members`,
];
for (const path of LISTS) {
  const r = await fetch(`https://gf-api.aws.glofox.com/prod${path}?limit=2`, {
    headers: HEADERS,
  });
  const j = await r.json();
  const okMessage = j.success === false ? "fail" : `${j.total_count ?? "—"} total`;
  console.log(`  ${r.status} ${path}  ${okMessage}`);
}
