"use client";

/*
 * Booking-rules editor — inline form for the most-edited settings on
 * the studio. Cancellation hours + late-cancel + no-show fee + booking
 * window. PATCH /api/settings with `bookingRules` payload.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  DialogField,
  FormDialog,
  dialogInputStyle,
} from "@/components/form-dialog";
import { Icon } from "@/components/icon";

type Rules = {
  bookingWindowDays: number;
  cancellationPolicyHours: number;
  lateCancelFeeCents: number;
  noShowFeeCents: number;
  waitlistAutoPromote: boolean;
};

export function BookingRulesEditor({ rules }: { rules: Rules }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [bookingWindowDays, setBookingWindowDays] = useState(
    rules.bookingWindowDays,
  );
  const [cancellationHours, setCancellationHours] = useState(
    rules.cancellationPolicyHours,
  );
  const [lateCancelFee, setLateCancelFee] = useState(rules.lateCancelFeeCents);
  const [noShowFee, setNoShowFee] = useState(rules.noShowFeeCents);
  const [waitlistAuto, setWaitlistAuto] = useState(rules.waitlistAutoPromote);
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
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingRules: {
            booking_window_days: bookingWindowDays,
            cancellation_policy_hours: cancellationHours,
            late_cancel_fee_cents: lateCancelFee,
            no_show_fee_cents: noShowFee,
            waitlist_auto_promote: waitlistAuto,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Could not save changes",
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
        className="btn btn-link hov"
        style={{ fontSize: 12 }}
        onClick={() => setIsOpen(true)}
      >
        <Icon name="edit" size={11} /> Edit
      </button>
      <FormDialog
        title="Booking rules"
        open={isOpen}
        onClose={close}
        onSubmit={submit}
        pending={pending}
        error={error}
        submitLabel="Save"
        submittingLabel="Saving…"
        minWidth={400}
      >
        <NumberField
          label="Booking window (days)"
          value={bookingWindowDays}
          onChange={setBookingWindowDays}
          min={1}
          max={365}
        />
        <NumberField
          label="Cancellation policy (hours before class)"
          value={cancellationHours}
          onChange={setCancellationHours}
          min={0}
          max={168}
        />
        <NumberField
          label="Late cancel fee ($)"
          value={lateCancelFee / 100}
          onChange={(v) => setLateCancelFee(Math.round(v * 100))}
          min={0}
          max={100}
          step={0.5}
        />
        <NumberField
          label="No-show fee ($)"
          value={noShowFee / 100}
          onChange={(v) => setNoShowFee(Math.round(v * 100))}
          min={0}
          max={100}
          step={0.5}
        />
        <label className="row" style={{ gap: 10, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={waitlistAuto}
            onChange={(e) => setWaitlistAuto(e.target.checked)}
          />
          <span>Waitlist auto-promote on cancel</span>
        </label>
      </FormDialog>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <DialogField label={label}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={dialogInputStyle}
      />
    </DialogField>
  );
}
