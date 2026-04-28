// One-off generator for module stub pages — keeps them DRY and tied to PAGE_TITLES.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const stubs = [
  ["app/schedule/calendar/page.tsx", ["Daily", "Schedule"], "Schedule"],
  [
    "app/schedule/optimization/page.tsx",
    ["Daily", "Schedule", "Optimization"],
    "Schedule optimization",
  ],
  ["app/members/directory/page.tsx", ["People", "Members"], "Members"],
  [
    "app/members/segments/page.tsx",
    ["People", "Members", "Segments"],
    "Segments",
  ],
  ["app/corporate/page.tsx", ["People", "Corporate"], "Corporate accounts"],
  ["app/revenue/overview/page.tsx", ["Growth", "Revenue"], "Revenue"],
  [
    "app/revenue/memberships/page.tsx",
    ["Growth", "Revenue", "Memberships & Pricing"],
    "Memberships & pricing",
  ],
  [
    "app/revenue/transactions/page.tsx",
    ["Growth", "Revenue", "Transactions"],
    "Transactions",
  ],
  [
    "app/revenue/products/page.tsx",
    ["Growth", "Revenue", "Retail"],
    "Retail",
  ],
  [
    "app/revenue/giftcards/page.tsx",
    ["Growth", "Revenue", "Gift cards"],
    "Gift cards",
  ],
  [
    "app/revenue/dunning/page.tsx",
    ["Growth", "Revenue", "Dunning"],
    "Dunning",
  ],
  ["app/marketing/overview/page.tsx", ["Growth", "Marketing"], "Marketing"],
  [
    "app/marketing/campaigns/page.tsx",
    ["Growth", "Marketing", "Campaigns"],
    "Campaigns",
  ],
  [
    "app/marketing/automations/page.tsx",
    ["Growth", "Marketing", "Automations"],
    "Automations",
  ],
  [
    "app/marketing/leads/page.tsx",
    ["Growth", "Marketing", "Leads"],
    "Lead pipeline",
  ],
  [
    "app/marketing/content/page.tsx",
    ["Growth", "Marketing", "Content"],
    "Content hub",
  ],
  ["app/analytics/page.tsx", ["Growth", "Analytics"], "Analytics"],
  [
    "app/operations/staff/page.tsx",
    ["Run", "Operations", "Staff"],
    "Staff",
  ],
  [
    "app/operations/payroll/page.tsx",
    ["Run", "Operations", "Payroll"],
    "Payroll",
  ],
  [
    "app/operations/facilities/page.tsx",
    ["Run", "Operations", "Facilities"],
    "Facilities",
  ],
  [
    "app/operations/waivers/page.tsx",
    ["Run", "Operations", "Waivers"],
    "Waivers",
  ],
  ["app/settings/page.tsx", ["Run", "Settings"], "Settings"],
  ["app/portal/page.tsx", ["Run", "Employee Portal"], "Employee portal"],
];

for (const [path, crumb, title] of stubs) {
  const file = `import { ModuleStub } from "@/components/primitives";

export default function Page() {
  return <ModuleStub crumb={${JSON.stringify(crumb)}} title=${JSON.stringify(title)} />;
}
`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, file);
}
console.log(`generated ${stubs.length} stubs`);
