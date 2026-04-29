import "dotenv/config";

const BASE = "https://gf-api.aws.glofox.com/prod";
const branch = process.env.GLOFOX_BRANCH_ID;
const ns = process.env.GLOFOX_NAMESPACE;
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": process.env.GLOFOX_BRANCH_ID,
  "Content-Type": "application/json",
};

const ATTEMPTS = {
  members: [
    `/2.0/branches/${branch}/clients`,
    `/2.0/clients`,
    `/2.0/clients/list`,
    `/2.0/branches/${branch}/users`,
    `/2.0/users`,
    `/2.0/namespaces/${ns}/clients`,
    `/2.0/branches/${branch}/customers`,
    `/2.1/branches/${branch}/clients`,
  ],
  staff: [
    `/2.0/branches/${branch}/trainers`,
    `/2.0/branches/${branch}/team`,
    `/2.0/staff`,
    `/2.0/trainers`,
    `/2.0/branches/${branch}/employees`,
    `/2.0/branches/${branch}/staff_members`,
  ],
  programs: [
    `/2.0/branches/${branch}/categories`,
    `/2.0/categories`,
    `/2.0/branches/${branch}/program_categories`,
  ],
  leads: [
    `/2.0/branches/${branch}/leads`,
    `/2.0/leads`,
    `/2.0/branches/${branch}/prospects`,
  ],
  transactions: [
    `/2.0/branches/${branch}/transactions`,
    `/2.0/branches/${branch}/payments`,
    `/2.0/branches/${branch}/Analytics/report`,
    `/2.0/branches/${branch}/analytics/report`,
    `/2.0/branches/${branch}/analytics/transactions`,
  ],
};

for (const [name, paths] of Object.entries(ATTEMPTS)) {
  console.log(`\n=== ${name} ===`);
  for (const path of paths) {
    const res = await fetch(`${BASE}${path}?limit=1`, { headers: HEADERS });
    const tag = res.ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    let preview = "";
    if (res.ok) {
      const j = await res.json();
      preview = JSON.stringify(j).slice(0, 100);
    }
    console.log(`  ${tag} ${res.status} ${path} ${preview}`);
  }
}
