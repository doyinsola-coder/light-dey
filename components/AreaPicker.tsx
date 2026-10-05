"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AreaStatus } from "@/lib/types";
import { POPULAR_CITIES } from "@/lib/types";
import { useCities, nearestCity, CITY_RADIUS_KM } from "@/lib/cities";
import { getLocation, buzz } from "@/lib/helpers";

type Suggestion = { id: string; name: string; score: number };
type Near = { area_id: string; name: string; city: string; km: number };

type Props = {
  city: string;
  areas: AreaStatus[];
  loading: boolean;
  onCityChange: (city: string) => void;
  onPick: (areaId: string, inCity?: string) => void;
  onAdd: (name: string) => Promise<string | null>; // returns an error message, or null when it worked
  // Add a town that isn't on the list. Returns an error message, or null when it worked.
  onAddCity: (name: string, state: string, lat: number, lng: number) => Promise<string | null>;
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

export function AreaPicker({ city, areas, loading, onCityChange, onPick, onAdd, onAddCity, initialQuery = "", onClose }: Props) {
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((a, b) => a.localeCompare(b)), [cities]);

  // "Use my location"
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [here, setHere] = useState<{ city: string; areas: Near[] } | null>(null);

  // "My town isn't listed"
  const [town, setTown] = useState<{ name: string; state: string; far: boolean } | null>(null);
  const [townBusy, setTownBusy] = useState(false);
  const [townError, setTownError] = useState<string | null>(null);

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

  function locationProblem(reason: "denied" | "unavailable" | "timeout") {
    return reason === "denied"
      ? "Location is blocked. Allow it in your browser settings, then try again."
      : reason === "timeout"
        ? "Couldn't get your location in time. Move near a window and try again."
        : "Turn on your phone's location and try again.";
  }

  // Find the nearest town, switch to it, and suggest the areas around you
  async function useMyLocation() {
    buzz(8);
    setLocating(true);
    setNotice(null);
    setHere(null);
    const loc = await getLocation();
    if (!loc.ok) {
      setLocating(false);
      setNotice(locationProblem(loc.reason));
      return;
    }
    const near = nearestCity(cities, loc.lat, loc.lng);
    if (near.km > CITY_RADIUS_KM) {
      setLocating(false);
      setTown({ name: "", state: near.city.state, far: true });
      setTownError(null);
      return;
    }
    if (near.city.city !== city) onCityChange(near.city.city);
    const { data } = await supabase.rpc("nearest_areas", { p_lat: loc.lat, p_lng: loc.lng });
    setLocating(false);
    setHere({ city: near.city.city, areas: ((data as Near[] | null) ?? []).filter((a) => a.city === near.city.city) });
  }

  async function addTown() {
    if (!town) return;
    setTownBusy(true);
    setTownError(null);
    const loc = await getLocation();
    if (!loc.ok) {
      setTownBusy(false);
      setTownError(locationProblem(loc.reason));
      return;
    }
    const err = await onAddCity(town.name, town.state, loc.lat, loc.lng);
    setTownBusy(false);
    if (err) {
      setTownError(err);
      return;
    }
    setTown(null);
    setHere(null);
    setNotice(`${tidyName(town.name)} has been added 🎉 Now add your area in it.`);
  }

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

      <button
        onClick={useMyLocation}
        disabled={locating}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-70"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={locating ? "ld-spinner" : ""}>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
        </svg>
        {locating ? "Finding where you are…" : "Use my location"}
      </button>

      {notice && <p className="text-sm text-(--soft)" role="status">{notice}</p>}

      {here && (
        <div className="ld-card-in flex flex-col gap-3 rounded-[22px] border border-(--light) bg-(--card) p-4">
          <strong className="text-base">📍 You&apos;re in {here.city}</strong>
          {here.areas.length > 0 ? (
            <>
              <span className="text-[15px] text-(--soft)">Looks like you&apos;re around here. Tap your area:</span>
              <div className="flex flex-wrap gap-2">
                {here.areas.map((a) => (
                  <button
                    key={a.area_id}
                    onClick={() => onPick(a.area_id, here.city)}
                    className="min-h-11 rounded-full bg-(--light) px-4 text-[15px] font-bold text-(--ink)"
                  >
                    {a.name}
                  </button>
                ))}
              </div>
              <span className="text-[13px] text-(--muted)">Not these? Search for your area below.</span>
            </>
          ) : (
            <span className="text-[15px] text-(--soft)">No areas near you yet. Type your area below and add it.</span>
          )}
        </div>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm text-(--soft)">Or pick your town</span>
        <span className="relative">
          <select
            value={city}
            onChange={(e) => {
              onCityChange(e.target.value);
              setQ("");
              setError(null);
              setHere(null);
            }}
            className="min-h-12 w-full appearance-none rounded-2xl border border-(--line) bg-(--raised) px-4 pr-10 text-base font-bold outline-none focus:border-(--light)"
          >
            <optgroup label="Popular">
              {POPULAR_CITIES.map((c) => (
                <option key={`p-${c}`} value={c}>{c}</option>
              ))}
            </optgroup>
            {states.map((st) => (
              <optgroup key={st} label={`${st} State`.replace("FCT State", "FCT (Abuja)")}>
                {cities
                  .filter((c) => c.state === st)
                  .map((c) => (
                    <option key={`${st}-${c.city}`} value={c.city}>
                      {c.city}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        {!town && (
          <button
            type="button"
            onClick={() => {
              setTown({ name: "", state: cities.find((c) => c.city === city)?.state ?? states[0], far: false });
              setTownError(null);
            }}
            className="self-start text-[14px] font-bold text-(--light-text) underline underline-offset-4"
          >
            My town isn&apos;t on the list
          </button>
        )}
      </label>

      {town && (
        <div className="ld-card-in flex flex-col gap-3 rounded-[22px] bg-(--card) p-4">
          <div className="flex flex-col gap-1">
            <strong className="text-base">{town.far ? "Your town isn't on Light Dey yet" : "Add your town"}</strong>
            <span className="text-[14px] text-(--soft)">
              It gets pinned where you are now, so add it only when you&apos;re in the town.
            </span>
          </div>
          <input
            value={town.name}
            onChange={(e) => setTown({ ...town, name: e.target.value })}
            placeholder="Town name, e.g. Ifo"
            maxLength={40}
            className="min-h-12 rounded-2xl border border-(--line) bg-(--raised) px-4 text-base outline-none placeholder:text-(--muted) focus:border-(--light)"
          />
          <span className="relative">
            <select
              value={town.state}
              onChange={(e) => setTown({ ...town, state: e.target.value })}
              aria-label="State"
              className="min-h-12 w-full appearance-none rounded-2xl border border-(--line) bg-(--raised) px-4 pr-10 text-base outline-none focus:border-(--light)"
            >
              {states.map((st) => (
                <option key={st} value={st}>{st === "FCT" ? "FCT (Abuja)" : `${st} State`}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <div className="flex gap-2">
            <button
              onClick={addTown}
              disabled={townBusy || town.name.trim().length < 2}
              className="min-h-12 flex-1 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-50"
            >
              {townBusy ? "Adding…" : town.name.trim().length >= 2 ? `Add ${tidyName(town.name)}` : "Add town"}
            </button>
            <button
              onClick={() => setTown(null)}
              className="min-h-12 rounded-2xl border border-(--line) bg-(--raised) px-4 text-[15px] font-bold"
            >
              Cancel
            </button>
          </div>
          {townError && <p className="text-sm text-(--muted)" role="status">{townError}</p>}
        </div>
      )}

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