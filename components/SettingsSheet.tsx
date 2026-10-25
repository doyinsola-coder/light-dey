"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { store } from "@/lib/helpers";
import { MAKER, whatsappChatLink } from "@/lib/brand";
import { BandCheck } from "@/components/BandCheck";
import { NotifyButton } from "@/components/NotifyButton";

type Props = {
  areaId: string;
  areaName: string;
  avg: number | null; // this week's average hours, when the area has a week of reports
  onClose: () => void;
};

// The gear in the header opens this. Things you set once live here, so the home screen stays light:
// your band, your alerts for this area, and the app's look.
export function SettingsSheet({ areaId, areaName, avg, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme !== "light");

  // Close on Escape, keep the page behind from scrolling, and move focus into the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, [onClose]);

  function setTheme(nextDark: boolean) {
    const t = nextDark ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    store.set("lightdey_theme", t);
    setDark(nextDark);
  }

  return (
    <div className="fixed inset-0 z-[1150] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button aria-label="Close settings" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <div
        ref={panel}
        tabIndex={-1}
        className="ld-sheet-in relative flex max-h-[88dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-[28px] border-t border-(--line) bg-(--bg) px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 outline-none"
      >
        <span className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-(--line-strong)" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3">
          <h2 id="settings-title" className="font-display text-[20px] font-extrabold leading-tight">
            Settings for {areaName}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--line) bg-(--raised)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <Section title="Your band">
          <BandCheck areaId={areaId} areaName={areaName} avg={avg} variant="settings" />
        </Section>

        <Section title="Alerts">
          <NotifyButton areaId={areaId} areaName={areaName} variant="settings" />
        </Section>

        <Section title="App">
          <div className="flex flex-col rounded-2xl border border-(--line) bg-(--card) px-4">
            <button
              onClick={() => setTheme(!dark)}
              role="switch"
              aria-checked={dark}
              className="flex min-h-14 items-center justify-between gap-3 border-b border-(--divider) text-left"
            >
              <span className="text-[15px] font-bold">Dark mode</span>
              <span className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${dark ? "bg-(--light)" : "bg-(--divider)"}`} aria-hidden="true">
                <span className={`h-5 w-5 rounded-full transition-transform ${dark ? "translate-x-4 bg-(--ink)" : "bg-(--muted)"}`} />
              </span>
            </button>
            <a
              href={whatsappChatLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center justify-between gap-3 border-b border-(--divider) text-[15px] font-bold"
            >
              <span className="flex items-center gap-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
                </svg>
                Chat with {MAKER.name.split(" ")[0]} on WhatsApp
              </span>
              <Chevron />
            </a>
            <a href="/privacy" className="flex min-h-14 items-center justify-between gap-3 text-[15px] font-bold">
              Privacy
              <Chevron />
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[12px] font-bold uppercase tracking-[1.4px] text-(--muted)">{title}</h3>
      {children}
    </section>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-(--muted)">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// The gear button for the header
export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Settings"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--line) bg-(--raised)"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </button>
  );
}