"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AreaStatus } from "@/lib/types";
import { CITIES } from "@/lib/types";

type Suggestion = { id: string; name: string; score: number };

type Props = {
  city: string;
  areas: AreaStatus[];
  loading: boolean;
  onCityChange: (city: string) => void;
  onPick: (areaId: string) => void;
  onAdd: (name: string) => Promise<string | null>; // returns an error message, or null when it worked
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

export function AreaPicker({ city, areas, loading, onCityChange, onPick, onAdd, onClose }: Props) {
  const [q, setQ] = useState("");
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

      <div className="grid grid-cols-3 gap-1.5 rounded-full bg-(--card) p-1" role="tablist" aria-label="City">
        {CITIES.map((c) => (
          <button
            key={c.city}
            role="tab"
            aria-selected={c.city === city}
            onClick={() => onCityChange(c.city)}
            className={`min-h-11 rounded-full text-[15px] font-bold ${
              c.city === city ? "bg-(--text) text-(--bg)" : "text-(--soft)"
            }`}
          >
            {c.city}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-(--soft)">Search your area</span>
        <input
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