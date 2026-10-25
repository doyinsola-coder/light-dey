"use client";

import { useEffect, useState, type ReactNode } from "react";
import { timeAgo } from "@/lib/helpers";
import { Card, Empty, Segments, Skeleton, useAdmin, phone, field, btn, btnSoft, ICheck, ICopy, IClose, IChevron } from "./ui";

type Settings = {
  enabled: boolean;
  pts_confirmed: number;
  pts_first: number;
  pts_streak: number;
  pts_referral: number;
  daily_cap: number;
  points_per_gb: number;
  monthly_claims: number;
  expire_days: number;
  referral_cap: number;
  signup_url: string;
  gb_price: number;
  contest_start: string | null;
  contest_end: string | null;
  contest_prizes: string | null;
};
type Claim = {
  id: number;
  device_id: string;
  contact: string | null;
  status: "pending" | "paid" | "rejected";
  pts: number;
  created_at: string;
  done_at: string | null;
  note: string | null;
};
type Data = {
  settings: Settings;
  points_month: number;
  earners_month: number;
  claims_month: number;
  paid_month: number;
  referrals_month: number;
  claims: Claim[];
  top: { device_id: string; pts: number }[];
};

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;
// ISO → value for <input type="date">, in Nigeria time
const toDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }) : "");
// Roughly what an active reporter earns in a week: about 3 confirmed reports and one "first" a day, plus the streak
const weeklyFor = (s: Pick<Settings, "pts_confirmed" | "pts_first" | "pts_streak" | "daily_cap">) =>
  Math.min(s.daily_cap, 2 * s.pts_confirmed + s.pts_first) * 7 + s.pts_streak;

type Part = "pay" | "contest" | "settings";

export function Rewards() {
  const { call, busy, confirm } = useAdmin();
  const [d, setD] = useState<Data | null>(null);
  const [tick, setTick] = useState(0);
  const [part, setPart] = useState<Part>("pay");
  const reload = () => setTick((n) => n + 1);

  useEffect(() => {
    call<Data>("admin_rewards").then((x) => x && setD(x));
  }, [call, tick]);

  if (!d) return <Skeleton rows={5} />;
  const s = d.settings;
  const pending = d.claims.filter((c) => c.status === "pending");

  async function toggle() {
    const ok = await confirm(
      s.enabled
        ? { title: "Pause rewards?", body: "Nobody earns new points and nobody can claim while it's paused. Points people already have stay.", action: "Pause", danger: true }
        : {
            title: "Turn rewards on?",
            body: `Everyone sees their points from now. You'll pay ${naira(s.gb_price)} per claim, at most ${s.monthly_claims} a month (${naira(s.gb_price * s.monthly_claims)}).`,
            action: "Turn on",
          }
    );
    if (ok && (await call("admin_reward_settings", { p_patch: { enabled: !s.enabled } }, s.enabled ? "Rewards paused." : "Rewards are on."))) reload();
  }

  return (
    <>
      {s.enabled ? (
        <div className="flex min-h-14 items-center justify-between gap-3 rounded-[20px] border border-(--light) bg-(--light)/12 px-4">
          <span className="flex items-center gap-2 text-[15px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-(--light)" aria-hidden="true" />
            Rewards are on
          </span>
          <button onClick={toggle} disabled={busy} className={btnSoft}>
            Pause
          </button>
        </div>
      ) : (
        <Card title="Rewards are off" sub="Nobody sees points yet. Here's what happens when you turn them on:">
          <HowItWorks s={s} />
          <button onClick={toggle} disabled={busy} className={btn}>
            Turn on rewards
          </button>
        </Card>
      )}

      <Segments
        value={part}
        onChange={setPart}
        items={[
          { id: "pay", label: "To pay", badge: pending.length },
          { id: "contest", label: "Contest" },
          { id: "settings", label: "Settings" },
        ]}
      />

      {part === "pay" && <Pay d={d} pending={pending} reload={reload} />}
      {part === "contest" && <Contest s={s} reload={reload} />}
      {part === "settings" && <SettingsForm s={s} reload={reload} />}
    </>
  );
}

// The 4 steps, in plain words, with this month's money
function HowItWorks({ s }: { s: Settings }) {
  const weeks = Math.max(1, Math.round(s.points_per_gb / Math.max(1, weeklyFor(s))));
  const steps = [
    `People earn points when a neighbour confirms their report (${s.pts_confirmed} points each).`,
    `At ${s.points_per_gb} points they claim 1GB with their Damacsub number. A regular reporter gets there in about ${weeks} weeks.`,
    "You send the numbers to Damac, then buy 1GB for each real account and tap Data sent.",
    `Each claim costs you ${naira(s.gb_price)}. At most ${s.monthly_claims} a month, so never more than ${naira(s.gb_price * s.monthly_claims)}.`,
  ];
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((t, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-snug">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--light) text-[12px] font-extrabold text-(--ink)">{i + 1}</span>
          <span className="pt-0.5">{t}</span>
        </li>
      ))}
    </ol>
  );
}

// ─── To pay ──────────────────────────────────────────────────────────────
function Pay({ d, pending, reload }: { d: Data; pending: Claim[]; reload: () => void }) {
  const { call, busy, toast, openPhone } = useAdmin();
  const s = d.settings;
  const [rejecting, setRejecting] = useState<{ id: number; note: string } | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const done = d.claims.filter((c) => c.status !== "pending");
  const budget = s.gb_price * s.monthly_claims;
  const spent = s.gb_price * d.paid_month;

  async function mark(id: number, status: "paid" | "rejected", note?: string) {
    if (await call("admin_reward_claim", { p_id: id, p_status: status, p_note: note ?? null }, status === "paid" ? "Marked as sent." : "Turned down. Their points are back.")) {
      setRejecting(null);
      reload();
    }
  }

  async function copyList() {
    const text = pending.map((c, i) => `${i + 1}. ${c.contact}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${pending.length} for Damac.`);
    } catch {
      toast("Couldn't copy. Long-press the numbers instead.", false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 rounded-[20px] border border-(--line) bg-(--card) p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-bold text-(--muted)">This month</span>
          <span className="text-[13px] text-(--muted)">
            {d.claims_month} of {s.monthly_claims} claims used
          </span>
        </div>
        <span className="font-display text-[26px] font-extrabold leading-none">
          {naira(spent)} <span className="text-[15px] font-bold text-(--muted)">of {naira(budget)}</span>
        </span>
        <span className="h-2 overflow-hidden rounded-full bg-(--raised)">
          <span className="block h-full rounded-full bg-(--light)" style={{ width: `${budget ? Math.min(100, (spent / budget) * 100) : 0}%` }} />
        </span>
        <span className="text-[12px] text-(--muted)">
          {d.earners_month} {d.earners_month === 1 ? "person" : "people"} earned points this month
          {d.referrals_month > 0 ? ` · ${d.referrals_month} ${d.referrals_month === 1 ? "invite" : "invites"} counted` : ""}
        </span>
      </div>

      {pending.length === 0 ? (
        <Card>
          <Empty icon={<ICheck size={22} />} text={`Nothing to pay. Claims show up here when someone reaches ${s.points_per_gb} points.`} />
        </Card>
      ) : (
        <>
          <Card
            title={`Step 1 · Send these to Damac`}
            sub="He checks which ones have a Damacsub account."
            right={
              <button onClick={copyList} className={btnSoft}>
                <ICopy size={16} /> Copy
              </button>
            }
          >
            <ol className="flex flex-col gap-1 rounded-2xl bg-(--raised) px-3.5 py-2.5 text-[15px] font-bold">
              {pending.map((c, i) => (
                <li key={c.id} className="select-all">
                  <span className="mr-2 text-(--muted)">{i + 1}.</span>
                  {c.contact}
                </li>
              ))}
            </ol>
          </Card>

          <Card
            title={`Step 2 · Pay each one`}
            sub={`Buy 1GB on Damacsub (${naira(s.gb_price)}), send it to the number, then tap Data sent. ${pending.length} to pay: ${naira(s.gb_price * pending.length)}.`}
          >
            <ul className="flex flex-col">
              {pending.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 border-b border-(--divider) py-3 first:pt-0 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="select-all truncate text-[16px] font-extrabold">{c.contact}</span>
                    <span className="shrink-0 text-[12px] text-(--muted)">{timeAgo(c.created_at)}</span>
                  </div>
                  {rejecting?.id === c.id ? (
                    <div className="flex flex-col gap-2">
                      <input className={field} value={rejecting.note} onChange={(e) => setRejecting({ id: c.id, note: e.target.value })} aria-label="Reason" />
                      <span className="text-[12px] text-(--muted)">They see this reason and get their points back.</span>
                      <div className="flex gap-2">
                        <button onClick={() => setRejecting(null)} className={`${btnSoft} flex-1`}>
                          Back
                        </button>
                        <button onClick={() => mark(c.id, "rejected", rejecting.note)} disabled={busy} className={`${btnSoft} flex-1 border-[#E5484D]/40 text-[#E5484D]`}>
                          Turn down
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRejecting({ id: c.id, note: "No Damacsub account with this number" })}
                        className={`${btnSoft} flex-1 whitespace-nowrap`}
                      >
                        <IClose size={16} /> No account
                      </button>
                      <button onClick={() => mark(c.id, "paid")} disabled={busy} className={`${btn} min-h-10 flex-1 text-[14px]`}>
                        <ICheck size={16} /> Data sent
                      </button>
                    </div>
                  )}
                  <button onClick={() => openPhone(c.device_id)} className="self-start text-[12px] text-(--muted) underline underline-offset-2">
                    Check {phone(c.device_id)}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {done.length > 0 && (
        <Fold open={showDone} onToggle={() => setShowDone(!showDone)} title={`Already handled (${done.length})`}>
          <ul className="flex flex-col">
            {done.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 border-b border-(--divider) py-2.5 text-[14px] last:border-0">
                <button onClick={() => openPhone(c.device_id)} className="flex flex-col text-left">
                  <span className="font-bold">{phone(c.device_id)}</span>
                  <span className="text-[12px] text-(--muted)">
                    {timeAgo(c.done_at ?? c.created_at)}
                    {c.note ? ` · ${c.note}` : ""}
                  </span>
                </button>
                <span className={`shrink-0 text-[13px] font-bold ${c.status === "paid" ? "text-[#30A46C]" : "text-[#E5484D]"}`}>
                  {c.status === "paid" ? "Sent" : "Turned down"}
                </span>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      {d.top.length > 0 && (
        <Fold open={showTop} onToggle={() => setShowTop(!showTop)} title="Who's earning most this month">
          <p className="text-[12px] text-(--muted)">Tap a phone to see its reports. Block it there if it looks fake.</p>
          <ul className="flex flex-col">
            {d.top.map((t, i) => (
              <li key={t.device_id}>
                <button onClick={() => openPhone(t.device_id)} className="flex min-h-11 w-full items-center gap-3 border-b border-(--divider) text-left last:border-0">
                  <span className="w-5 text-[13px] font-bold text-(--muted)">{i + 1}</span>
                  <span className="flex-1 text-[15px] font-bold">{phone(t.device_id)}</span>
                  <span className="text-[14px] text-(--soft)">{t.pts} pts</span>
                </button>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      {s.enabled && (
        <Card title="How it works">
          <HowItWorks s={s} />
        </Card>
      )}
    </>
  );
}

function Fold({ open, onToggle, title, children }: { open: boolean; onToggle: () => void; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-(--line) bg-(--card) px-4">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-14 items-center justify-between gap-3 text-left text-[15px] font-bold">
        {title}
        <IChevron size={18} className={`text-(--muted) transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="flex flex-col gap-2 pb-3">{children}</div>}
    </div>
  );
}

// ─── Contest ─────────────────────────────────────────────────────────────
function Contest({ s, reload }: { s: Settings; reload: () => void }) {
  const { call, busy, toast } = useAdmin();
  const [start, setStart] = useState(toDate(s.contest_start));
  const [end, setEnd] = useState(toDate(s.contest_end));
  const [prizes, setPrizes] = useState(s.contest_prizes ?? "");
  const [now] = useState(() => Date.now());
  const running = s.contest_start && s.contest_end && new Date(s.contest_start).getTime() <= now && now <= new Date(s.contest_end).getTime();
  const upcoming = s.contest_start && new Date(s.contest_start).getTime() > now;
  const daysLeft = s.contest_end ? Math.ceil((new Date(s.contest_end).getTime() - now) / 86_400_000) : 0;

  async function save(clear = false) {
    if (!clear && (!start || !end || end < start)) {
      toast("Pick a start date and an end date after it.", false);
      return;
    }
    const patch = clear
      ? { contest_start: "", contest_end: "", contest_prizes: "" }
      : { contest_start: `${start}T00:00:00+01:00`, contest_end: `${end}T23:59:59+01:00`, contest_prizes: prizes.trim() };
    if (await call("admin_reward_settings", { p_patch: patch }, clear ? "Contest removed." : "Contest saved.")) reload();
  }

  return (
    <Card
      title="Invite contest"
      sub="The people whose invites start reporting the most win. Everyone sees a countdown and the top 5 on their home screen."
    >
      <p className="rounded-2xl bg-(--raised) px-3.5 py-3 text-[14px] font-bold">
        {running ? `Running · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : upcoming ? "Set to start soon" : "No contest right now"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-bold">
          Starts
          <input type="date" className={field} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-bold">
          Ends
          <input type="date" className={field} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[13px] font-bold">
        Prizes
        <input className={field} placeholder="1st 10GB · 2nd 5GB · 3rd 2GB" value={prizes} onChange={(e) => setPrizes(e.target.value)} />
      </label>
      <p className="text-[12px] text-(--muted)">
        At {naira(s.gb_price)} a GB, 10GB + 5GB + 2GB is about {naira(17 * s.gb_price)}. Winners aren&apos;t paid automatically: post the winners, then send their data.
      </p>
      <div className="flex gap-2">
        {s.contest_start && (
          <button onClick={() => save(true)} disabled={busy} className={`${btnSoft} flex-1`}>
            Remove
          </button>
        )}
        <button onClick={() => save()} disabled={busy} className={`${btn} flex-[2]`}>
          Save contest
        </button>
      </div>
    </Card>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────
type NumKey = Exclude<keyof Settings, "enabled" | "signup_url" | "contest_start" | "contest_end" | "contest_prizes">;
const GROUPS: { title: string; rows: { k: NumKey; label: string; unit: string }[] }[] = [
  {
    title: "What people earn",
    rows: [
      { k: "pts_confirmed", label: "A neighbour confirms their report", unit: "pts" },
      { k: "pts_first", label: "First to report light coming or going", unit: "pts" },
      { k: "pts_streak", label: "Reported on 5 days in a week", unit: "pts" },
      { k: "pts_referral", label: "Someone they invited starts reporting", unit: "pts" },
    ],
  },
  {
    title: "Data and your budget",
    rows: [
      { k: "points_per_gb", label: "Points needed for 1GB", unit: "pts" },
      { k: "gb_price", label: "What 1GB costs you on Damacsub", unit: "₦" },
      { k: "monthly_claims", label: "Most claims you'll pay a month", unit: "claims" },
    ],
  },
  {
    title: "Limits",
    rows: [
      { k: "daily_cap", label: "Most points a day from reports", unit: "pts" },
      { k: "expire_days", label: "Points disappear after", unit: "days" },
      { k: "referral_cap", label: "Most invites that count a month", unit: "per person" },
    ],
  },
];

function SettingsForm({ s, reload }: { s: Settings; reload: () => void }) {
  const { call, busy, toast } = useAdmin();
  const [form, setForm] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(GROUPS.flatMap((g) => g.rows).map(({ k }) => [k, String(s[k])])),
    signup_url: s.signup_url,
  }));
  const num = (k: NumKey) => Number(form[k]) || 0;
  const weekly = weeklyFor({ pts_confirmed: num("pts_confirmed"), pts_first: num("pts_first"), pts_streak: num("pts_streak"), daily_cap: num("daily_cap") });
  const weeks = Math.max(1, Math.round(num("points_per_gb") / Math.max(1, weekly)));

  async function save() {
    const patch: Record<string, unknown> = { signup_url: form.signup_url.trim() };
    for (const { k, label } of GROUPS.flatMap((g) => g.rows)) {
      const n = Number(form[k]);
      if (form[k] === "" || !Number.isInteger(n) || n < 0) {
        toast(`"${label}": use a whole number.`, false);
        return;
      }
      patch[k] = n;
    }
    if (await call("admin_reward_settings", { p_patch: patch }, "Saved.")) reload();
  }

  return (
    <>
      <div className="rounded-[20px] border border-(--light) bg-(--light)/10 px-4 py-3.5 text-[14px] leading-snug">
        With these numbers, a regular reporter earns about <strong>{weekly} points a week</strong>, so 1GB every{" "}
        <strong>{weeks} {weeks === 1 ? "week" : "weeks"}</strong>. The most you&apos;ll pay in a month is{" "}
        <strong>{naira(num("gb_price") * num("monthly_claims"))}</strong>.
      </div>

      {GROUPS.map((g) => (
        <Card key={g.title} title={g.title}>
          <ul className="flex flex-col">
            {g.rows.map(({ k, label, unit }) => (
              <li key={k} className="flex min-h-14 items-center justify-between gap-3 border-b border-(--divider) last:border-0">
                <label htmlFor={`rw-${k}`} className="text-[14px] leading-snug">
                  {label}
                </label>
                <span className="flex shrink-0 items-center gap-1.5">
                  {unit === "₦" && <span className="text-[14px] font-bold text-(--muted)">₦</span>}
                  <input
                    id={`rw-${k}`}
                    inputMode="numeric"
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value.replace(/[^0-9]/g, "") })}
                    className="h-11 w-20 rounded-xl border border-(--line) bg-(--raised) px-2 text-center text-[16px] font-bold outline-none focus:border-(--light)"
                  />
                  {unit !== "₦" && <span className="w-14 text-[12px] text-(--muted)">{unit}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card title="Damacsub sign-up link" sub="Shown to people who don't have an account when they claim.">
        <input className={field} value={form.signup_url} onChange={(e) => setForm({ ...form, signup_url: e.target.value })} />
      </Card>

      <button onClick={save} disabled={busy} className={btn}>
        Save settings
      </button>
    </>
  );
}