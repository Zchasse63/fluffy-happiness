"use client";

/*
 * Modal form scaffold — backdrop + centered card + title + footer with
 * cancel/submit buttons. Owners (NewCampaignButton, NewCorporateAccountButton,
 * BookingRulesEditor) wire the actual fields and submit handler; this
 * component owns the chrome and keeps it visually identical across pages.
 *
 * Renders byte-identical markup to the previous inline copies (same backdrop
 * color, card padding, button labels) — extraction is refactor-only.
 */

export const dialogFieldLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

export const dialogInputStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
};

export function FormDialog({
  title,
  open,
  onClose,
  onSubmit,
  pending,
  error,
  submitLabel,
  submittingLabel,
  submitDisabled = false,
  minWidth = 360,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  submittingLabel: string;
  submitDisabled?: boolean;
  minWidth?: number;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          padding: 24,
          minWidth,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div className="serif" style={{ fontSize: 22 }}>
          {title}
        </div>
        {children}
        {error && (
          <div style={{ color: "var(--neg)", fontSize: 12 }}>{error}</div>
        )}
        <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost hov"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary hov"
            disabled={pending || submitDisabled}
          >
            {pending ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DialogField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={dialogFieldLabelStyle}>
      <span className="metric-label">{label}</span>
      {children}
    </label>
  );
}
