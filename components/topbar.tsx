"use client";

import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();
  const meta = PAGE_TITLES[pathname] ?? {
    crumb: ["Meridian", pathname],
    title: pathname,
  };

  // Topbar Ask Meridian: focus the AskMeridian banner on the Command
  // Center. If the operator is already on `/`, scroll smoothly; from any
  // other route, navigate to the anchor (Next handles cross-page hash
  // scrolling). Resolves QA BUG-001 (button was inert).
  const handleAskMeridian = () => {
    if (pathname === "/") {
      const el = document.getElementById("ask-meridian");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      // Move focus into the Ask input if the section exposes one.
      const input = el?.querySelector("input,textarea") as HTMLElement | null;
      input?.focus();
    } else {
      router.push("/#ask-meridian");
    }
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
        <button
          type="button"
          className="btn btn-ghost hov"
          onClick={handleAskMeridian}
        >
          <Icon name="sparkle" size={14} /> Ask Meridian
        </button>
        <button
          type="button"
          className="btn btn-primary hov"
          onClick={onOpenCmdK}
          aria-label="Create new (opens command palette)"
        >
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
