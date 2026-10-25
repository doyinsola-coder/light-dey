"use client";

import { useState } from "react";
import { shareInvite, type Contest } from "@/lib/rewards";

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.ceil(ms / 86_400_000);
  return d <= 1 ? "Ends today" : `${d} days left`;
}

// The invite contest: prizes, countdown, top inviters and your count. Only while a contest is set in LD Admin.
export function ContestCard({ contest, refCode }: { contest: Contest | null; refCode: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!contest || !("starts" in contest)) return null;
  const c = contest;
  const top = c.top.slice(0, 5);

  return (
    <section
      className="flex flex-col gap-3 rounded-[24px] border border-(--light) bg-[linear-gradient(160deg,rgba(255,197,49,0.16),transparent_60%)] p-4.5"
      aria-label="Invite contest"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[12px] font-bold uppercase tracking-[1.4px] text-(--light-text)">Invite contest</span>
          <span className="font-display text-[20px] font-extrabold leading-tight">
            {c.ended ? "Contest over" : "Bring your neighbours, win data"}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-(--raised) px-2.5 py-1 text-[12px] font-bold">{c.ended ? "Winners soon" : daysLeft(c.ends)}</span>
      </div>

      {c.prizes && <p className="text-[14px] font-bold">{c.prizes}</p>}

      {top.length > 0 ? (
        <ol className="flex flex-col rounded-2xl bg-(--raised) px-3.5 py-1">
          {top.map((t, i) => (
            <li key={`${t.who}-${i}`} className="flex min-h-10 items-center gap-3 border-b border-(--divider) text-[14px] last:border-0">
              <span className="w-4 font-bold text-(--muted)">{i + 1}</span>
              <span className={`flex-1 font-bold ${t.me ? "text-(--light-text)" : ""}`}>{t.me ? "You" : t.who}</span>
              <span className="text-(--soft)">{t.n} counted</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[14px] text-(--soft)">No one on the board yet. The first invites to start reporting take the lead.</p>
      )}

      <p className="text-[13px] text-(--muted)">
        You: <strong className="text-(--text)">{c.mine}</strong>. A friend counts once they report on 3 different days from their area.
      </p>

      {!c.ended && refCode && (
        <button
          onClick={async () => {
            if ((await shareInvite(refCode)) === "copied") {
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }
          }}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-(--light) text-[15px] font-extrabold text-(--ink)"
        >
          {copied ? "Link copied. Send it to your neighbours" : "Invite neighbours"}
        </button>
      )}
    </section>
  );
}