"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icon";
import { NAV } from "@/lib/nav";

/*
 * The sidebar mirrors the prototype: brand row, grouped nav with auto-
 * expanding parents (only the current section opens by default), a footer
 * card with a goal indicator, and the theme toggle + ⌘K hint.
 */

type Theme = "light" | "dark";

function isParentActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  const root = href.split("/")[1];
  return pathname.startsWith(`/${root}`);
}

export function Sidebar({ onOpenCmdK }: { onOpenCmdK: () => void }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Pick up persisted theme on hydrate.
    const stored = (localStorage.getItem("meridian:theme") as Theme | null) ?? null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("meridian:theme", theme);
  }, [theme]);

  // Auto-expand the section that contains the current route.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const group of NAV) {
      for (const item of group.items) {
        if (item.children && isParentActive(pathname, item.href)) {
          next[item.id] = true;
        }
      }
    }
    setOpenSections((prev) => ({ ...prev, ...next }));
  }, [pathname]);

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                fontFamily: "var(--serif)",
                fontSize: 17,
                letterSpacing: "-0.01em",
              }}
            >
              The Sauna Guys
            </span>
            <span
              className="mono"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-3)",
              }}
            >
              Tampa · Meridian
            </span>
          </div>
        </div>
      </div>

      {NAV.map((group) => (
        <div key={group.section}>
          <div className="nav-label">{group.section}</div>
          {group.items.map((item) => {
            const parentActive = isParentActive(pathname, item.href);
            const isOpen = openSections[item.id] ?? false;
            const hasChildren = !!item.children;
            const itemActive =
              !hasChildren && pathname === item.href ? "active" : "";
            return (
              <div key={item.id}>
                {hasChildren ? (
                  <button
                    type="button"
                    className={`nav-item ${parentActive ? "active" : ""} ${
                      isOpen ? "open" : ""
                    }`}
                    onClick={() =>
                      setOpenSections((prev) => ({
                        ...prev,
                        [item.id]: !isOpen,
                      }))
                    }
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    {item.count != null && (
                      <span className="count">{item.count}</span>
                    )}
                    <Icon name="chev-down" size={12} className="chev" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`nav-item ${itemActive}`}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    {item.count != null && (
                      <span className="count">{item.count}</span>
                    )}
                  </Link>
                )}
                {hasChildren && isOpen && (
                  <div className="nav-sub">
                    {item.children!.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={`nav-sub-item ${
                          pathname === c.href ? "active" : ""
                        }`}
                      >
                        <span>{c.label}</span>
                        {c.count != null && (
                          <span className="pill-count">{c.count}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-card">
          <div className="title">Quarterly goal</div>
          <div className="desc">$240k of $300k earned</div>
          <div className="progress">
            <div style={{ width: "80%" }} />
          </div>
        </div>

        <div
          className="row"
          style={{ justifyContent: "space-between", padding: "4px 6px" }}
        >
          <div className="theme-row">
            <button
              type="button"
              className={theme === "light" ? "on" : ""}
              onClick={() => setTheme("light")}
              aria-label="Light theme"
            >
              <Icon name="sun" size={13} />
            </button>
            <button
              type="button"
              className={theme === "dark" ? "on" : ""}
              onClick={() => setTheme("dark")}
              aria-label="Dark theme"
            >
              <Icon name="moon" size={13} />
            </button>
          </div>
          <button
            type="button"
            className="hov"
            onClick={onOpenCmdK}
            title="Command (⌘K)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-2)",
              fontFamily: "var(--mono)",
              fontSize: 11,
            }}
          >
            <Icon name="cmd" size={14} /> K
          </button>
        </div>
      </div>
    </aside>
  );
}
