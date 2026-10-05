// RANKING CARD (leaderboard). This file goes in: app/api/leaderboard-card/route.tsx
import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { MAKER } from "@/lib/brand";
import { W, H, C, cardFonts, Logo, CardFooter, KIT_TEXT } from "@/lib/cardKit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { label: string; hrs: number };
const MAX_ROWS = 8;

// /api/leaderboard-card?type=cities
// /api/leaderboard-card?type=areas&city=Ilorin
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "areas" ? "areas" : "cities";
  const city = (url.searchParams.get("city") ?? "").slice(0, 40);
  if (type === "areas" && !city) return new Response("Missing city", { status: 400 });

  let rows: Row[] = [];
  try {
    if (type === "cities") {
      const { data } = await supabase.rpc("leaderboard_cities");
      rows = ((data as { city: string; hrs_per_day: number }[] | null) ?? []).map((r) => ({
        label: r.city,
        hrs: Number(r.hrs_per_day),
      }));
    } else {
      const { data } = await supabase.rpc("leaderboard_areas", { p_city: city });
      rows = ((data as { name: string; hrs_per_day: number }[] | null) ?? []).map((r) => ({
        label: r.name,
        hrs: Number(r.hrs_per_day),
      }));
    }
  } catch {
    // network trouble: show the empty version
  }
  rows = rows.slice(0, MAX_ROWS);

  const title = type === "cities" ? "Which city get light pass?" : `Which part of ${city} get light pass?`;
  const kicker = "LAST 7 DAYS · HOURS OF LIGHT PER DAY";
  const empty = "Not enough reports yet.";
  const emptySub = "Report your area and get it on the board.";
  const footerQ = type === "cities" ? "Where your city dey for the list?" : "Where your area dey for the list?";
  const site = url.host;
  const credit = `Made by ${MAKER.handle}`;
  const fmt = (h: number) => `${h} hrs`;
  const perDay = "per day";

  const { fonts, family } = await cardFonts(
    [title, kicker, empty, emptySub, footerQ, site, credit, perDay, KIT_TEXT, ...rows.map((r) => r.label), ...rows.map((r) => fmt(r.hrs))].join(" ")
  );

  const titleSize = title.length > 30 ? 92 : 108;
  const podium = rows.length >= 3;
  const rest = podium ? rows.slice(3) : rows;

  // Podium order on screen: 2nd, 1st, 3rd
  // A long list below means a shorter podium, so everything fits
  const tall = rest.length <= 3 ? 1 : 0.8;
  const MEDAL = [
    { bg: `linear-gradient(180deg, ${C.lightTop} 0%, ${C.light} 50%, ${C.lightBottom} 100%)`, fg: C.ink, h: 420 * tall, ring: "#FFF1C2" },
    { bg: "linear-gradient(180deg, #E4E7EC 0%, #B9C0CB 100%)", fg: C.ink, h: 335 * tall, ring: "#F4F6F9" },
    { bg: "linear-gradient(180deg, #E8A86B 0%, #C0773A 100%)", fg: C.ink, h: 275 * tall, ring: "#F6D2AE" },
  ];
  const nameSize = (label: string, first: boolean) => (label.length > 11 ? 36 : label.length > 8 ? 42 : first ? 54 : 48);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: `linear-gradient(175deg, ${C.bg2} 0%, ${C.bg} 55%)`,
          color: C.text,
          padding: "100px 88px 80px",
          fontFamily: family,
        }}
      >
        {/* yellow glow over the podium */}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 420,
            width: 800,
            height: 800,
            borderRadius: 800,
            background: "radial-gradient(circle, rgba(255,197,49,0.16) 0%, rgba(255,197,49,0) 65%)",
          }}
        />

        <Logo />

        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 64 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3, color: C.light }}>{kicker}</div>
          <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 0.98, letterSpacing: -3 }}>{title}</div>
        </div>

        {rows.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginTop: 90,
              padding: 56,
              borderRadius: 40,
              border: `4px dashed ${C.line}`,
            }}
          >
            <div style={{ fontSize: 58, fontWeight: 800 }}>{empty}</div>
            <div style={{ fontSize: 42, color: C.muted }}>{emptySub}</div>
          </div>
        )}

        {podium && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginTop: tall < 1 ? 50 : 70 }}>
            {[1, 0, 2].map((i) => {
              const r = rows[i];
              const m = MEDAL[i];
              const first = i === 0;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 18 }}>
                  {first && (
                    <svg width="86" height="66" viewBox="0 0 24 18" fill={C.light}>
                      <path d="M2 6l5 4 5-8 5 8 5-4-2 11H4L2 6z" />
                    </svg>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      textAlign: "center",
                      fontSize: nameSize(r.label, first),
                      fontWeight: 800,
                      lineHeight: 1.02,
                      letterSpacing: -1,
                    }}
                  >
                    {r.label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "100%",
                      height: m.h,
                      paddingTop: tall < 1 ? 18 : 26,
                      gap: 6,
                      borderRadius: "36px 36px 14px 14px",
                      background: m.bg,
                      color: m.fg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: first ? 96 : 80,
                        height: first ? 96 : 80,
                        borderRadius: 96,
                        border: `5px solid ${m.ring}`,
                        background: "rgba(20,18,11,0.12)",
                        fontSize: first ? 56 : 46,
                        fontWeight: 800,
                      }}
                    >
                      {`${i + 1}`}
                    </div>
                    <div style={{ fontSize: first ? 64 : 50, fontWeight: 800, letterSpacing: -2, marginTop: 8 }}>{fmt(r.hrs)}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.7 }}>{perDay}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rest.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: podium ? 20 : 30,
              marginTop: podium ? 30 : 70,
              marginBottom: 40,
              padding: "30px 36px",
              borderRadius: 40,
              background: C.panel,
            }}
          >
            {rest.map((r, j) => {
              const rank = (podium ? 4 : 1) + j;
              return (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 62,
                      height: 62,
                      borderRadius: 62,
                      background: C.empty,
                      fontSize: 32,
                      fontWeight: 800,
                      color: C.muted,
                    }}
                  >
                    {`${rank}`}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: 40, fontWeight: 800 }}>{r.label}</div>
                      <div style={{ fontSize: 34, fontWeight: 700, color: C.light }}>{fmt(r.hrs)}</div>
                    </div>
                    <div style={{ display: "flex", height: 12, borderRadius: 12, background: C.empty }}>
                      <div
                        style={{
                          width: `${Math.max(2, Math.min(100, (r.hrs / 24) * 100))}%`,
                          height: "100%",
                          borderRadius: 12,
                          background: `linear-gradient(90deg, ${C.lightBottom}, ${C.light})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", marginTop: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <CardFooter question={footerQ} site={site} credit={credit} />
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
      headers: { "Cache-Control": "public, max-age=300" },
    }
  );
}