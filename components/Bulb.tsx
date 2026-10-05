import type React from "react";

// The animated bulb on the status card.
// on: glowing, with turning rays and little sparks floating up
// off: dark, but it tries to flicker on every few seconds (NEPA things)
// unknown: a bulb with a question mark, gently bobbing

const BULB = "M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z";

export function Bulb({ mode, size = 92 }: { mode: "on" | "off" | "unknown"; size?: number }) {
  if (mode === "on") {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
        {/* soft glow */}
        <div className="ld-halo absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.35)_40%,transparent_70%)]" />
        {/* turning rays */}
        <svg className="ld-rays absolute inset-0" viewBox="0 0 100 100">
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="50"
              y1="4"
              x2="50"
              y2={i % 2 ? "13" : "17"}
              stroke="#14120B"
              strokeOpacity="0.35"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </svg>
        {/* the bulb */}
        <svg className="absolute inset-[18%]" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={BULB} fill="#FFFBEA" stroke="#14120B" strokeWidth="1.6" />
          <path d="M10 10.5l1 1.5 1-2 1 2 1-1.5" stroke="#E0A100" strokeWidth="1.2" />
          <path d="M9 18h6M10 21h4" stroke="#14120B" strokeWidth="1.6" />
        </svg>
        {/* sparks */}
        {[
          { left: "18%", top: "40%", d: "0s", fx: "-8px" },
          { left: "78%", top: "34%", d: "0.9s", fx: "8px" },
          { left: "30%", top: "20%", d: "1.6s", fx: "-4px" },
          { left: "66%", top: "58%", d: "2.1s", fx: "6px" },
        ].map((s, i) => (
          <span
            key={i}
            className="ld-float absolute h-1.5 w-1.5 rounded-full bg-white"
            style={{ left: s.left, top: s.top, opacity: 0, animationDelay: s.d, "--fx": s.fx } as React.CSSProperties}
          />
        ))}
      </div>
    );
  }

  if (mode === "off") {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
        {/* the flicker: a quick yellow glow that comes and goes */}
        <div
          className="ld-flicker absolute inset-[4%] rounded-full bg-[radial-gradient(circle,rgba(255,197,49,0.55)_0%,transparent_65%)]"
          style={{ opacity: 0 }}
        />
        <svg className="absolute inset-[18%]" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={BULB} fill="var(--card)" stroke="var(--off-dot)" strokeWidth="1.6" />
          <path d={BULB} className="ld-flicker" fill="#FFC531" fillOpacity="0.85" style={{ opacity: 0 }} />
          <path d="M10 10.5l1 1.5 1-2 1 2 1-1.5" stroke="var(--off-dot)" strokeWidth="1.2" />
          <path d="M9 18h6M10 21h4" stroke="var(--off-dot)" strokeWidth="1.6" />
        </svg>
      </div>
    );
  }

  return (
    <div className="ld-bob relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <svg className="absolute inset-[18%]" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={BULB} fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeDasharray="2.5 2.5" />
        <path d="M9 18h6M10 21h4" stroke="var(--muted)" strokeWidth="1.6" />
        <text x="12" y="12.2" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="var(--light-text)">
          ?
        </text>
      </svg>
    </div>
  );
}