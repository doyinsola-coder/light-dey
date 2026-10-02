"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/helpers";

type Choice = "on" | "off";
export type ReportOutcome = "ok" | "too_soon" | "error";

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
    setSending(status);
    setNote(null);
    const outcome = await onReport(status);
    setSending(null);
    if (outcome === "ok") {
      startCooldown(status);
      setJustSent((n) => n + 1);
      setNote("Thanks! Your neighbours can see it now.");
    } else if (outcome === "too_soon") {
      // Reported from another tab or after clearing the app: wait it out from now
      startCooldown(status);
      setNote("You reported recently, so wait for the timer.");
    } else {
      setNote("Couldn't send that. Check your data and try again.");
    }
  }

  const fraction = cooling ? remaining / COOLDOWN_MS : 0;

  function button(status: Choice) {
    const isLight = status === "on";
    const chosen = cooling && last?.status === status;
    const locked = (cooling && !chosen) || (sending !== null && sending !== status);
    const label = isLight ? "Light dey" : "No light";

    const base =
      "relative flex min-h-16 flex-col items-center justify-center overflow-hidden rounded-[18px] px-3 text-[17px] font-bold";
    const look = chosen
      ? isLight
        ? "bg-(--light) text-(--ink) ring-2 ring-(--light) ring-offset-2 ring-offset-(--bg)"
        : "bg-(--text) text-(--bg) ring-2 ring-(--text) ring-offset-2 ring-offset-(--bg)"
      : isLight
        ? "bg-(--light) text-(--ink)"
        : "border border-(--line-strong) bg-(--raised)";

    return (
      <button
        key={`${status}-${chosen ? justSent : 0}`}
        onClick={() => press(status)}
        disabled={cooling || sending !== null}
        aria-pressed={chosen}
        className={`${base} ${look} ${locked ? "opacity-35 saturate-0" : ""} ${chosen && justSent ? "ld-pop" : ""}`}
      >
        <span className="flex items-center gap-2">
          {sending === status ? <Spinner /> : chosen ? <Check /> : null}
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
        {note ?? (cooling ? "One report per phone every 15 mins keeps things fair." : "")}
      </p>
    </section>
  );
}