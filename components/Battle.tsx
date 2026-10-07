"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { whatsappShare } from "@/lib/helpers";
import { useCities } from "@/lib/cities";
import { ShareCardButton } from "@/components/ShareCardButton";

type Side = { city: string; state: string | null; people: number; reports: number; areas: number; hrs_per_day: number | null };
type Active = { city: string; state: string; people: number };

// Your town against another town, this week. The winner is the town with more people reporting,
// so the way to win is to get your neighbours on the app.
export function Battle({ city }: { city: string }) {
  const all = useCities();
  const [active, setActive] = useState<Active[] | null>(null);
  const [mine, setMine] = useState(city);
  const [rival, setRival] = useState("");
  const [result, setResult] = useState<{ key: string; sides: Side[] } | null>(null);

  useEffect(() => {
    supabase.rpc("battle_cities").then(({ data }) => setActive(((data as Active[] | null) ?? []).map((r) => ({ ...r, people: Number(r.people) }))));
  }, []);

  // Default rival: the busiest other town this week
  const theirs = rival || active?.find((a) => a.city !== mine)?.city || "";
  const key = `${mine}|${theirs}`;

  useEffect(() => {
    if (!mine || !theirs || mine === theirs) return;
    let alive = true;
    supabase.rpc("city_battle", { p_a: mine, p_b: theirs }).then(({ data }) => {
      if (!alive) return;
      const sides = ((data as Side[] | null) ?? []).map((s) => ({ ...s, people: Number(s.people), reports: Number(s.reports), areas: Number(s.areas) }));
      setResult({ key, sides });
    });
    return () => {
      alive = false;
    };
  }, [mine, theirs, key]);

  // Towns with reports first (busiest at the top), then every other town A–Z
  const options = useMemo(() => {
    const busy = (active ?? []).map((a) => a.city);
    const rest = all.map((c) => c.city).filter((c) => !busy.includes(c)).sort((a, b) => a.localeCompare(b));
    return { busy, rest };
  }, [active, all]);

  const sides = result?.key === key ? result.sides : null;
  const [x, y] = sides ?? [];
  const lead = x && y && x.people !== y.people ? (x.people > y.people ? x.city : y.city) : null;
  const gap = x && y ? Math.abs(x.people - y.people) : 0;

  const shareText =
    x && y
      ? `City battle this week: ${x.city} vs ${y.city}\n\n` +
        `${x.city}: ${x.people} people reporting\n${y.city}: ${y.people} people reporting\n\n` +
        (lead ? `${lead} dey lead by ${gap}. ` : "Na draw for now. ") +
        `Which side you dey? Report your area: ${location.origin}`
      : "";

  const select = "min-h-12 w-full appearance-none rounded-2xl border border-(--line) bg-(--raised) px-4 text-base font-bold outline-none focus:border-(--light)";
  const pick = (value: string, onChange: (v: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={select} aria-label={label}>
      {options.busy.length > 0 && (
        <optgroup label="Reporting this week">
          {options.busy.map((c) => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      )}
      <optgroup label="All towns">
        {options.rest.map((c) => <option key={c} value={c}>{c}</option>)}
      </optgroup>
    </select>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed text-(--soft)">
        The town with more people reporting this week wins. Want your town on top? Get your neighbours on Light Dey.
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {pick(mine, (v) => setMine(v), "Your town")}
        <span className="text-[13px] font-extrabold text-(--light-text)">VS</span>
        {pick(theirs, (v) => setRival(v), "Rival town")}
      </div>

      {mine === theirs ? (
        <p className="text-[15px] text-(--muted)">Pick two different towns.</p>
      ) : !sides ? (
        <div className="flex flex-col gap-3" aria-label="Loading">
          <div className="ld-skeleton h-36 rounded-[24px]" />
          <div className="ld-skeleton h-36 rounded-[24px]" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 text-center">
            <span className="font-display text-[28px] font-extrabold leading-tight tracking-tight">
              {lead ? `${lead} dey lead!` : x.people === 0 ? "Who go start first?" : "Na draw for now!"}
            </span>
            <span className="text-[14px] text-(--muted)">
              {lead ? `By ${gap} ${gap === 1 ? "person" : "people"}. E never finish.` : "Get your people reporting."}
            </span>
          </div>
          {[x, y].map((s, i) => {
            const win = lead === s.city;
            return (
              <div key={s.city} className="flex flex-col">
                {i === 1 && (
                  <span className="-my-3 z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-(--light) bg-(--bg) text-[14px] font-extrabold text-(--light-text)">
                    VS
                  </span>
                )}
                <div
                  className={`ld-rise flex flex-col gap-1.5 rounded-[24px] p-5 ${
                    win
                      ? "bg-[linear-gradient(145deg,#FFD866_0%,#FFC531_50%,#FFB300_100%)] text-(--ink) shadow-[0_18px_50px_-18px_rgba(255,190,30,0.7)]"
                      : "border border-(--line) bg-(--raised)"
                  }`}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[26px] font-extrabold tracking-tight">{s.city}</span>
                    {win && <span className="rounded-full bg-(--ink) px-3 py-1 text-[11px] font-extrabold tracking-[1.5px] text-(--light)">LEADING</span>}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[52px] font-extrabold leading-none tracking-tight">{s.people}</span>
                    <span className={`text-[15px] font-bold ${win ? "opacity-75" : "text-(--muted)"}`}>people reporting</span>
                  </div>
                  <span className={`text-[14px] ${win ? "font-medium opacity-75" : "text-(--muted)"}`}>
                    {s.reports} reports · {s.areas} areas · {s.hrs_per_day === null ? "light hours coming" : `${s.hrs_per_day} hrs light/day`}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-1">
            <ShareCardButton
              imageUrl={`/api/battle-card?a=${encodeURIComponent(x.city)}&b=${encodeURIComponent(y.city)}`}
              fileName={`light-dey-${x.city}-vs-${y.city}`}
              text={shareText}
              label="Share battle card"
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
        </>
      )}
    </div>
  );
}