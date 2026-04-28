/*
 * Generated avatar that mirrors the prototype's procedural face SVG.
 * No external network calls — looks identical between server + client.
 */

type AvatarProps = {
  name?: string;
  size?: number;
  seed?: number;
};

const palettes = [
  ["#FCE7F3", "#BE185D", "#F472B6"],
  ["#DCFCE7", "#15803D", "#86EFAC"],
  ["#DBEAFE", "#1D4ED8", "#93C5FD"],
  ["#FEF3C7", "#B45309", "#FCD34D"],
  ["#E9D5FF", "#7E22CE", "#D8B4FE"],
  ["#FED7AA", "#C2410C", "#FDBA74"],
  ["#A5F3FC", "#0E7490", "#67E8F9"],
];

function hashName(name: string) {
  return name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function Avatar({ name = "", size = 40, seed }: AvatarProps) {
  const s = seed ?? hashName(name);
  const [bg, fg, hl] = palettes[s % palettes.length];
  const hair = s % 5;
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" aria-hidden>
        <rect width="40" height="40" fill={bg} />
        {hair === 0 && (
          <path d="M9 16 Q20 4 31 16 Q28 9 20 9 Q12 9 9 16z" fill={fg} />
        )}
        {hair === 1 && (
          <path
            d="M8 18 Q20 2 32 18 Q34 14 30 11 Q22 6 14 8 Q8 11 8 18z"
            fill={fg}
          />
        )}
        {hair === 2 && (
          <path d="M10 14 Q20 8 30 14 L30 17 Q20 12 10 17z" fill={fg} />
        )}
        {hair === 3 && (
          <path
            d="M9 17 Q12 6 20 6 Q28 6 31 17 Q26 13 20 13 Q14 13 9 17z"
            fill={fg}
          />
        )}
        {hair === 4 && (
          <path d="M11 16 Q20 7 29 16 Q26 11 20 11 Q14 11 11 16z" fill={fg} />
        )}
        <circle cx="20" cy="18" r="6.5" fill={hl} />
        <ellipse cx="20" cy="40" rx="14" ry="10" fill={fg} />
      </svg>
    </div>
  );
}
