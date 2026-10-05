"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import type { AreaStatus, Status } from "@/lib/types";
import { CITIES } from "@/lib/types";
import { buzz, getLocation, store, timeAgo, whatsappShare } from "@/lib/helpers";
import { Logo } from "@/components/Logo";
import { StatusCard } from "@/components/StatusCard";
import { MixedNotice } from "@/components/MixedNotice";
import { HowItWorks } from "@/components/HowItWorks";
import { AreaPicker } from "@/components/AreaPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TodayBar } from "@/components/TodayBar";
import { Leaderboard } from "@/components/Leaderboard";
import { ShareCardButton } from "@/components/ShareCardButton";
import { NotifyButton } from "@/components/NotifyButton";
import { ReportButtons, type ReportOutcome } from "@/components/ReportButtons";
import { InstallPrompt } from "@/components/InstallPrompt";
import { TabBar, type View } from "@/components/TabBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import { LiveRow } from "@/components/LiveRow";
import { Celebrate } from "@/components/Celebrate";
import { CountUp } from "@/components/CountUp";
import { MAKER, whatsappChatLink } from "@/lib/brand";
import dynamic from "next/dynamic";

// The map library is big, so it only loads when someone opens the map
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-[58dvh] animate-pulse rounded-[22px] bg-(--card)" />,
});

const REFRESH_MS = 20_000;

function savedCity(): string {
  const c = store.get("lightdey_city");
  return c && CITIES.some((x) => x.city === c) ? c : CITIES[0].city;
}

export default function LightDeyApp() {
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
  const [celebrate, setCelebrate] = useState<string | null>(null); // area name, while the "Light don come!" screen shows

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

  const fetchAreas = useCallback(
    () => supabase.from("area_status").select("*").eq("city", city),
    [city]
  );

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
    const t = setInterval(refresh, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchAreas, applyAreas]);

  const area = areas.find((a) => a.area_id === areaId) ?? null;

  function pickArea(id: string, inCity: string = city) {
    areaIdRef.current = id;
    setAreaId(id);
    store.set("lightdey_area", id);
    store.set("lightdey_city", inCity);
    setPicking(false);
    setView("home");
  }

  // Add a new area (or get the existing one if the name is already there), then open it.
  // You have to be in the city, and the new area is pinned where you are.
  async function addArea(name: string): Promise<string | null> {
    const loc = await getLocation();
    if (!loc.ok) {
      return loc.reason === "denied"
        ? "Location is blocked. Allow it in your browser settings to add an area."
        : "Turn on your location to add an area. It gets pinned where you are.";
    }
    const state = CITIES.find((c) => c.city === city)?.state ?? city;
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
    await load();
    pickArea(data as string);
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
    if (!loc.ok) return loc.reason === "denied" ? "location_denied" : "location_off";

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
    if (lightCameBack === true) {
      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: area.area_id }),
      }).catch(() => {});
    }
    await load();
    setReported(true);
    return "ok";
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
          onPick={pickArea}
          onAdd={addArea}
          initialQuery={prefill}
          onClose={area ? () => setPicking(false) : undefined}
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
        ? `Does light dey ${area.name}? Report it here so we all know 💡 ${location.origin}`
        : `${area.status === "on" ? "Light dey" : "No light"} for ${area.name} right now. Check your area 💡 ${location.origin}`;

    // Sections slide up one after another when the screen opens
    const rise = (i: number) => ({ className: "ld-rise", style: { animationDelay: `${80 + i * 70}ms` } });

    screen = (
      <main key="home" className="ld-view-in ld-safe-top ld-safe-bottom mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5">
        <header className="flex items-center gap-2">
          <div className="mr-auto"><Logo /></div>
          <button
            onClick={() => {
              setPrefill("");
              setPicking(true);
            }}
            aria-label="Change area"
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-(--line) bg-(--raised) px-3.5 text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className="max-w-32 truncate">{area.name}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-(--muted)">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <ThemeToggle />
        </header>

        <LiveRow city={area.city} updatedAt={updatedAt} />

        {/* key: the card re-animates whenever the status changes */}
        <StatusCard key={`${area.area_id}-${area.status}`} area={area} />

        <MixedNotice
          area={area}
          onAddStreet={() => {
            setPrefill(`${area.name} `);
            setPicking(true);
          }}
        />

        <div {...rise(0)}>
          <ReportButtons areaName={area.name} onReport={report} />
        </div>

        {wrongPlace?.forArea === area.area_id && (
          <div className="ld-card-in flex flex-col gap-3 rounded-[22px] border border-(--light) bg-(--card) p-4" role="note">
            <div className="flex flex-col gap-1">
              <strong className="text-base">📍 You&apos;re not in {area.name} right now</strong>
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
          <NotifyButton areaId={area.area_id} areaName={area.name} />
        </div>

        <div {...rise(2)}>
          <TodayBar areaId={area.area_id} areaName={area.name} refreshKey={area.last_report_at ?? ""} />
        </div>

        <div {...rise(3)} >
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
              See map →
            </button>
          </div>
          {nearby.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-(--line-strong) p-4 text-sm text-(--muted)">
              No other reports in {area.city} in the last hour. Share the app so your neighbours join 👀
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
          <span>Follow for what I build next 👀</span>
          <a
            href={whatsappChatLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-11 items-center gap-2 rounded-full border border-(--line) bg-(--raised) px-4 text-[14px] font-bold text-(--text)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
            </svg>
            Chat with me on WhatsApp
          </a>
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
    </>
  );
}