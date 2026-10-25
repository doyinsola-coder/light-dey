"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import { Card, Empty, Segments, Skeleton, useAdmin, phone, field, btn, btnSoft, btnDanger, ICheck, ICopy, IClose } from "./ui";

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

const NUMBERS: { k: keyof Settings; label: string }[] = [
  { k: "pts_confirmed", label: "Confirmed report" },
  { k: "pts_first", label: "First to report a change" },
  { k: "pts_streak", label: "5 days in a week" },
  { k: "pts_referral", label: "Invite that starts reporting" },
  { k: "daily_cap", label: "Most points a day (reports)" },
  { k: "points_per_gb", label: "Points for 1GB" },
  { k: "monthly_claims", label: "Claims a month (budget)" },
  { k: "expire_days", label: "Points last (days)" },
  { k: "referral_cap", label: "Invites that count a month" },
];

// ISO → value for <input type="date">, in Nigeria time
const toDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }) : "");

export function Rewards() {
  const { call, busy, confirm, openPhone, toast } = useAdmin();
  const [d, setD] = useState<Data | null>(null);
  const [tick, setTick] = useState(0);
  const [part, setPart] = useState<"pending" | "done">("pending");
  const [rejecting, setRejecting] = useState<{ id: number; note: string } | null>(null);
  const [form, setForm] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    call<Data>("admin_rewards").then((x) => {
      if (!x) return;
      setD(x);
      const s = x.settings;
      setForm({
        ...Object.fromEntries(NUMBERS.map(({ k }) => [k, String(s[k])])),
        signup_url: s.signup_url,
        contest_start: toDate(s.contest_start),
        contest_end: toDate(s.contest_end),
        contest_prizes: s.contest_prizes ?? "",
      });
    });
  }, [call, tick]);

  if (!d || !form) return <Skeleton rows={5} />;
  const s = d.settings;
  const pending = d.claims.filter((c) => c.status === "pending");
  const done = d.claims.filter((c) => c.status !== "pending");
  const reload = () => setTick((n) => n + 1);

  async function toggle() {
    const ok = await confirm(
      s.enabled
        ? { title: "Pause rewards?", body: "No new points are given while paused, and people can't claim data. Points already earned stay.", action: "Pause", danger: true }
        : {
            title: "Turn rewards on?",
            body: `Everyone sees their points from now on. Up to ${s.monthly_claims} claims of 1GB a month at ${s.points_per_gb} points each.`,
            action: "Turn on",
          }
    );
    if (ok && (await call("admin_reward_settings", { p_patch: { enabled: !s.enabled } }, s.enabled ? "Rewards paused." : "Rewards are on."))) reload();
  }

  async function mark(id: number, status: "paid" | "rejected", note?: string) {
    if (await call("admin_reward_claim", { p_id: id, p_status: status, p_note: note ?? null }, status === "paid" ? "Marked paid." : "Claim turned down. Points returned.")) {
      setRejecting(null);
      reload();
    }
  }

  async function copyList() {
    const text = pending.map((c) => c.contact).filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${pending.length} for Damac.`);
    } catch {
      toast("Couldn't copy. Long-press the numbers instead.", false);
    }
  }

  async function saveSettings() {
    if (!form) return;
    const patch: Record<string, unknown> = { signup_url: form.signup_url.trim() };
    for (const { k, label } of NUMBERS) {
      const n = Number(form[k]);
      if (!Number.isInteger(n) || n < 0) {
        toast(`${label}: use a whole number.`, false);
        return;
      }
      patch[k] = n;
    }
    if (await call("admin_reward_settings", { p_patch: patch }, "Saved.")) reload();
  }

  async function saveContest(clear = false) {
    if (!form) return;
    const start = clear ? "" : form.contest_start;
    const end = clear ? "" : form.contest_end;
    if (!clear && (!start || !end || end < start)) {
      toast("Pick a start date and an end date after it.", false);
      return;
    }
    const patch = {
      contest_start: start ? `${start}T00:00:00+01:00` : "",
      contest_end: end ? `${end}T23:59:59+01:00` : "",
      contest_prizes: clear ? "" : form.contest_prizes.trim(),
    };
    if (await call("admin_reward_settings", { p_patch: patch }, clear ? "Contest removed." : "Contest saved.")) reload();
  }

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <>
      <button
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={s.enabled}
        className={`flex min-h-20 items-center justify-between gap-3 rounded-[24px] border px-5 text-left ${
          s.enabled ? "border-(--light) bg-(--light)/12" : "border-(--line) bg-(--card)"
        }`}
      >
        <span className="flex flex-col">
          <span className="font-display text-[18px] font-extrabold">{s.enabled ? "Rewards are on" : "Rewards are off"}</span>
          <span className="text-[13px] text-(--muted)">
            {s.enabled ? "People earn points and can claim data" : "Nobody sees points yet. Tap to turn on"}
          </span>
        </span>
        <span className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${s.enabled ? "bg-(--light)" : "bg-(--divider)"}`} aria-hidden="true">
          <span className={`h-6 w-6 rounded-full transition-transform ${s.enabled ? "translate-x-6 bg-(--ink)" : "bg-(--muted)"}`} />
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2">
        <Tile n={`${d.claims_month}/${s.monthly_claims}`} label="claims this month" />
        <Tile n={String(d.paid_month)} label="paid this month" />
        <Tile n={d.points_month.toLocaleString()} label={`points given · ${d.earners_month} people`} />
        <Tile n={String(d.referrals_month)} label="invites that counted" />
      </div>

      <Card
        title="Claims"
        right={
          pending.length > 0 ? (
            <button onClick={copyList} className={btnSoft}>
              <ICopy size={16} /> Copy for Damac
            </button>
          ) : undefined
        }
      >
        <Segments
          value={part}
          onChange={setPart}
          items={[
            { id: "pending", label: "To pay", badge: pending.length },
            { id: "done", label: "Done" },
          ]}
        />
        {(part === "pending" ? pending : done).length === 0 ? (
          <Empty icon={<ICheck size={22} />} text={part === "pending" ? "No claims waiting." : "Nothing paid in the last 60 days."} />
        ) : (
          <ul className="flex flex-col">
            {(part === "pending" ? pending : done).map((c) => (
              <li key={c.id} className="flex flex-col gap-2 border-b border-(--divider) py-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="select-all truncate text-[16px] font-extrabold">{c.contact ?? (c.status === "paid" ? "Paid" : "Turned down")}</span>
                    <button onClick={() => openPhone(c.device_id)} className="self-start text-[12px] text-(--muted) underline underline-offset-2">
                      {phone(c.device_id)} · {c.pts} pts · {timeAgo(c.created_at)}
                    </button>
                    {c.note && <span className="text-[12px] text-(--soft)">Note: {c.note}</span>}
                  </span>
                  {c.status !== "pending" && (
                    <span className={`shrink-0 text-[12px] font-bold ${c.status === "paid" ? "text-[#30A46C]" : "text-[#E5484D]"}`}>
                      {c.status === "paid" ? "Paid" : "Turned down"}
                    </span>
                  )}
                </div>
                {c.status === "pending" &&
                  (rejecting?.id === c.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        className={field}
                        placeholder="Why? e.g. No Damacsub account with this number"
                        value={rejecting.note}
                        onChange={(e) => setRejecting({ id: c.id, note: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setRejecting(null)} className={`${btnSoft} flex-1`}>Cancel</button>
                        <button onClick={() => mark(c.id, "rejected", rejecting.note)} disabled={busy} className={`${btnDanger} flex-1`}>
                          Turn down
                        </button>
                      </div>
                      <span className="text-[12px] text-(--muted)">They see the reason and get their points back.</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setRejecting({ id: c.id, note: "" })} className={`${btnSoft} flex-1 whitespace-nowrap`}>
                        <IClose size={16} /> Turn down
                      </button>
                      <button onClick={() => mark(c.id, "paid")} disabled={busy} className={`${btn} min-h-10 flex-1 text-[14px]`}>
                        <ICheck size={16} /> Data sent
                      </button>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        )}
        <span className="text-[12px] text-(--muted)">
          Send Damac the list, then buy and send 1GB to each confirmed number. The number is wiped once you mark it.
        </span>
      </Card>

      {d.top.length > 0 && (
        <Card title="Top earners this month">
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
        </Card>
      )}

      <Card title="Invite contest" sub="Ranked by invites that start reporting between these dates. Shows on everyone's home screen.">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-bold">
            Starts
            <input type="date" className={field} value={form.contest_start} onChange={(e) => set("contest_start", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-bold">
            Ends
            <input type="date" className={field} value={form.contest_end} onChange={(e) => set("contest_end", e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-bold">
          Prizes
          <input className={field} placeholder="1st 10GB · 2nd 5GB · 3rd 2GB" value={form.contest_prizes} onChange={(e) => set("contest_prizes", e.target.value)} />
        </label>
        <div className="flex gap-2">
          {s.contest_start && (
            <button onClick={() => saveContest(true)} disabled={busy} className={`${btnSoft} flex-1`}>
              Remove
            </button>
          )}
          <button onClick={() => saveContest()} disabled={busy} className={`${btn} flex-[2]`}>
            Save contest
          </button>
        </div>
      </Card>

      <Card title="Points and limits" sub="Changes apply to new points straight away.">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {NUMBERS.map(({ k, label }) => (
            <label key={k} className="flex flex-col gap-1 text-[13px] font-bold">
              {label}
              <input inputMode="numeric" className={field} value={form[k]} onChange={(e) => set(k, e.target.value.replace(/[^0-9]/g, ""))} />
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-bold">
          Damacsub sign-up link
          <input className={field} value={form.signup_url} onChange={(e) => set("signup_url", e.target.value)} />
        </label>
        <button onClick={saveSettings} disabled={busy} className={btn}>
          Save
        </button>
      </Card>
    </>
  );
}

function Tile({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[18px] border border-(--line) bg-(--card) p-3.5">
      <span className="font-display text-[22px] font-extrabold">{n}</span>
      <span className="text-[12px] text-(--muted)">{label}</span>
    </div>
  );
}