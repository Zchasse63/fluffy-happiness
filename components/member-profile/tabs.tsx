/*
 * Member profile tab nav strip — 6 tabs (Overview, Bookings, Payments,
 * Activity, Wellness, Notes) wired through `?tab=` search params.
 */

import Link from "next/link";

import { MEMBER_PROFILE_TABS, type MemberProfileTab } from "@/lib/fixtures";

export function ProfileTabs({
  memberId,
  active,
}: {
  memberId: string;
  active: MemberProfileTab;
}) {
  return (
    <div className="tabs" style={{ alignSelf: "flex-start" }}>
      {MEMBER_PROFILE_TABS.map((t) => (
        <Link
          key={t}
          href={`/members/${memberId}?tab=${t}`}
          className={`tab ${t === active ? "active" : ""}`}
          style={{ textDecoration: "none" }}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </Link>
      ))}
    </div>
  );
}
