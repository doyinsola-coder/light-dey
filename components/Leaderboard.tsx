"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { whatsappShare } from "@/lib/helpers";
import { ShareCardButton } from "@/components/ShareCardButton";
import { RankBadge } from "@/components/Icons";

type CityRow = { city: string; hrs_per_day: number; areas: number };
type AreaRow = { area_id: string; name: string; hrs_per_day: number; known_hours: number };
type Tab = "cities" | "areas";

type Props = {
  city: string;
  onOpenArea: (areaId: string) => void;
};

export function Leaderboard({ city, onOpenArea }: Props) {
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
      ? `Which ${tab === "cities" ? "city" : `${city} area`} get light pass this week?\n\n` +
        rows.slice(0, 5).map((r, i) => `${i + 1}. ${r.label}: ${r.hrs} hrs/day`).join("\n") +
        `\n\nAdd your area: ${location.origin}`
      : "";

  return (
    <main className="ld-view-in ld-safe-top ld-safe-bottom mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5">

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

      {!rows && (
        <div className="flex flex-col gap-4" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ld-skeleton h-14 rounded-2xl" />
          ))}
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="rounded-[22px] border-2 border-dashed border-(--line-strong) p-5">
          <p className="text-base font-bold">Not enough reports yet this week.</p>
          <p className="mt-1 text-[15px] text-(--soft)">
            An area joins the ranking once it has a few hours of reports. Get your neighbours reporting.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ol key={tab} className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-base font-bold">
                    <RankBadge rank={i + 1} />
                    {r.label}
                  </span>
                  <span className="shrink-0 text-[15px] font-bold text-(--light-text)">{r.hrs} hrs/day</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-(--divider)">
                  <div
                    className="ld-grow-x h-2.5 rounded-full bg-[linear-gradient(90deg,#FFB300,#FFC531,#FFD866)]"
                    style={{ width: `${Math.min(100, (r.hrs / 24) * 100)}%`, animationDelay: `${150 + i * 70}ms` }}
                  />
                </div>
                {r.sub && <span className="text-[13px] text-(--muted)">{r.sub}</span>}
              </>
            );
            return (
              <li key={r.id} className="ld-rise" style={{ animationDelay: `${i * 70}ms` }}>
                {tab === "areas" ? (
                  <button
                    onClick={() => onOpenArea(r.id)}
                    className={`flex w-full flex-col gap-2 rounded-[20px] border p-3.5 text-left ${i === 0 ? "border-(--light) bg-(--raised)" : "border-(--line) bg-(--raised)"}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={`flex flex-col gap-2 rounded-[20px] border p-3.5 ${i === 0 ? "border-(--light) bg-(--raised)" : "border-(--line) bg-(--raised)"}`}>
                    {body}
                  </div>
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
        <div className="mt-auto flex flex-col gap-1">
          <ShareCardButton
            imageUrl={tab === "cities" ? "/api/leaderboard-card?type=cities" : `/api/leaderboard-card?type=areas&city=${encodeURIComponent(city)}`}
            fileName={tab === "cities" ? "light-dey-cities-ranking" : `light-dey-${city}-ranking`}
            text={shareText}
            label="Share ranking card"
          />
          <a
            href={whatsappShare(shareText)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center text-[15px] font-medium text-(--soft) underline underline-offset-4"
          >
            or send it as text
          </a>
        </div>
      )}
    </main>
  );
}