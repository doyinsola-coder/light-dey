import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { MAKER } from "@/lib/brand";
import { W, H, C, cardFonts, Logo } from "@/lib/cardKit";

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
  const kicker = "LAST 7 DAYS";
  const empty = "Not enough reports yet.";
  const emptySub = "Report your area and get it on the board.";
  const footerQ = type === "cities" ? "Where your city dey for the list?" : "Where your area dey for the list?";
  const site = url.host;
  const credit = `by ${MAKER.handle}`;
  const hrsText = rows.map((r) => `${r.hrs} hrs/day`);

  const { fonts, family } = await cardFonts(
    [title, kicker, empty, emptySub, footerQ, site, credit, "Light Dey?", "0123456789.", ...rows.map((r) => r.label), ...hrsText].join(" ")
  );

  const titleSize = title.length > 30 ? 92 : 108;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          color: C.text,
          padding: "110px 96px",
          fontFamily: family,
        }}
      >
        <Logo />

        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 90 }}>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: 4, color: C.muted }}>{kicker}</div>
          <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 0.98, letterSpacing: -3 }}>{title}</div>
        </div>

        {rows.length === 0 ? (
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: rows.length > 6 ? 34 : 44, marginTop: 80 }}>
            {rows.map((r, i) => {
              const first = i === 0;
              return (
                <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
                      <div style={{ fontSize: first ? 64 : 48, fontWeight: 800, color: first ? C.light : C.muted, width: 70 }}>
                        {`${i + 1}`}
                      </div>
                      <div style={{ fontSize: first ? 58 : 46, fontWeight: 800 }}>{r.label}</div>
                    </div>
                    <div style={{ fontSize: first ? 46 : 38, fontWeight: 700, color: C.light }}>{hrsText[i]}</div>
                  </div>
                  <div style={{ display: "flex", height: first ? 26 : 18, borderRadius: 13, background: C.empty }}>
                    <div
                      style={{
                        width: `${Math.max(2, Math.min(100, (r.hrs / 24) * 100))}%`,
                        height: "100%",
                        borderRadius: 13,
                        background: first ? C.light : "#C9A43A",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: "auto",
            borderTop: `3px solid ${C.line}`,
            paddingTop: 44,
          }}
        >
          <div style={{ fontSize: 50, fontWeight: 700 }}>{footerQ}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 46, color: C.light }}>{site}</div>
            <div style={{ fontSize: 34, color: C.muted }}>{credit}</div>
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