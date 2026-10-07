"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCities, loadCities } from "@/lib/cities";
import { timeAgo } from "@/lib/helpers";
import { IconCheck } from "@/components/Icons";

const PickPoint = dynamic(() => import("./PickPoint"), {
  ssr: false,
  loading: () => <div className="h-72 rounded-2xl bg-(--raised)" />,
});

const ERRORS: Record<string, string> = {
  not_admin: "Wrong password. Unlock again.",
  invalid_name: "That name is too short or too long.",
  unknown_town: "That town isn't in that state.",
  already_there: "That's already on the list.",
  outside_nigeria: "That spot isn't in Nigeria.",
  invalid_state: "Pick a state.",
  has_reports: "People have reported from this area. Merge it into the right one instead of deleting it.",
  same_area: "Pick a different area to merge into.",
  unknown_area: "Couldn't find that area.",
  invalid_size: "Size must be between 5 and 80 km.",
};
const explain = (m: string) =>
  ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Couldn't do that. Check your data and try again.";

const field =
  "min-h-12 w-full rounded-2xl border border-(--line) bg-(--raised) px-4 text-base outline-none placeholder:text-(--muted) focus:border-(--light) disabled:opacity-50";
const btn = "min-h-12 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-40";
const btnGhost = "min-h-10 rounded-xl border border-(--line) bg-(--raised) px-3 text-[14px] font-bold disabled:opacity-40";
const card = "flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5";
const stateLabel = (st: string) => (st === "FCT" ? "FCT (Abuja)" : `${st} State`);

type Tab = "overview" | "areas" | "towns" | "phones" | "questions" | "download";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "areas", label: "Areas" },
  { id: "towns", label: "Towns" },
  { id: "phones", label: "Phones" },
  { id: "questions", label: "Questions" },
  { id: "download", label: "Download" },
];

type Msg = { text: string; ok?: boolean } | null;
type Stats = Record<string, number> & { top_towns_week?: { city: string; reports: number; people: number }[] };
type FoundArea = { id: string; state: string; city: string; name: string; reports: number; last_report: string | null; is_seed: boolean };
type Report = { id: number; status: string; device_id: string; device_reports_today: number; created_at: string; blocked: boolean };
type Question = { id: string; text: string; active: boolean; answers: number; skips: number };

export function AdminPanel() {
  // The password lives only in this tab's memory: close the tab and you're locked out again
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Every admin call goes through here: shows errors, locks the page if the password stops working
  const call = useCallback(
    async <T,>(fn: string, args: Record<string, unknown>, done?: string): Promise<T | null> => {
      setBusy(true);
      setMsg(null);
      const { data, error } = await supabase.rpc(fn, { p_key: key, ...args });
      setBusy(false);
      if (error) {
        if (error.message.includes("not_admin")) setUnlocked(false);
        setMsg({ text: explain(error.message) });
        return null;
      }
      if (done) setMsg({ text: done, ok: true });
      return (data ?? true) as T;
    },
    [key]
  );

  async function unlock() {
    setBusy(true);
    setMsg(null);
    const { data } = await supabase.rpc("admin_login", { p_key: key });
    setBusy(false);
    if (data === true) setUnlocked(true);
    else setMsg({ text: "Wrong password." });
  }

  return (
    <main className="ld-safe-top mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-16">
      <Link href="/" className="flex min-h-11 items-center gap-1 self-start pr-3 text-[15px] font-medium">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to Light Dey
      </Link>
      <h1 className="font-display text-[34px] font-extrabold leading-tight tracking-tight">Admin</h1>

      {!unlocked ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            unlock();
          }}
        >
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin password" autoComplete="current-password" className={field} />
          <button disabled={busy || key.length < 12} className={btn}>
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
      ) : (
        <>
          <nav className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" aria-label="Admin sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setMsg(null);
                }}
                aria-pressed={tab === t.id}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-[14px] font-bold ${
                  tab === t.id ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised)"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {msg && (
            <p role="status" className={`flex items-center gap-1.5 text-[15px] ${msg.ok ? "font-bold text-(--light-text)" : "text-(--soft)"}`}>
              {msg.ok && <IconCheck size={16} />}
              {msg.text}
            </p>
          )}

          {tab === "overview" && <Overview call={call} />}
          {tab === "areas" && <Areas call={call} busy={busy} />}
          {tab === "towns" && <Towns call={call} busy={busy} />}
          {tab === "phones" && <Phones call={call} busy={busy} />}
          {tab === "questions" && <Questions call={call} busy={busy} />}
          {tab === "download" && <Download call={call} busy={busy} />}
        </>
      )}
    </main>
  );
}

type Call = <T>(fn: string, args: Record<string, unknown>, done?: string) => Promise<T | null>;

// ─── Overview ────────────────────────────────────────────────────────────
function Overview({ call }: { call: Call }) {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    call<Stats>("admin_stats", {}).then((d) => d && setS(d));
  }, [call]);
  if (!s) return <p className="text-(--muted)">Loading…</p>;
  const tiles: [string, number][] = [
    ["Reports today", s.reports_today],
    ["People today", s.people_today],
    ["Areas active today", s.areas_today],
    ["Reports this week", s.reports_week],
    ["People this week", s.people_week],
    ["Complaints this week", s.complaints_week],
    ["Reports all time", s.reports_all],
    ["People all time", s.people_all],
    ["Question answers", s.answers_all],
    ["Towns", s.towns],
    ["Areas", s.areas],
    ["Blocked phones", s.blocked],
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(([label, n]) => (
          <div key={label} className="flex flex-col gap-1 rounded-[20px] border border-(--line) bg-(--card) p-4">
            <span className="font-display text-[28px] font-extrabold leading-none">{Number(n ?? 0).toLocaleString()}</span>
            <span className="text-[13px] text-(--muted)">{label}</span>
          </div>
        ))}
      </div>
      {!!s.top_towns_week?.length && (
        <section className={card}>
          <h2 className="text-lg font-bold">Busiest towns this week</h2>
          <ul className="flex flex-col gap-2">
            {s.top_towns_week.map((t) => (
              <li key={t.city} className="flex justify-between text-[15px]">
                <span>{t.city}</span>
                <span className="text-(--muted)">
                  {t.reports} reports · {t.people} people
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ─── Areas: add, find, rename, merge, delete, see reports ────────────────
function Areas({ call, busy }: { call: Call; busy: boolean }) {
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((a, b) => a.localeCompare(b)), [cities]);
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const towns = useMemo(() => cities.filter((c) => c.state === state).sort((a, b) => a.city.localeCompare(b.city)), [cities, state]);

  const [newName, setNewName] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<FoundArea[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const search = useCallback(async () => {
    const d = await call<FoundArea[]>("admin_find_areas", { p_q: q.trim(), p_city: town || null });
    if (d) setFound(d);
  }, [call, q, town]);

  async function add() {
    const ok = await call("admin_add_area", { p_state: state, p_city: town, p_name: newName }, `Added ${newName.trim()} to ${town}.`);
    if (ok) {
      setNewName("");
      search();
    }
  }

  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-bold">Pick a town</h2>
        <select value={state} onChange={(e) => { setState(e.target.value); setTown(""); setFound([]); }} className={field}>
          <option value="" disabled>Choose state</option>
          {states.map((s) => <option key={s} value={s}>{stateLabel(s)}</option>)}
        </select>
        <select value={town} onChange={(e) => { setTown(e.target.value); setFound([]); }} disabled={!state} className={field}>
          <option value="" disabled>Choose town</option>
          {towns.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
        </select>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Add an area</h2>
        <input value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 60))} placeholder={town ? `New area in ${town}` : "Pick a town first"} disabled={!town} className={field} />
        <button onClick={add} disabled={busy || !town || newName.trim().length < 2} className={btn}>Add area</button>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Find and fix areas</h2>
        <p className="text-[13px] text-(--muted)">Search one town, or leave the town empty to search everywhere. Busiest areas show first.</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Area name" className={field} />
          <button disabled={busy} className={`${btn} shrink-0`}>Search</button>
        </form>
        <ul className="flex flex-col">
          {found.map((a) => (
            <li key={a.id} className="border-b border-(--divider) py-3">
              <button onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full items-start justify-between gap-3 text-left">
                <span className="flex flex-col">
                  <span className="text-base font-bold">{a.name}</span>
                  <span className="text-[13px] text-(--muted)">
                    {a.city}, {a.state} · {a.reports} reports{a.last_report ? ` · last ${timeAgo(a.last_report)}` : ""}
                  </span>
                </span>
                <span className="pt-1 text-[13px] font-bold text-(--light-text)">{open === a.id ? "Close" : "Manage"}</span>
              </button>
              {open === a.id && <AreaTools area={a} call={call} busy={busy} onChanged={search} />}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function AreaTools({ area, call, busy, onChanged }: { area: FoundArea; call: Call; busy: boolean; onChanged: () => void }) {
  const [name, setName] = useState(area.name);
  const [mergeQ, setMergeQ] = useState("");
  const [targets, setTargets] = useState<FoundArea[]>([]);
  const [reports, setReports] = useState<Report[] | null>(null);

  async function findTargets() {
    const d = await call<FoundArea[]>("admin_find_areas", { p_q: mergeQ.trim(), p_city: area.city });
    if (d) setTargets(d.filter((t) => t.id !== area.id));
  }
  async function loadReports() {
    const d = await call<Report[]>("admin_area_reports", { p_area_id: area.id });
    if (d) setReports(d);
  }

  return (
    <div className="ld-card-in mt-3 flex flex-col gap-4 rounded-2xl bg-(--raised) p-3.5">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold uppercase tracking-[1px] text-(--muted)">Rename</span>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className={field} />
          <button disabled={busy || name.trim() === area.name} onClick={async () => { if (await call("admin_rename_area", { p_area_id: area.id, p_name: name }, "Renamed.")) onChanged(); }} className={`${btnGhost} shrink-0`}>Save</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold uppercase tracking-[1px] text-(--muted)">Duplicate? Merge it into the right one</span>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); findTargets(); }}>
          <input value={mergeQ} onChange={(e) => setMergeQ(e.target.value)} placeholder={`Correct area in ${area.city}`} className={field} />
          <button disabled={busy} className={`${btnGhost} shrink-0`}>Find</button>
        </form>
        {targets.map((t) => (
          <button
            key={t.id}
            disabled={busy}
            onClick={async () => {
              if (!confirm(`Merge "${area.name}" into "${t.name}"? Its reports move to ${t.name} and "${area.name}" disappears.`)) return;
              if (await call("admin_merge_area", { p_from: area.id, p_into: t.id }, `Merged into ${t.name}.`)) onChanged();
            }}
            className="flex min-h-11 items-center justify-between rounded-xl border border-(--line) px-3 text-left text-[15px]"
          >
            <span>{t.name}</span>
            <span className="text-[13px] text-(--muted)">{t.reports} reports · merge here</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold uppercase tracking-[1px] text-(--muted)">Latest reports</span>
        {reports === null ? (
          <button disabled={busy} onClick={loadReports} className={`${btnGhost} self-start`}>Show reports</button>
        ) : reports.length === 0 ? (
          <p className="text-[14px] text-(--muted)">No reports yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-[14px]">
                <span className="flex flex-col">
                  <span className="font-bold">{r.status === "on" ? "Light dey" : "No light"} · {timeAgo(r.created_at)}</span>
                  <span className="text-[12px] text-(--muted)">
                    Phone {r.device_id.slice(0, 6)} · {r.device_reports_today} reports in 24h{r.blocked ? " · blocked" : ""}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <button disabled={busy} onClick={async () => { if (await call("admin_delete_report", { p_report_id: r.id }, "Report deleted.")) loadReports(); }} className={btnGhost}>Delete</button>
                  {!r.blocked && (
                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (!confirm("Block this phone? It won't be able to report again, and what it sent in the last 24 hours is deleted.")) return;
                        if (await call("admin_block_device", { p_device_id: r.device_id, p_reason: `Fake reports in ${area.name}`, p_wipe: true }, "Phone blocked.")) loadReports();
                      }}
                      className={btnGhost}
                    >
                      Block
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        disabled={busy}
        onClick={async () => {
          if (!confirm(`Delete "${area.name}"? Only works if nobody has reported from it.`)) return;
          if (await call("admin_delete_area", { p_area_id: area.id }, "Area deleted.")) onChanged();
        }}
        className="self-start text-[14px] font-bold text-(--muted) underline underline-offset-4"
      >
        Delete this area
      </button>
    </div>
  );
}

// ─── Towns: add on a map, change size ────────────────────────────────────
function Towns({ call, busy }: { call: Call; busy: boolean }) {
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
    const ok = await call("admin_add_city", { p_state: state, p_city: name, p_lat: point[0], p_lng: point[1] }, `Added ${name.trim()} to ${stateLabel(state)}.`);
    if (ok) {
      await loadCities(true);
      setName("");
      setPoint(null);
    }
  }

  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-bold">Add a town</h2>
        <select value={state} onChange={(e) => { setState(e.target.value); setPoint(null); setSizeTown(""); }} className={field}>
          <option value="" disabled>Choose state</option>
          {states.map((s) => <option key={s} value={s}>{stateLabel(s)}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Town name" className={field} />
        {state && (
          <>
            <p className="text-[13px] text-(--muted)">
              Tap the map where the town is. Zoom in to be exact. Grey dots are towns already on the list.
            </p>
            <PickPoint towns={inState} point={point} onPick={(lat, lng) => setPoint([lat, lng])} />
            {point && (
              <p className="flex items-center gap-1.5 text-[14px] font-bold text-(--light-text)">
                <IconCheck size={16} /> Spot picked
              </p>
            )}
          </>
        )}
        <button onClick={add} disabled={busy || !state || name.trim().length < 2 || !point} className={btn}>
          {point ? "Add town" : "Tap the map first"}
        </button>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Change a town&apos;s size</h2>
        <p className="text-[13px] text-(--muted)">
          How far from the centre still counts as the town. Make it bigger if people on the edge get &quot;too far&quot;.
        </p>
        <select value={sizeTown} onChange={(e) => { setSizeTown(e.target.value); setSize(""); }} disabled={!state} className={field}>
          <option value="" disabled>{state ? "Choose town" : "Choose a state above first"}</option>
          {inState.map((c) => <option key={c.city} value={c.city}>{c.city} ({c.radiusKm} km)</option>)}
        </select>
        {current && (
          <div className="flex gap-2">
            <input value={size} onChange={(e) => setSize(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder={`Now ${current.radiusKm} km`} className={field} />
            <button
              disabled={busy || !size}
              onClick={async () => {
                if (await call("admin_set_town_size", { p_city: current.city, p_radius: Number(size) }, `${current.city} is now ${size} km.`)) {
                  await loadCities(true);
                  setSize("");
                }
              }}
              className={`${btnGhost} shrink-0`}
            >
              Save
            </button>
          </div>
        )}
      </section>
    </>
  );
}

// ─── Phones: blocked list ────────────────────────────────────────────────
function Phones({ call, busy }: { call: Call; busy: boolean }) {
  const [list, setList] = useState<{ device_id: string; reason: string | null; created_at: string }[] | null>(null);
  const [id, setId] = useState("");
  const load = useCallback(async () => {
    const d = await call<typeof list>("admin_blocked", {});
    if (d) setList(d);
  }, [call]);
  useEffect(() => {
    call<{ device_id: string; reason: string | null; created_at: string }[]>("admin_blocked", {}).then((d) => d && setList(d));
  }, [call]);

  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-bold">Block a phone</h2>
        <p className="text-[13px] text-(--muted)">
          Easiest way: Areas → Manage → Show reports → Block. Or paste a phone ID someone sent you from the privacy page.
        </p>
        <input value={id} onChange={(e) => setId(e.target.value.trim())} placeholder="Phone ID" className={field} />
        <button
          disabled={busy || id.length < 16}
          onClick={async () => {
            if (await call("admin_block_device", { p_device_id: id, p_reason: "Blocked by admin", p_wipe: true }, "Phone blocked.")) {
              setId("");
              load();
            }
          }}
          className={btn}
        >
          Block and delete its last 24 hours
        </button>
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Blocked phones</h2>
        {list === null ? (
          <p className="text-(--muted)">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-[14px] text-(--muted)">Nobody is blocked.</p>
        ) : (
          <ul className="flex flex-col">
            {list.map((b) => (
              <li key={b.device_id} className="flex items-center justify-between gap-2 border-b border-(--divider) py-2.5 text-[14px]">
                <span className="flex flex-col">
                  <span className="font-bold">Phone {b.device_id.slice(0, 6)}</span>
                  <span className="text-[12px] text-(--muted)">{b.reason ?? "No reason"} · {timeAgo(b.created_at)}</span>
                </span>
                <button disabled={busy} onClick={async () => { if (await call("admin_unblock_device", { p_device_id: b.device_id }, "Unblocked.")) load(); }} className={btnGhost}>
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ─── Daily questions: on/off and how many answered ───────────────────────
function Questions({ call, busy }: { call: Call; busy: boolean }) {
  const [list, setList] = useState<Question[] | null>(null);
  const load = useCallback(async () => {
    const d = await call<Question[]>("admin_questions", {});
    if (d) setList(d);
  }, [call]);
  useEffect(() => {
    call<Question[]>("admin_questions", {}).then((d) => d && setList(d));
  }, [call]);
  if (!list) return <p className="text-(--muted)">Loading…</p>;
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Daily questions</h2>
      <p className="text-[13px] text-(--muted)">Each phone gets one question a day, in this order. Turn one off to stop asking it.</p>
      <ul className="flex flex-col">
        {list.map((q) => (
          <li key={q.id} className="flex items-center justify-between gap-3 border-b border-(--divider) py-3">
            <span className="flex flex-col">
              <span className={`text-[15px] font-bold ${q.active ? "" : "text-(--muted)"}`}>{q.text}</span>
              <span className="text-[12px] text-(--muted)">{q.answers} answered · {q.skips} skipped</span>
            </span>
            <button
              disabled={busy}
              onClick={async () => { if (await call("admin_set_question", { p_id: q.id, p_active: !q.active }, q.active ? "Question turned off." : "Question turned on.")) load(); }}
              className={`${btnGhost} shrink-0`}
            >
              {q.active ? "Turn off" : "Turn on"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Downloads (CSV for Excel / Google Sheets) ───────────────────────────
function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function Download({ call, busy }: { call: Call; busy: boolean }) {
  const [days, setDays] = useState(30);
  const kinds = [
    { id: "reports", label: "Light reports", hint: "Per area, per day: light reports, no-light reports, people" },
    { id: "complaints", label: "Complaints", hint: "Per area: each complaint type and how many people" },
    { id: "answers", label: "Question answers", hint: "Per area: each question, each answer, how many people (all time)" },
  ];
  async function get(kind: string) {
    const rows = await call<Record<string, unknown>[]>("admin_export", { p_kind: kind, p_days: days });
    if (!rows) return;
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lightdey-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Download data</h2>
      <p className="text-[13px] text-(--muted)">Opens in Excel or Google Sheets. Totals only: no phone IDs, no notes.</p>
      <label className="flex items-center justify-between gap-3 text-[15px]">
        <span>Last</span>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${field} w-auto`}>
          {[7, 30, 90, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
      </label>
      {kinds.map((k) => (
        <button key={k.id} disabled={busy} onClick={() => get(k.id)} className="flex flex-col items-start gap-0.5 rounded-2xl border border-(--line) bg-(--raised) p-3.5 text-left disabled:opacity-40">
          <span className="text-base font-bold">{k.label}</span>
          <span className="text-[13px] text-(--muted)">{k.hint}</span>
        </button>
      ))}
    </section>
  );
}