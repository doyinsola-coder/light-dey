// SERVER ONLY. Sends web push messages and forgets phones that uninstalled or turned alerts off.
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Target = { endpoint: string; p256dh: string; auth: string };
export type Message = { title: string; body: string; tag: string; url: string };

export function pushReady(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@example.com", pub, priv);
  return true;
}

// Sends to every target (a few at a time), returns how many went through.
// ttl: seconds the push service keeps it for a phone that's offline.
export async function sendAll(targets: Target[], message: (t: Target) => Message, ttl: number, urgency: "high" | "normal" = "normal") {
  let sent = 0;
  const dead: string[] = [];
  const BATCH = 50;
  for (let i = 0; i < targets.length; i += BATCH) {
    await Promise.all(
      targets.slice(i, i + BATCH).map(async (t) => {
        try {
          await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(message(t)), {
            TTL: ttl,
            urgency,
          });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(t.endpoint); // phone unsubscribed or app removed
        }
      })
    );
  }
  if (dead.length) await supabaseAdmin().from("push_subscriptions").delete().in("endpoint", dead);
  return sent;
}