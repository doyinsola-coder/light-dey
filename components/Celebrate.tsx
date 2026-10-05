"use client";

import type React from "react";
import { useEffect } from "react";
import { Bulb } from "@/components/Bulb";

const COLORS = ["#FFC531", "#FFFFFF", "#FFB300", "#14120B", "#FFE08A"];

// Full-screen "Light don come!" moment, when your area goes from no light to light
export function Celebrate({ areaName, onDone }: { areaName: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  // Fixed pattern (no randomness) so every celebration looks the same and renders cleanly
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    left: `${(i * 97) % 100}%`,
    drift: `${((i * 37) % 80) - 40}px`,
    spin: `${((i * 53) % 2 ? 1 : -1) * (360 + ((i * 61) % 360))}deg`,
    delay: `${((i * 13) % 10) * 0.05}s`,
    dur: `${1.8 + ((i * 7) % 8) * 0.1}s`,
    color: COLORS[i % COLORS.length],
    w: 6 + (i % 3) * 3,
    h: 10 + (i % 2) * 6,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[1200] overflow-hidden" role="status" aria-live="assertive">
      <div className="ld-flash absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,216,102,0.97)_0%,rgba(255,197,49,0.92)_45%,rgba(255,179,0,0.85)_100%)]" />
      {pieces.map((p, i) => (
        <span
          key={i}
          className="ld-fall absolute top-0 rounded-[2px]"
          style={
            {
              left: p.left,
              width: p.w,
              height: p.h,
              background: p.color,
              opacity: 0,
              "--drift": p.drift,
              "--spin": p.spin,
              "--delay": p.delay,
              "--dur": p.dur,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="ld-flash absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-(--ink)">
        <div className="ld-zoom-pop">
          <Bulb mode="on" size={150} />
        </div>
        <div className="ld-zoom-pop font-display text-[46px] font-extrabold leading-none tracking-tight" style={{ animationDelay: "0.12s" }}>
          Light don come! 🎉
        </div>
        <div className="ld-zoom-pop text-lg font-bold" style={{ animationDelay: "0.2s" }}>
          {areaName} is back on
        </div>
      </div>
    </div>
  );
}