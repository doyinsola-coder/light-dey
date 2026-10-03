import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { MAKER } from "@/lib/brand";
import { W, H, C, cardFonts, Logo } from "@/lib/cardKit";

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

  const big = current ? `${streak} hr${streak === 1 ? "" : "s"}` : "Light dey?";
  const line1 =
    current === "off" ? "without light." : current === "on" ? "of light and counting." : `Nobody has reported from ${name} yet.`;
  const line2 = current === "off" ? "We move." : current === "on" ? "Make e no go o." : "Be the first.";
  const place = city ? `${name}, ${city}` : name;
  const site = url.host;

  const credit = `by ${MAKER.handle}`;
  // The font is downloaded only for the letters on this card, so every piece of text must be in here
  const fontText = [big, line1, line2, place.toUpperCase(), site, credit, "Light Dey?", "Today", "hrs of light", "Does light dey your area?", "0123456789"].join(" ");
  const { fonts, family } = await cardFonts(fontText);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: C.bg,
          color: C.text,
          padding: "110px 96px",
          fontFamily: family,
        }}
      >
        <Logo />

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 4, color: C.muted, textTransform: "uppercase" }}>
            {place}
          </div>
          <div
            style={{
              fontSize: current ? 300 : 210,
              fontWeight: 800,
              lineHeight: 0.85,
              letterSpacing: -12,
              color: current === "on" ? C.light : current === "off" ? C.text : C.light,
            }}
          >
            {big}
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            <div>{line1}</div>
            <div style={{ color: C.muted }}>{line2}</div>
          </div>
        </div>

        {/* Today's bar + call to action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 700 }}>
            <div>Today</div>
            <div style={{ color: C.light }}>{`${lightToday} hr${lightToday === 1 ? "" : "s"} of light`}</div>
          </div>
          <div style={{ display: "flex", gap: 8, height: 64 }}>
            {Array.from({ length: 24 }, (_, h) => {
              const s = byHour.get(h);
              const future = h > nowHour;
              return (
                <div
                  key={h}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    background: future ? "transparent" : s === "on" ? C.light : s === "off" ? C.off : C.empty,
                    border: future ? `3px dashed ${C.line}` : "none",
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `3px solid ${C.line}`, paddingTop: 44, marginTop: 30 }}>
            <div style={{ fontSize: 50, fontWeight: 700 }}>Does light dey your area?</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 46, color: C.light }}>{site}</div>
              <div style={{ fontSize: 34, color: C.muted }}>{credit}</div>
            </div>
          </div>
        </div>
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