"use client";

import { useEffect, useState } from "react";
import type { AreaStatus } from "@/lib/types";
import { supabase, getDeviceId } from "@/lib/supabase";
import { timeAgo } from "@/lib/helpers";
import { clock, usualNext, type Event, type useAreaWeek } from "@/lib/areaData";
import { BandCheck } from "@/components/BandCheck";

type WeekInfo = ReturnType<typeof useAreaWeek>;
type Band = "A" | "B" | "C" | "D" | "E";
const PROMISE: Record<Band, number> = { A: 20, B: 16, C: 12, D: 8, E: 4 };

type Props = {
  area: AreaStatus;
  events: Event[] | null; // today's timeline, newest first
  week: WeekInfo;
  saved: boolean;
  canSave: boolean;
  onSave: () => void;
  onChangeArea: () => void;
};

// Nothing reported in the last hour: the last report from the past 24 hours
function useLastReport(areaId: string, unknown: boolean) {
  const [last, setLast] = useState<{ id: string; last: { status: "on" | "off"; at: string } | null } | null>(null);
  useEffect(() => {
    if (!unknown) return;
    let alive = true;
    supabase.rpc("area_last_report", { p_area: areaId }).then(({ data }) => {
      if (alive) setLast({ id: areaId, last: (data as { status: "on" | "off"; at: string } | null) ?? null });
    });
    return () => {
      alive = false;
    };
  }, [areaId, unknown]);
  return last?.id === areaId ? last.last : null;
}

// "Band B · 6.6 hrs short a day this week". Tap to change your band.
function BandBadge({ areaId, areaName, avg }: { areaId: string; areaName: string; avg: number }) {
  const [c, setC] = useState<{ id: string; band: Band | null } | null>(null);
  const [changing, setChanging] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    supabase.rpc("band_check", { p_area: areaId, p_device_id: getDeviceId() }).then(({ data }) => {
      const d = data as { mine: Band | null; area: Band | null } | null;
      if (alive) setC({ id: areaId, band: d ? (d.mine ?? d.area) : null });
    });
    return () => {
      alive = false;
    };
  }, [areaId, tick]);
  const band = c?.id === areaId ? c.band : null;

  if (changing)
    return (
      <div className="mt-2 w-full max-w-sm text-left">
        <BandCheck areaId={areaId} areaName={areaName} avg={avg} variant="ask" forcePick onDone={() => { setChanging(false); setTick((n) => n + 1); }} />
      </div>
    );
  if (!band) return null;

  const short = Math.round((PROMISE[band] - avg) * 10) / 10;
  const kept = short <= 0;
  return (
    <button
      onClick={() => setChanging(true)}
      aria-label={`Band ${band}. Tap to change your band`}
      className={`mt-2 rounded-full border px-3 py-1.5 text-[13px] font-bold ${
        kept ? "border-[#30A46C]/40 bg-[#30A46C]/12 text-[#30A46C]" : "border-[#E5484D]/40 bg-[#E5484D]/12 text-[#E5484D]"
      }`}
    >
      Band {band} · {kept ? "promise kept this week" : `${short} hrs short a day this week`}
    </button>
  );
}

export function HomeHero({ area, events, week, saved, canSave, onSave, onChangeArea }: Props) {
  const last = useLastReport(area.area_id, area.status === "unknown");
  const people = area.on_count + area.off_count;

  // When the current status started: the newest run of today's timeline with the same status.
  // (A newer report that disagrees but hasn't changed the area yet doesn't reset it.)
  const run = area.status !== "unknown" ? events?.find((e) => e.status === area.status) : undefined;
  const since = run ? clock(run.at) : null;
  // "3 neighbours", or when they disagree: "2 say light dey, 1 says no light"
  const who =
    area.on_count > 0 && area.off_count > 0
      ? `${area.on_count} ${area.on_count === 1 ? "says" : "say"} light dey, ${area.off_count} ${area.off_count === 1 ? "says" : "say"} no light`
      : `${people} ${people === 1 ? "neighbour" : "neighbours"}`;

  let word: string;
  let line: string;
  if (area.status === "on") {
    word = "Light dey";
    line = `${since ? `Since ${since}` : timeAgo(area.last_report_at)} · ${who}`;
  } else if (area.status === "off") {
    word = "No light";
    line = `${since ? `Since ${since}` : timeAgo(area.last_report_at)} · ${who}`;
  } else if (last) {
    word = last.status === "on" ? "Light still dey?" : "Still no light?";
    line = `Last report ${timeAgo(last.at)}: ${last.status === "on" ? "Light dey" : "No light"}`;
  } else {
    word = "No reports yet";
    line = `Be the first in ${area.name} to report`;
  }
  const usual = week?.enough ? usualNext(week.on, area.status) ?? (week.ranges.length ? `Usually has light ${week.ranges.join(" and ")}` : null) : null;

  const wordCls =
    area.status === "on"
      ? "text-(--light-text) text-[46px]"
      : area.status === "off"
        ? "text-(--soft) text-[46px]"
        : "text-(--text) text-[30px]";

  return (
    <section className="ld-card-in flex flex-col items-center gap-1 text-center" aria-live="polite">
      <button onClick={onChangeArea} className="flex min-h-10 items-center gap-1.5 text-[22px] font-extrabold" aria-label={`${area.name}. Change area`}>
        <span className="max-w-[260px] truncate">{area.name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-(--muted)">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <span className="text-[12px] font-bold uppercase tracking-[1.4px] text-(--muted)">
        {area.city}
        {saved ? " · My place" : ""}
      </span>
      <span className={`mt-2 font-display font-extrabold leading-[1.1] tracking-[-1.5px] ${wordCls}`}>{word}</span>
      <span className="text-[16px] font-semibold">{line}</span>
      {usual && <span className="text-[15px] text-(--muted)">{usual}</span>}
      {week?.enough && <BandBadge areaId={area.area_id} areaName={area.name} avg={week.avg} />}
      {!saved && canSave && (
        <button onClick={onSave} className="mt-2 flex min-h-9 items-center gap-1.5 rounded-full border border-(--light) bg-(--light)/15 px-3.5 text-[13px] font-bold">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Save to my places
        </button>
      )}
    </section>
  );
}