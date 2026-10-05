"use client";

import { useEffect, useState } from "react";

// "● LIVE · Ilorin ........ Updated 12s ago"
export function LiveRow({ city, updatedAt }: { city: string; updatedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const s = Math.max(0, Math.round((now - updatedAt) / 1000));
  const ago = updatedAt === 0 ? "…" : s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)} min ago`;

  return (
    <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-[1.2px] text-(--muted)">
      <span className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="ld-ping absolute inset-0 rounded-full bg-[#2ECC71]" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#2ECC71]" />
        </span>
        Live · {city}
      </span>
      <span className="normal-case tracking-normal font-medium">Updated {ago}</span>
    </div>
  );
}