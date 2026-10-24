import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { pushReady, sendAll, type Target } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the app after a report that may have changed an area's light:
//   kind "on"  = light came back (everyone following the area)
//   kind "off" = light went (only people who turned on "also when light goes")
// It doesn't trust the caller: claim_push_alert re-checks the database (a real change in the last
// 15 minutes, not already sent, at most one of each kind per area per hour) before anything is sent.
export async function POST(req: Request) {
  const { areaId, kind = "on" } = (await req.json().catch(() => ({}))) as { areaId?: string; kind?: "on" | "off" };
  if (!areaId || !/^[0-9a-f-]{36}$/i.test(areaId) || (kind !== "on" && kind !== "off")) return Response.json({ sent: 0 }, { status: 400 });
  if (!pushReady()) return Response.json({ sent: 0, reason: "push not configured" }, { status: 500 });

  const db = supabaseAdmin();
  const { data: name, error } = await db.rpc("claim_push_alert", { p_area: areaId, p_kind: kind });
  if (error) return Response.json({ sent: 0, error: error.message }, { status: 500 });
  if (!name) return Response.json({ sent: 0, reason: "nothing new" });

  let q = db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("area_id", areaId);
  if (kind === "off") q = q.eq("notify_off", true);
  const { data: subs } = await q;

  const sent = await sendAll(
    (subs as Target[] | null) ?? [],
    () =>
      kind === "on"
        ? { title: "Light don come!", body: `Neighbours say light dey for ${name} now.`, tag: `light-${areaId}`, url: `/?area=${areaId}` }
        : { title: "Light don go", body: `Neighbours say no light for ${name} now.`, tag: `light-${areaId}`, url: `/?area=${areaId}` },
    60 * 30, // old news after 30 mins
    "high"
  );
  return Response.json({ sent });
}