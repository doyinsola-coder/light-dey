"use client";

import { buzz } from "@/lib/helpers";
import type React from "react";

export type View = "home" | "map" | "leaderboard";

const TABS: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "My places",
    icon: (
      <>
        <path d="M9 18h6" /><path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
      </>
    ),
  },
  {
    id: "map",
    label: "Map",
    icon: (
      <>
        <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" />
      </>
    ),
  },
  {
    id: "leaderboard",
    label: "Ranking",
    icon: <path d="M8 21V11M16 21V7M12 21V3" />,
  },
];

// App-style bar at the bottom of the screen, with a pill that slides to the open tab
export function TabBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const index = TABS.findIndex((t) => t.id === view);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[1000] px-4"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      aria-label="Main"
    >
      <div className="relative mx-auto grid max-w-md grid-cols-3 rounded-[26px] border border-(--line) bg-[color-mix(in_srgb,var(--raised)_82%,transparent)] p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {/* sliding pill */}
        <span
          className="absolute bottom-1.5 left-1.5 top-1.5 rounded-[20px] bg-(--light) transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.5,1)]"
          style={{ width: "calc((100% - 12px) / 3)", transform: `translateX(${index * 100}%)` }}
          aria-hidden="true"
        />
        {TABS.map((t) => {
          const active = t.id === view;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (active) return;
                buzz(8);
                window.scrollTo({ top: 0 });
                onChange(t.id);
              }}
              aria-current={active ? "page" : undefined}
              className={`relative z-10 flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[12px] font-bold transition-colors duration-200 ${
                active ? "text-(--ink)" : "text-(--muted)"
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={active ? "ld-pop" : ""}
              >
                {t.icon}
              </svg>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}