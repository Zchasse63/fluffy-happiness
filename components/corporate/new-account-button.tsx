"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  DialogField,
  FormDialog,
  dialogInputStyle,
} from "@/components/form-dialog";
import { Icon } from "@/components/icon";

export function NewCorporateAccountButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [monthlyFeeCents, setMonthlyFeeCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setIsOpen(false);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/corporate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact_name: contactName || null,
          contact_email: contactEmail || null,
          monthly_fee_cents: monthlyFeeCents,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          typeof body?.error === "string" ? body.error : "Could not create",
        );
        return;
      }
      close();
      setName("");
      setContactName("");
      setContactEmail("");
      setMonthlyFeeCents(0);
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
        <Icon name="plus" size={13} /> New account
      </button>
      <FormDialog
        title="New corporate account"
        open={isOpen}
        onClose={close}
        onSubmit={submit}
        pending={pending}
        error={error}
        submitLabel="Create"
        submittingLabel="Creating…"
        submitDisabled={!name.trim()}
        minWidth={380}
      >
        <DialogField label="Company">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            style={dialogInputStyle}
          />
        </DialogField>
        <DialogField label="Primary contact (optional)">
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            style={dialogInputStyle}
          />
        </DialogField>
        <DialogField label="Contact email (optional)">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            style={dialogInputStyle}
          />
        </DialogField>
        <DialogField label="Monthly fee ($)">
          <input
            type="number"
            min={0}
            value={monthlyFeeCents / 100}
            onChange={(e) =>
              setMonthlyFeeCents(Math.round(Number(e.target.value) * 100))
            }
            style={dialogInputStyle}
          />
        </DialogField>
      </FormDialog>
    </>
  );
}
