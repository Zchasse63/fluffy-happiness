"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CommandPalette } from "@/components/command-palette";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

/*
 * Top-level client wrapper. Holds the ⌘K state because it spans the
 * sidebar (button), topbar (pill), and the modal itself. Everything
 * inside `children` stays a server component by default.
 *
 * Skips the chrome (sidebar / topbar / cmd-k) on auth routes — those
 * have their own minimal layout.
 */

const NO_CHROME_PREFIXES = ["/login", "/auth"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [cmdkOpen, setCmdKOpen] = useState(false);

  const skipChrome = NO_CHROME_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (skipChrome) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdKOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skipChrome]);

  if (skipChrome) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <Sidebar onOpenCmdK={() => setCmdKOpen(true)} />
      <div>
        <Topbar onOpenCmdK={() => setCmdKOpen(true)} />
        <main className="main">{children}</main>
      </div>
      <CommandPalette open={cmdkOpen} onClose={() => setCmdKOpen(false)} />
    </div>
  );
}
