"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { whatsappShare } from "@/lib/helpers";
import { ShareCardButton } from "@/components/ShareCardButton";

type B = {
  id: number;
  city_a: string;
  city_b: string;
  ends_at: string;
  people_a: number;
  people_b: number;
  finished: boolean;
};

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h}h left`;
  return "Ends soon";
}

// The official City battle for your town (set by the Light Dey team): live score on the home screen
export function BattleBanner({ city }: { city: string }) {
  const [b, setB] = useState<{ city: string; battle: B | null } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.rpc("current_battle", { p_city: city }).then(({ data }) => {
      const row = (data as B[] | null)?.[0] ?? null;
      if (alive) setB({ city, battle: row ? { ...row, people_a: Number(row.people_a), people_b: Number(row.people_b) } : null });
    });
    return () => {
      alive = false;
    };
  }, [city]);

  const x = b?.city === city ? b.battle : null;
  if (!x) return null;

  const mineA = city === x.city_a;
  const me = mineA ? x.people_a : x.people_b;
  const them = mineA ? x.people_b : x.people_a;
  const rival = mineA ? x.city_b : x.city_a;
  const gap = Math.abs(me - them);
  const total = Math.max(1, me + them);
  const line = x.finished
    ? me === them
      ? "Na draw! Rematch loading."
      : me > them
        ? `${city} won by ${gap}! Well done.`
        : `${rival} won by ${gap}. Next time.`
    : me === them
      ? me === 0
        ? "Who go start first? Report now."
        : "Na draw! One more person fit change am."
      : me > them
        ? `${city} dey lead by ${gap}. Hold am!`
        : `${rival} dey lead by ${gap}. Bring your people!`;

  const shareText = x.finished
    ? `City battle result: ${x.city_a} ${x.people_a} vs ${x.city_b} ${x.people_b} people reporting. ${line}\n${location.origin}`
    : `City battle: ${x.city_a} vs ${x.city_b}. ${city} needs you! Report your area on Light Dey: ${location.origin}`;

  return (
    <section className="ld-card-in flex flex-col gap-3 rounded-[24px] border border-(--light) bg-(--card) p-4" aria-label="City battle">
      <button onClick={() => setOpen(!open)} className="flex flex-col gap-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-extrabold uppercase tracking-[1.5px] text-(--light-text)">City battle</span>
          <span className="text-[12px] font-bold text-(--muted)">{x.finished ? "Final" : timeLeft(x.ends_at)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div className="flex flex-col">
            <span className={`text-[15px] font-bold ${mineA ? "" : "text-(--soft)"}`}>{x.city_a}{mineA ? " (you)" : ""}</span>
            <span className="font-display text-[36px] font-extrabold leading-none">{x.people_a}</span>
          </div>
          <span className="pb-1 text-[12px] font-extrabold text-(--muted)">VS</span>
          <div className="flex flex-col items-end">
            <span className={`text-[15px] font-bold ${mineA ? "text-(--soft)" : ""}`}>{x.city_b}{mineA ? "" : " (you)"}</span>
            <span className="font-display text-[36px] font-extrabold leading-none">{x.people_b}</span>
          </div>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-(--raised)">
          <span className="h-full bg-(--light) transition-[width] duration-700" style={{ width: `${x.people_a + x.people_b === 0 ? 50 : Math.round((x.people_a / total) * 100)}%` }} />
          <span className="h-full flex-1 bg-(--line-strong)" />
        </div>
        <span className="text-[14px] font-bold">{line}</span>
        <span className="text-[12px] text-(--muted)">People reporting since the battle started. Tap to share.</span>
      </button>
      {open && (
        <div className="ld-card-in flex flex-col gap-1">
          <ShareCardButton imageUrl={`/api/battle-card?id=${x.id}`} fileName={`light-dey-battle-${x.city_a}-${x.city_b}`} text={shareText} label="Share battle card" />
          <a href={whatsappShare(shareText)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center text-[15px] font-medium text-(--soft) underline underline-offset-4">
            or send it as text
          </a>
        </div>
      )}
    </section>
  );
}