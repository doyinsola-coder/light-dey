// Light Dey? service worker: shows "light don come" alerts, even when the app is closed.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Page loads go to the network as normal. With no network, show a friendly
// message instead of the browser's dinosaur. (Chrome also needs this to offer "Install".)
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Light Dey?</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0E1014;color:#F3F1EA;font-family:system-ui,sans-serif;padding:32px;box-sizing:border-box;text-align:center">
<div><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FFC531" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/></svg><h1 style="font-size:26px;margin:12px 0 8px">No network</h1>
<p style="color:#9AA3B2;font-size:16px;line-height:1.5;margin:0 0 20px">Light Dey needs data to show reports.<br>Check your connection and try again.</p>
<button onclick="location.reload()" style="background:#FFC531;color:#14120B;border:0;border-radius:16px;padding:14px 24px;font-size:16px;font-weight:700">Try again</button></div></body></html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    )
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Light Dey?", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "light-dey", // a newer alert for the same area replaces the old one
      renotify: true,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});