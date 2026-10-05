"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { buzz, store } from "@/lib/helpers";

type Choice = "on" | "off";
export type ReportOutcome =
  | "ok"
  | "too_soon"
  | "too_far" // not in this area right now
  | "location_denied" // location blocked for this site
  | "location_off" // phone location off
  | "location_slow" // location is on but the phone couldn't get a fix in time
  | "location_rough" // location too fuzzy to trust
  | "error";

const COOLDOWN_MS = 15 * 60 * 1000; // must match the 15 minutes in report_status()
const KEY = "lightdey_last_report";

type Last = { at: number; status: Choice; areaName: string };

function readLast(): Last | null {
  try {
    const v = JSON.parse(store.get(KEY) ?? "null") as Last | null;
    return v && typeof v.at === "number" && (v.status === "on" || v.status === "off") ? v : null;
  } catch {
    return null;
  }
}

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Spinner() {
  return (
    <svg className="ld-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  );
}

function BulbIcon({ off }: { off?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" /><path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" fill={off ? "none" : "currentColor"} fillOpacity="0.2" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

// Sparks that fly out of the button after a report goes through
function Burst({ color }: { color: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 58 + (i % 3) * 14;
        return (
          <span
            key={i}
            className="ld-burst absolute left-0 top-0 rounded-full"
            style={
              {
                width: i % 2 ? 7 : 10,
                height: i % 2 ? 7 : 10,
                background: color,
                opacity: 0,
                animationDelay: `${(i % 3) * 30}ms`,
                "--dx": `${Math.round(Math.cos(a) * r)}px`,
                "--dy": `${Math.round(Math.sin(a) * r * 0.7)}px`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

type Props = {
  areaName: string;
  onReport: (status: Choice) => Promise<ReportOutcome>;
};

// The two report buttons. After a report, the chosen one stays lit with a tick and
// a bar that drains over the 15-minute wait, then both unlock again.
// The wait is per phone (not per area), same as the server rule, and survives reloads.
export function ReportButtons({ areaName, onReport }: Props) {
  const [last, setLast] = useState<Last | null>(readLast);
  const [now, setNow] = useState(() => Date.now());
  const [sending, setSending] = useState<Choice | null>(null);
  const [justSent, setJustSent] = useState(0); // bumps to replay the "pop"
  const [note, setNote] = useState<string | null>(null);
  const [ripple, setRipple] = useState<{ status: Choice; x: number; y: number; id: number } | null>(null);

  const remaining = last ? COOLDOWN_MS - (now - last.at) : 0;
  const cooling = remaining > 0;

  // Tick every second while waiting
  useEffect(() => {
    if (!cooling) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooling]);

  function startCooldown(status: Choice, at = Date.now()) {
    const v: Last = { at, status, areaName };
    store.set(KEY, JSON.stringify(v));
    setLast(v);
    setNow(Date.now());
  }

  async function press(status: Choice) {
    if (sending || cooling) return;
    buzz(12);
    setSending(status);
    setNote(null);
    const outcome = await onReport(status);
    setSending(null);
    if (outcome === "ok") {
      buzz(status === "on" ? [20, 50, 20, 50, 40] : [30, 60, 30]);
      startCooldown(status);
      setJustSent((n) => n + 1);
      setNote("Thanks! Your neighbours can see it now.");
    } else if (outcome === "too_soon") {
      // Reported from another tab or after clearing the app: wait it out from now
      startCooldown(status);
      setNote("You reported recently, so wait for the timer.");
    } else {
      buzz([60, 40, 60]);
      setNote(
        outcome === "too_far"
          ? "That didn't go through. Pick where you are below 👇"
          : outcome === "location_denied"
            ? "Location is blocked for Light Dey. Allow it in your browser settings, then try again."
            : outcome === "location_off"
              ? "Turn on your phone's location to report. It's how we know you're really there."
              : outcome === "location_slow"
                ? "Couldn't get your location in time. Move near a window or outside, then try again."
                : outcome === "location_rough"
                ? "We couldn't get a clear location. Turn on GPS / high accuracy and try again."
                : "Couldn't send that. Check your data and try again."
      );
    }
  }

  const fraction = cooling ? remaining / COOLDOWN_MS : 0;

  function button(status: Choice) {
    const isLight = status === "on";
    const chosen = cooling && last?.status === status;
    const locked = (cooling && !chosen) || (sending !== null && sending !== status);
    const label = isLight ? "Light dey" : "No light";

    const base =
      "relative flex min-h-[84px] w-full flex-col items-center justify-center overflow-hidden rounded-[22px] px-3 text-[17px] font-bold";
    const look = chosen
      ? isLight
        ? "bg-(--light) text-(--ink) ring-2 ring-(--light) ring-offset-2 ring-offset-(--bg)"
        : "bg-(--text) text-(--bg) ring-2 ring-(--text) ring-offset-2 ring-offset-(--bg)"
      : isLight
        ? "bg-[linear-gradient(160deg,#FFD866,#FFC531_55%,#FFB300)] text-(--ink) shadow-[0_10px_28px_-12px_rgba(255,190,30,0.8)]"
        : "border border-(--line-strong) bg-(--raised) shadow-[0_10px_28px_-16px_rgba(0,0,0,0.6)]";

    return (
      <div key={status} className="relative">
      <button
        key={`${status}-${chosen ? justSent : 0}`}
        onClick={() => press(status)}
        onPointerDown={(e) => {
          if (cooling || sending) return;
          const r = e.currentTarget.getBoundingClientRect();
          setRipple({ status, x: e.clientX - r.left, y: e.clientY - r.top, id: Date.now() });
        }}
        disabled={cooling || sending !== null}
        aria-pressed={chosen}
        className={`${base} ${look} ${locked ? "opacity-35 saturate-0" : ""} ${chosen && justSent ? "ld-pop" : ""}`}
      >
        {ripple?.status === status && (
          <span
            key={ripple.id}
            className="ld-ripple pointer-events-none absolute h-[260px] w-[260px] rounded-full bg-current"
            style={{ left: ripple.x, top: ripple.y, opacity: 0 }}
            aria-hidden="true"
          />
        )}
        <span className="flex items-center gap-2">
          {sending === status ? <Spinner /> : chosen ? <Check /> : <BulbIcon off={!isLight} />}
          {sending === status ? "Sending…" : label}
        </span>
        {chosen && (
          <>
            <span className="mt-0.5 text-[12px] font-medium opacity-80">Again in {mmss(remaining)}</span>
            {/* the bar drains as the wait runs out */}
            <span
              className="absolute bottom-0 left-0 h-1.5 bg-current opacity-30 transition-[width] duration-1000 ease-linear"
              style={{ width: `${fraction * 100}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </button>
      {chosen && justSent > 0 && <Burst key={justSent} color={isLight ? "#FFC531" : "var(--off-dot)"} />}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2.5" aria-label="Report">
      <span className="text-[15px] font-medium text-(--soft)">
        {cooling && last
          ? `You said "${last.status === "on" ? "light dey" : "no light"}"${last.areaName !== areaName ? ` for ${last.areaName}` : ""}.`
          : "What's happening where you are?"}
      </span>
      <div className="grid grid-cols-2 gap-2.5">
        {button("on")}
        {button("off")}
      </div>
      <p className="min-h-5 text-sm text-(--muted)" role="status" aria-live="polite">
        {note ??
          (cooling
            ? "One report per phone every 15 mins keeps things fair."
            : `📍 We check that you're in ${areaName}. Your exact spot is never saved.`)}
      </p>
    </section>
  );
}