"use client";

import { useEffect, useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import { buzz, getLocation } from "@/lib/helpers";
import { IconCheck, IconWarning } from "@/components/Icons";

type Band = "A" | "B" | "C" | "D" | "E";
type Check = { mine: Band | null; area: Band | null; votes: number; total: number };

// Minimum hours a day each band is meant to get (NERC)
const PROMISE: Record<Band, number> = { A: 20, B: 16, C: 12, D: 8, E: 4 };
const BANDS = Object.keys(PROMISE) as Band[];

// "Band A: promised 20+ hrs a day, people reported 4.3." Only shown inside the week line,
// so it never appears without a week of data behind it.
export function BandCheck({ areaId, areaName, avg }: { areaId: string; areaName: string; avg: number }) {
  const [check, setCheck] = useState<{ areaId: string; c: Check } | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<Band | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase.rpc("band_check", { p_area: areaId, p_device_id: getDeviceId() }).then(({ data }) => {
      if (alive && data) setCheck({ areaId, c: data as Check });
    });
    return () => {
      alive = false;
    };
  }, [areaId, tick]);

  async function pick(b: Band) {
    if (busy) return;
    buzz(8);
    setBusy(b);
    setError(null);
    const loc = await getLocation();
    if (!loc.ok) {
      setBusy(null);
      setError(loc.reason === "denied" ? "Location is blocked. Allow it to set your band." : "Couldn't get your location. Try again.");
      return;
    }
    const { error: err } = await supabase.rpc("set_band", {
      p_device_id: getDeviceId(),
      p_band: b,
      p_area_id: areaId,
      p_lat: loc.lat,
      p_lng: loc.lng,
    });
    setBusy(null);
    if (err) {
      setError(err.message.includes("too_far") ? `Set your band when you're in ${areaName}'s town.` : "Couldn't save that. Try again.");
      return;
    }
    buzz([15, 30, 15]);
    setPicking(false);
    setTick((n) => n + 1);
  }

  const c = check?.areaId === areaId ? check.c : null;
  if (!c) return null;
  const band = c.mine ?? c.area;

  if (!band || picking) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[14px] leading-snug">
          {band ? "Change your band:" : <>What band are you on? <span className="text-(--muted)">See how {areaName} compares.</span></>}
        </span>
        <div className="flex gap-1.5">
          {BANDS.map((b) => (
            <button
              key={b}
              onClick={() => pick(b)}
              disabled={!!busy}
              className={`flex h-9 flex-1 items-center justify-center rounded-xl border text-[14px] font-bold transition-transform active:scale-95 ${
                busy === b ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised)"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <span className="text-xs text-(--muted)">Not sure? It&apos;s on your token receipt or bill.</span>
        {error && <span className="text-xs text-(--soft)" role="status">{error}</span>}
      </div>
    );
  }

  const promised = PROMISE[band];
  const short = Math.round((promised - avg) * 10) / 10;
  const kept = short <= 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[14px] leading-snug">
        <span className="rounded-lg border border-(--line-strong) px-2 py-0.5 text-[13px] font-bold">Band {band}</span>
        <span className="flex-1">
          Promised <strong>{promised}+ hrs</strong> a day, got <strong>{avg}</strong>
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={`flex items-center gap-1 font-bold ${kept ? "text-[#30A46C]" : "text-[#E5484D]"}`}>
          {kept ? <IconCheck size={14} /> : <IconWarning size={14} />}
          {kept ? "Promise kept this week" : `${short} hrs short a day`}
        </span>
        <button onClick={() => setPicking(true)} className="shrink-0 text-(--muted) underline underline-offset-2">
          {c.mine ? "Yours" : `${c.votes} of ${c.total} here`} · change
        </button>
      </div>
    </div>
  );
}