"use client";

import { useState } from "react";
import { clock, lagosHourNow, type Event, type useAreaWeek } from "@/lib/areaData";

type WeekInfo = ReturnType<typeof useAreaWeek>;

function dayLabel(day: string, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Yest.";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

// "Today in Tanke": Light came 6:12pm · 4 reports, Light went 12:03pm · 2 reports, ...
export function TodayTimeline({ areaName, events, lightHours, week }: { areaName: string; events: Event[] | null; lightHours: number; week: WeekInfo }) {
  const [all, setAll] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const list = events ?? [];
  const shown = all ? list : list.slice(0, 3);
  const now = lagosHourNow();

  return (
    <section className="flex flex-col gap-1 rounded-[24px] border border-(--line) bg-(--card) p-4.5" aria-label={`Today in ${areaName}`}>
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <h2 className="font-display text-[15px] font-bold">Today in {areaName}</h2>
        {events && <span className="shrink-0 text-[13px] text-(--muted)">{lightHours} hr{lightHours === 1 ? "" : "s"} of light</span>}
      </div>

      {events === null ? (
        <div className="flex flex-col gap-3 py-1" aria-label="Loading">
          <div className="ld-skeleton h-10 rounded-xl" />
          <div className="ld-skeleton h-10 rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-1 text-[14px] text-(--muted)">No reports from {areaName} today yet. Your report starts the day.</p>
      ) : (
        <ol className="flex flex-col">
          {shown.map((e, i) => {
            const first = i === list.length - 1; // the day's first report: no change to describe
            const on = e.status === "on";
            const label = first ? (on ? "Light dey (first report)" : "No light (first report)") : on ? "Light came" : "Light went";
            const lastShown = i === shown.length - 1;
            return (
              <li key={e.at} className="flex gap-3">
                <span className="flex flex-col items-center pt-1" aria-hidden="true">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${on ? "bg-(--light)" : "bg-(--off-dot)"} ${i === 0 && on ? "shadow-[0_0_10px_rgba(255,197,49,0.7)]" : ""}`} />
                  {!lastShown && <span className="w-0.5 flex-1 bg-(--line)" />}
                </span>
                <span className={`flex flex-col ${lastShown ? "" : "pb-3"}`}>
                  <span className="text-[15px] font-extrabold">{label}</span>
                  <span className="text-[13px] text-(--muted)">
                    {clock(e.at)} · {e.reports} report{e.reports === 1 ? "" : "s"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {showWeek && week && (
        <div className="ld-card-in mt-3 flex flex-col gap-1.5 border-t border-(--divider) pt-3" role="img" aria-label={`Light reported in ${areaName} over the last 7 days`}>
          {week.week.days.map((d, i) => (
            <div key={d.day} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs text-(--muted)">{dayLabel(d.day, i)}</span>
              <div className="flex h-4 flex-1 gap-[2px]">
                {Array.from(d.hours).map((c, h) => (
                  <div
                    key={h}
                    className={`flex-1 rounded-[3px] ${
                      i === 0 && h > now ? "border border-dashed border-(--line)" : c === "1" ? "bg-(--light)" : c === "0" ? "bg-(--off-dot)" : "bg-(--divider)"
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
            {week.enough ? <>About <strong className="text-(--text)">{week.avg} hrs</strong> of light a day, from </> : "From "}
            {week.week.reports} reports by {week.week.people} people. Faint blocks: nobody reported.
          </p>
        </div>
      )}

      <div className="mt-2 flex gap-5">
        {list.length > 3 && (
          <button onClick={() => setAll(!all)} className="min-h-9 text-[14px] font-extrabold text-(--light-text)" aria-expanded={all}>
            {all ? "Show less" : "See the whole day"}
          </button>
        )}
        {week && week.week.reports > 0 && (
          <button onClick={() => setShowWeek(!showWeek)} className="min-h-9 text-[14px] font-extrabold text-(--light-text)" aria-expanded={showWeek}>
            {showWeek ? "Hide the week" : "This week"}
          </button>
        )}
      </div>
    </section>
  );
}