"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { whatsappShare } from "@/lib/helpers";

type CityRow = { city: string; hrs_per_day: number; areas: number };
type AreaRow = { area_id: string; name: string; hrs_per_day: number; known_hours: number };
type Tab = "cities" | "areas";

type Props = {
  city: string;
  onBack: () => void;
  onOpenArea: (areaId: string) => void;
};

export function Leaderboard({ city, onBack, onOpenArea }: Props) {
  const [tab, setTab] = useState<Tab>("cities");
  const [cities, setCities] = useState<CityRow[] | null>(null);
  const [areas, setAreas] = useState<{ city: string; rows: AreaRow[] } | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.rpc("leaderboard_cities").then(({ data }) => {
      if (alive) setCities((data as CityRow[] | null) ?? []);
    });
    supabase.rpc("leaderboard_areas", { p_city: city }).then(({ data }) => {
      if (alive) setAreas({ city, rows: (data as AreaRow[] | null) ?? [] });
    });
    return () => {
      alive = false;
    };
  }, [city]);

  const areaRows = areas?.city === city ? areas.rows : null;
  const rows =
    tab === "cities"
      ? cities?.map((c) => ({ id: c.city, label: c.city, hrs: Number(c.hrs_per_day), sub: `${c.areas} area${c.areas === 1 ? "" : "s"} reporting` }))
      : areaRows?.map((a) => ({ id: a.area_id, label: a.name, hrs: Number(a.hrs_per_day), sub: "" }));

  const shareText =
    rows && rows.length > 0
      ? `Which ${tab === "cities" ? "city" : `${city} area`} get light pass this week? ⚡\n\n` +
        rows.slice(0, 5).map((r, i) => `${i + 1}. ${r.label}: ${r.hrs} hrs/day`).join("\n") +
        `\n\nAdd your area 💡 ${location.origin}`
      : "";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-6">
      <header>
        <button onClick={onBack} className="flex min-h-11 items-center gap-1 pr-3 text-[15px] font-medium">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </button>
      </header>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-(--muted)">Last 7 days</span>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.02] tracking-tight">
          {tab === "cities" ? "Which city get light pass?" : `Which part of ${city} get light pass?`}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-full bg-(--card) p-1" role="tablist" aria-label="Leaderboard">
        {(["cities", "areas"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-full text-[15px] font-bold ${tab === t ? "bg-(--text) text-(--bg)" : "text-(--soft)"}`}
          >
            {t === "cities" ? "Cities" : `${city} areas`}
          </button>
        ))}
      </div>

      {!rows && <p className="text-(--muted)">Loading…</p>}

      {rows && rows.length === 0 && (
        <div className="rounded-[22px] border-2 border-dashed border-(--line-strong) p-5">
          <p className="text-base font-bold">Not enough reports yet this week.</p>
          <p className="mt-1 text-[15px] text-(--soft)">
            An area joins the ranking once it has a few hours of reports. Get your neighbours reporting.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ol className="flex flex-col gap-4">
          {rows.map((r, i) => {
            const body = (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-bold">
                    {i + 1}. {r.label}
                  </span>
                  <span className="shrink-0 text-[15px] font-bold text-(--light-text)">{r.hrs} hrs/day</span>
                </div>
                <div className="h-3 overflow-hidden rounded-md bg-(--divider)">
                  <div className="h-3 rounded-md bg-(--light)" style={{ width: `${Math.min(100, (r.hrs / 24) * 100)}%` }} />
                </div>
                {r.sub && <span className="text-[13px] text-(--muted)">{r.sub}</span>}
              </>
            );
            return (
              <li key={r.id}>
                {tab === "areas" ? (
                  <button onClick={() => onOpenArea(r.id)} className="flex w-full flex-col gap-1.5 text-left">
                    {body}
                  </button>
                ) : (
                  <div className="flex flex-col gap-1.5">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[13px] text-(--muted)">
        Hours of light per day, worked out from reports. One report counts for up to 6 hours until someone updates it.
      </p>

      {shareText && (
        <a
          href={whatsappShare(shareText)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex min-h-14 items-center justify-center rounded-2xl bg-(--light) text-base font-bold text-(--ink)"
        >
          Share this ranking
        </a>
      )}
    </main>
  );
}