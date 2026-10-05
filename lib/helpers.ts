// "just now", "12 mins ago", "2 hrs ago"
export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
}

// The phone's location, for checking you're really in the area you report for.
// We send it to the server once, it checks the distance, and only a rounded (~1 km) version is ever saved.
export type Located = { ok: true; lat: number; lng: number; accuracy: number };
export type NotLocated = { ok: false; reason: "denied" | "unavailable" | "timeout" };

function locateOnce(opts: PositionOptions): Promise<Located | NotLocated> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) =>
        resolve({
          ok: false,
          reason: err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable",
        }),
      opts
    );
  });
}

// Indoors, GPS often can't get a fix in time even with location ON.
// So: try GPS first, and if it's slow, fall back to Wi-Fi/network location (good enough to confirm the area).
export async function getLocation(): Promise<Located | NotLocated> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return { ok: false, reason: "unavailable" };
  const gps = await locateOnce({ enableHighAccuracy: true, timeout: 8000, maximumAge: 2 * 60 * 1000 });
  if (gps.ok || gps.reason === "denied") return gps;
  return locateOnce({ enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 });
}

// Safe localStorage (private mode / blocked storage won't crash the app)
export const store = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch {}
  },
};

export function whatsappShare(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// A tiny buzz on Android phones (iPhones ignore it). Never throws.
export function buzz(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

// True when the person turned off animations in their phone settings
export function prefersReducedMotion() {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}