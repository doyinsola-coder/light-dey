"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/helpers";

// Chrome's install event (not in the standard TypeScript types yet)
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SNOOZE_KEY = "lightdey_install_snoozed";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // "Not now" hides it for 3 days
const SHOW_AFTER_MS = 10_000;

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isSnoozed() {
  return Date.now() - Number(store.get(SNOOZE_KEY) ?? 0) < SNOOZE_MS;
}

// Slides up from the bottom and asks people to put Light Dey on their home screen.
// Android: real "Install" button. iPhone: shows the two taps (Apple has no install button for websites).
// Appears after the first report (`nudge`) or after 10 seconds, whichever comes first.
export function InstallPrompt({ nudge }: { nudge: boolean }) {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [hidden, setHidden] = useState(() => isInstalled() || isSnoozed());
  const [ios] = useState(isIOS);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const onInstallable = (e: Event) => {
      e.preventDefault(); // we show our own card instead of Chrome's mini-bar
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setTimeUp(true), SHOW_AFTER_MS);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  const ready = Boolean(installEvent) || ios;
  if (hidden || !ready || !(nudge || timeUp)) return null;

  function snooze() {
    store.set(SNOOZE_KEY, String(Date.now()));
    setHidden(true);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null); // Chrome only lets us use it once
    if (outcome === "accepted") setHidden(true);
    else snooze();
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1100] px-4"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-label="Install Light Dey"
    >
      <div className="ld-sheet-in mx-auto flex max-w-md flex-col gap-4 rounded-[26px] border border-(--line) bg-(--raised) p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={52} height={52} className="h-13 w-13 shrink-0 rounded-[14px]" />
          <div className="flex flex-col gap-1">
            <strong className="text-[17px] leading-tight">Put Light Dey on your phone</strong>
            <span className="text-[14px] leading-snug text-(--soft)">
              Open it from your home screen like an app. No need to find the link again.
            </span>
          </div>
        </div>

        {ios ? (
          <>
            <ol className="flex flex-col gap-2 rounded-2xl bg-(--card) p-4 text-[15px]">
              <li className="flex items-center gap-2">
                <span className="font-bold">1.</span> Tap
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="the Share button" role="img">
                  <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>
                <span>at the bottom of Safari</span>
              </li>
              <li>
                <span className="font-bold">2.</span> Choose <strong>Add to Home Screen</strong>
              </li>
            </ol>
            <button onClick={snooze} className="min-h-12 rounded-2xl bg-(--light) text-base font-bold text-(--ink)">
              Got it
            </button>
          </>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-2.5">
            <button onClick={install} className="min-h-12 rounded-2xl bg-(--light) text-base font-bold text-(--ink)">
              Install app
            </button>
            <button onClick={snooze} className="min-h-12 rounded-2xl px-4 text-[15px] font-medium text-(--soft)">
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}