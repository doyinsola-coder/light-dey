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
  // ?ref=<code>: someone's invite link (only matters for a brand-new phone)
  const refUrl = url.searchParams.get("ref")?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "";
  if (fromUrl || refUrl) {
    // Tidy the address bar so shared links don't carry it on
    url.searchParams.delete("from");
    url.searchParams.delete("ref");
    window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
  }

  let source = store.get("lightdey_from");
  if (!source) {
    // Used the app before tracking existed? Don't count them as new.
    let madeNow = false;
    try {
      madeNow = sessionStorage.getItem("lightdey_new_phone") === "1";
    } catch {
      // no session storage: fall back to the saved values below
    }
    const usedBefore = !!(store.get("lightdey_area") || (store.get("lightdey_device_id") && !madeNow));
    source = usedBefore ? "existing" : fromUrl || (refUrl ? "invite" : "direct");
    store.set("lightdey_from", source);
    if (!usedBefore && refUrl.length === 6) store.set("lightdey_ref", refUrl);
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  if (store.get("lightdey_seen") === today) return;
  const ref = store.get("lightdey_ref");
  supabase.rpc("track_visit", { p_device_id: getDeviceId(), p_source: source }).then(({ error }) => {
    if (error) return;
    store.set("lightdey_seen", today);
    // The server only accepts it for a phone it hasn't seen before today, so send it once
    if (ref && !store.get("lightdey_ref_sent")) {
      supabase.rpc("track_referral", { p_device_id: getDeviceId(), p_code: ref }).then(({ error: e }) => {
        if (!e) store.set("lightdey_ref_sent", "1");
      });
    }
  });
}