"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CITIES } from "@/lib/types";

// The full city list = the built-in cities (lib/types.ts) + towns people added themselves (cities table).
// radiusKm: how far from the centre still counts as this town (same numbers as the database)
export type City = { city: string; state: string; center: readonly [number, number]; radiusKm: number };

const BIG: Record<string, number> = {
  Lagos: 70,
  Abuja: 60,
  Ibadan: 50,
  Kano: 50,
  "Port Harcourt": 50,
  "Benin City": 45,
  Kaduna: 45,
  Onitsha: 45,
  Enugu: 45,
  Aba: 45,
  Ilorin: 45,
  Jos: 45,
  Abeokuta: 45,
  Warri: 45,
};
export const CITY_RADIUS_KM = 40; // default for every other town

const BUILT_IN: City[] = CITIES.map((c) => ({
  city: c.city,
  state: c.state,
  center: [c.center[0], c.center[1]] as const,
  radiusKm: BIG[c.city] ?? CITY_RADIUS_KM,
}));

let cache: City[] = BUILT_IN;
let loaded = false;
const listeners = new Set<(list: City[]) => void>();

type Row = { city: string; state: string; lat: number; lng: number; radius_km?: number | null };

function merge(rows: Row[]): City[] {
  const byName = new Map<string, City>(BUILT_IN.map((c) => [c.city.toLowerCase(), c]));
  for (const r of rows) {
    const key = r.city.toLowerCase();
    const known = byName.get(key);
    if (known) {
      if (r.radius_km) byName.set(key, { ...known, radiusKm: r.radius_km });
    } else {
      byName.set(key, { city: r.city, state: r.state, center: [r.lat, r.lng] as const, radiusKm: r.radius_km ?? CITY_RADIUS_KM });
    }
  }
  return [...byName.values()].sort((a, b) => a.city.localeCompare(b.city));
}

// Fetch the towns people added. force = true after adding a new town.
export async function loadCities(force = false): Promise<City[]> {
  if (loaded && !force) return cache;
  let { data, error } = await supabase.from("cities").select("city, state, lat, lng, radius_km");
  if (error) ({ data, error } = await supabase.from("cities").select("city, state, lat, lng")); // before step 9 was run
  if (!error && data) {
    cache = merge(data as Row[]);
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

// Which town you're in. Big cities cover more ground, so distance is compared to each town's size:
// someone in Agege is 20 km from the Lagos centre (size 70) but only 13 km from Ota (size 40), and still gets Lagos.
// inside = false when you're outside every town's area.
export function nearestCity(list: City[], lat: number, lng: number): { city: City; km: number; inside: boolean } {
  let best = { city: list[0], km: Infinity, score: Infinity };
  for (const c of list) {
    const km = kmBetween(lat, lng, c.center[0], c.center[1]);
    const score = km / c.radiusKm;
    if (score < best.score) best = { city: c, km, score };
  }
  return { city: best.city, km: best.km, inside: best.km <= best.city.radiusKm };
}