"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import { useCities, loadCities, type City } from "@/lib/cities";
import {
  Card, Empty, Skeleton, useAdmin, stateLabel, phone, field, btn, btnSoft, btnDanger,
  ITown, IPhone, IQuestion, IDownload, ISwords, IChevron, IPlus, IBan, ICheck,
} from "./ui";

type PickPointProps = { towns: City[]; point: [number, number] | null; onPick: (lat: number, lng: number) => void };
const PickPoint = dynamic<PickPointProps>(() => import("./PickPoint"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-(--raised)" />,
});

export function More() {
  const { go } = useAdmin();
  const items = [
    { id: "battles" as const, Icon: ISwords, title: "City battles", sub: "Run the official battle of the week, check scores, post the winner" },
    { id: "towns" as const, Icon: ITown, title: "Towns", sub: "Add a town on the map, change a town's size" },
    { id: "phones" as const, Icon: IPhone, title: "Blocked phones", sub: "See and unblock phones, block by phone ID" },
    { id: "questions" as const, Icon: IQuestion, title: "Daily questions", sub: "Turn questions on or off, see how many answered" },
    { id: "download" as const, Icon: IDownload, title: "Download data", sub: "Spreadsheets for DisCos and partners" },
  ];
  return (
    <div className="flex flex-col overflow-hidden rounded-[24px] border border-(--line) bg-(--card)">
      {items.map(({ id, Icon, title, sub }) => (
        <button key={id} onClick={() => go(id)} className="flex min-h-16 items-center gap-3 border-b border-(--divider) px-4 py-3 text-left last:border-0 active:bg-(--raised)">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--light)/15 text-(--light-text)">
            <Icon size={20} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[16px] font-bold">{title}</span>
            <span className="text-[13px] leading-snug text-(--muted)">{sub}</span>
          </span>
          <IChevron size={18} className="text-(--muted)" />
        </button>
      ))}
    </div>
  );
}

// ─── Towns ───────────────────────────────────────────────────────────────
export function Towns() {
  const { call, busy } = useAdmin();
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((a, b) => a.localeCompare(b)), [cities]);
  const [state, setState] = useState("");
  const [name, setName] = useState("");
  const [point, setPoint] = useState<[number, number] | null>(null);
  const inState = useMemo(() => cities.filter((c) => c.state === state).sort((a, b) => a.city.localeCompare(b.city)), [cities, state]);

  const [sizeTown, setSizeTown] = useState("");
  const current = inState.find((c) => c.city === sizeTown);
  const [size, setSize] = useState("");

  async function add() {
    if (!point) return;
    if (await call("admin_add_city", { p_state: state, p_city: name, p_lat: point[0], p_lng: point[1] }, `Added ${name.trim()} to ${stateLabel(state)}.`)) {
      await loadCities(true);
      setName("");
      setPoint(null);
    }
  }

  return (
    <>
      <select value={state} onChange={(e) => { setState(e.target.value); setPoint(null); setSizeTown(""); }} className={field} aria-label="State">
        <option value="" disabled>Choose a state</option>
        {states.map((s) => <option key={s} value={s}>{stateLabel(s)}</option>)}
      </select>

      <Card title="Add a town" sub="Tap the map where the town is. Zoom in to be exact. Grey dots are towns already on the list.">
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Town name" className={field} />
        {state ? (
          <PickPoint towns={inState} point={point} onPick={(lat, lng) => setPoint([lat, lng])} />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-(--line-strong) text-[14px] text-(--muted)">
            Choose a state above to see the map
          </div>
        )}
        {point && (
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-(--light-text)">
            <ICheck size={16} /> Spot picked. Tap again to move it.
          </p>
        )}
        <button onClick={add} disabled={busy || !state || name.trim().length < 2 || !point} className={btn}>
          <IPlus size={18} /> {point ? "Add town" : "Tap the map first"}
        </button>
      </Card>

      <Card title="Town size" sub='How far from the centre still counts as the town. Make it bigger if people on the edge get "too far".'>
        <select value={sizeTown} onChange={(e) => { setSizeTown(e.target.value); setSize(""); }} disabled={!state} className={field}>
          <option value="" disabled>{state ? "Choose a town" : "Choose a state above first"}</option>
          {inState.map((c) => <option key={c.city} value={c.city}>{c.city} · {c.radiusKm} km</option>)}
        </select>
        {current && (
          <>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={80}
                step={5}
                value={size ? Number(size) : current.radiusKm}
                onChange={(e) => setSize(e.target.value)}
                className="flex-1 accent-[#FFC531]"
                aria-label="Town size in km"
              />
              <span className="w-16 text-right font-display text-[22px] font-extrabold">{size || current.radiusKm} km</span>
            </div>
            <button
              disabled={busy || !size || Number(size) === current.radiusKm}
              onClick={async () => {
                if (await call("admin_set_town_size", { p_city: current.city, p_radius: Number(size) }, `${current.city} is now ${size} km.`)) {
                  await loadCities(true);
                  setSize("");
                }
              }}
              className={btn}
            >
              Save size
            </button>
          </>
        )}
      </Card>
    </>
  );
}

// ─── Phones ──────────────────────────────────────────────────────────────
type Blocked = { device_id: string; reason: string | null; created_at: string };

export function Phones() {
  const { call, busy, confirm } = useAdmin();
  const [list, setList] = useState<Blocked[] | null>(null);
  const [id, setId] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    call<Blocked[]>("admin_blocked").then((d) => d && setList(d));
  }, [call, tick]);

  return (
    <>
      <Card title="Block by phone ID" sub="Most times you'll block from Live or Areas. Use this when someone sends you a phone ID from the privacy page.">
        <input value={id} onChange={(e) => setId(e.target.value.trim())} placeholder="Phone ID" className={field} />
        <button
          disabled={busy || id.length < 16}
          onClick={async () => {
            const ok = await confirm({ title: "Block this phone?", body: "It can't report, complain or answer again. What it sent in the last 24 hours is deleted.", action: "Block phone", danger: true });
            if (ok && (await call("admin_block_device", { p_device_id: id, p_reason: "Blocked by admin", p_wipe: true }, "Phone blocked."))) {
              setId("");
              setTick((n) => n + 1);
            }
          }}
          className={`${btnDanger} min-h-12`}
        >
          <IBan size={17} /> Block phone
        </button>
      </Card>

      <Card title="Blocked">
        {list === null ? (
          <Skeleton rows={2} />
        ) : list.length === 0 ? (
          <Empty icon={<IPhone size={28} />} text="Nobody is blocked." />
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((b) => (
              <li key={b.device_id} className="flex items-center gap-3 rounded-2xl bg-(--raised) p-3">
                <span className="flex flex-1 flex-col">
                  <span className="font-bold">{phone(b.device_id)}</span>
                  <span className="text-[12px] leading-snug text-(--muted)">{b.reason ?? "No reason"} · {timeAgo(b.created_at)}</span>
                </span>
                <button disabled={busy} onClick={async () => { if (await call("admin_unblock_device", { p_device_id: b.device_id }, "Unblocked.")) setTick((n) => n + 1); }} className={btnSoft}>
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

// ─── Questions: switch on/off, and tap one to see how people answered ────
type Question = { id: string; text: string; active: boolean; answers: number; skips: number };
type Result = { answer: string; label: string; n: number };
type TownRow = { state: string; city: string; total: number; top_label: string; top_n: number };

export function Questions() {
  const { call, busy } = useAdmin();
  const [list, setList] = useState<Question[] | null>(null);
  const [tick, setTick] = useState(0);
  const [openQ, setOpenQ] = useState<Question | null>(null);
  useEffect(() => {
    call<Question[]>("admin_questions").then((d) => d && setList(d));
  }, [call, tick]);

  if (openQ) return <Answers q={openQ} onBack={() => setOpenQ(null)} />;
  if (!list) return <Skeleton rows={5} />;
  return (
    <>
      <p className="text-[13px] leading-snug text-(--muted)">
        Each phone gets one question a day, from top to bottom. Tap a question to see the answers. Use the switch to stop asking it.
      </p>
      <div className="flex flex-col overflow-hidden rounded-[24px] border border-(--line) bg-(--card)">
        {list.map((q) => {
          const total = Number(q.answers) + Number(q.skips);
          const rate = total ? Math.round((Number(q.answers) / total) * 100) : 0;
          return (
            <div key={q.id} className="flex items-center gap-3 border-b border-(--divider) p-4 last:border-0">
              <button onClick={() => setOpenQ(q)} className="flex flex-1 flex-col gap-1 text-left">
                <span className={`text-[15px] font-bold leading-snug ${q.active ? "" : "text-(--muted)"}`}>{q.text}</span>
                <span className="text-[12px] text-(--muted)">
                  {q.answers} answered · {q.skips} skipped{total ? ` · ${rate}% answer` : ""}
                </span>
                <span className="flex items-center gap-0.5 text-[13px] font-bold text-(--light-text)">
                  See answers <IChevron size={14} />
                </span>
              </button>
              <button
                role="switch"
                aria-checked={q.active}
                aria-label={q.active ? "Turn off" : "Turn on"}
                disabled={busy}
                onClick={async () => { if (await call("admin_set_question", { p_id: q.id, p_active: !q.active }, q.active ? "Question turned off." : "Question turned on.")) setTick((n) => n + 1); }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${q.active ? "bg-(--light)" : "bg-(--line-strong)"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${q.active ? "left-6" : "left-1"}`} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Answers({ q, onBack }: { q: Question; onBack: () => void }) {
  const { call } = useAdmin();
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((a, b) => a.localeCompare(b)), [cities]);
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const towns = useMemo(() => cities.filter((c) => c.state === state).sort((a, b) => a.city.localeCompare(b.city)), [cities, state]);
  const [rows, setRows] = useState<{ key: string; data: Result[] } | null>(null);
  const [where, setWhere] = useState<TownRow[] | null>(null);
  const key = `${state}|${town}`;

  useEffect(() => {
    call<Result[]>("admin_question_results", { p_question: q.id, p_state: state || null, p_city: town || null }).then(
      (d) => d && setRows({ key, data: d.map((r) => ({ ...r, n: Number(r.n) })) })
    );
  }, [call, q.id, state, town, key]);
  useEffect(() => {
    call<TownRow[]>("admin_question_towns", { p_question: q.id, p_state: state || null }).then((d) => d && setWhere(d));
  }, [call, q.id, state]);

  const data = rows?.key === key ? rows.data : null;
  const total = data?.reduce((s, r) => s + r.n, 0) ?? 0;
  const max = Math.max(1, ...(data ?? []).map((r) => r.n));
  const place = town || (state ? stateLabel(state) : "All of Nigeria");

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1 self-start text-[14px] font-bold text-(--light-text)">
        <IChevron size={16} className="rotate-180" /> All questions
      </button>
      <h2 className="font-display text-[24px] font-extrabold leading-tight tracking-tight">{q.text}</h2>

      <div className="grid grid-cols-2 gap-2">
        <select value={state} onChange={(e) => { setState(e.target.value); setTown(""); }} className={field} aria-label="State">
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{stateLabel(s)}</option>)}
        </select>
        <select value={town} onChange={(e) => setTown(e.target.value)} disabled={!state} className={field} aria-label="Town">
          <option value="">{state ? "All towns" : "Town"}</option>
          {towns.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
        </select>
      </div>

      <Card title={place} sub={data ? `${total} ${total === 1 ? "person" : "people"} answered` : undefined}>
        {!data ? (
          <Skeleton rows={4} />
        ) : total === 0 ? (
          <Empty icon={<IQuestion size={28} />} text="No answers here yet." />
        ) : (
          <ul className="flex flex-col gap-3.5">
            {data.map((r) => {
              const pct = Math.round((r.n / total) * 100);
              const top = r.n === max;
              return (
                <li key={r.answer} className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span className={top ? "font-bold" : ""}>{r.label}</span>
                    <span className="shrink-0 text-(--muted)">
                      <strong className="text-(--text)">{pct}%</strong> · {r.n}
                    </span>
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-(--raised)">
                    <span className={`block h-full rounded-full ${top ? "bg-(--light)" : "bg-(--line-strong)"}`} style={{ width: `${(r.n / max) * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {!town && (
        <Card title="By town" sub="Where the answers come from, and the most common answer in each town">
          {where === null ? (
            <Skeleton rows={3} />
          ) : where.length === 0 ? (
            <Empty icon={<ITown size={28} />} text="No answers yet." />
          ) : (
            <ul className="flex flex-col">
              {where.map((w) => (
                <li key={`${w.state}-${w.city}`}>
                  <button
                    onClick={() => { setState(w.state); setTown(w.city); }}
                    className="flex w-full items-center gap-3 border-b border-(--divider) py-3 text-left last:border-0"
                  >
                    <span className="flex flex-1 flex-col">
                      <span className="text-[15px] font-bold">{w.city}</span>
                      <span className="text-[12px] text-(--muted)">
                        Most said: {w.top_label} ({Math.round((Number(w.top_n) / Number(w.total)) * 100)}%)
                      </span>
                    </span>
                    <span className="text-[13px] font-bold text-(--muted)">{w.total}</span>
                    <IChevron size={16} className="text-(--muted)" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}

// ─── Download (CSV for Excel / Google Sheets) ────────────────────────────
function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function Download() {
  const { call, busy, toast } = useAdmin();
  const [days, setDays] = useState(30);
  const kinds = [
    { id: "reports", label: "Light reports", hint: "Per area, per day: light reports, no-light reports, people" },
    { id: "complaints", label: "Complaints", hint: "Per area: each complaint type and how many people" },
    { id: "answers", label: "Question answers", hint: "Per area: each question and answer, how many people (all time)" },
  ];
  async function get(kind: string) {
    const rows = await call<Record<string, unknown>[]>("admin_export", { p_kind: kind, p_days: days });
    if (!rows) return;
    if (!rows.length) {
      toast("Nothing to download yet.", false);
      return;
    }
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lightdey-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Downloaded ${rows.length} rows.`);
  }
  return (
    <>
      <p className="text-[13px] leading-snug text-(--muted)">Opens in Excel or Google Sheets. Totals only: no phone IDs, no notes.</p>
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90, 365].map((d) => (
          <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={`min-h-10 rounded-full border px-3.5 text-[14px] font-bold ${days === d ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised)"}`}>
            Last {d} days
          </button>
        ))}
      </div>
      <div className="flex flex-col overflow-hidden rounded-[24px] border border-(--line) bg-(--card)">
        {kinds.map((k) => (
          <button key={k.id} disabled={busy} onClick={() => get(k.id)} className="flex min-h-16 items-center gap-3 border-b border-(--divider) p-4 text-left last:border-0 active:bg-(--raised) disabled:opacity-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--light)/15 text-(--light-text)">
              <IDownload size={20} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-[16px] font-bold">{k.label}</span>
              <span className="text-[13px] leading-snug text-(--muted)">{k.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}