"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Status } from "@/lib/types";
import { timeAgo } from "@/lib/helpers";
import { lagosHourNow } from "@/lib/areaData";
import { MAX_PLACES, type Place } from "@/lib/places";

export type PlaceInfo = Record<string, { name: string; city: string; status: Status; last_report_at: string | null }>;

type Props = {
  places: Place[];
  currentId: string;
  info: PlaceInfo;
  refreshKey: number;
  onOpen: (p: Place) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

// Each other place's day, as a thin strip of 24 hours
function useDays(ids: string[], refreshKey: number) {
  const key = `${ids.join(",")}|${refreshKey}`;
  const [days, setDays] = useState<{ key: string; map: Record<string, Map<number, "on" | "off">> } | null>(null);
  useEffect(() => {
    if (!ids.length) return;
    let alive = true;
    Promise.all(ids.map((id) => supabase.rpc("area_today", { p_area: id }).then(({ data }) => [id, data] as const))).then((rows) => {
      if (!alive) return;
      const map: Record<string, Map<number, "on" | "off">> = {};
      for (const [id, data] of rows) map[id] = new Map(((data as { hour_of_day: number; status: "on" | "off" }[] | null) ?? []).map((h) => [h.hour_of_day, h.status]));
      setDays({ key, map });
    });
    return () => {
      alive = false;
    };
    // ids is derived from key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return days?.key === key ? days.map : {};
}

export function OtherPlaces({ places, currentId, info, refreshKey, onOpen, onAdd, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const others = places.filter((p) => p.id !== currentId);
  const days = useDays(others.map((p) => p.id), refreshKey);
  const now = lagosHourNow();
  const room = places.length < MAX_PLACES;

  return (
    <section className="flex flex-col gap-3" aria-label="Your other places">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[16px] font-bold">{others.length ? "Your other places" : "Your places"}</h2>
        {others.length > 0 && (
          <button onClick={() => setEditing(!editing)} className="min-h-9 text-[13px] font-bold text-(--light-text)">
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {others.map((p) => {
        const i = info[p.id];
        const st = i?.status ?? "unknown";
        const map = days[p.id];
        return (
          <article key={p.id} className="relative flex flex-col gap-2.5 rounded-[22px] border border-(--line) bg-(--card) px-4 py-3.5">
            <button onClick={() => onOpen(p)} className="flex items-center gap-2.5 text-left" aria-label={`Open ${i?.name ?? "place"}`}>
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${st === "on" ? "bg-(--light) shadow-[0_0_8px_rgba(255,197,49,0.7)]" : st === "off" ? "bg-(--off-dot)" : "border-2 border-(--off-dot)"}`}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[16px] font-extrabold">{i?.name ?? "…"}</span>
                <span className="text-[12px] text-(--muted)">
                  {p.city}
                  {i?.last_report_at ? ` · ${timeAgo(i.last_report_at)}` : " · no reports in the last hour"}
                </span>
              </span>
              {st === "on" ? (
                <span className="shrink-0 rounded-full bg-(--light) px-2.5 py-1 text-[12px] font-extrabold text-(--ink)">Light dey</span>
              ) : st === "off" ? (
                <span className="shrink-0 rounded-full bg-(--divider) px-2.5 py-1 text-[12px] font-extrabold text-(--soft)">No light</span>
              ) : (
                <span className="shrink-0 rounded-full border border-(--line) px-2.5 py-1 text-[12px] font-bold text-(--muted)">Not sure</span>
              )}
            </button>
            <div className="grid h-2.5 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }} aria-hidden="true">
              {Array.from({ length: 24 }, (_, h) => {
                const s = map?.get(h);
                return (
                  <span
                    key={h}
                    className={`rounded-[2px] ${h > now ? "border border-dashed border-(--line)" : s === "on" ? "bg-(--light)" : s === "off" ? "bg-(--off-dot)" : "bg-(--divider)"}`}
                  />
                );
              })}
            </div>
            {editing && (
              <button
                onClick={() => onRemove(p.id)}
                className="self-start rounded-full border border-dashed border-(--line-strong) px-3 py-1.5 text-[13px] font-bold text-(--soft)"
              >
                Remove {i?.name ?? "this place"}
              </button>
            )}
          </article>
        );
      })}

      {room && (
        <button
          onClick={onAdd}
          className="min-h-[52px] rounded-[18px] border border-dashed border-(--line-strong) text-[15px] font-extrabold text-(--soft)"
        >
          + Add a place (school, work, family)
        </button>
      )}
    </section>
  );
}