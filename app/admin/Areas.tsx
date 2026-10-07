"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import { useCities } from "@/lib/cities";
import {
  Card, Empty, Segments, Skeleton, useAdmin, stateLabel, phone, field, btn, btnSoft, btnDanger,
  ISearch, IPlus, IMerge, ITrash, IBan, IChevron, ICheck,
} from "./ui";

type FoundArea = { id: string; state: string; city: string; name: string; reports: number; last_report: string | null; is_seed: boolean };
type Report = { id: number; status: string; device_id: string; device_reports_today: number; created_at: string; blocked: boolean };
type Dupe = { city: string; a_id: string; a_name: string; a_reports: number; b_id: string; b_name: string; b_reports: number; likeness: number };

export function Areas() {
  const [view, setView] = useState<"find" | "dupes" | "add">("find");
  // State and town are shared by all three views
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((a, b) => a.localeCompare(b)), [cities]);
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const towns = useMemo(() => cities.filter((c) => c.state === state).sort((a, b) => a.city.localeCompare(b.city)), [cities, state]);

  return (
    <>
      <Segments
        value={view}
        onChange={setView}
        items={[
          { id: "find", label: "Find" },
          { id: "dupes", label: "Duplicates" },
          { id: "add", label: "Add" },
        ]}
      />
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
      {view === "find" && <Find town={town} />}
      {view === "dupes" && <Dupes town={town} />}
      {view === "add" && <Add state={state} town={town} />}
    </>
  );
}

function Find({ town }: { town: string }) {
  const { call } = useAdmin();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<FoundArea[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const search = useCallback(async () => {
    const d = await call<FoundArea[]>("admin_find_areas", { p_q: q.trim(), p_city: town || null });
    if (d) setRows(d);
  }, [call, q, town]);

  // Search as you type (after a short pause)
  useEffect(() => {
    if (!town && q.trim().length < 2) return;
    const t = setTimeout(search, 350);
    return () => clearTimeout(t);
  }, [search, q, town]);

  return (
    <>
      <div className="relative">
        <ISearch size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-(--muted)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={town ? `Search areas in ${town}` : "Search any area"} className={`${field} pl-11`} />
      </div>
      {rows === null ? (
        <Empty icon={<ISearch size={28} />} text="Pick a town or type an area name. Busiest areas show first." />
      ) : rows.length === 0 ? (
        <Empty icon={<ISearch size={28} />} text="No areas found." />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((a) => (
            <li key={a.id} className="rounded-[20px] border border-(--line) bg-(--card)">
              <button onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="flex flex-1 flex-col">
                  <span className="text-[16px] font-bold">{a.name}</span>
                  <span className="text-[13px] text-(--muted)">
                    {a.city} · {a.reports} report{a.reports === 1 ? "" : "s"}{a.last_report ? ` · last ${timeAgo(a.last_report)}` : ""}
                  </span>
                </span>
                <IChevron size={18} className={`text-(--muted) transition-transform ${open === a.id ? "rotate-90" : ""}`} />
              </button>
              {open === a.id && <AreaTools area={a} onChanged={search} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AreaTools({ area, onChanged }: { area: FoundArea; onChanged: () => void }) {
  const { call, busy, confirm, openPhone, toast } = useAdmin();
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((x, y) => x.localeCompare(y)), [cities]);
  const [moveState, setMoveState] = useState("");
  const [moveTown, setMoveTown] = useState("");
  const moveTowns = useMemo(() => cities.filter((c) => c.state === moveState && c.city !== area.city).sort((x, y) => x.city.localeCompare(y.city)), [cities, moveState, area.city]);
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

  const label = "text-[12px] font-bold uppercase tracking-[1px] text-(--muted)";
  return (
    <div className="ld-card-in flex flex-col gap-5 border-t border-(--divider) p-4">
      <div className="flex flex-col gap-2">
        <span className={label}>Name</span>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className={field} />
          <button disabled={busy || name.trim() === area.name || name.trim().length < 2} onClick={async () => { if (await call("admin_rename_area", { p_area_id: area.id, p_name: name }, "Renamed.")) onChanged(); }} className={`${btnSoft} min-h-12 shrink-0`}>
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Duplicate? Merge into the right one</span>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); findTargets(); }}>
          <input value={mergeQ} onChange={(e) => setMergeQ(e.target.value)} placeholder={`Correct area in ${area.city}`} className={field} />
          <button disabled={busy} className={`${btnSoft} min-h-12 shrink-0`}>Find</button>
        </form>
        {targets.map((t) => (
          <button
            key={t.id}
            disabled={busy}
            onClick={async () => {
              const ok = await confirm({
                title: `Merge into ${t.name}?`,
                body: `"${area.name}" disappears. Its reports, complaints, answers and alerts move to "${t.name}".`,
                action: "Merge",
              });
              if (ok && (await call("admin_merge_area", { p_from: area.id, p_into: t.id }, `Merged into ${t.name}.`))) onChanged();
            }}
            className="flex min-h-12 items-center gap-3 rounded-2xl border border-(--line) bg-(--raised) px-4 text-left"
          >
            <IMerge size={18} className="text-(--light-text)" />
            <span className="flex-1 font-bold">{t.name}</span>
            <span className="text-[12px] text-(--muted)">{t.reports} reports</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Latest reports</span>
        {reports === null ? (
          <button disabled={busy} onClick={loadReports} className={`${btnSoft} self-start`}>Show reports</button>
        ) : reports.length === 0 ? (
          <p className="text-[14px] text-(--muted)">No reports yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-2xl bg-(--raised) p-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.status === "on" ? "bg-(--light)" : "bg-(--off-dot)"}`} />
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] font-bold">{r.status === "on" ? "Light dey" : "No light"} · {timeAgo(r.created_at)}</span>
                  <button onClick={() => openPhone(r.device_id)} className="self-start text-left text-[12px] text-(--muted) underline underline-offset-2">
                    {phone(r.device_id)} · {r.device_reports_today} in 24h{r.blocked ? " · blocked" : ""}
                  </button>
                </span>
                <button aria-label="Delete report" disabled={busy} onClick={async () => { if (await call("admin_delete_report", { p_report_id: r.id }, "Report deleted.")) loadReports(); }} className={`${btnSoft} w-10 px-0`}>
                  <ITrash size={16} />
                </button>
                {!r.blocked && (
                  <button
                    aria-label="Block phone"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await confirm({ title: `Block ${phone(r.device_id)}?`, body: "It can't report again, and what it sent in the last 24 hours is deleted.", action: "Block phone", danger: true });
                      if (ok && (await call("admin_block_device", { p_device_id: r.device_id, p_reason: `Fake reports in ${area.name}`, p_wipe: true }, "Phone blocked."))) loadReports();
                    }}
                    className={`${btnDanger} w-10 px-0`}
                  >
                    <IBan size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Wrong status? Reset it</span>
        <p className="-mt-1 text-[12px] leading-snug text-(--muted)">Deletes the area&apos;s recent reports so it shows &quot;no reports&quot; until someone reports again.</p>
        <div className="flex flex-wrap gap-2">
          {[1, 6, 24].map((h) => (
            <button
              key={h}
              disabled={busy}
              className={btnSoft}
              onClick={async () => {
                if (!(await confirm({ title: `Reset ${area.name}?`, body: `Deletes every report from the last ${h === 1 ? "hour" : `${h} hours`} in ${area.name}.`, action: "Reset", danger: true }))) return;
                const n = await call<number>("admin_reset_area", { p_area_id: area.id, p_hours: h });
                if (n !== null) {
                  toast(`Deleted ${n} report${Number(n) === 1 ? "" : "s"}.`);
                  onChanged();
                }
              }}
            >
              Last {h === 1 ? "hour" : `${h} hours`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>In the wrong town? Move it</span>
        <div className="grid grid-cols-2 gap-2">
          <select value={moveState} onChange={(e) => { setMoveState(e.target.value); setMoveTown(""); }} className={field} aria-label="State">
            <option value="" disabled>State</option>
            {states.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <select value={moveTown} onChange={(e) => setMoveTown(e.target.value)} disabled={!moveState} className={field} aria-label="Town">
            <option value="" disabled>Town</option>
            {moveTowns.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
          </select>
        </div>
        <button
          disabled={busy || !moveTown}
          className={btnSoft + " min-h-11"}
          onClick={async () => {
            if (!(await confirm({ title: `Move ${area.name} to ${moveTown}?`, body: "Its reports go with it. Its map pin resets until people report from there.", action: "Move" }))) return;
            if (await call("admin_move_area", { p_area_id: area.id, p_city: moveTown }, `Moved to ${moveTown}.`)) onChanged();
          }}
        >
          Move to {moveTown || "…"}
        </button>
      </div>

      <button
        disabled={busy}
        onClick={async () => {
          const ok = await confirm({ title: `Delete ${area.name}?`, body: "Only works if nobody has reported from it. Otherwise merge it instead.", action: "Delete area", danger: true });
          if (ok && (await call("admin_delete_area", { p_area_id: area.id }, "Area deleted."))) onChanged();
        }}
        className="flex items-center gap-1.5 self-start text-[14px] font-bold text-[#E5484D]"
      >
        <ITrash size={16} /> Delete this area
      </button>
    </div>
  );
}

// Look-alike names in the same town ("Oke Odo" / "Oke-Odo").
// Tap the name to keep, then Merge. "Not a duplicate" is remembered, so the pair never comes back.
function Dupes({ town }: { town: string }) {
  const { call, busy, confirm } = useAdmin();
  const [rows, setRows] = useState<Dupe[] | null>(null);
  const [tick, setTick] = useState(0);
  const [keepPick, setKeepPick] = useState<Record<string, string>>({}); // pair key → id to keep
  useEffect(() => {
    call<Dupe[]>("admin_duplicates", { p_city: town || null }).then((d) => d && setRows(d.map((x) => ({ ...x, a_reports: Number(x.a_reports), b_reports: Number(x.b_reports) }))));
  }, [call, town, tick]);

  if (rows === null) return <Skeleton rows={4} />;
  if (rows.length === 0) return <Card><Empty icon={<ICheck size={28} />} text={town ? `No look-alike areas in ${town}.` : "No look-alike areas found."} /></Card>;

  return (
    <>
      <p className="text-[13px] leading-snug text-(--muted)">
        Tap the name you want to keep, then Merge. The other one disappears and its reports move over. Some look-alikes
        are real different places, so tap &quot;Not a duplicate&quot; for those and they won&apos;t show again.
      </p>
      {rows.map((d) => {
        const pairKey = `${d.a_id}-${d.b_id}`;
        const A = { id: d.a_id, name: d.a_name, n: d.a_reports };
        const B = { id: d.b_id, name: d.b_name, n: d.b_reports };
        // Default keep: the one with more reports
        const keepId = keepPick[pairKey] ?? (A.n >= B.n ? A.id : B.id);
        const keep = keepId === A.id ? A : B;
        const drop = keepId === A.id ? B : A;
        const side = (x: typeof A) => {
          const kept = x.id === keepId;
          return (
            <button
              onClick={() => setKeepPick({ ...keepPick, [pairKey]: x.id })}
              aria-pressed={kept}
              className={`flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-colors ${kept ? "border-(--light) bg-(--light)/10" : "border-(--line) bg-(--raised) opacity-70"}`}
            >
              <span className="font-bold">{x.name}</span>
              <span className="text-[12px] text-(--muted)">{x.n} report{x.n === 1 ? "" : "s"}</span>
              <span className={`mt-1 text-[11px] font-extrabold tracking-[1px] ${kept ? "text-(--light-text)" : "text-(--muted)"}`}>{kept ? "KEEP" : "REMOVE"}</span>
            </button>
          );
        };
        return (
          <Card key={pairKey}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[1px] text-(--muted)">{d.city}</span>
              <span className="text-[12px] text-(--muted)">{Math.round(d.likeness * 100)}% alike</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {side(A)}
              {side(B)}
            </div>
            <div className="flex gap-2">
              <button
                disabled={busy}
                className={`${btn} min-h-11 flex-1 text-[15px]`}
                onClick={async () => {
                  const ok = await confirm({ title: `Keep ${keep.name}?`, body: `"${drop.name}" disappears and its ${drop.n} report${drop.n === 1 ? "" : "s"} move to "${keep.name}".`, action: "Merge" });
                  if (ok && (await call("admin_merge_area", { p_from: drop.id, p_into: keep.id }, `Merged into ${keep.name}.`))) setTick((n) => n + 1);
                }}
              >
                <IMerge size={17} /> Merge
              </button>
              <button
                disabled={busy}
                className={`${btnSoft} min-h-11`}
                onClick={async () => {
                  if (await call("admin_not_duplicate", { p_a: d.a_id, p_b: d.b_id }, "Got it. Won't show again.")) setRows(rows.filter((r) => r !== d));
                }}
              >
                Not a duplicate
              </button>
            </div>
          </Card>
        );
      })}
    </>
  );
}

function Add({ state, town }: { state: string; town: string }) {
  const { call, busy } = useAdmin();
  const [name, setName] = useState("");
  return (
    <Card title="Add an area" sub="You don't need to be there. Pick the state and town above first.">
      <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder={town ? `New area in ${town}` : "Pick a town above"} disabled={!town} className={field} />
      <button
        disabled={busy || !town || name.trim().length < 2}
        onClick={async () => {
          if (await call("admin_add_area", { p_state: state, p_city: town, p_name: name }, `Added ${name.trim()} to ${town}.`)) setName("");
        }}
        className={btn}
      >
        <IPlus size={18} /> Add area
      </button>
    </Card>
  );
}