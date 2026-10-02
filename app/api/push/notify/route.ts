import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRESH_MS = 15 * 60 * 1000;    // only alert about light that came back in the last 15 mins
const COOLDOWN_MS = 60 * 60 * 1000; // at most one alert per area per hour

type Sub = { id: number; endpoint: string; p256dh: string; auth: string };

// Called by the app after a report that brought light back.
// It doesn't trust the caller: it re-checks the database before sending anything.
export async function POST(req: Request) {
  const { areaId } = (await req.json().catch(() => ({}))) as { areaId?: string };
  if (!areaId || !/^[0-9a-f-]{36}$/i.test(areaId)) return Response.json({ sent: 0 }, { status: 400 });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return Response.json({ sent: 0, reason: "push not configured" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@example.com", pub, priv);

  const db = supabaseAdmin();
  const { data: area } = await db
    .from("areas")
    .select("id, name, light_returned_at, last_notified_at")
    .eq("id", areaId)
    .maybeSingle();
  if (!area?.light_returned_at) return Response.json({ sent: 0, reason: "no change" });

  const returned = new Date(area.light_returned_at).getTime();
  const last = area.last_notified_at ? new Date(area.last_notified_at).getTime() : 0;
  if (Date.now() - returned > FRESH_MS) return Response.json({ sent: 0, reason: "old" });
  if (last >= returned || Date.now() - last < COOLDOWN_MS) return Response.json({ sent: 0, reason: "already sent" });

  // Claim this alert so two calls at the same time can't both send it
  const { data: claimed } = await db
    .from("areas")
    .update({ last_notified_at: new Date().toISOString() })
    .eq("id", areaId)
    .eq("light_returned_at", area.light_returned_at)
    .or(`last_notified_at.is.null,last_notified_at.lt.${area.light_returned_at}`)
    .select("id");
  if (!claimed?.length) return Response.json({ sent: 0, reason: "already sent" });

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("area_id", areaId);

  const payload = JSON.stringify({
    title: "Light don come! 💡",
    body: `Neighbours say light dey for ${area.name} now.`,
    tag: `light-${areaId}`,
    url: "/",
  });

  let sent = 0;
  const dead: number[] = [];
  await Promise.all(
    ((subs as Sub[] | null) ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 30, // drop it if the phone is offline for 30+ mins; old news by then
          urgency: "high",
        });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id); // phone unsubscribed or app removed
      }
    })
  );
  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);

  return Response.json({ sent });
}