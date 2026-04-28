"use client";

import { usePathname } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PAGE_TITLES } from "@/lib/nav";

/*
 * Topbar contains breadcrumbs derived from the current route,
 * a ⌘K command-pill placeholder, "Ask Meridian" + primary actions,
 * a notifications bell with an unread dot, and the user avatar.
 */

export function Topbar({ onOpenCmdK }: { onOpenCmdK: () => void }) {
  const pathname = usePathname();
  const meta = PAGE_TITLES[pathname] ?? {
    crumb: ["Meridian", pathname],
    title: pathname,
  };

  return (
    <div className="topbar">
      <div className="crumbs">
        {meta.crumb.map((c, i) => (
          <span key={`${c}-${i}`}>
            <span className={i === meta.crumb.length - 1 ? "current" : ""}>
              {c}
            </span>
            {i < meta.crumb.length - 1 && (
              <span className="sep" style={{ marginLeft: 10 }}>
                /
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="cmd-pill hov" onClick={onOpenCmdK}>
          <Icon name="search" size={14} />
          <span>Search or run a command</span>
          <span className="kbd">⌘K</span>
        </button>
        <button type="button" className="btn btn-ghost hov">
          <Icon name="sparkle" size={14} /> Ask Meridian
        </button>
        <button type="button" className="btn btn-primary hov">
          <Icon name="plus" size={14} /> New
        </button>
        <button type="button" className="icon-btn hov" aria-label="Notifications">
          <Icon name="bell" size={15} />
          <span className="dot" />
        </button>
        <Avatar name="Zach" seed={42} size={36} />
      </div>
    </div>
  );
}
