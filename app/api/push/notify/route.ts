import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { pushReady, sendAll } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = { endpoint: string; p256dh: string; auth: string; title: string; body: string; url: string; tag: string };

// Runs once a day at about 7am Nigeria time (Vercel Cron, see vercel.json).
// Every day: "Good morning. Last night in Tanke: about 5 hrs of light."
// Sundays: the weekly report instead: "Tanke: about 5.9 hrs of light a day, 10.1 hrs short of Band B."
// Only for phones following an area with the daily summary switched on.
export async function GET(req: Request) {
  // Only Vercel's scheduler (or you, with the secret) may run this
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Not allowed", { status: 401 });
  if (!pushReady()) return Response.json({ sent: 0, reason: "push not configured" }, { status: 500 });

  const url = new URL(req.url);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Africa/Lagos" }).format(new Date());
  const weekly = url.searchParams.has("weekly") ? url.searchParams.get("weekly") === "1" : day === "Sun";

  const { data, error } = await supabaseAdmin().rpc("push_daily_digest", { p_weekly: weekly });
  if (error) return Response.json({ sent: 0, error: error.message }, { status: 500 });

  const rows = (data as Row[] | null) ?? [];
  const sent = await sendAll(
    rows,
    (t) => {
      const r = t as Row;
      return { title: r.title, body: r.body, tag: r.tag, url: r.url };
    },
    60 * 60 * 6 // a morning summary is still useful a few hours late
  );
  return Response.json({ weekly, phones: rows.length, sent });
}