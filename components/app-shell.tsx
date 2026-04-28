"use client";

import { useEffect, useState } from "react";

import { CommandPalette } from "@/components/command-palette";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

/*
 * Top-level client wrapper. Holds the ⌘K state because it spans the
 * sidebar (button), topbar (pill), and the modal itself. Everything
 * inside `children` stays a server component by default.
 */

export function AppShell({ children }: { children: React.ReactNode }) {
  const [cmdkOpen, setCmdKOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdKOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
