"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import { useCities } from "@/lib/cities";
import { Card, Empty, Segments, Skeleton, useAdmin, phone, field, btnSoft, btnDanger, IBan, ITrash, IFlag, ILive, ICheck } from "./ui";

type FeedRow = { id: number; status: "on" | "off"; area_id: string; area: string; city: string; device_id: string; device_reports_24h: number; created_at: string; blocked: boolean };
type Alert = { device_id: string; reports: number; areas: number; towns: number; flips: number; last_at: string; where_: string; reasons: string[]; blocked: boolean };

export function Live() {
  const [view, setView] = useState<"feed" | "alerts">("feed");
  const [alertCount, setAlertCount] = useState(0);
  return (
    <>
      <Segments
        value={view}
        onChange={setView}
        items={[
          { id: "feed", label: "Feed" },
          { id: "alerts", label: "Alerts", badge: alertCount },
        ]}
      />
      {view === "feed" ? <Feed /> : <Alerts onCount={setAlertCount} />}
      {view === "feed" && <AlertPeek onCount={setAlertCount} onOpen={() => setView("alerts")} />}
    </>
  );
}

// Newest reports everywhere. Refreshes by itself every 20 seconds while you're looking.
function Feed() {
  const { call, confirm } = useAdmin();
  const cities = useCities();
  const towns = useMemo(() => [...cities].sort((a, b) => a.city.localeCompare(b.city)), [cities]);
  const [town, setTown] = useState("");
  const [rows, setRows] = useState<FeedRow[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    call<FeedRow[]>("admin_live_feed", { p_city: town || null }).then((d) => alive && d && setRows(d));
    return () => {
      alive = false;
    };
  }, [call, town, tick]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, 20000);
    return () => clearInterval(t);
  }, []);

  const reload = () => setTick((n) => n + 1);

  return (
    <Card
      title="Reports coming in"
      sub="Updates every 20 seconds. Tap a report to act on it."
      right={<span className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#30A46C]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#30A46C]" />Live</span>}
    >
      <select value={town} onChange={(e) => { setTown(e.target.value); setRows(null); }} className={field}>
        <option value="">All towns</option>
        {towns.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
      </select>
      {rows === null ? (
        <Skeleton rows={5} />
      ) : rows.length === 0 ? (
        <Empty icon={<ILive size={28} />} text="No reports yet." />
      ) : (
        <ul className="-mx-1 flex flex-col">
          {rows.map((r) => {
            const heavy = r.device_reports_24h >= 20;
            return (
              <li key={r.id} className="border-b border-(--divider) last:border-0">
                <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-center gap-3 px-1 py-3 text-left">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${r.status === "on" ? "bg-(--light) shadow-[0_0_10px_rgba(255,197,49,0.8)]" : "bg-(--off-dot)"}`} />
                  <span className="flex flex-1 flex-col">
                    <span className="text-[15px] font-bold">
                      {r.status === "on" ? "Light dey" : "No light"} <span className="font-normal text-(--soft)">in {r.area}</span>
                    </span>
                    <span className="text-[12px] text-(--muted)">
                      {r.city} · {timeAgo(r.created_at)} · {phone(r.device_id)}
                      {heavy && <span className="font-bold text-[#E5484D]"> · {r.device_reports_24h} today</span>}
                      {r.blocked && <span className="font-bold"> · blocked</span>}
                    </span>
                  </span>
                </button>
                {open === r.id && (
                  <div className="ld-card-in flex gap-2 px-1 pb-3">
                    <button
                      className={btnSoft}
                      onClick={async () => {
                        if (await call("admin_delete_report", { p_report_id: r.id }, "Report deleted.")) reload();
                      }}
                    >
                      <ITrash size={16} /> Delete report
                    </button>
                    {!r.blocked && (
                      <button
                        className={btnDanger}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Block ${phone(r.device_id)}?`,
                            body: "It won't be able to report, complain or answer again. Everything it sent in the last 24 hours is deleted.",
                            action: "Block phone",
                            danger: true,
                          });
                          if (ok && (await call("admin_block_device", { p_device_id: r.device_id, p_reason: `Blocked from live feed (${r.area}, ${r.city})`, p_wipe: true }, "Phone blocked."))) reload();
                        }}
                      >
                        <IBan size={16} /> Block phone
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// Small heads-up under the feed when there are alerts
function AlertPeek({ onCount, onOpen }: { onCount: (n: number) => void; onOpen: () => void }) {
  const { call } = useAdmin();
  const [n, setN] = useState(0);
  useEffect(() => {
    call<Alert[]>("admin_suspicious").then((d) => {
      const c = (d ?? []).filter((a) => !a.blocked).length;
      setN(c);
      onCount(c);
    });
  }, [call, onCount]);
  if (!n) return null;
  return (
    <button onClick={onOpen} className="flex items-center gap-3 rounded-[20px] border border-[#E5484D]/40 bg-[#E5484D]/10 p-4 text-left">
      <IFlag size={20} className="text-[#E5484D]" />
      <span className="flex-1 text-[15px] font-bold">{n} phone{n === 1 ? "" : "s"} acting strangely today</span>
      <span className="text-[13px] font-bold text-[#E5484D]">Review</span>
    </button>
  );
}

// Phones that report too much, from too many places, or keep flipping light/no light
function Alerts({ onCount }: { onCount: (n: number) => void }) {
  const { call, confirm } = useAdmin();
  const [rows, setRows] = useState<Alert[] | null>(null);
  const load = useCallback(() => {
    call<Alert[]>("admin_suspicious").then((d) => {
      if (!d) return;
      setRows(d);
      onCount(d.filter((a) => !a.blocked).length);
    });
  }, [call, onCount]);
  useEffect(() => {
    load();
  }, [load]);

  if (rows === null) return <Skeleton rows={3} />;
  if (rows.length === 0)
    return (
      <Card>
        <Empty icon={<ICheck size={28} />} text="Nothing strange in the last 24 hours." />
      </Card>
    );

  return (
    <>
      <p className="text-[13px] leading-snug text-(--muted)">
        Phones from the last 24 hours with 20+ reports, 4+ areas, 2+ towns, or that keep switching light/no light. Not every
        flag is fake: a busy person can report a lot. Check where before you block.
      </p>
      {rows.map((a) => (
        <Card key={a.device_id} className={a.blocked ? "opacity-60" : ""}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[16px] font-bold">{phone(a.device_id)}</span>
              <span className="text-[12px] text-(--muted)">Last report {timeAgo(a.last_at)}</span>
            </div>
            {a.blocked ? (
              <span className="rounded-full bg-(--raised) px-3 py-1 text-[12px] font-bold">Blocked</span>
            ) : (
              <button
                className={btnDanger}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Block ${phone(a.device_id)}?`,
                    body: `It sent ${a.reports} reports today. Blocking stops it and deletes what it sent in the last 24 hours.`,
                    action: "Block phone",
                    danger: true,
                  });
                  if (ok && (await call("admin_block_device", { p_device_id: a.device_id, p_reason: a.reasons.join(", "), p_wipe: true }, "Phone blocked."))) load();
                }}
              >
                <IBan size={16} /> Block
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {a.reasons.map((r) => (
              <span key={r} className="rounded-full bg-[#E5484D]/12 px-2.5 py-1 text-[12px] font-bold text-[#E5484D]">{r}</span>
            ))}
          </div>
          <p className="text-[13px] leading-snug text-(--soft)">{a.where_}</p>
        </Card>
      ))}
    </>
  );
}