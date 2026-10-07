"use client";

import dynamic from "next/dynamic";

// The admin app only runs in the browser (it uses the map, saved login and the screen).
// Loading it this way stops the build from trying to run it on the server.
const AdminPanel = dynamic(() => import("./AdminPanel").then((m) => m.AdminPanel), {
  ssr: false,
  loading: () => <main className="flex min-h-dvh items-center justify-center text-(--muted)">Opening…</main>,
});

export function AdminClient() {
  return <AdminPanel />;
}