import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";

// Private page for the Light Dey team. Not linked anywhere in the app and hidden from search engines.
// It has its own install settings, so it can sit on your home screen as a separate "LD Admin" app.
export const metadata: Metadata = {
  title: "Light Dey Admin",
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
  icons: { icon: "/admin-192.png", apple: "/admin-192.png" },
  appleWebApp: { capable: true, title: "LD Admin", statusBarStyle: "black-translucent" },
};

export default function AdminPage() {
  return <AdminClient />;
}