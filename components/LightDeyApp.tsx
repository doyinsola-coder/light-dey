"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import type { AreaStatus, Status } from "@/lib/types";
import { useCities, loadCities } from "@/lib/cities";
import { buzz, getLocation, store, timeAgo, whatsappShare } from "@/lib/helpers";
import { Logo } from "@/components/Logo";
import { MixedNotice } from "@/components/MixedNotice";
import { HowItWorks } from "@/components/HowItWorks";
import { AreaPicker } from "@/components/AreaPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Leaderboard } from "@/components/Leaderboard";
import { ShareCardButton } from "@/components/ShareCardButton";
import { NotifyButton } from "@/components/NotifyButton";
import { ReportButtons, type ReportOutcome } from "@/components/ReportButtons";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ComplaintBox } from "@/components/ComplaintBox";
import { QuickQuestion } from "@/components/QuickQuestion";
import { Announcement } from "@/components/Announcement";
import { BattleBanner } from "@/components/BattleBanner";
import { TabBar, type View } from "@/components/TabBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import { LiveRow } from "@/components/LiveRow";
import { Celebrate } from "@/components/Celebrate";
import { CountUp } from "@/components/CountUp";
import { MAKER } from "@/lib/brand";
import dynamic from "next/dynamic";
import { IconPin, IconArrowRight } from "@/components/Icons";
import { HomeHero } from "@/components/HomeHero";
import { TodayTimeline } from "@/components/TodayTimeline";
import { OtherPlaces, type PlaceInfo } from "@/components/OtherPlaces";
import { BandCheck } from "@/components/BandCheck";
import { SettingsSheet, SettingsButton } from "@/components/SettingsSheet";
import { PointsCard } from "@/components/PointsCard";
import { usePoints, useContest } from "@/lib/rewards";
import { ContestCard } from "@/components/ContestCard";
import { useTimeline, useAreaWeek } from "@/lib/areaData";
import { loadPlaces, savePlaces, trackVisit, MAX_PLACES, type Place } from "@/lib/places";

// The map library is big, so it only loads when someone opens the map
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-[58dvh] animate-pulse rounded-[22px] bg-(--card)" />,
});

const REFRESH_MS = 30_000; // check for new reports this often while the app is on screen
const FULL_MS = 10 * 60_000; // reload the whole area list (new areas, names) this often

// The last town this phone used (it may be a town someone added, so any saved name is fine)
function savedCity(): string {
  return store.get("lightdey_city") || "Ilorin";
}

export default function LightDeyApp() {
  const cities = useCities();
  // Restore the last city and area this phone used
  const [city, setCity] = useState<string>(savedCity);
  const [areaId, setAreaId] = useState<string | null>(() => store.get("lightdey_area"));
  const [areas, setAreas] = useState<AreaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [reported, setReported] = useState(false); // shows the install card after a first report
  const [prefill, setPrefill] = useState("");
  const [view, setView] = useState<View>("home");
  const [updatedAt, setUpdatedAt] = useState(0);
  const [complainSignal, setComplainSignal] = useState(0); // opens the complaint box from the prompt after reporting
  const [celebrate, setCelebrate] = useState<string | null>(null); // area name, while the "Light don come!" screen shows
  // My places: up to 3 saved areas, each with a live dot. pickMode says what the area picker is for.
  const [places, setPlaces] = useState<Place[]>(loadPlaces);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo>({});
  const [pickMode, setPickMode] = useState<"add" | "replace">("add");
  // The settings sheet (band, alerts, theme). Closing it bumps settingsKey so the home cards re-check.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setSettingsKey((n) => n + 1);
  }, []);

  // What we saw last time, so we can spot "no light" turning into "light dey" while the app is open
  const areasRef = useRef<AreaStatus[]>([]);
  const areaIdRef = useRef<string | null>(areaId);

  const applyAreas = useCallback((next: AreaStatus[]) => {
    const id = areaIdRef.current;
    const before = areasRef.current.find((a) => a.area_id === id);
    const after = next.find((a) => a.area_id === id);
    if (before && after && before.status === "off" && after.status === "on") {
      setCelebrate(after.name);
      buzz([40, 60, 40, 60, 120]);
    }
    areasRef.current = next;
    setAreas(next);
    setUpdatedAt(Date.now());
  }, []);

  const endCelebrate = useCallback(() => setCelebrate(null), []);

  // After a "you're not there" report: the areas we think you're actually in
  type Near = { area_id: string; name: string; city: string; km: number };
  const [wrongPlace, setWrongPlace] = useState<{ forArea: string; nearby: Near[] } | null>(null);

  // Big towns have hundreds of areas but only a few have reports in the last hour.
  // So: the full list once (and every 10 minutes), and in between only the areas with recent reports.
  // That keeps data use (and the server bill) small when lots of people have the app open.
  const COLS = "area_id, state, city, name, lat, lng, status, on_count, off_count, last_report_at";
  const fullRef = useRef<{ city: string; at: number; list: AreaStatus[] } | null>(null);
  const fetchAreas = useCallback(async (): Promise<{ data: AreaStatus[] | null; error: unknown }> => {
    const full = fullRef.current;
    if (!full || full.city !== city || Date.now() - full.at > FULL_MS) {
      const { data, error } = await supabase.from("area_status").select(COLS).eq("city", city);
      if (!error && data) fullRef.current = { city, at: Date.now(), list: data as AreaStatus[] };
      return { data: (data as AreaStatus[] | null) ?? null, error };
    }
    const { data, error } = await supabase.from("area_status").select(COLS).eq("city", city).not("last_report_at", "is", null);
    if (error || !data) return { data: null, error };
    const live = new Map((data as AreaStatus[]).map((a) => [a.area_id, a]));
    const merged = full.list.map(
      (a) => live.get(a.area_id) ?? { ...a, status: "unknown" as const, on_count: 0, off_count: 0, last_report_at: null }
    );
    // An area someone added in the last few minutes
    for (const a of live.values()) if (!full.list.some((b) => b.area_id === a.area_id)) merged.push(a);
    return { data: merged, error: null };
  }, [city]);

  // Used after reporting, so the new status shows straight away
  const load = useCallback(async () => {
    const { data, error } = await fetchAreas();
    if (!error && data) applyAreas(data as AreaStatus[]);
  }, [fetchAreas, applyAreas]);

  // Fetch now, then every 20s, and whenever the person comes back to the tab
  useEffect(() => {
    let alive = true; // ignore answers for a city the person already left
    const refresh = () =>
      fetchAreas().then(({ data, error }) => {
        if (!alive) return;
        if (!error && data) applyAreas(data as AreaStatus[]);
        setLoading(false);
      });
    refresh();
    // Don't use data while the phone is locked or the app is in the background
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchAreas, applyAreas]);

  // Which platform brought this phone, and which days it opens the app (no personal data)
  useEffect(() => {
    trackVisit();
  }, []);

  // Opened from a notification: /?area=<id> (and &week=1 for the Sunday report)
  const [weekFor, setWeekFor] = useState<string | null>(null);
  // Opened from an alert: /?area=<id>&confirm=on|off asks "is it true?" above the report buttons
  const [confirmFor, setConfirmFor] = useState<{ areaId: string; status: "on" | "off" } | null>(null);
  const linkDone = useRef(false);
  useEffect(() => {
    if (linkDone.current) return;
    linkDone.current = true;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("area");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    const week = params.get("week") === "1";
    const confirm = params.get("confirm");
    params.delete("confirm");
    params.delete("area");
    params.delete("week");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    supabase
      .from("area_status")
      .select("area_id, city")
      .eq("area_id", id)
      .maybeSingle()
      .then(({ data }) => {
        const a = data as { area_id: string; city: string } | null;
        if (!a) return;
        if (a.city !== savedCity()) {
          setCity(a.city);
          areasRef.current = [];
          setAreas([]);
          setLoading(true);
        }
        areaIdRef.current = a.area_id;
        setAreaId(a.area_id);
        store.set("lightdey_area", a.area_id);
        store.set("lightdey_city", a.city);
        setView("home");
        if (week) setWeekFor(a.area_id);
        if (confirm === "on" || confirm === "off") setConfirmFor({ areaId: a.area_id, status: confirm });
      });
  }, []);

  // Live dots for My places (they can be in different towns, so ask for them by id)
  const placeKey = places.map((p) => p.id).join(",");
  useEffect(() => {
    if (!placeKey) return;
    let alive = true;
    const ids = placeKey.split(",");
    const refresh = () =>
      supabase
        .from("area_status")
        .select("area_id, name, city, status, last_report_at")
        .in("area_id", ids)
        .then(({ data }) => {
          if (!alive || !data) return;
          setPlaceInfo(
            Object.fromEntries(
              (data as { area_id: string; name: string; city: string; status: Status; last_report_at: string | null }[]).map((a) => [
                a.area_id,
                { name: a.name, city: a.city, status: a.status, last_report_at: a.last_report_at },
              ])
            )
          );
        });
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [placeKey]);

  const area = areas.find((a) => a.area_id === areaId) ?? null;
  // Today's "Light came / Light went" list and the week pattern for the area on screen
  const timeline = useTimeline(area?.area_id ?? "", area?.last_report_at ?? "");
  // Points (only while rewards are on). Re-checked after reporting and every few minutes,
  // because points land when a neighbour confirms, which can be a while after you report.
  const [pointsTick, setPointsTick] = useState(0);
  const points = usePoints(`${pointsTick}-${Math.floor(updatedAt / (3 * 60_000))}`);
  const pointsOn = points?.enabled === true;
  const contest = useContest(pointsOn);
  const week = useAreaWeek(area?.area_id ?? "", area?.last_report_at ? area.last_report_at.slice(0, 13) : "");

  function updatePlaces(next: Place[]) {
    setPlaces(next);
    savePlaces(next);
  }

  // mode: "add" = save as a new place, "replace" = swap the place on screen for this one, "visit" = just look
  function pickArea(id: string, inCity: string = city, mode: "add" | "replace" | "visit" = "visit") {
    if (mode !== "visit" && !places.some((p) => p.id === id)) {
      const here = places.findIndex((p) => p.id === areaId);
      const entry = { id, city: inCity };
      if (mode === "replace" && here >= 0) updatePlaces(places.map((p, i) => (i === here ? entry : p)));
      else if (places.length < MAX_PLACES) updatePlaces([...places, entry]);
      else updatePlaces([...places.slice(0, MAX_PLACES - 1), entry]);
    }
    areaIdRef.current = id;
    setAreaId(id);
    store.set("lightdey_area", id);
    store.set("lightdey_city", inCity);
    setPicking(false);
    setView("home");
    window.scrollTo({ top: 0 });
  }

  // Add a new area (or get the existing one if the name is already there), then open it.
  // You have to be in the city, and the new area is pinned where you are.
  async function addArea(name: string): Promise<string | null> {
    const loc = await getLocation();
    if (!loc.ok) {
      return loc.reason === "denied"
        ? "Location is blocked. Allow it in your browser settings to add an area."
        : loc.reason === "timeout"
          ? "Couldn't get your location in time. Move near a window and try again."
          : "Turn on your location to add an area. It gets pinned where you are.";
    }
    const state = cities.find((c) => c.city === city)?.state ?? city;
    const { data, error } = await supabase.rpc("add_area", {
      p_state: state,
      p_city: city,
      p_name: name,
      p_lat: loc.lat,
      p_lng: loc.lng,
    });
    if (error || !data) {
      const m = error?.message ?? "";
      return m.includes("invalid_name")
        ? "That name looks too short or too long."
        : m.includes("too_far")
          ? `You need to be in ${city} to add an area there.`
          : "Couldn't add that. Check your data and try again.";
    }
    fullRef.current = null; // the new area has no reports yet, so reload the whole list
    await load();
    pickArea(data as string, city, pickMode);
    return null;
  }

  // Add a town that isn't on the list (pinned where you are), then switch to it
  async function addCity(name: string, state: string, lat: number, lng: number): Promise<string | null> {
    const { data, error } = await supabase.rpc("add_city", {
      p_name: name,
      p_state: state,
      p_lat: lat,
      p_lng: lng,
      p_device_id: getDeviceId(),
    });
    if (error || !data) {
      const m = error?.message ?? "";
      const near = m.match(/city_nearby:(.+)$/)?.[1];
      return near
        ? `You're close to ${near.trim()}, which is already on the list. Pick ${near.trim()} and add your area there.`
        : m.includes("too_many")
          ? "You already added a town today. Try again tomorrow."
          : m.includes("invalid_name")
            ? "That name looks too short or too long."
            : "Couldn't add your town. Check your data and try again.";
    }
    await loadCities(true);
    changeCity(data as string);
    store.set("lightdey_city", data as string);
    return null;
  }

  function changeCity(next: string) {
    setCity(next);
    areasRef.current = [];
    setAreas([]);
    setLoading(true);
  }

  // Returns how it went; ReportButtons shows the result and the 15-minute timer.
  // You can only report for the area you're physically in: the server checks your location.
  async function report(status: Exclude<Status, "unknown">): Promise<ReportOutcome> {
    if (!area) return "error";
    setWrongPlace(null);
    const loc = await getLocation();
    if (!loc.ok) return loc.reason === "denied" ? "location_denied" : loc.reason === "timeout" ? "location_slow" : "location_off";

    const { data: lightCameBack, error } = await supabase.rpc("report_status", {
      p_area_id: area.area_id,
      p_status: status,
      p_device_id: getDeviceId(),
      p_lat: loc.lat,
      p_lng: loc.lng,
      p_accuracy: loc.accuracy,
    });
    if (error) {
      const m = error.message;
      if (m.includes("too_soon")) return "too_soon";
      if (m.includes("location_rough")) return "location_rough";
      if (m.includes("location_required")) return "location_off";
      if (m.includes("too_far")) {
        // Suggest the areas around where they actually are
        const forArea = area.area_id;
        supabase
          .rpc("nearest_areas", { p_lat: loc.lat, p_lng: loc.lng })
          .then(({ data }) => setWrongPlace({ forArea, nearby: (data as Near[] | null) ?? [] }));
        return "too_far";
      }
      return "error";
    }

    // This report brought light back: tell everyone following this area (the server double-checks)
    if (lightCameBack === true || status === "off") {
      // "on": this report brought light back. "off": it may have just taken the area to no light.
      // The server re-checks before sending anything.
      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: area.area_id, kind: lightCameBack === true ? "on" : "off" }),
      }).catch(() => {});
    }
    await load();
    setReported(true);
    setConfirmFor(null);
    setPointsTick((n) => n + 1);
    return "ok";
  }

  // "Light came earlier?" Moves the start of this phone's latest report back (the server caps it).
  async function reportEarlier(minutes: number): Promise<number | null> {
    const { data, error } = await supabase.rpc("set_report_since", { p_device_id: getDeviceId(), p_minutes: minutes });
    if (error) return null;
    await load();
    return Number(data ?? 0);
  }

  const statusText = (n: AreaStatus) =>
    n.status === "on" ? (
      <span className="rounded-full bg-(--light) px-2.5 py-1 text-[12px] font-bold text-(--ink)">Light dey</span>
    ) : (
      <span className="rounded-full bg-(--divider) px-2.5 py-1 text-[12px] font-bold text-(--muted)">No light</span>
    );

  // A status row for another area: dot, name, how long ago, status pill. Tap to open it.
  const areaRow = (n: AreaStatus, i: number) => (
    <li key={n.area_id} className="ld-rise" style={{ animationDelay: `${i * 60}ms` }}>
      <button
        onClick={() => pickArea(n.area_id)}
        className="flex min-h-[60px] w-full items-center gap-3 rounded-[18px] border border-(--line) bg-(--raised) px-3.5 text-left"
      >
        <span className="relative flex h-3 w-3 shrink-0">
          {n.status === "on" && <span className="ld-ping absolute inset-0 rounded-full bg-(--light)" />}
          <span className={`relative h-3 w-3 rounded-full ${n.status === "on" ? "bg-(--light)" : "bg-(--off-dot)"}`} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">{n.name}</span>
          <span className="text-[12px] text-(--muted)">{timeAgo(n.last_report_at)}</span>
        </span>
        {statusText(n)}
      </button>
    </li>
  );

  // First visit, or "Change area"
  if (!area || picking) {
    // Coming back with a saved area: show a shimmer of the home screen instead of flashing the picker
    if (!picking && loading && areaId) {
      return (
        <main className="ld-safe-top mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5" aria-label="Loading">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="ld-skeleton h-11 w-32 rounded-full" />
          </div>
          <div className="ld-skeleton h-4 w-40 rounded-full" />
          <div className="ld-skeleton h-[230px] rounded-[28px]" />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="ld-skeleton h-[84px] rounded-[22px]" />
            <div className="ld-skeleton h-[84px] rounded-[22px]" />
          </div>
          <div className="ld-skeleton h-14 rounded-2xl" />
          <div className="ld-skeleton h-28 rounded-[24px]" />
        </main>
      );
    }
    return (
      <main className="ld-view-in ld-safe-top mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pb-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <AreaPicker
          city={city}
          areas={areas}
          loading={loading}
          onCityChange={changeCity}
          onPick={(id, inCity) => pickArea(id, inCity ?? city, pickMode)}
          onAdd={addArea}
          onAddCity={addCity}
          initialQuery={prefill}
          onClose={area ? () => setPicking(false) : undefined}
          title={pickMode === "add" && places.length > 0 ? "Add a place" : undefined}
        />
      </main>
    );
  }

  let screen: React.ReactNode;

  if (view === "leaderboard") {
    screen = <Leaderboard key="leaderboard" city={city} onOpenArea={pickArea} />;
  } else if (view === "map") {
    const unpinned = areas
      .filter((a) => a.lat === null && a.status !== "unknown")
      .sort((a, b) => (b.last_report_at ?? "").localeCompare(a.last_report_at ?? ""));
    const lit = areas.filter((a) => a.status === "on").length;
    const dark = areas.filter((a) => a.status === "off").length;

    screen = (
      <main key="map" className="ld-view-in ld-safe-top ld-safe-bottom mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight">{city} right now</h1>
          <ThemeToggle />
        </header>

        <LiveRow city={city} updatedAt={updatedAt} />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="ld-rise flex flex-col rounded-[20px] bg-(--light) p-3.5 text-(--ink)">
            <span className="font-display text-[34px] font-extrabold leading-none">
              <CountUp value={lit} />
            </span>
            <span className="text-[13px] font-bold">areas with light</span>
          </div>
          <div className="ld-rise flex flex-col rounded-[20px] border border-(--line) bg-(--raised) p-3.5" style={{ animationDelay: "60ms" }}>
            <span className="font-display text-[34px] font-extrabold leading-none">
              <CountUp value={dark} />
            </span>
            <span className="text-[13px] font-bold text-(--muted)">areas without</span>
          </div>
        </div>

        <div className="ld-rise overflow-hidden rounded-[22px]" style={{ animationDelay: "120ms" }}>
          <MapView city={city} areas={areas} currentAreaId={area.area_id} onOpen={pickArea} />
        </div>

        <div className="flex flex-wrap gap-4 text-[13px] text-(--soft)">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-(--light)" />Light dey</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-(--off-dot)" />No light</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-(--off-dot)" />No reports yet</span>
        </div>

        {unpinned.length > 0 && (
          <section className="flex flex-col gap-2">
            <div>
              <h2 className="text-base font-bold">Not on the map yet</h2>
              <p className="text-[13px] text-(--muted)">An area gets its pin when someone reports with location on.</p>
            </div>
            <ul className="flex flex-col gap-2">{unpinned.map(areaRow)}</ul>
          </section>
        )}
      </main>
    );
  } else {
    const nearby = areas
      .filter((a) => a.area_id !== area.area_id && a.status !== "unknown")
      .sort((a, b) => (b.last_report_at ?? "").localeCompare(a.last_report_at ?? ""))
      .slice(0, 5);

    const shareText =
      area.status === "unknown"
        ? `Does light dey ${area.name}? Report it here so we all know: ${location.origin}`
        : `${area.status === "on" ? "Light dey" : "No light"} for ${area.name} right now. Check your area: ${location.origin}`;

    // Sections slide up one after another when the screen opens
    const rise = (i: number) => ({ className: "ld-rise empty:hidden", style: { animationDelay: `${80 + i * 70}ms` } });

    const glow =
      area.status === "on"
        ? "radial-gradient(120% 360px at 50% 0%, rgba(255,197,49,0.22), transparent 70%)"
        : area.status === "off"
          ? "radial-gradient(120% 360px at 50% 0%, rgba(110,124,150,0.20), transparent 70%)"
          : "none";

    screen = (
      <main key="home" className="ld-view-in ld-safe-top ld-safe-bottom mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5" style={{ backgroundImage: glow }}>
        <header className="flex items-center gap-2">
          <div className="mr-auto"><Logo /></div>
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </header>

        <Announcement city={area.city} />

        <HomeHero
          key={`${area.area_id}-${area.status}-${settingsKey}`}
          onOpenSettings={() => setSettingsOpen(true)}
          area={area}
          events={timeline?.events ?? null}
          week={week}
          saved={places.some((p) => p.id === area.area_id)}
          canSave={places.length < MAX_PLACES}
          onSave={() => pickArea(area.area_id, area.city, "add")}
          onChangeArea={() => {
            setPrefill("");
            setPickMode(places.some((p) => p.id === area.area_id) ? "replace" : "add");
            setPicking(true);
          }}
        />

        <MixedNotice
          area={area}
          onAddStreet={() => {
            setPrefill(`${area.name} `);
            setPicking(true);
          }}
        />

        {confirmFor?.areaId === area.area_id && (
          <div className="ld-card-in flex items-start gap-3 rounded-[20px] border border-(--light) bg-(--light)/10 px-4 py-3.5" role="note">
            <span className="flex flex-1 flex-col gap-0.5">
              <strong className="text-[15px]">
                {confirmFor.status === "on" ? `Light don come for ${area.name}?` : `Light don go for ${area.name}?`}
              </strong>
              <span className="text-[14px] text-(--soft)">
                A neighbour just reported it. If you&apos;re there, tap what you see below
                {pointsOn ? " to confirm and earn points." : " to confirm it."}
              </span>
            </span>
            <button onClick={() => setConfirmFor(null)} aria-label="Dismiss" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-(--muted)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        )}

        <div {...rise(0)}>
          <ReportButtons
            pointsOn={pointsOn}
            areaId={area.area_id}
            areaName={area.name}
            onReport={report}
            onEarlier={reportEarlier}
            onComplain={() => {
              setComplainSignal((n) => n + 1);
              requestAnimationFrame(() =>
                document.getElementById("complaints")?.scrollIntoView({ behavior: "smooth", block: "start" })
              );
            }}
          />
        </div>
        {wrongPlace?.forArea === area.area_id && (
          <div className="ld-card-in flex flex-col gap-3 rounded-[22px] border border-(--light) bg-(--card) p-4" role="note">
            <div className="flex flex-col gap-1">
              <strong className="flex items-center gap-2 text-base"><IconPin size={18} className="text-(--light-text)" />You&apos;re not in {area.name} right now</strong>
              <span className="text-[15px] text-(--soft)">
                {wrongPlace.nearby.length > 0
                  ? "Looks like you're around here. Report for where you are:"
                  : "We don't have your area on the map yet. Add it and report from there."}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {wrongPlace.nearby.map((n) => (
                <button
                  key={n.area_id}
                  onClick={() => {
                    setWrongPlace(null);
                    if (n.city !== city) changeCity(n.city);
                    pickArea(n.area_id, n.city);
                  }}
                  className="min-h-11 rounded-full bg-(--light) px-4 text-[15px] font-bold text-(--ink)"
                >
                  {n.name}
                </button>
              ))}
              <button
                onClick={() => {
                  setWrongPlace(null);
                  setPrefill("");
                  setPicking(true);
                }}
                className="min-h-11 rounded-full border border-(--line) bg-(--raised) px-4 text-[15px] font-bold"
              >
                {wrongPlace.nearby.length > 0 ? "Somewhere else" : "Add my area"}
              </button>
            </div>
          </div>
        )}

        <div {...rise(1)}>
          <TodayTimeline
            key={`${area.area_id}-${weekFor === area.area_id ? "week" : "day"}`}
            areaId={area.area_id}
            areaName={area.name}
            status={area.status}
            events={timeline?.events ?? null}
            lightHours={timeline?.lightHours ?? 0}
            week={week}
            openWeek={weekFor === area.area_id}
          />
        </div>

        <div {...rise(1)}>
          <ContestCard contest={contest} refCode={points?.enabled ? points.ref : null} />
        </div>

        <div {...rise(1)}>
          <PointsCard points={points} onChanged={() => setPointsTick((n) => n + 1)} />
        </div>

        <div {...rise(1)}>
          <BandCheck key={settingsKey} areaId={area.area_id} areaName={area.name} avg={week?.enough ? week.avg : null} variant="ask" />
        </div>

        <div {...rise(2)}>
          <NotifyButton key={settingsKey} areaId={area.area_id} areaName={area.name} variant="home" pointsOn={pointsOn} onOpenSettings={() => setSettingsOpen(true)} />
        </div>

        <div {...rise(2)}>
          <OtherPlaces
            places={places}
            currentId={area.area_id}
            info={placeInfo}
            refreshKey={updatedAt === 0 ? 0 : Math.floor(updatedAt / (10 * 60_000))}
            onOpen={(p) => {
              if (p.city !== city) changeCity(p.city);
              pickArea(p.id, p.city);
            }}
            onAdd={() => {
              setPrefill("");
              setPickMode("add");
              setPicking(true);
            }}
            onRemove={(id) => updatePlaces(places.filter((p) => p.id !== id))}
          />
        </div>

        <div {...rise(3)}>
          <BattleBanner city={area.city} />
        </div>

        <div {...rise(3)}>
          <QuickQuestion areaId={area.area_id} areaName={area.name} />
        </div>

        <div {...rise(3)}>
          <ComplaintBox areaId={area.area_id} areaName={area.name} openSignal={complainSignal} />
        </div>

        <div {...rise(4)}>
          <div className="flex flex-col gap-1">
            <ShareCardButton imageUrl={`/api/card?area=${area.area_id}`} fileName={`light-dey-${area.name}`} text={shareText} />
            <a
              href={whatsappShare(shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center text-[15px] font-medium text-(--soft) underline underline-offset-4"
            >
              or send the link in a chat
            </a>
          </div>
        </div>

        <section className="flex flex-col gap-2" aria-label="Nearby">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Other areas in {area.city}</h2>
            <button onClick={() => setView("map")} className="min-h-9 text-[13px] font-bold text-(--light-text)">
              <span className="flex items-center gap-1">See map <IconArrowRight size={14} /></span>
            </button>
          </div>
          {nearby.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-(--line-strong) p-4 text-sm text-(--muted)">
              No other reports in {area.city} in the last hour. Share the app so your neighbours can join.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">{nearby.map(areaRow)}</ul>
          )}
        </section>

        <HowItWorks />

        <footer className="flex flex-col items-center gap-1 pb-2 pt-2 text-center text-[13px] text-(--muted)">
          <span>
            Built in Ilorin by{" "}
            <a href={MAKER.url} target="_blank" rel="noopener noreferrer" className="font-bold text-(--soft) underline underline-offset-4">
              {MAKER.name} ({MAKER.handle})
            </a>
          </span>
          <span>Follow for what I build next</span>
        </footer>
      </main>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={load} />
      {screen}
      <TabBar view={view} onChange={setView} />
      {view === "home" && <InstallPrompt nudge={reported} />}
      {celebrate && <Celebrate areaName={celebrate} onDone={endCelebrate} />}
      {settingsOpen && area && (
        <SettingsSheet areaId={area.area_id} areaName={area.name} avg={week?.enough ? week.avg : null} onClose={closeSettings} />
      )}
    </>
  );
}