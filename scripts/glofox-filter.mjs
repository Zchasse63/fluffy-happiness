import "dotenv/config";

const branch = process.env.GLOFOX_BRANCH_ID;
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": branch,
  "Content-Type": "application/json",
};

// Try with explicit branch param
const TRIES = [
  `/2.0/clients?branch_id=${branch}&limit=2`,
  `/2.0/clients?branch=${branch}&limit=2`,
  `/2.0/clients?registered_branch_id=${branch}&limit=2`,
  `/2.0/clients?limit=2&offset=0`,
];

for (const path of TRIES) {
  const res = await fetch(`https://gf-api.aws.glofox.com/prod${path}`, {
    headers: HEADERS,
  });
  const j = await res.json();
  console.log(`\n${path}`);
  console.log(`  total_count=${j.total_count} has_more=${j.has_more}`);
  if (j.data?.[0]) {
    console.log(
      `  first: ${j.data[0]._id} ${j.data[0].first_name} ${j.data[0].last_name} branch=${j.data[0].branch_id ?? j.data[0].registered_branch_id ?? '—'}`,
    );
  }
}
