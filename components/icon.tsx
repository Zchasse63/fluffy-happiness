/*
 * Icon set ported from the prototype's hand-rolled SVGs. We keep these
 * inline (rather than swapping to lucide-react) because the prototype's
 * stroke weight + path style is part of the locked visual contract.
 */

import { type SVGProps } from "react";

export type IconName =
  | "home"
  | "calendar"
  | "grid"
  | "box"
  | "users"
  | "user"
  | "shop"
  | "chart"
  | "spark"
  | "income"
  | "promote"
  | "close"
  | "search"
  | "bell"
  | "chat"
  | "plus"
  | "sun"
  | "moon"
  | "arrow-up"
  | "arrow-down"
  | "arrow-up-right"
  | "arrow-right"
  | "arrow-left"
  | "chev-down"
  | "chev-right"
  | "check"
  | "check-sq"
  | "download"
  | "mail"
  | "globe"
  | "help"
  | "flame"
  | "edit"
  | "briefcase"
  | "list"
  | "link"
  | "smile"
  | "follow"
  | "star"
  | "pin"
  | "cmd"
  | "sparkle"
  | "filter"
  | "send"
  | "settings";

export type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
} & Omit<SVGProps<SVGSVGElement>, "name" | "stroke" | "width" | "height">;

export function Icon({ name, size = 18, stroke = 1.6, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    // Every icon in this app is decorative — the surrounding button/link
    // text or aria-label is the accessible name. Callers that need an
    // icon-only control should set aria-label on the wrapping element,
    // or override aria-hidden on the SVG via ...rest.
    "aria-hidden": true as const,
    focusable: false as const,
    ...rest,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8 12 3 3 8l9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="m3 8 9 5 9-5" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 21c0-4 3-6 7-6s7 2 7 6" />
          <circle cx="17" cy="6" r="2.5" />
          <path d="M22 17c0-2.5-1.7-4-4-4" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21c0-4 3-6 7-6s7 2 7 6" />
        </svg>
      );
    case "shop":
      return (
        <svg {...common}>
          <path d="M3 8h18l-1.5 11a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 8z" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 14l3-4 3 3 5-6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M3 17l4-6 4 3 4-7 6 9" />
        </svg>
      );
    case "income":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M9 10h4.5a2 2 0 0 1 0 4H9" />
        </svg>
      );
    case "promote":
      return (
        <svg {...common}>
          <path d="M3 11l18-7-7 18-2-8-9-3z" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5A8 8 0 1 1 21 12z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
    case "arrow-up":
      return (
        <svg {...common}>
          <path d="m6 14 6-6 6 6" />
        </svg>
      );
    case "arrow-down":
      return (
        <svg {...common}>
          <path d="m6 10 6 6 6-6" />
        </svg>
      );
    case "arrow-up-right":
      return (
        <svg {...common}>
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      );
    case "chev-down":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "chev-right":
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 5 5L20 7" />
        </svg>
      );
    case "check-sq":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "help":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-2 2-2 5a6 6 0 0 0 12 0c0-6-7-10-7-10z" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M4 20h4l11-11-4-4L4 16v4z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.5 1.5" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5" />
        </svg>
      );
    case "smile":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 14s1 2 3 2 3-2 3-2M9 9h.01M15 9h.01" />
        </svg>
      );
    case "follow":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 21c0-4 3-6 7-6s7 2 7 6" />
          <path d="M19 8v6M16 11h6" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "cmd":
      return (
        <svg {...common}>
          <path d="M9 6a3 3 0 1 0 0 6h6a3 3 0 1 0 0-6 3 3 0 0 0-3 3v6a3 3 0 1 0 6 0 3 3 0 0 0-3-3H9a3 3 0 1 0 0 6 3 3 0 0 0 3-3V9a3 3 0 0 0-3-3z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM19 14l.7 1.8L21 16.5l-1.3.7L19 19l-.7-1.8L17 16.5l1.3-.7L19 14z" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common}>
          <path d="M3 5h18l-7 9v6l-4-2v-4z" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
  }
}
