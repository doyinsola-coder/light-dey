// CITY BATTLE CARD. This file goes in: app/api/battle-card/route.tsx
import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { MAKER } from "@/lib/brand";
import { W, H, C, cardFonts, Logo, CardFooter, KIT_TEXT } from "@/lib/cardKit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Side = { city: string; people: number; reports: number; areas: number; hrs: number | null };

// /api/battle-card?a=Ibadan&b=Ilorin  (this week)
// /api/battle-card?id=12              (official battle: live score or final result)
// Who has more people reporting this week. Light hours shown underneath.
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Official battle (?id=12): score from the battle's own dates. Otherwise ?a=&b= for this week.
  const id = Number(url.searchParams.get("id") ?? "");
  let a = (url.searchParams.get("a") ?? "").slice(0, 40);
  let b = (url.searchParams.get("b") ?? "").slice(0, 40);
  let official: { endsAt: string; finished: boolean } | null = null;
  let sides: Side[] = [];

  try {
    if (id) {
      const { data } = await supabase.rpc("battle_public", { p_id: id });
      const r = (data as { city_a: string; city_b: string; ends_at: string; finished: boolean; people_a: number; people_b: number; reports_a: number; reports_b: number }[] | null)?.[0];
      if (r) {
        a = r.city_a;
        b = r.city_b;
        official = { endsAt: r.ends_at, finished: r.finished };
        sides = [
          { city: a, people: Number(r.people_a), reports: Number(r.reports_a), areas: 0, hrs: null },
          { city: b, people: Number(r.people_b), reports: Number(r.reports_b), areas: 0, hrs: null },
        ];
      }
    } else if (a && b && a !== b) {
      const { data } = await supabase.rpc("city_battle", { p_a: a, p_b: b });
      const rows = (data as { city: string; people: number; reports: number; areas: number; hrs_per_day: number | null }[] | null) ?? [];
      if (rows.length === 2)
        sides = rows.map((r) => ({
          city: r.city,
          people: Number(r.people),
          reports: Number(r.reports),
          areas: Number(r.areas),
          hrs: r.hrs_per_day === null ? null : Number(r.hrs_per_day),
        }));
    }
  } catch {
    // network trouble: show zeros
  }
  if (!a || !b || a === b) return new Response("Pick two different towns", { status: 400 });
  if (sides.length !== 2)
    sides = [
      { city: a, people: 0, reports: 0, areas: 0, hrs: null },
      { city: b, people: 0, reports: 0, areas: 0, hrs: null },
    ];

  const [x, y] = sides;
  const tie = x.people === y.people;
  const lead = tie ? null : x.people > y.people ? x.city : y.city;
  const gap = Math.abs(x.people - y.people);

  const daysLeft = official ? Math.max(0, Math.ceil((new Date(official.endsAt).getTime() - Date.now()) / 86400000)) : 0;
  const final = official?.finished ?? false;
  const kicker = !official
    ? "CITY BATTLE · THIS WEEK"
    : final
      ? "OFFICIAL CITY BATTLE · FINAL"
      : `OFFICIAL CITY BATTLE · ${daysLeft <= 1 ? "LAST DAY" : `${daysLeft} DAYS LEFT`}`;
  const headline = final
    ? tie ? "Na draw!" : `${lead} wins!`
    : tie ? (x.people === 0 ? "Who go start first?" : "Na draw for now!") : `${lead} dey lead!`;
  const sub = final
    ? tie ? "Rematch loading." : `By ${gap} ${gap === 1 ? "person" : "people"}. Well done, ${lead}.`
    : tie ? "Get your people reporting." : `By ${gap} ${gap === 1 ? "person" : "people"}. E never finish.`;

  const site = url.host;
  const credit = `Made by ${MAKER.handle}`;
  const peopleLabel = "people reporting";
  const footerQ = final ? "Who go win the next one? Report your area." : "Which side you dey? Report your area.";
  const stat = (s: Side) => (official ? `${s.reports} reports` : `${s.reports} reports · ${s.hrs === null ? "light hours coming" : `${s.hrs} hrs light/day`}`);
  const lines = [kicker, headline, sub, footerQ, site, credit, peopleLabel, "VS", "LEADING", "WINNER", x.city, y.city, stat(x), stat(y), String(x.people), String(y.people), KIT_TEXT];
  const { fonts, family } = await cardFonts(lines.join(" "));

  const nameSize = (n: string) => (n.length > 14 ? 64 : n.length > 9 ? 80 : 96);

  const panel = (s: Side) => {
    const win = lead === s.city;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "38px 48px",
          borderRadius: 52,
          background: win ? `linear-gradient(145deg, ${C.lightTop} 0%, ${C.light} 50%, ${C.lightBottom} 100%)` : C.panel,
          border: win ? "none" : `3px solid ${C.line}`,
          color: win ? C.ink : C.text,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: nameSize(s.city), fontWeight: 800, letterSpacing: -2 }}>{s.city}</div>
          {win && (
            <div style={{ display: "flex", padding: "10px 24px", borderRadius: 40, background: C.ink, color: C.light, fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>
              {final ? "WINNER" : "LEADING"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ fontSize: 128, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>{String(s.people)}</div>
          <div style={{ fontSize: 40, fontWeight: 700, opacity: 0.75 }}>{peopleLabel}</div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, opacity: win ? 0.75 : 1, color: win ? C.ink : C.muted }}>{stat(s)}</div>
      </div>
    );
  };

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "90px 72px 70px",
          background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
          color: C.text,
          fontFamily: family,
        }}
      >
        <Logo />
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 50 }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 4, color: C.light }}>{kicker}</div>
          <div style={{ fontSize: headline.length > 18 ? 96 : 112, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>{headline}</div>
          <div style={{ fontSize: 42, fontWeight: 700, color: C.muted }}>{sub}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 44 }}>
          {panel(x)}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 96, height: 96, borderRadius: 96, background: C.bg, border: `4px solid ${C.light}`, color: C.light, fontSize: 44, fontWeight: 800 }}>
              VS
            </div>
          </div>
          {panel(y)}
        </div>

        <div style={{ display: "flex", marginTop: "auto", paddingTop: 40 }}>
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
      // Vercel's CDN keeps each battle card for 10 minutes, so 1,000 shares = 1 drawing
      headers: {
        "Cache-Control": official
          ? "public, max-age=60, s-maxage=120, stale-while-revalidate=600" // official battles move faster
          : "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
      },
    }
  );
}