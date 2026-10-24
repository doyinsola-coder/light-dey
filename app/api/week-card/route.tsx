// WEEK CARD (one area's last 7 days). This file goes in: app/api/week-card/route.tsx
// Shared from "This week" and opened from the Sunday report.
import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { MAKER } from "@/lib/brand";
import { W, H, C, cardFonts, Logo, CardFooter, KIT_TEXT } from "@/lib/cardKit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Week = { days: { day: string; hours: string }[]; reports: number; people: number };
type Band = "A" | "B" | "C" | "D" | "E";
const PROMISE: Record<Band, number> = { A: 20, B: 16, C: 12, D: 8, E: 4 };

function dayLabel(day: string, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Yest.";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("area") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Bad area", { status: 400 });

  let name = "Your area";
  let city = "";
  let week: Week = { days: [], reports: 0, people: 0 };
  let band: Band | null = null;
  try {
    const [{ data: area }, { data: w }, { data: b }] = await Promise.all([
      supabase.from("areas").select("name, city").eq("id", id).maybeSingle(),
      supabase.rpc("area_week", { p_area: id }),
      supabase.rpc("band_check", { p_area: id, p_device_id: "" }),
    ]);
    if (area) {
      name = area.name;
      city = area.city;
    }
    if (w) week = w as Week;
    band = ((b as { area: Band | null } | null)?.area ?? null) as Band | null;
  } catch {
    // network trouble: still return a card, just without numbers
  }

  const withData = week.days.filter((d) => /[01]/.test(d.hours));
  const lightHours = week.days.reduce((n, d) => n + (d.hours.match(/1/g)?.length ?? 0), 0);
  const avg = withData.length ? Math.round((lightHours / withData.length) * 10) / 10 : 0;
  const enough = week.reports >= 15 && withData.length >= 3;
  const short = band ? Math.round((PROMISE[band] - avg) * 10) / 10 : null;

  const place = city ? `${name}, ${city}` : name;
  const big = enough ? `${avg} hrs` : "Not enough";
  const line1 = enough ? "of light a day this week." : "reports yet this week.";
  const bandLine = enough && band && short !== null ? (short > 0 ? `Band ${band} promised ${PROMISE[band]}+. ${short} hrs short a day.` : `Band ${band} promise kept.`) : "";
  const proof = `From ${week.reports} reports by ${week.people} people`;
  const site = url.host;
  const credit = `Made by ${MAKER.handle}`;
  const question = "How was your area's week?";
  const labels = week.days.map((d, i) => dayLabel(d.day, i));
  const ticks = ["12am", "6am", "12pm", "6pm", "12am"];
  const nowHour = new Date(Date.now() + 3600_000).getUTCHours();

  const fontText = [big, line1, bandLine, proof, place.toUpperCase(), "THIS WEEK IN", site, credit, question, labels.join(" "), ticks.join(" "), KIT_TEXT].join(" ");
  const { fonts, family } = await cardFonts(fontText);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(170deg, ${C.bg2} 0%, ${C.bg} 60%)`,
          color: C.text,
          padding: "100px 88px 80px",
          fontFamily: family,
        }}
      >
        <Logo />

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 80 }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4, color: C.muted }}>THIS WEEK IN</div>
          <div style={{ fontSize: place.length > 22 ? 58 : 72, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{place}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
          <div style={{ fontSize: enough ? 230 : 150, fontWeight: 800, lineHeight: 0.9, letterSpacing: -10, color: C.light }}>{big}</div>
          <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginTop: 20 }}>{line1}</div>
          {bandLine && (
            <div style={{ fontSize: 46, fontWeight: 800, marginTop: 30, color: short !== null && short > 0 ? "#FF7A7E" : "#4CC38A" }}>{bandLine}</div>
          )}
        </div>

        {/* The 7 days, 24 hours each */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginTop: "auto",
            marginBottom: 44,
            padding: "34px 36px 28px",
            borderRadius: 40,
            background: C.panel,
          }}
        >
          {week.days.map((d, i) => (
            <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 110, fontSize: 26, fontWeight: 700, color: C.muted }}>{labels[i]}</div>
              <div style={{ display: "flex", flex: 1, gap: 5, height: 34 }}>
                {Array.from(d.hours).map((c, h) => (
                  <div
                    key={h}
                    style={{
                      flex: 1,
                      borderRadius: 6,
                      background: i === 0 && h > nowHour ? "transparent" : c === "1" ? C.light : c === "0" ? C.off : C.empty,
                      border: i === 0 && h > nowHour ? `2px dashed ${C.line}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 128, fontSize: 24, fontWeight: 700, color: C.muted }}>
            {ticks.map((t, i) => (
              <div key={i}>{t}</div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: C.muted, marginTop: 6 }}>{proof}</div>
        </div>

        <CardFooter question={question} site={site} credit={credit} />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800" },
    }
  );
}