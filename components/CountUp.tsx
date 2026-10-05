"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/helpers";

// Numbers roll up to their value instead of just appearing
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const from = useRef(shown);

  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    const instant = prefersReducedMotion();
    let raf = 0;
    const step = (t: number) => {
      const p = instant ? 1 : Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(begin + (value - begin) * eased);
      setShown(v);
      from.current = v;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{shown}</>;
}