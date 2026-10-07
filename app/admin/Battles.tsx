"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCities } from "@/lib/cities";
import { Card, Empty, Segments, Skeleton, useAdmin, field, btn, btnSoft, btnDanger, ISwords, IMegaphone, IDownload, IChevron, IFlag } from "./ui";

type Battle = {
  id: number;
  city_a: string;
  city_b: string;
  starts_at: string;
  ends_at: string;
  status: "live" | "upcoming" | "finished" | "cancelled";
  announced: boolean;
  fair_a: number; fair_b: number;
  raw_a: number; raw_b: number;
  reports_a: number; reports_b: number;
  left_out_a: number; left_out_b: number;
};

const LENGTHS = [
  { d: 3, label: "3 days" },
  { d: 7, label: "1 week" },
  { d: 14, label: "2 weeks" },
];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function left(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const h = Math.floor(ms / 3600000);
  return h >= 48 ? `${Math.floor(h / 24)} days left` : h >= 1 ? `${h}h left` : "under an hour left";
}

export function Battles() {
  const { call, busy, confirm, toast } = useAdmin();
  const cities = useCities();
  const [active, setActive] = useState<string[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [startDay, setStartDay] = useState<"0" | "1">("1");
  const [days, setDays] = useState(7);
  const [list, setList] = useState<Battle[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    supabase.rpc("battle_cities").then(({ data }) => setActive(((data as { city: string }[] | null) ?? []).map((r) => r.city)));
  }, []);
  useEffect(() => {
    call<Battle[]>("admin_battles").then((d) => d && setList(d.map((x) => ({ ...x, ...num(x) }))));
  }, [call, tick]);

  const options = useMemo(() => {
    const rest = cities.map((c) => c.city).filter((c) => !active.includes(c)).sort((x, y) => x.localeCompare(y));
    return { busy: active, rest };
  }, [cities, active]);

  const pick = (value: string, onChange: (v: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={field} aria-label={label}>
      <option value="" disabled>{label}</option>
      {options.busy.length > 0 && (
        <optgroup label="Reporting this week">
          {options.busy.map((c) => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      )}
      <optgroup label="All towns">
        {options.rest.map((c) => <option key={c} value={c}>{c}</option>)}
      </optgroup>
    </select>
  );

  async function create() {
    const ok = await confirm({
      title: `Start ${a} vs ${b}?`,
      body: `${startDay === "1" ? "Starts next Monday" : "Starts now"} and runs for ${LENGTHS.find((l) => l.d === days)?.label}. Everyone in both towns sees the live score on their home screen.`,
      action: "Start battle",
    });
    if (!ok) return;
    const id = await call("admin_battle_create", { p_a: a, p_b: b, p_start_day: Number(startDay), p_days: days }, "Battle set.");
    if (id) {
      setA("");
      setB("");
      setTick((n) => n + 1);
    }
  }

  const running = list?.filter((x) => x.status === "live" || x.status === "upcoming") ?? [];
  const past = list?.filter((x) => x.status === "finished") ?? [];

  return (
    <>
      <Card title="New battle" sub="One battle at a time per town. The town with more people reporting wins. Unfair phones are left out of the score.">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {pick(a, setA, "Town")}
          <span className="text-[13px] font-extrabold text-(--light-text)">VS</span>
          {pick(b, setB, "Town")}
        </div>
        <Segments value={startDay} onChange={setStartDay} items={[{ id: "1", label: "Next Monday" }, { id: "0", label: "Start now" }]} />
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map((l) => (
            <button
              key={l.d}
              onClick={() => setDays(l.d)}
              aria-pressed={days === l.d}
              className={`min-h-10 rounded-full border px-3.5 text-[14px] font-bold ${days === l.d ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised)"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button disabled={busy || !a || !b || a === b} onClick={create} className={btn}>
          <ISwords size={18} /> {a && b && a === b ? "Pick two different towns" : "Start battle"}
        </button>
      </Card>

      {list === null ? (
        <Skeleton rows={3} />
      ) : (
        <>
          <h2 className="mt-2 text-[13px] font-bold uppercase tracking-[1.2px] text-(--muted)">Live and upcoming</h2>
          {running.length === 0 ? (
            <Card><Empty icon={<ISwords size={28} />} text="No battle running. Start one above." /></Card>
          ) : (
            running.map((x) => (
              <BattleCard
                key={x.id}
                x={x}
                actions={
                  <div className="flex flex-wrap gap-2">
                    <a href={`/api/battle-card?id=${x.id}`} target="_blank" rel="noopener noreferrer" className={btnSoft}>
                      <IDownload size={16} /> Score card
                    </a>
                    {x.status === "live" && (
                      <button
                        disabled={busy}
                        className={btnSoft}
                        onClick={async () => {
                          if (await confirm({ title: "End this battle now?", body: "The score freezes at what it is now. You can then post the winner.", action: "End now" }))
                            if (await call("admin_battle_end", { p_id: x.id }, "Battle ended.")) setTick((n) => n + 1);
                        }}
                      >
                        End now
                      </button>
                    )}
                    <button
                      disabled={busy}
                      className={btnDanger}
                      onClick={async () => {
                        if (await confirm({ title: "Cancel this battle?", body: "It disappears from everyone's home screen and won't count.", action: "Cancel battle", danger: true }))
                          if (await call("admin_battle_cancel", { p_id: x.id }, "Battle cancelled.")) setTick((n) => n + 1);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                }
              />
            ))
          )}

          <h2 className="mt-2 text-[13px] font-bold uppercase tracking-[1.2px] text-(--muted)">Finished</h2>
          {past.length === 0 ? (
            <Card><Empty icon={<ISwords size={28} />} text="No finished battles yet." /></Card>
          ) : (
            past.map((x) => (
              <BattleCard
                key={x.id}
                x={x}
                actions={
                  <div className="flex flex-wrap gap-2">
                    <a href={`/api/battle-card?id=${x.id}`} target="_blank" rel="noopener noreferrer" className={btnSoft}>
                      <IDownload size={16} /> Winner card
                    </a>
                    {x.announced ? (
                      <span className="flex min-h-10 items-center px-2 text-[13px] font-bold text-(--muted)">Winner posted</span>
                    ) : (
                      <button
                        disabled={busy}
                        className={`${btn} min-h-10 px-3 text-[14px]`}
                        onClick={async () => {
                          if (!(await confirm({ title: "Post the winner?", body: `A notice goes to everyone in ${x.city_a} and ${x.city_b} for 2 days.`, action: "Post winner" }))) return;
                          const msg = await call<string>("admin_battle_announce", { p_id: x.id });
                          if (msg) {
                            toast("Winner posted in both towns.");
                            setTick((n) => n + 1);
                          }
                        }}
                      >
                        <IMegaphone size={16} /> Post winner
                      </button>
                    )}
                  </div>
                }
              />
            ))
          )}
        </>
      )}
    </>
  );
}

function num(x: Battle) {
  const n = (v: unknown) => Number(v ?? 0);
  return {
    fair_a: n(x.fair_a), fair_b: n(x.fair_b), raw_a: n(x.raw_a), raw_b: n(x.raw_b),
    reports_a: n(x.reports_a), reports_b: n(x.reports_b), left_out_a: n(x.left_out_a), left_out_b: n(x.left_out_b),
  };
}

function BattleCard({ x, actions }: { x: Battle; actions: React.ReactNode }) {
  const [check, setCheck] = useState(false);
  const lead = x.fair_a === x.fair_b ? null : x.fair_a > x.fair_b ? x.city_a : x.city_b;
  const total = Math.max(1, x.fair_a + x.fair_b);
  const pctA = Math.round((x.fair_a / total) * 100);
  const leftOut = x.left_out_a + x.left_out_b;
  const statusChip =
    x.status === "live" ? (
      <span className="flex items-center gap-1 rounded-full bg-[#30A46C]/15 px-2 py-0.5 text-[12px] font-bold text-[#30A46C]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#30A46C]" /> Live · {left(x.ends_at)}
      </span>
    ) : x.status === "upcoming" ? (
      <span className="rounded-full bg-(--raised) px-2 py-0.5 text-[12px] font-bold text-(--muted)">Starts {when(x.starts_at)}</span>
    ) : (
      <span className="rounded-full bg-(--raised) px-2 py-0.5 text-[12px] font-bold text-(--muted)">Ended {when(x.ends_at)}</span>
    );

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        {statusChip}
        {x.status === "finished" && <span className="text-[13px] font-bold text-(--light-text)">{lead ? `${lead} won` : "Draw"}</span>}
        {x.status === "live" && lead && <span className="text-[13px] font-bold text-(--light-text)">{lead} leads</span>}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="flex flex-col">
          <span className="text-[15px] font-bold">{x.city_a}</span>
          <span className={`font-display text-[40px] font-extrabold leading-none ${lead === x.city_a ? "text-(--light-text)" : ""}`}>{x.fair_a}</span>
        </div>
        <span className="pb-1 text-[13px] font-extrabold text-(--muted)">VS</span>
        <div className="flex flex-col items-end">
          <span className="text-[15px] font-bold">{x.city_b}</span>
          <span className={`font-display text-[40px] font-extrabold leading-none ${lead === x.city_b ? "text-(--light-text)" : ""}`}>{x.fair_b}</span>
        </div>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-(--raised)">
        <span className="h-full bg-(--light)" style={{ width: `${x.fair_a + x.fair_b === 0 ? 50 : pctA}%` }} />
        <span className="h-full flex-1 bg-(--line-strong)" />
      </div>
      <span className="text-[12px] text-(--muted)">People reporting (fair score) · {x.reports_a} vs {x.reports_b} reports</span>

      <button onClick={() => setCheck(!check)} className="flex items-center gap-1.5 self-start text-[13px] font-bold text-(--light-text)">
        <IFlag size={15} /> Score check{leftOut ? ` · ${leftOut} phone${leftOut === 1 ? "" : "s"} left out` : ""}
        <IChevron size={14} className={`transition-transform ${check ? "rotate-90" : ""}`} />
      </button>
      {check && (
        <div className="ld-card-in flex flex-col gap-2 rounded-2xl bg-(--raised) p-3.5 text-[13px]">
          <div className="grid grid-cols-3 gap-2 font-bold text-(--muted)">
            <span />
            <span>{x.city_a}</span>
            <span>{x.city_b}</span>
          </div>
          {[
            ["All phones", x.raw_a, x.raw_b],
            ["Left out", x.left_out_a, x.left_out_b],
            ["Fair score", x.fair_a, x.fair_b],
          ].map(([label, va, vb]) => (
            <div key={label as string} className="grid grid-cols-3 gap-2">
              <span className="text-(--muted)">{label}</span>
              <span className="font-bold">{va}</span>
              <span className="font-bold">{vb}</span>
            </div>
          ))}
          <p className="leading-snug text-(--muted)">
            Left out: blocked phones, phones that reported in both towns, and phones with more than 30 reports in one day.
          </p>
        </div>
      )}

      {actions}
    </Card>
  );
}