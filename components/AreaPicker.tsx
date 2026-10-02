"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AreaStatus } from "@/lib/types";
import { CITIES, POPULAR_CITIES } from "@/lib/types";

type Suggestion = { id: string; name: string; score: number };

type Props = {
  city: string;
  areas: AreaStatus[];
  loading: boolean;
  onCityChange: (city: string) => void;
  onPick: (areaId: string) => void;
  onAdd: (name: string) => Promise<string | null>; // returns an error message, or null when it worked
  initialQuery?: string; // e.g. "Tanke " when adding a street inside Tanke
  onClose?: () => void;
};

// "okeogun road" → "Okeogun Road" (leaves "GRA" alone)
function tidyName(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function AreaPicker({ city, areas, loading, onCityChange, onPick, onAdd, initialQuery = "", onClose }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [fuzzy, setFuzzy] = useState<{ key: string; items: Suggestion[] }>({ key: "", items: [] });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const term = q.trim().toLowerCase();
  const key = `${city}|${term}`;

  const list = useMemo(
    () =>
      areas
        .filter((a) => a.name.toLowerCase().includes(term))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [areas, term]
  );

  const exact = areas.some((a) => a.name.toLowerCase() === term);
  const canAdd = term.length >= 2 && !exact;

  // Typo-tolerant matches from the database ("Okelel" → Okelele), 300ms after typing stops
  useEffect(() => {
    if (!canAdd) return;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("suggest_areas", { p_city: city, p_q: term });
      setFuzzy({ key, items: (data as Suggestion[] | null) ?? [] });
    }, 300);
    return () => clearTimeout(t);
  }, [canAdd, city, term, key]);

  const shownIds = new Set(list.map((a) => a.area_id));
  const didYouMean = fuzzy.key === key ? fuzzy.items.filter((s) => !shownIds.has(s.id)) : [];
  const newName = tidyName(q);

  async function add() {
    setAdding(true);
    setError(null);
    const err = await onAdd(newName);
    if (err) setError(err);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight">Where you dey?</h1>
        {onClose && (
          <button onClick={onClose} className="min-h-11 px-2 text-[15px] text-(--muted)">
            Close
          </button>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-(--soft)">City</span>
        <span className="relative">
          <select
            value={city}
            onChange={(e) => {
              onCityChange(e.target.value);
              setQ("");
              setError(null);
            }}
            className="min-h-12 w-full appearance-none rounded-2xl border border-(--line) bg-(--raised) px-4 pr-10 text-base font-bold outline-none focus:border-(--light)"
          >
            <optgroup label="Popular">
              {POPULAR_CITIES.map((c) => (
                <option key={`p-${c}`} value={c}>{c}</option>
              ))}
            </optgroup>
            <optgroup label="All cities">
              {CITIES.filter((c) => !(POPULAR_CITIES as readonly string[]).includes(c.city)).map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.state})
                </option>
              ))}
            </optgroup>
          </select>
          <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-(--soft)">
          {initialQuery ? "Type your street after the area name, e.g. Tanke Oke-Odo" : "Search your area"}
        </span>
        <input
          autoFocus={initialQuery.length > 0}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Tanke"
          maxLength={60}
          className="min-h-12 rounded-2xl border border-(--line) bg-(--raised) px-4 text-base outline-none placeholder:text-(--muted) focus:border-(--light)"
        />
      </label>

      <ul className="flex flex-col">
        {loading && areas.length === 0 && <li className="py-3 text-(--muted)">Loading areas…</li>}
        {!loading && areas.length === 0 && term.length === 0 && (
          <li className="rounded-[22px] border-2 border-dashed border-(--line-strong) p-5 text-[15px] text-(--soft)">
            <strong className="block text-base text-(--text)">You&apos;re early in {city}.</strong>
            Type your area in the box above and add it. Your neighbours will find it after you.
          </li>
        )}
        {list.map((a) => (
          <li key={a.area_id}>
            <button
              onClick={() => onPick(a.area_id)}
              className="flex min-h-12 w-full items-center justify-between border-b border-(--divider) py-3 text-left text-base"
            >
              <span>{a.name}</span>
              {a.status === "on" && <span className="text-sm font-bold text-(--light-text)">Light dey</span>}
              {a.status === "off" && <span className="text-sm text-(--muted)">No light</span>}
            </button>
          </li>
        ))}
      </ul>

      {didYouMean.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-(--soft)">Did you mean…</span>
          <div className="flex flex-wrap gap-2">
            {didYouMean.map((s) => (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className="min-h-11 rounded-full border border-(--line) bg-(--raised) px-4 text-[15px] font-medium"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {canAdd && !loading && (
        <div className="flex flex-col gap-3 rounded-[22px] bg-(--card) p-5">
          <span className="text-[15px] text-(--soft)">
            {list.length === 0 && didYouMean.length === 0 ? "We don't have this area yet." : "Not on the list?"}
          </span>
          <button
            onClick={add}
            disabled={adding}
            className="min-h-14 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-60"
          >
            {adding ? "Adding…" : `Add “${newName}” to ${city}`}
          </button>
          {error && <p className="text-sm text-(--muted)" role="status">{error}</p>}
        </div>
      )}
    </div>
  );
}