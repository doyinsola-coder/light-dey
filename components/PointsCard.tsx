"use client";

import { useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import { buzz } from "@/lib/helpers";
import { CLAIM_ERRORS, shareInvite, type Points } from "@/lib/rewards";

// "Your points": progress to 1GB, "Turn into data", and the invite link.
// Only shows while rewards are switched on.
export function PointsCard({ points, onChanged }: { points: Points | null; onChanged: () => void }) {
  const [open, setOpen] = useState<"none" | "how" | "claim">("none");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!points || !points.enabled) return null;
  const p = points;
  const pct = Math.min(100, Math.round((p.balance / p.per_gb) * 100));
  const left = Math.max(0, p.per_gb - p.balance);
  const claimedThisMonth = p.claim && p.claim.status !== "rejected";
  const canClaim = p.balance >= p.per_gb && !claimedThisMonth && p.claims_left > 0;

  async function claim() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("claim_data", { p_device_id: getDeviceId(), p_contact: contact });
    setBusy(false);
    if (err) {
      const code = Object.keys(CLAIM_ERRORS).find((k) => err.message.includes(k));
      setError(code ? CLAIM_ERRORS[code] : "Couldn't send your claim. Check your data and try again.");
      return;
    }
    buzz([15, 30, 15]);
    setOpen("none");
    setContact("");
    onChanged();
  }

  async function invite() {
    if ((await shareInvite(p.ref)) === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  // What to say about this month's claim
  let status: { text: string; tone: "ok" | "wait" | "bad" } | null = null;
  if (p.claim?.status === "pending") status = { text: "Claimed! Your 1GB is on its way. We'll mark it here once it's sent.", tone: "wait" };
  else if (p.claim?.status === "paid") status = { text: "Sent! Your 1GB should be on your line. Next claim from the 1st.", tone: "ok" };
  else if (p.claim?.status === "rejected")
    status = { text: `Your claim couldn't be paid${p.claim.note ? `: ${p.claim.note}` : ""}. Your points are back.`, tone: "bad" };

  return (
    <section className="flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5" aria-label="Your points">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[12px] font-bold uppercase tracking-[1.4px] text-(--muted)">Your points</span>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-[34px] font-extrabold leading-none">{p.balance.toLocaleString()}</span>
            {p.today > 0 && <span className="text-[13px] font-bold text-(--light-text)">+{p.today} today</span>}
          </span>
        </div>
        <button
          onClick={() => setOpen(open === "how" ? "none" : "how")}
          aria-expanded={open === "how"}
          className="min-h-9 shrink-0 text-[13px] font-bold text-(--light-text)"
        >
          How it works
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          className="h-2.5 overflow-hidden rounded-full bg-(--raised)"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={p.per_gb}
          aria-valuenow={Math.min(p.balance, p.per_gb)}
          aria-label="Points toward 1GB"
        >
          <span className="block h-full rounded-full bg-(--light) transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </span>
        <span className="text-[13px] text-(--soft)">
          {left > 0 ? `${left} more points for 1GB of data` : claimedThisMonth ? "You've got enough for your next 1GB" : "You've got enough for 1GB of data!"}
        </span>
      </div>

      {open === "how" && (
        <ul className="ld-card-in flex flex-col gap-1.5 rounded-2xl bg-(--raised) p-3.5 text-[13px] text-(--soft)">
          <li><strong className="text-(--text)">+{p.pts.confirmed}</strong> for a report a neighbour agrees with</li>
          <li><strong className="text-(--text)">+{p.pts.first}</strong> for being first to report light coming or going</li>
          <li><strong className="text-(--text)">+{p.pts.streak}</strong> for reporting on 5 days in a week</li>
          <li><strong className="text-(--text)">+{p.pts.referral}</strong> when a friend you invite starts reporting</li>
          <li className="pt-1 text-(--muted)">
            Reports nobody confirms earn nothing. Up to {p.daily_cap} points a day from reports. Points last 90 days.
            {` ${p.per_gb} points = 1GB, sent to your Damacsub account.`}
          </li>
        </ul>
      )}

      {status && (
        <p
          className={`rounded-2xl px-3.5 py-3 text-[14px] ${
            status.tone === "ok" ? "bg-[#30A46C]/12 text-[#30A46C]" : status.tone === "bad" ? "bg-[#E5484D]/12 text-[#E5484D]" : "bg-(--raised)"
          }`}
          role="status"
        >
          {status.text}
        </p>
      )}

      {p.balance >= p.per_gb && !claimedThisMonth && p.claims_left === 0 && (
        <p className="rounded-2xl bg-(--raised) px-3.5 py-3 text-[14px]">This month&apos;s data is finished. More on the 1st.</p>
      )}

      {canClaim && open !== "claim" && (
        <button
          onClick={() => {
            buzz(8);
            setOpen("claim");
          }}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-(--light) text-[15px] font-extrabold text-(--ink)"
        >
          Turn {p.per_gb} points into 1GB
        </button>
      )}

      {canClaim && open === "claim" && (
        <form
          className="ld-card-in flex flex-col gap-2.5 rounded-2xl bg-(--raised) p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            claim();
          }}
        >
          <label htmlFor="claim-contact" className="text-[14px] font-bold">
            Phone number or email on your Damacsub account
          </label>
          <input
            id="claim-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            inputMode="email"
            autoComplete="tel"
            placeholder="0803 123 4567"
            className="min-h-12 rounded-xl border border-(--line) bg-(--card) px-3.5 text-[16px] outline-none focus:border-(--light)"
          />
          <span className="text-[12px] text-(--muted)">
            No Damacsub account?{" "}
            <a href={p.signup_url} target="_blank" rel="noopener noreferrer" className="font-bold text-(--light-text) underline underline-offset-2">
              Sign up free
            </a>
            , then come back. We only keep this until your data is sent.
          </span>
          {error && <span className="text-[13px] text-[#E5484D]" role="alert">{error}</span>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen("none")}
              className="min-h-12 flex-1 rounded-xl border border-(--line) bg-(--card) text-[14px] font-bold"
            >
              Not now
            </button>
            <button
              type="submit"
              disabled={busy || contact.trim().length < 5}
              className="min-h-12 flex-[2] rounded-xl bg-(--light) text-[15px] font-extrabold text-(--ink) disabled:opacity-50"
            >
              {busy ? "Sending..." : "Claim 1GB"}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-(--divider) pt-3">
        <span className="flex flex-col">
          <span className="text-[14px] font-bold">Invite neighbours</span>
          <span className="text-[12px] text-(--muted)">
            {p.invited > 0
              ? `${p.invited} joined · ${p.invited_ok} started reporting (+${p.pts.referral} each)`
              : `+${p.pts.referral} points for each one who starts reporting`}
          </span>
        </span>
        <button onClick={invite} className="min-h-10 shrink-0 rounded-full border border-(--line) bg-(--raised) px-4 text-[13px] font-bold">
          {copied ? "Link copied" : "Invite"}
        </button>
      </div>
    </section>
  );
}