"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── Time words ─────────────────────────────────────────────────────────────
export const fmtHour = (h: number) => (h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);

// "6:12pm", Nigeria time
export function clock(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })
    .format(new Date(iso))
    .replace(" ", "")
    .toLowerCase();
}

export function lagosHourNow() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date())) % 24;
}

// ─── Today's timeline ───────────────────────────────────────────────────────
export type Event = { status: "on" | "off"; at: string; reports: number; people: number };

// One stray report between two runs of the same status (someone tapping wrong, a flicker)
// shouldn't show as "Light came" then "Light went" five minutes later. Drop it and join the runs.
export function cleanEvents(newestFirst: Event[]): Event[] {
  const list = [...newestFirst].reverse(); // oldest first
  const kept: Event[] = [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const prev = list[i - 1];
    const next = list[i + 1];
    if (e.reports === 1 && prev && next && prev.status === next.status && prev.status !== e.status) continue;
    const last = kept.at(-1);
    if (last && last.status === e.status) {
      kept[kept.length - 1] = { ...last, reports: last.reports + e.reports, people: Math.max(last.people, e.people) };
    } else kept.push(e);
  }
  return kept.reverse();
}

export function useTimeline(areaId: string, refreshKey: string) {
  const key = `${areaId}|${refreshKey}`;
  const [data, setData] = useState<{ key: string; events: Event[]; lightHours: number } | null>(null);
  useEffect(() => {
    if (!areaId) return;
    let alive = true;
    supabase.rpc("area_timeline", { p_area: areaId }).then(({ data: d }) => {
      if (!alive || !d) return;
      const v = d as { events: Event[]; light_hours: number };
      setData({ key, events: cleanEvents(v.events ?? []), lightHours: Number(v.light_hours ?? 0) });
    });
    return () => {
      alive = false;
    };
  }, [areaId, key]);
  return data?.key === key ? data : null;
}

// ─── The week pattern ("usually has light 6pm to 11pm") ─────────────────────
export type Week = {
  days: { day: string; hours: string }[]; // newest first; "1" light, "0" no light, "." nobody reported
  usual: { h: number; on: number; known: number }[];
  reports: number;
  people: number;
};

const MIN_REPORTS = 15;
const MIN_DAYS = 3;
const MIN_DAYS_PER_HOUR = 3;
const SHARE = 0.7; // light on at least 70% of the days someone reported that hour

export function usualHours(usual: Week["usual"]) {
  return Array.from({ length: 24 }, (_, h) => {
    const u = usual.find((x) => x.h === h);
    return !!u && u.known >= MIN_DAYS_PER_HOUR && u.on / u.known >= SHARE;
  });
}

// "6pm to 11pm" (up to the two longest stretches)
export function usualRanges(on: boolean[]) {
  if (on.every(Boolean)) return ["all day"];
  const runs: { start: number; len: number }[] = [];
  for (let h = 0; h < 24; h++) {
    if (on[h] && !on[(h + 23) % 24]) {
      let len = 0;
      while (len < 24 && on[(h + len) % 24]) len++;
      runs.push({ start: h, len });
    }
  }
  return runs
    .sort((a, b) => b.len - a.len)
    .slice(0, 2)
    .sort((a, b) => a.start - b.start)
    .map((r) => `${fmtHour(r.start)} to ${fmtHour((r.start + r.len) % 24)}`);
}

// What usually happens next: "Usually goes around 11pm" / "Usually comes around 6pm"
export function usualNext(on: boolean[], status: "on" | "off" | "unknown", now = lagosHourNow()): string | null {
  if (!on.some(Boolean) || on.every(Boolean)) return null;
  if (status !== "on" && on[now]) return "Light usually dey at this hour";
  for (let i = 1; i <= 24; i++) {
    const h = (now + i) % 24;
    const prev = on[(h + 23) % 24];
    if (status === "on" && on[now] && prev && !on[h]) return `Usually goes around ${fmtHour(h)}`;
    if (status !== "on" && !prev && on[h]) return `Usually comes around ${fmtHour(h)}`;
  }
  return null;
}

export function useAreaWeek(areaId: string, refreshKey: string) {
  const key = `${areaId}|${refreshKey}`;
  const [data, setData] = useState<{ key: string; week: Week | null } | null>(null);
  useEffect(() => {
    if (!areaId) return;
    let alive = true;
    supabase.rpc("area_week", { p_area: areaId }).then(({ data: w }) => {
      if (alive) setData({ key, week: (w as Week | null) ?? null });
    });
    return () => {
      alive = false;
    };
  }, [areaId, key]);

  const week = data?.key === key ? data.week : null;
  if (!week) return null;
  const withData = week.days.filter((d) => /[01]/.test(d.hours));
  const lightHours = week.days.reduce((n, d) => n + (d.hours.match(/1/g)?.length ?? 0), 0);
  const avg = withData.length ? Math.round((lightHours / withData.length) * 10) / 10 : 0;
  const enough = week.reports >= MIN_REPORTS && withData.length >= MIN_DAYS;
  const on = enough ? usualHours(week.usual) : Array<boolean>(24).fill(false);
  return { week, enough, avg, on, ranges: enough ? usualRanges(on) : [] };
}