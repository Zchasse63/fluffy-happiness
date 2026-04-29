/*
 * Week-grid header strip — Mon-Sun day labels with the date number,
 * "Today" pill on the active column, sits above the hour gutter.
 */

export function WeekHeader({
  days,
  dates,
  todayIdx,
}: {
  days: readonly string[];
  dates: readonly string[];
  todayIdx: number;
}) {
  return (
    <>
      <div
        style={{
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--border)",
        }}
      />
      {days.map((d, i) => {
        const isToday = i === todayIdx;
        return (
          <div
            key={d}
            style={{
              padding: "10px 12px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              borderLeft: "1px solid var(--border)",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isToday ? "var(--accent)" : "var(--text-3)",
              }}
            >
              {d}
            </span>
            <span
              className="serif"
              style={{
                fontSize: 20,
                letterSpacing: "-0.02em",
                color: isToday ? "var(--accent-deep)" : "var(--text)",
              }}
            >
              {dates[i].split(" ")[1]}
            </span>
            {isToday && (
              <span
                className="badge"
                style={{
                  background: "var(--accent)",
                  color: "#FBF0E3",
                  fontSize: 9.5,
                }}
              >
                Today
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
