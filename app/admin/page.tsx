import type { Metadata } from "next";
import { AdminPanel } from "./AdminPanel";

// Private page for the Light Dey team: add any area or town without being there.
// Not linked anywhere in the app and hidden from search engines.
export const metadata: Metadata = {
  title: "Admin · Light Dey?",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}