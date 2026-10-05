import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { MAKER } from "@/lib/brand";
import { W, H, C, cardFonts, Logo, BulbArt, CardFooter, KIT_TEXT } from "@/lib/cardKit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type St = "on" | "off";
type HourRow = { hour: string; status: St | null };

// Shift a UTC time to Nigeria time (UTC+1, no daylight saving)
const lagos = (d: Date) => new Date(d.getTime() + 60 * 60 * 1000);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("area") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Bad area", { status: 400 });

  let name = "Your area";
  let city = "";
  let hours: HourRow[] = [];
  try {
    const [{ data: area }, { data: hrs }] = await Promise.all([
      supabase.from("areas").select("name, city").eq("id", id).maybeSingle(),
      supabase.rpc("hourly_status", {
        p_from: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        p_to: new Date().toISOString(),
        p_area: id,
      }),
    ]);
    if (area) {
      name = area.name;
      city = area.city;
    }
    hours = (hrs as HourRow[] | null) ?? [];
  } catch {
    // network trouble: still return a card, just without numbers
  }

  // Current run: how many hours in a row the latest status has lasted
  const newestFirst = [...hours].sort((a, b) => b.hour.localeCompare(a.hour));
  const current = newestFirst.find((h) => h.status)?.status ?? null;
  let streak = 0;
  if (current) {
    for (const h of newestFirst) {
      if (!h.status && streak === 0) continue; // skip empty hours before the latest report
      if (h.status !== current) break;
      streak++;
    }
  }

  // Today's 24 hours (Nigeria time)
  const nowL = lagos(new Date());
  const today = nowL.toISOString().slice(0, 10);
  const byHour = new Map<number, St>();
  for (const h of hours) {
    const t = lagos(new Date(h.hour));
    if (h.status && t.toISOString().slice(0, 10) === today) byHour.set(t.getUTCHours(), h.status);
  }
  const nowHour = nowL.getUTCHours();
  const lightToday = [...byHour.values()].filter((s) => s === "on").length;

  const mode: "on" | "off" | "unknown" = current ?? "unknown";
  const on = mode === "on";

  const big = current ? `${streak} hr${streak === 1 ? "" : "s"}` : "Light dey?";
  const line1 =
    current === "off" ? "without light." : current === "on" ? "of light and counting." : `Nobody has reported from ${name} yet.`;
  // A little Naija commentary that changes with how long it's been
  const line2 =
    current === "off"
      ? streak >= 12
        ? "NEPA, we dey wait o."
        : streak >= 4
          ? "Gen dey work overtime."
          : "We move."
      : current === "on"
        ? streak >= 12
          ? "Who dey pray for us? Continue."
          : streak >= 4
            ? "Make e no go o."
            : "Charge everything now."
        : "Be the first.";
  const stamp = on ? "LIGHT DEY" : mode === "off" ? "NO LIGHT" : "NO REPORTS YET";
  const place = city ? `${name}, ${city}` : name;
  const site = url.host;
  const credit = `Made by ${MAKER.handle}`;
  const question = "Does light dey your area?";
  const todayLabel = `${lightToday} hr${lightToday === 1 ? "" : "s"} of light today`;
  const ticks = ["12am", "6am", "12pm", "6pm", "12am"];

  // The font is downloaded only for the letters on this card, so every piece of text must be in here
  const fontText = [big, line1, line2, stamp, place.toUpperCase(), site, credit, question, todayLabel, ticks.join(" "), KIT_TEXT].join(" ");
  const { fonts, family } = await cardFonts(fontText);

  const ink = on ? C.ink : C.text;
  const soft = on ? "rgba(20,18,11,0.62)" : C.muted;
  const bars = {
    on: on ? C.ink : C.light,
    off: on ? "rgba(20,18,11,0.22)" : C.off,
    empty: on ? "rgba(20,18,11,0.09)" : C.empty,
    future: on ? "rgba(20,18,11,0.22)" : C.line,
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: on
            ? `linear-gradient(160deg, ${C.lightTop} 0%, ${C.light} 45%, ${C.lightBottom} 100%)`
            : `linear-gradient(170deg, ${C.bg2} 0%, ${C.bg} 60%)`,
          color: ink,
          padding: "100px 88px 80px",
          fontFamily: family,
        }}
      >
        {/* faint glow behind the bulb on dark cards */}
        {!on && (
          <div
            style={{
              position: "absolute",
              right: -160,
              top: 120,
              width: 760,
              height: 760,
              borderRadius: 760,
              background: "radial-gradient(circle, rgba(255,197,49,0.10) 0%, rgba(255,197,49,0) 65%)",
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo color={ink} accent={on ? C.ink : C.light} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 26px",
              borderRadius: 999,
              background: on ? "rgba(20,18,11,0.1)" : C.panel,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 3,
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 18, background: on ? C.ink : mode === "off" ? C.off : C.light }} />
            {stamp}
          </div>
        </div>

        {/* Place + bulb */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 70 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4, color: soft }}>RIGHT NOW IN</div>
            <div style={{ fontSize: place.length > 18 ? 58 : 72, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{place}</div>
          </div>
          <BulbArt mode={mode} size={360} />
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
          <div
            style={{
              fontSize: current ? 290 : 200,
              fontWeight: 800,
              lineHeight: 0.88,
              letterSpacing: -12,
              color: on ? C.ink : mode === "off" ? C.text : C.light,
            }}
          >
            {big}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, fontSize: 86, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>
            <div>{line1}</div>
            <div style={{ color: on ? "rgba(20,18,11,0.55)" : C.light }}>{line2}</div>
          </div>
        </div>

        {/* Today */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            marginTop: "auto",
            marginBottom: 44,
            padding: "34px 36px 28px",
            borderRadius: 40,
            background: on ? "rgba(20,18,11,0.08)" : C.panel,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 800 }}>
            <div>Today</div>
            <div style={{ color: on ? C.ink : C.light }}>{todayLabel}</div>
          </div>
          <div style={{ display: "flex", gap: 7, height: 84, alignItems: "flex-end" }}>
            {Array.from({ length: 24 }, (_, h) => {
              const s = byHour.get(h);
              const future = h > nowHour;
              return (
                <div
                  key={h}
                  style={{
                    flex: 1,
                    height: s === "on" || h === nowHour ? "100%" : "68%",
                    borderRadius: 9,
                    background: future ? "transparent" : s === "on" ? bars.on : s === "off" ? bars.off : bars.empty,
                    border: future ? `3px dashed ${bars.future}` : h === nowHour ? `4px solid ${on ? C.ink : C.light}` : "none",
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 700, color: soft }}>
            {ticks.map((t, i) => (
              <div key={i}>{t}</div>
            ))}
          </div>
        </div>

        <CardFooter question={question} site={site} credit={credit} onYellow={on} />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
      headers: { "Cache-Control": "public, max-age=60" },
    }
  );
}