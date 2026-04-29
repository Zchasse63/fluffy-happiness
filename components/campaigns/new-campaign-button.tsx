"use client";

/*
 * New-campaign creator. Inline form (popover-style) — keeps a single
 * source of truth for "create draft + redirect to edit", though the
 * edit screen is the same builder placeholder until Resend lands.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  DialogField,
  FormDialog,
  dialogInputStyle,
} from "@/components/form-dialog";
import { Icon } from "@/components/icon";

export function NewCampaignButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setIsOpen(false);
    setName("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, channel }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          typeof body?.error === "string" ? body.error : "Failed to create",
        );
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary hov"
        onClick={() => setIsOpen(true)}
      >
        <Icon name="plus" size={13} /> New campaign
      </button>
      <FormDialog
        title="New campaign"
        open={isOpen}
        onClose={close}
        onSubmit={submit}
        pending={pending}
        error={error}
        submitLabel="Create draft"
        submittingLabel="Creating…"
        submitDisabled={!name.trim()}
      >
        <DialogField label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Mother's Day gift cards"
            autoFocus
            style={dialogInputStyle}
          />
        </DialogField>
        <DialogField label="Channel">
          <select
            value={channel}
            onChange={(e) =>
              setChannel(e.target.value as "email" | "sms" | "both")
            }
            style={dialogInputStyle}
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Email + SMS</option>
          </select>
        </DialogField>
      </FormDialog>
    </>
  );
}
