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
export type NotLocated = { ok: false; reason: "denied" | "unavailable" };

export function getLocation(): Promise<Located | NotLocated> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({ ok: false, reason: "unavailable" });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => resolve({ ok: false, reason: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60 * 1000 }
    );
  });
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