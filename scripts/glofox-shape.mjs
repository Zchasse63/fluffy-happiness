import "dotenv/config";

const BASE = "https://gf-api.aws.glofox.com/prod";
const branch = process.env.GLOFOX_BRANCH_ID;
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": process.env.GLOFOX_BRANCH_ID,
  "Content-Type": "application/json",
};

const PATHS = [
  ["members", `/2.0/branches/${branch}/members?limit=2`],
  ["events", `/2.0/branches/${branch}/events?limit=2`],
  ["bookings", `/2.2/branches/${branch}/bookings?limit=2`],
  ["staff", `/2.0/branches/${branch}/staff?limit=2`],
  ["programs", `/2.0/branches/${branch}/programs?limit=2`],
];

for (const [name, path] of PATHS) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  const data = await res.json();
  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(data).slice(0, 1200));
}
