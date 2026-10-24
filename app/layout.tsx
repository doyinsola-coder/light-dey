import type { Metadata, Viewport } from "next";
import { Unbounded, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Unbounded({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-display" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Light Dey?",
  description: "Does light dey your area? Live power reports from your neighbours.",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  authors: [{ name: "Doyinsola", url: "https://x.com/TheMaleDoyin" }],
  creator: "Doyinsola (@TheMaleDoyin)",
  appleWebApp: { capable: true, title: "Light Dey", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0E1014" },
    { media: "(prefers-color-scheme: light)", color: "#F6F4EE" },
  ],
};

// Runs before the page paints: the saved choice, else the phone's own setting. Stops a white flash.
const themeScript = `(function(){try{var t=localStorage.getItem("lightdey_theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}