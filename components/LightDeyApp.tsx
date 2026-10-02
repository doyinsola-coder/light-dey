"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import type { AreaStatus, Status } from "@/lib/types";
import { CITIES } from "@/lib/types";
import { getApproxLocation, store, timeAgo, whatsappShare } from "@/lib/helpers";
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
import dynamic from "next/dynamic";

// The map library is big, so it only loads when someone opens the map
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-[58dvh] animate-pulse rounded-[22px] bg-(--card)" />,
});

const REFRESH_MS = 20_000;

function Spinner() {
  return (
    <svg className="ld-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  );
}

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
  const [prefill, setPrefill] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<"on" | "off" | null>(null);
  const [popped, setPopped] = useState<{ which: "on" | "off"; n: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "map" | "leaderboard">("home");

  const fetchAreas = useCallback(
    () => supabase.from("area_status").select("*").eq("city", city),
    [city]
  );

  // Used after reporting, so the new status shows straight away
  const load = useCallback(async () => {
    const { data, error } = await fetchAreas();
    if (!error && data) setAreas(data as AreaStatus[]);
  }, [fetchAreas]);

  // Fetch now, then every 20s, and whenever the person comes back to the tab
  useEffect(() => {
    let alive = true; // ignore answers for a city the person already left
    const refresh = () =>
      fetchAreas().then(({ data, error }) => {
        if (!alive) return;
        if (!error && data) setAreas(data as AreaStatus[]);
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
  }, [fetchAreas]);

  const area = areas.find((a) => a.area_id === areaId) ?? null;

  function pickArea(id: string) {
    setAreaId(id);
    store.set("lightdey_area", id);
    store.set("lightdey_city", city);
    setPicking(false);
    setView("home");
    setMsg(null);
  }

  // Add a new area (or get the existing one if the name is already there), then open it
  async function addArea(name: string): Promise<string | null> {
    const state = CITIES.find((c) => c.city === city)?.state ?? city;
    const { data, error } = await supabase.rpc("add_area", { p_state: state, p_city: city, p_name: name });
    if (error || !data) {
      return error?.message.includes("invalid_name")
        ? "That name looks too short or too long."
        : "Couldn't add that. Check your data and try again.";
    }
    await load();
    pickArea(data as string);
    return null;
  }

  function changeCity(next: string) {
    setCity(next);
    setAreas([]);
    setLoading(true);
  }

  async function report(status: Exclude<Status, "unknown">) {
    if (!area || busy) return;
    setBusy(true);
    setSending(status);
    setMsg(null);
    const loc = await getApproxLocation();
    const { data: lightCameBack, error } = await supabase.rpc("report_status", {
      p_area_id: area.area_id,
      p_status: status,
      p_device_id: getDeviceId(),
      p_lat: loc?.lat ?? null,
      p_lng: loc?.lng ?? null,
    });
    if (error) {
      setMsg(
        error.message.includes("too_soon")
          ? "You reported recently. You can report again in 15 mins."
          : "Couldn't send that. Check your data and try again."
      );
    } else {
      setMsg("Thanks! Your neighbours can see it now.");
      setPopped((p) => ({ which: status, n: (p?.n ?? 0) + 1 }));
      // This report brought light back: tell everyone following this area (the server double-checks)
      if (lightCameBack === true) {
        fetch("/api/push/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ areaId: area.area_id }),
        }).catch(() => {});
      }
      await load();
    }
    setBusy(false);
    setSending(null);
  }

  // First visit, or "Change area"
  if (!area || picking) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-6">
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

  if (view === "leaderboard") {
    return <Leaderboard city={city} onBack={() => setView("home")} onOpenArea={pickArea} />;
  }

  if (view === "map") {
    const unpinned = areas
      .filter((a) => a.lat === null && a.status !== "unknown")
      .sort((a, b) => (b.last_report_at ?? "").localeCompare(a.last_report_at ?? ""));
    const lit = areas.filter((a) => a.status === "on").length;
    const dark = areas.filter((a) => a.status === "off").length;

    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-6">
        <header className="flex items-center justify-between">
          <button onClick={() => setView("home")} className="flex min-h-11 items-center gap-1 pr-3 text-[15px] font-medium">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            Back
          </button>
          <ThemeToggle />
        </header>

        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight">{city} right now</h1>
          <span className="text-[13px] text-(--muted)">Updates every 20 seconds</span>
          <p className="text-[15px] text-(--soft)">
            <span className="font-bold text-(--light-text)">{lit} with light</span> · {dark} without · last hour
          </p>
        </div>

        <MapView city={city} areas={areas} currentAreaId={area.area_id} onOpen={pickArea} />

        <div className="flex flex-wrap gap-4 text-[13px] text-(--soft)">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-(--light)" />Light dey</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-(--off-dot)" />No light</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-(--off-dot)" />No reports yet</span>
        </div>

        {unpinned.length > 0 && (
          <section className="flex flex-col">
            <h2 className="text-base font-bold">Not on the map yet</h2>
            <p className="mb-1 text-[13px] text-(--muted)">An area gets its pin when someone reports with location on.</p>
            {unpinned.map((n) => (
              <button
                key={n.area_id}
                onClick={() => pickArea(n.area_id)}
                className="flex min-h-12 items-center justify-between border-b border-(--divider) py-2.5 text-left"
              >
                <span className="text-[15px]">{n.name}</span>
                {n.status === "on" ? (
                  <span className="text-sm font-bold text-(--light-text)">Light dey · {timeAgo(n.last_report_at)}</span>
                ) : (
                  <span className="text-sm text-(--muted)">No light · {timeAgo(n.last_report_at)}</span>
                )}
              </button>
            ))}
          </section>
        )}
      </main>
    );
  }

  const nearby = areas
    .filter((a) => a.area_id !== area.area_id && a.status !== "unknown")
    .sort((a, b) => (b.last_report_at ?? "").localeCompare(a.last_report_at ?? ""))
    .slice(0, 5);

  const shareText =
    area.status === "unknown"
      ? `Does light dey ${area.name}? Report it here so we all know 💡 ${location.origin}`
      : `${area.status === "on" ? "Light dey" : "No light"} for ${area.name} right now. Check your area 💡 ${location.origin}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-6">
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
          <span className="max-w-36 truncate">{area.name}</span>
        </button>
        <ThemeToggle />
      </header>

      {/* key: the card re-animates whenever the status changes */}
      <StatusCard key={`${area.area_id}-${area.status}`} area={area} />

      <MixedNotice
        area={area}
        onAddStreet={() => {
          setPrefill(`${area.name} `);
          setPicking(true);
        }}
      />

      <section className="flex flex-col gap-2.5" aria-label="Report">
        <span className="text-[15px] font-medium text-(--soft)">What&apos;s happening where you are?</span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            key={`on-${popped?.which === "on" ? popped.n : 0}`}
            onClick={() => report("on")}
            disabled={busy}
            className={`flex min-h-16 items-center justify-center gap-2 rounded-[18px] bg-(--light) text-[17px] font-bold text-(--ink) disabled:opacity-60 ${
              popped?.which === "on" ? "ld-pop" : ""
            }`}
          >
            {sending === "on" && <Spinner />}
            {sending === "on" ? "Sending…" : "Light dey"}
          </button>
          <button
            key={`off-${popped?.which === "off" ? popped.n : 0}`}
            onClick={() => report("off")}
            disabled={busy}
            className={`flex min-h-16 items-center justify-center gap-2 rounded-[18px] border border-(--line-strong) bg-(--raised) text-[17px] font-bold disabled:opacity-60 ${
              popped?.which === "off" ? "ld-pop" : ""
            }`}
          >
            {sending === "off" && <Spinner />}
            {sending === "off" ? "Sending…" : "No light"}
          </button>
        </div>
        {msg && <p className="text-sm text-(--muted)" role="status">{msg}</p>}
      </section>

      <NotifyButton areaId={area.area_id} areaName={area.name} />

      <div className="flex flex-col gap-1">
        <ShareCardButton areaId={area.area_id} areaName={area.name} text={shareText} />
        <a
          href={whatsappShare(shareText)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center text-[15px] font-medium text-(--soft) underline underline-offset-4"
        >
          or send the link in a chat
        </a>
      </div>

      <TodayBar areaId={area.area_id} areaName={area.name} refreshKey={area.last_report_at ?? ""} />

      <nav className="grid grid-cols-2 gap-2.5" aria-label="More">
        <button
          onClick={() => setView("map")}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-(--line) bg-(--raised) text-[15px] font-bold"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>
          Map
        </button>
        <button
          onClick={() => setView("leaderboard")}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-(--line) bg-(--raised) text-[15px] font-bold"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21V11M16 21V7M12 21V3" /></svg>
          Leaderboard
        </button>
      </nav>

      <section className="flex flex-col" aria-label="Nearby">
        <h2 className="mb-1 text-base font-bold">Other areas in {area.city}</h2>
        {nearby.length === 0 && (
          <p className="py-2 text-sm text-(--muted)">No other reports in {area.city} in the last hour.</p>
        )}
        {nearby.map((n) => (
          <div key={n.area_id} className="flex items-center justify-between border-b border-(--divider) py-2.5">
            <span className="text-[15px]">{n.name}</span>
            {n.status === "on" ? (
              <span className="text-sm font-bold text-(--light-text)">Light dey · {timeAgo(n.last_report_at)}</span>
            ) : (
              <span className="text-sm text-(--muted)">No light · {timeAgo(n.last_report_at)}</span>
            )}
          </div>
        ))}
      </section>

      <HowItWorks />
    </main>
  );
}