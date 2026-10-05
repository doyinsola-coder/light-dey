"use client";

import { useEffect, useRef, useState } from "react";
import { buzz } from "@/lib/helpers";

const TRIGGER = 70; // how far (px) to pull before it refreshes

// Pull down from the top of the page to refresh, like a normal phone app.
// A little bulb drops in, turns as you pull, and lights up when you've pulled far enough.
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);
  const armed = useRef(false);

  useEffect(() => {
    const down = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0) return;
      // Dragging the map or a popup shouldn't refresh the page
      if ((e.target as Element | null)?.closest?.(".leaflet-container, [data-no-pull]")) return;
      startY.current = e.touches[0].clientY;
      armed.current = false;
    };
    const move = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const d = Math.min(120, dy * 0.5);
      pullRef.current = d;
      setDragging(true);
      setPull(d);
      if (d >= TRIGGER && !armed.current) {
        armed.current = true;
        buzz(10);
      } else if (d < TRIGGER) {
        armed.current = false;
      }
    };
    const up = async () => {
      if (startY.current === null) return;
      startY.current = null;
      setDragging(false);
      if (pullRef.current >= TRIGGER) {
        busyRef.current = true;
        setBusy(true);
        setPull(64);
        try {
          await Promise.all([onRefresh(), new Promise((r) => setTimeout(r, 600))]);
        } finally {
          busyRef.current = false;
          setBusy(false);
          pullRef.current = 0;
          setPull(0);
        }
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
  }, [onRefresh]);

  const ready = pull >= TRIGGER || busy;

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-0 z-[1050] ${dragging ? "" : "transition-all duration-300"}`}
      style={{
        transform: `translate(-50%, ${pull - 52}px)`,
        opacity: Math.min(1, pull / 40),
        marginTop: "env(safe-area-inset-top)",
      }}
      aria-hidden={!busy}
      role="status"
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg ${
          ready ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised) text-(--muted)"
        } ${busy ? "ld-halo" : ""}`}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={busy ? "ld-spinner" : ""}
          style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        >
          <path d="M9 18h6" /><path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" fill={ready ? "currentColor" : "none"} fillOpacity="0.25" />
        </svg>
      </div>
      {busy && <span className="sr-only">Refreshing</span>}
    </div>
  );
}