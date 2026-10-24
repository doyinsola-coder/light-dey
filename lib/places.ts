import { store } from "@/lib/helpers";
import { supabase, getDeviceId } from "@/lib/supabase";

// "My places": up to 3 areas this phone cares about (home, school, family).
// Kept on the phone only, so no account is needed.
export type Place = { id: string; city: string };
export const MAX_PLACES = 3;
const KEY = "lightdey_places";

export function loadPlaces(): Place[] {
  try {
    const raw = store.get(KEY);
    if (raw) {
      const list = JSON.parse(raw) as Place[];
      if (Array.isArray(list)) return list.filter((p) => p && typeof p.id === "string" && typeof p.city === "string").slice(0, MAX_PLACES);
    }
  } catch {}
  // Phones from before My places: their one saved area becomes the first place
  const id = store.get("lightdey_area");
  const city = store.get("lightdey_city");
  return id && city ? [{ id, city }] : [];
}

export function savePlaces(list: Place[]) {
  store.set(KEY, JSON.stringify(list.slice(0, MAX_PLACES)));
}

// Platform tracking: lightdeyng.vercel.app/?from=tiktok tells us TikTok brought this phone.
// Sends the random phone ID and the platform word, once a day. Nothing personal.
export function trackVisit() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get("from")?.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "";
  if (fromUrl) {
    // Tidy the address bar so shared links don't carry it on
    url.searchParams.delete("from");
    window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
  }

  let source = store.get("lightdey_from");
  if (!source) {
    // Used the app before tracking existed? Don't count them as new.
    const usedBefore = !!(store.get("lightdey_area") || store.get("lightdey_device_id"));
    source = usedBefore ? "existing" : fromUrl || "direct";
    store.set("lightdey_from", source);
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  if (store.get("lightdey_seen") === today) return;
  supabase.rpc("track_visit", { p_device_id: getDeviceId(), p_source: source }).then(({ error }) => {
    if (!error) store.set("lightdey_seen", today);
  });
}