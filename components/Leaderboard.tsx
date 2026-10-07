"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { whatsappShare } from "@/lib/helpers";
import { ShareCardButton } from "@/components/ShareCardButton";
import { RankBadge } from "@/components/Icons";
import { Battle } from "@/components/Battle";

type CityRow = { city: string; hrs_per_day: number; areas: number };
type AreaRow = { area_id: string; name: string; hrs_per_day: number; known_hours: number };
type Tab = "cities" | "areas" | "battle";

type Props = {
  city: string;
  onOpenArea: (areaId: string) => void;
};

export function Leaderboard({ city, onOpenArea }: Props) {
  const [tab, setTab] = useState<Tab>("cities");
  // The Battle tab only shows while the Light Dey team is running an official battle for this town
  const [battleOn, setBattleOn] = useState<{ city: string; on: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.rpc("current_battle", { p_city: city }).then(({ data }) => {
      if (alive) setBattleOn({ city, on: ((data as unknown[] | null) ?? []).length > 0 });
    });
    return () => {
      alive = false;
    };
  }, [city]);
  const hasBattle = battleOn?.city === city && battleOn.on;
  const tabs: Tab[] = hasBattle ? ["cities", "areas", "battle"] : ["cities", "areas"];
  const shown: Tab = tab === "battle" && !hasBattle ? "cities" : tab;
  const [cities, setCities] = useState<CityRow[] | null>(null);
  const [areas, setAreas] = useState<{ city: string; rows: AreaRow[] } | null>(null);

  // failed: the ranking couldn't load (network or server). Shown as an error, never as "no reports".
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    supabase.rpc("leaderboard_cities").then(({ data, error }) => {
      if (!alive) return;
      if (error) setFailed(true);
      else setCities((data as CityRow[] | null) ?? []);
    });
    supabase.rpc("leaderboard_areas", { p_city: city }).then(({ data, error }) => {
      if (!alive) return;
      if (error) setFailed(true);
      else setAreas({ city, rows: (data as AreaRow[] | null) ?? [] });
    });
    return () => {
      alive = false;
    };
  }, [city, retry]);

  const areaRows = areas?.city === city ? areas.rows : null;
  const rows =
    shown === "cities"
      ? cities?.map((c) => ({ id: c.city, label: c.city, hrs: Number(c.hrs_per_day), sub: `${c.areas} area${c.areas === 1 ? "" : "s"} reporting` }))
      : areaRows?.map((a) => ({ id: a.area_id, label: a.name, hrs: Number(a.hrs_per_day), sub: "" }));

  const shareText =
    rows && rows.length > 0
      ? `Which ${shown === "cities" ? "city" : `${city} area`} get light pass this week?\n\n` +
        rows.slice(0, 5).map((r, i) => `${i + 1}. ${r.label}: ${r.hrs} hrs/day`).join("\n") +
        `\n\nAdd your area: ${location.origin}`
      : "";

  return (
    <main className="ld-view-in ld-safe-top ld-safe-bottom mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5">

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-(--muted)">Last 7 days</span>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.02] tracking-tight">
          {shown === "cities" ? "Which city get light pass?" : shown === "areas" ? `Which part of ${city} get light pass?` : "City battle"}
        </h1>
      </div>

      <div className={`grid ${hasBattle ? "grid-cols-3" : "grid-cols-2"} gap-1.5 rounded-full bg-(--card) p-1`} role="tablist" aria-label="Leaderboard">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={shown === t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-full text-[15px] font-bold ${shown === t ? "bg-(--text) text-(--bg)" : "text-(--soft)"}`}
          >
            <span className="block truncate px-2">{t === "cities" ? "Cities" : t === "areas" ? `${city} areas` : "Battle"}</span>
          </button>
        ))}
      </div>

      {shown === "battle" && <Battle city={city} />}

      {shown !== "battle" && failed && (
        <div className="flex flex-col items-start gap-3 rounded-[22px] border border-(--line) bg-(--raised) p-5">
          <p className="text-base font-bold">Couldn&apos;t load the ranking.</p>
          <p className="-mt-2 text-[15px] text-(--soft)">Check your data and try again.</p>
          <button
            onClick={() => {
              setFailed(false);
              setRetry((n) => n + 1);
            }}
            className="min-h-11 rounded-full bg-(--light) px-5 text-[15px] font-bold text-(--ink)"
          >
            Try again
          </button>
        </div>
      )}

      {shown !== "battle" && !failed && !rows && (
        <div className="flex flex-col gap-4" aria-label="Loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ld-skeleton h-14 rounded-2xl" />
          ))}
        </div>
      )}

      {shown !== "battle" && !failed && rows && rows.length === 0 && (
        <div className="rounded-[22px] border-2 border-dashed border-(--line-strong) p-5">
          <p className="text-base font-bold">Not enough reports yet this week.</p>
          <p className="mt-1 text-[15px] text-(--soft)">
            An area joins the ranking once it has a few hours of reports. Get your neighbours reporting.
          </p>
        </div>
      )}

      {shown !== "battle" && rows && rows.length > 0 && (
        <ol key={shown} className="flex flex-col gap-3">
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
                {shown === "areas" ? (
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

      {shown !== "battle" && <p className="text-[13px] text-(--muted)">
        Hours of light per day, worked out from reports. One report counts for up to 6 hours until someone updates it.
      </p>}

      {shown !== "battle" && shareText && (
        <div className="mt-auto flex flex-col gap-1">
          <ShareCardButton
            imageUrl={shown === "cities" ? "/api/leaderboard-card?type=cities" : `/api/leaderboard-card?type=areas&city=${encodeURIComponent(city)}`}
            fileName={shown === "cities" ? "light-dey-cities-ranking" : `light-dey-${city}-ranking`}
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