/*
 * Custom 404 — matches Atelier visual contract instead of Next.js's
 * default UI. Server component (no `"use client"`); rendered for any
 * unmatched route segment, including from server components calling
 * `notFound()` (e.g. /members/[id]).
 */

import Link from "next/link";

import { Icon } from "@/components/icon";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div
          className="metric-label"
          style={{ marginBottom: 12 }}
        >
          404 · Not found
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 44,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            margin: 0,
            marginBottom: 14,
          }}
        >
          That route hasn&apos;t been built yet.
        </h1>
        <p
          className="muted"
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            marginBottom: 24,
          }}
        >
          Either the URL is wrong, the resource was moved, or the feature
          is still on the roadmap. The links below cover everything that
          exists today.
        </p>
        <div
          className="row"
          style={{ gap: 10, justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link href="/" className="btn btn-primary hov">
            <Icon name="home" size={13} /> Command Center
          </Link>
          <Link href="/members/directory" className="btn btn-ghost hov">
            <Icon name="users" size={13} /> Members
          </Link>
          <Link href="/schedule/calendar" className="btn btn-ghost hov">
            <Icon name="calendar" size={13} /> Schedule
          </Link>
        </div>
      </div>
    </main>
  );
}
