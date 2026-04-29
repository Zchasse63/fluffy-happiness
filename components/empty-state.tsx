/*
 * Empty-state cell for cards that wrap a table or list and need a
 * centered "nothing yet" message in place of the rows. Matches the
 * existing `padding: 32 / textAlign: center / var(--text-2) / 13.5px`
 * shape from the corporate + payroll pages — extraction is refactor-only.
 */

export function EmptyTableState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 32,
        textAlign: "center",
        color: "var(--text-2)",
        fontSize: 13.5,
      }}
    >
      {children}
    </div>
  );
}
