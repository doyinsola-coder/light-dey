"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CountUp } from "@/components/CountUp";

type Hour = { hour_of_day: number; status: "on" | "off" };

function lagosHourNow() {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date())
  ) % 24;
}

// 24 little blocks for today: yellow = light, grey = no light, faint = no data, empty = not yet
export function TodayBar({ areaId, areaName, refreshKey }: { areaId: string; areaName: string; refreshKey: string }) {
  const [data, setData] = useState<{ key: string; hours: Hour[] } | null>(null);
  const key = `${areaId}|${refreshKey}`;

  useEffect(() => {
    let alive = true;
    supabase.rpc("area_today", { p_area: areaId }).then(({ data: rows }) => {
      if (alive) setData({ key, hours: (rows as Hour[] | null) ?? [] });
    });
    return () => {
      alive = false;
    };
  }, [areaId, key]);

  const hours = data?.key === key ? data.hours : [];
  const byHour = new Map(hours.map((h) => [h.hour_of_day, h.status]));
  const now = lagosHourNow();
  const lightHours = hours.filter((h) => h.status === "on").length;

  return (
    <section className="flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5" aria-label={`Today in ${areaName}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">Today in {areaName}</h2>
        <span className="font-display text-xl font-bold text-(--light-text)">
          <CountUp value={lightHours} /> hr{lightHours === 1 ? "" : "s"}
        </span>
      </div>
      {/* key: the blocks grow in again once today's data arrives */}
      <div key={data?.key ?? "loading"} className="flex h-9 items-end gap-[3px]" role="img" aria-label={`${lightHours} hours of light reported today`}>
        {Array.from({ length: 24 }, (_, h) => {
          const s = byHour.get(h);
          const cls =
            h > now
              ? "border border-dashed border-(--line)"
              : s === "on"
                ? "bg-(--light)"
                : s === "off"
                  ? "bg-(--off-dot)"
                  : "bg-(--divider)";
          const isNow = h === now;
          return (
            <div
              key={h}
              className={`ld-grow-y flex-1 rounded-[4px] ${cls} ${isNow ? "ld-breathe h-full ring-2 ring-(--light) ring-offset-1 ring-offset-(--card)" : s === "on" ? "h-full" : "h-[70%]"}`}
              style={{ animationDelay: isNow ? undefined : `${h * 22}ms` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-(--muted)">
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
      </div>
    </section>
  );
}