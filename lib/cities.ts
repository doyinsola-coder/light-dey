"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CITIES } from "@/lib/types";

// The full city list = the built-in cities (lib/types.ts) + towns people added themselves (cities table).
export type City = { city: string; state: string; center: readonly [number, number] };

const BUILT_IN: City[] = CITIES.map((c) => ({ city: c.city, state: c.state, center: [c.center[0], c.center[1]] as const }));

let cache: City[] = BUILT_IN;
let loaded = false;
const listeners = new Set<(list: City[]) => void>();

function merge(rows: { city: string; state: string; lat: number; lng: number }[]): City[] {
  const byName = new Map<string, City>(BUILT_IN.map((c) => [c.city.toLowerCase(), c]));
  for (const r of rows) {
    if (!byName.has(r.city.toLowerCase())) {
      byName.set(r.city.toLowerCase(), { city: r.city, state: r.state, center: [r.lat, r.lng] as const });
    }
  }
  return [...byName.values()].sort((a, b) => a.city.localeCompare(b.city));
}

// Fetch the towns people added. force = true after adding a new town.
export async function loadCities(force = false): Promise<City[]> {
  if (loaded && !force) return cache;
  const { data, error } = await supabase.from("cities").select("city, state, lat, lng");
  if (!error && data) {
    cache = merge(data as { city: string; state: string; lat: number; lng: number }[]);
    loaded = true;
    listeners.forEach((l) => l(cache));
  }
  return cache;
}

export function useCities(): City[] {
  const [list, setList] = useState<City[]>(cache);
  useEffect(() => {
    listeners.add(setList);
    loadCities();
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return list;
}

export function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function nearestCity(list: City[], lat: number, lng: number): { city: City; km: number } {
  let best = { city: list[0], km: Infinity };
  for (const c of list) {
    const km = kmBetween(lat, lng, c.center[0], c.center[1]);
    if (km < best.km) best = { city: c, km };
  }
  return best;
}

// How close you must be to a city to report in it (same as the server rule)
export const CITY_RADIUS_KM = 40;