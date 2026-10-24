"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { IconBolt, IconInfo } from "@/components/Icons";
import { BandCheck } from "@/components/BandCheck";

type Week = {
  days: { day: string; hours: string }[]; // newest first; each hour is "1" light, "0" no light, "." nobody reported
  usual: { h: number; on: number; known: number }[];
  reports: number;
  people: number;
};

// Only claim a pattern when there's enough behind it
const MIN_REPORTS = 15;
const MIN_DAYS = 3;
const MIN_DAYS_PER_HOUR = 3;
const SHARE = 0.7; // light on at least 70% of the days someone reported that hour

const fmtHour = (h: number) => (h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);

function lagosHourNow() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date())) % 24;
}

function dayLabel(day: string, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Yest.";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

// Hours that usually have light, as readable ranges: "6pm to 11pm"
function usualRanges(usual: Week["usual"]) {
  const on = Array.from({ length: 24 }, (_, h) => {
    const u = usual.find((x) => x.h === h);
    return !!u && u.known >= MIN_DAYS_PER_HOUR && u.on / u.known >= SHARE;
  });
  if (on.every(Boolean)) return ["all day"];
  const runs: { start: number; len: number }[] = [];
  for (let h = 0; h < 24; h++) {
    if (on[h] && !on[(h + 23) % 24]) {
      let len = 0;
      while (len < 24 && on[(h + len) % 24]) len++;
      runs.push({ start: h, len });
    }
  }
  // The two longest stretches, in time order
  return runs
    .sort((a, b) => b.len - a.len)
    .slice(0, 2)
    .sort((a, b) => a.start - b.start)
    .map((r) => `${fmtHour(r.start)} to ${fmtHour((r.start + r.len) % 24)}`);
}

export function WeekHistory({ areaId, areaName, refreshKey }: { areaId: string; areaName: string; refreshKey: string }) {
  const key = `${areaId}|${refreshKey}`;
  const [data, setData] = useState<{ key: string; week: Week | null } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.rpc("area_week", { p_area: areaId }).then(({ data: w }) => {
      if (alive) setData({ key, week: (w as Week | null) ?? null });
    });
    return () => {
      alive = false;
    };
  }, [areaId, key]);

  const week = data?.week;
  if (!week) return null;

  const withData = week.days.filter((d) => /[01]/.test(d.hours));
  const lightHours = week.days.reduce((n, d) => n + (d.hours.match(/1/g)?.length ?? 0), 0);
  const avg = withData.length ? Math.round((lightHours / withData.length) * 10) / 10 : 0;
  const enough = week.reports >= MIN_REPORTS && withData.length >= MIN_DAYS;
  const ranges = enough ? usualRanges(week.usual) : [];
  const now = lagosHourNow();

  // Quiet until there's a real pattern: no extra card, no "not enough data" message.
  // Only the band question, so band answers build up before the week data does.
  if (!enough) return <BandCheck areaId={areaId} areaName={areaName} avg={null} />;

  return (
    <div className="flex flex-col gap-3 border-t border-(--divider) pt-3">
      <div className="flex items-start justify-between gap-3">
        {ranges.length ? (
          <p className="flex items-start gap-2 text-[14px] leading-snug">
            <IconBolt size={17} className="mt-0.5 text-(--light-text)" />
            <span>
              Usually has light <strong>{ranges.join(" and ")}</strong>
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-[14px] leading-snug text-(--soft)">
            <IconInfo size={17} className="mt-0.5 text-(--muted)" />
            <span>No steady light pattern this week.</span>
          </p>
        )}
        <button onClick={() => setOpen(!open)} className="shrink-0 text-[13px] font-bold text-(--light-text)" aria-expanded={open}>
          {open ? "Hide" : "This week"}
        </button>
      </div>

      <BandCheck areaId={areaId} areaName={areaName} avg={avg} />

      {open && (
        <div className="ld-card-in flex flex-col gap-1.5" role="img" aria-label={`Light reported in ${areaName} over the last 7 days`}>
          {week.days.map((d, i) => (
            <div key={d.day} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs text-(--muted)">{dayLabel(d.day, i)}</span>
              <div className="flex h-4 flex-1 gap-[2px]">
                {Array.from(d.hours).map((c, h) => (
                  <div
                    key={h}
                    className={`flex-1 rounded-[3px] ${
                      i === 0 && h > now
                        ? "border border-dashed border-(--line)"
                        : c === "1"
                          ? "bg-(--light)"
                          : c === "0"
                            ? "bg-(--off-dot)"
                            : "bg-(--divider)"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-between pl-12 text-xs text-(--muted)">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
          </div>
          <p className="mt-1 text-xs leading-snug text-(--muted)">
            About <strong className="text-(--text)">{avg} hrs</strong> of light a day, from {week.reports} reports by {week.people} people. Faint blocks: nobody reported.
          </p>
        </div>
      )}
    </div>
  );
}