"use client";

/*
 * Automation card actions — pause/resume toggle + the global "seed
 * defaults" button that appears when the studio has no flows yet.
 */

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Icon } from "@/components/icon";

export function AutomationToggle({
  id,
  status,
}: {
  id: string;
  status: "active" | "paused";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = status === "active" ? "paused" : "active";

  function toggle() {
    startTransition(async () => {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn btn-ghost hov"
      style={{ fontSize: 12 }}
      onClick={toggle}
      disabled={pending}
    >
      {pending ? "…" : status === "active" ? "Pause" : "Resume"}
    </button>
  );
}

export function SeedAutomationsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function seed() {
    startTransition(async () => {
      const res = await fetch("/api/automations/seed", { method: "POST" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="btn btn-primary hov"
      onClick={seed}
      disabled={pending}
    >
      <Icon name="plus" size={13} />{" "}
      {pending ? "Seeding…" : "Seed default flows"}
    </button>
  );
}
