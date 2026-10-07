"use client";

import type React from "react";
import { createContext, useContext } from "react";

// Shared pieces for the admin app: the call helper, toasts, confirm sheet, icons and styles.

export type Call = <T>(fn: string, args?: Record<string, unknown>, done?: string) => Promise<T | null>;
export type Confirm = (opts: { title: string; body?: string; action: string; danger?: boolean }) => Promise<boolean>;
export type Go = (tab: Tab) => void;
export type Tab = "home" | "live" | "areas" | "announce" | "more" | "towns" | "phones" | "questions" | "download";

export const AdminCtx = createContext<{ call: Call; busy: boolean; toast: (text: string, ok?: boolean) => void; confirm: Confirm; go: Go } | null>(null);
export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("useAdmin outside admin");
  return c;
}

export const ERRORS: Record<string, string> = {
  not_admin: "Wrong password. Unlock again.",
  invalid_name: "That name is too short or too long.",
  unknown_town: "That town isn't on the list.",
  already_there: "That's already on the list.",
  outside_nigeria: "That spot isn't in Nigeria.",
  invalid_state: "Pick a state.",
  has_reports: "People have reported from this area. Merge it into the right one instead.",
  same_area: "Pick a different area to merge into.",
  unknown_area: "Couldn't find that area.",
  invalid_size: "Size must be between 5 and 80 km.",
};
export const explain = (m: string) =>
  ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Couldn't do that. Check your data and try again.";

export const stateLabel = (st: string) => (st === "FCT" ? "FCT (Abuja)" : `${st} State`);
export const phone = (id: string) => `Phone ${id.slice(0, 6).toUpperCase()}`;

// ─── Styles ──────────────────────────────────────────────────────────────
export const field =
  "min-h-12 w-full rounded-2xl border border-(--line) bg-(--raised) px-4 text-base outline-none placeholder:text-(--muted) focus:border-(--light) disabled:opacity-50";
export const btn =
  "flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) active:scale-[0.98] transition-transform disabled:opacity-40";
export const btnSoft =
  "flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-(--line) bg-(--raised) px-3 text-[14px] font-bold active:scale-[0.97] transition-transform disabled:opacity-40";
export const btnDanger =
  "flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E5484D]/40 bg-[#E5484D]/10 px-3 text-[14px] font-bold text-[#E5484D] active:scale-[0.97] transition-transform disabled:opacity-40";

export function Card({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            {title && <h2 className="text-[17px] font-bold">{title}</h2>}
            {sub && <p className="text-[13px] leading-snug text-(--muted)">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Segments<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; badge?: number }[] }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-(--raised) p-1" role="tablist">
      {items.map((i) => (
        <button
          key={i.id}
          role="tab"
          aria-selected={value === i.id}
          onClick={() => onChange(i.id)}
          className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[14px] font-bold transition-colors ${
            value === i.id ? "bg-(--card) shadow-sm" : "text-(--muted)"
          }`}
        >
          {i.label}
          {!!i.badge && <span className="rounded-full bg-[#E5484D] px-1.5 text-[11px] leading-[18px] text-white">{i.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-[14px] text-(--muted)">
      <span className="opacity-60">{icon}</span>
      {text}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-(--raised)" />
      ))}
    </div>
  );
}

// ─── Icons (24×24 line icons) ────────────────────────────────────────────
type P = { size?: number; className?: string };
function I({ size = 20, className = "", children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      {children}
    </svg>
  );
}
export const IHome = (p: P) => <I {...p}><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></I>;
export const ILive = (p: P) => <I {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></I>;
export const IAreas = (p: P) => <I {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></I>;
export const IMegaphone = (p: P) => <I {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M17 8a5 5 0 0 1 0 8M19.5 5.5a8.5 8.5 0 0 1 0 13" /></I>;
export const IMore = (p: P) => <I {...p}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></I>;
export const ITown = (p: P) => <I {...p}><path d="M3 21h18M5 21V10l5-3v14M10 21V4l9 4v13" /><path d="M14 11h1M14 15h1" /></I>;
export const IPhone = (p: P) => <I {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></I>;
export const IQuestion = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></I>;
export const IDownload = (p: P) => <I {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></I>;
export const ILock = (p: P) => <I {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></I>;
export const IRefresh = (p: P) => <I {...p}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></I>;
export const ISearch = (p: P) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></I>;
export const IPlus = (p: P) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IMerge = (p: P) => <I {...p}><path d="M6 3v6a6 6 0 0 0 6 6h6M15 12l3 3-3 3M6 21v-4" /></I>;
export const ITrash = (p: P) => <I {...p}><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3" /></I>;
export const IBan = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></I>;
export const IFlag = (p: P) => <I {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></I>;
export const IChevron = (p: P) => <I {...p}><path d="M9 6l6 6-6 6" /></I>;
export const ICopy = (p: P) => <I {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></I>;
export const IEye = (p: P) => <I {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></I>;
export const IUsers = (p: P) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></I>;
export const IBolt = (p: P) => <I {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></I>;
export const ICheck = (p: P) => <I {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></I>;
export const IClose = (p: P) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>;
export const IMessage = (p: P) => <I {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>;
export const IInfo = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></I>;
export const IWarn = (p: P) => <I {...p}><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></I>;