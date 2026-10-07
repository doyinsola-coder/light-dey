import type React from "react";

// One small icon set for the whole app (line icons, 24×24, inherit the text colour).
// The app uses these instead of emojis everywhere.

type P = { size?: number; className?: string; strokeWidth?: number };

function Svg({ size = 18, className = "", strokeWidth = 2, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconArrowDown = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
);

export const IconBolt = (p: P) => (
  <Svg {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconUsers = (p: P) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </Svg>
);

export const IconSparkles = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </Svg>
);

export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);

// ─── Complaint types ─────────────────────────────────────────────────────
export const IconLowCurrent = (p: P) => (
  <Svg {...p}>
    <rect x="2" y="7" width="17" height="10" rx="2" />
    <path d="M22 11v2M6 10v4" />
  </Svg>
);

export const IconBlinking = (p: P) => (
  <Svg {...p}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
    <path d="M2 9h2M20 9h2M4.5 3.5l1.4 1.4M19.5 3.5l-1.4 1.4" />
  </Svg>
);

export const IconTransformer = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="6" width="14" height="14" rx="2" />
    <path d="M9 3v3M15 3v3" />
    <path d="M12.5 9l-2.5 4h4l-2.5 4" />
  </Svg>
);

export const IconWarning = (p: P) => (
  <Svg {...p}>
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);

export const IconReceipt = (p: P) => (
  <Svg {...p}>
    <path d="M5 2v20l3-2 2 2 2-2 2 2 2-2 3 2V2l-3 2-2-2-2 2-2-2-2 2-3-2z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </Svg>
);

export const IconKeypad = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" />
  </Svg>
);

export const IconUnplug = (p: P) => (
  <Svg {...p}>
    <path d="M19 5l3-3M2 22l3-3" />
    <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4z" />
    <path d="M7.5 13.5L10 11M10.5 16.5L13 14" />
    <path d="M12 6l6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0z" />
  </Svg>
);

export const IconMessage = (p: P) => (
  <Svg {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);

// Ranking badge: gold, silver, bronze for the top 3, plain for the rest
export function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-[linear-gradient(160deg,#FFD866,#FFB300)] text-(--ink)"
      : rank === 2
        ? "bg-[linear-gradient(160deg,#E4E7EC,#B9C0CB)] text-(--ink)"
        : rank === 3
          ? "bg-[linear-gradient(160deg,#E8A86B,#C0773A)] text-(--ink)"
          : "bg-(--card) text-(--muted)";
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${style}`}>
      {rank}
    </span>
  );
}