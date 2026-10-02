"use client";

import dynamic from "next/dynamic";

// The app reads this phone's saved area from localStorage, so it only renders in the browser.
const LightDeyApp = dynamic(() => import("@/components/LightDeyApp"), { ssr: false });

export default function Home() {
  return <LightDeyApp />;
}