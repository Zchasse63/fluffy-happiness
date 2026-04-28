/*
 * Meridian navigation map. Mirrors the SPEC §1.1 sidebar — grouped by
 * operational frequency, not by module name. Sub-routes are optional.
 *
 * Keep this in sync with the route tree under `app/` and PAGE_TITLES below.
 */

export type NavSubItem = {
  href: string;
  label: string;
  count?: number;
};

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  children?: NavSubItem[];
};

export type NavGroup = {
  section: string;
  items: NavItem[];
};

import type { IconName } from "@/components/icon";

export const NAV: NavGroup[] = [
  {
    section: "Daily",
    items: [
      { id: "dashboard", href: "/", label: "Command Center", icon: "home" },
      {
        id: "schedule",
        href: "/schedule/calendar",
        label: "Schedule",
        icon: "calendar",
        children: [
          { href: "/schedule/calendar", label: "Calendar" },
          { href: "/schedule/optimization", label: "Optimization" },
        ],
      },
    ],
  },
  {
    section: "People",
    items: [
      {
        id: "members",
        href: "/members/directory",
        label: "Members",
        icon: "users",
        children: [
          { href: "/members/directory", label: "Directory" },
          { href: "/members/segments", label: "Segments" },
        ],
      },
      { id: "corporate", href: "/corporate", label: "Corporate", icon: "shop" },
    ],
  },
  {
    section: "Growth",
    items: [
      {
        id: "revenue",
        href: "/revenue/overview",
        label: "Revenue",
        icon: "income",
        children: [
          { href: "/revenue/overview", label: "Overview" },
          { href: "/revenue/memberships", label: "Memberships & Pricing" },
          { href: "/revenue/transactions", label: "Transactions" },
          { href: "/revenue/products", label: "Retail" },
          { href: "/revenue/giftcards", label: "Gift cards" },
          { href: "/revenue/dunning", label: "Dunning", count: 3 },
        ],
      },
      {
        id: "marketing",
        href: "/marketing/overview",
        label: "Marketing",
        icon: "promote",
        children: [
          { href: "/marketing/overview", label: "Overview" },
          { href: "/marketing/campaigns", label: "Campaigns" },
          { href: "/marketing/automations", label: "Automations" },
          { href: "/marketing/leads", label: "Leads" },
          { href: "/marketing/content", label: "Content" },
        ],
      },
      { id: "analytics", href: "/analytics", label: "Analytics", icon: "chart" },
    ],
  },
  {
    section: "Run",
    items: [
      {
        id: "operations",
        href: "/operations/staff",
        label: "Operations",
        icon: "briefcase",
        children: [
          { href: "/operations/staff", label: "Staff" },
          { href: "/operations/payroll", label: "Payroll" },
          { href: "/operations/facilities", label: "Facilities" },
          { href: "/operations/waivers", label: "Waivers" },
        ],
      },
      { id: "settings", href: "/settings", label: "Settings", icon: "settings" },
      { id: "portal", href: "/portal", label: "Employee Portal", icon: "user" },
    ],
  },
];

export type PageMeta = { crumb: string[]; title: string };

export const PAGE_TITLES: Record<string, PageMeta> = {
  "/": { crumb: ["Daily", "Command Center"], title: "Command Center" },
  "/schedule/calendar": { crumb: ["Daily", "Schedule"], title: "Schedule" },
  "/schedule/optimization": {
    crumb: ["Daily", "Schedule", "Optimization"],
    title: "Schedule optimization",
  },
  "/members/directory": { crumb: ["People", "Members"], title: "Members" },
  "/members/segments": {
    crumb: ["People", "Members", "Segments"],
    title: "Segments",
  },
  "/corporate": {
    crumb: ["People", "Corporate"],
    title: "Corporate accounts",
  },
  "/revenue/overview": { crumb: ["Growth", "Revenue"], title: "Revenue" },
  "/revenue/memberships": {
    crumb: ["Growth", "Revenue", "Memberships & Pricing"],
    title: "Memberships & pricing",
  },
  "/revenue/transactions": {
    crumb: ["Growth", "Revenue", "Transactions"],
    title: "Transactions",
  },
  "/revenue/products": {
    crumb: ["Growth", "Revenue", "Retail"],
    title: "Retail",
  },
  "/revenue/giftcards": {
    crumb: ["Growth", "Revenue", "Gift cards"],
    title: "Gift cards",
  },
  "/revenue/dunning": {
    crumb: ["Growth", "Revenue", "Dunning"],
    title: "Dunning",
  },
  "/marketing/overview": {
    crumb: ["Growth", "Marketing"],
    title: "Marketing",
  },
  "/marketing/campaigns": {
    crumb: ["Growth", "Marketing", "Campaigns"],
    title: "Campaigns",
  },
  "/marketing/automations": {
    crumb: ["Growth", "Marketing", "Automations"],
    title: "Automations",
  },
  "/marketing/leads": {
    crumb: ["Growth", "Marketing", "Leads"],
    title: "Lead pipeline",
  },
  "/marketing/content": {
    crumb: ["Growth", "Marketing", "Content"],
    title: "Content hub",
  },
  "/analytics": { crumb: ["Growth", "Analytics"], title: "Analytics" },
  "/operations/staff": {
    crumb: ["Run", "Operations", "Staff"],
    title: "Staff",
  },
  "/operations/payroll": {
    crumb: ["Run", "Operations", "Payroll"],
    title: "Payroll",
  },
  "/operations/facilities": {
    crumb: ["Run", "Operations", "Facilities"],
    title: "Facilities",
  },
  "/operations/waivers": {
    crumb: ["Run", "Operations", "Waivers"],
    title: "Waivers",
  },
  "/settings": { crumb: ["Run", "Settings"], title: "Settings" },
  "/portal": { crumb: ["Run", "Employee Portal"], title: "Employee portal" },
};
