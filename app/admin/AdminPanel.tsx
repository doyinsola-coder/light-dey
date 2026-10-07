"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { store } from "@/lib/helpers";
import {
  AdminCtx, type Call, type Confirm, type Tab, explain, field, btn, btnSoft,
  IHome, ILive, IAreas, IMegaphone, IMore, ILock, IRefresh, ICheck, IEye, IChevron,
} from "./ui";
import { Overview } from "./Overview";
import { Live } from "./Live";
import { Areas } from "./Areas";
import { Announce } from "./Announce";
import { More, Towns, Phones, Questions, Download } from "./More";

const KEY_STORE = "lightdey_admin_key";

const NAV: { id: Tab; label: string; Icon: (p: { size?: number }) => React.ReactElement }[] = [
  { id: "home", label: "Home", Icon: IHome },
  { id: "live", label: "Live", Icon: ILive },
  { id: "areas", label: "Areas", Icon: IAreas },
  { id: "announce", label: "Notices", Icon: IMegaphone },
  { id: "more", label: "More", Icon: IMore },
];
const TITLES: Record<Tab, string> = {
  home: "Overview",
  live: "Live",
  areas: "Areas",
  announce: "Notices",
  more: "More",
  towns: "Towns",
  phones: "Blocked phones",
  questions: "Daily questions",
  download: "Download data",
};
const UNDER_MORE: Tab[] = ["towns", "phones", "questions", "download"];

export function AdminPanel() {
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [refresh, setRefresh] = useState(0); // bump to reload the current screen
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean; n: number } | null>(null);
  const [ask, setAsk] = useState<(Parameters<Confirm>[0] & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((text: string, ok = true) => setToastMsg({ text, ok, n: Date.now() }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const lock = useCallback(() => {
    store.set(KEY_STORE, "");
    setUnlocked(false);
    setKey("");
  }, []);

  // Every admin call goes through here: errors become toasts, a dead password locks the app
  const call: Call = useCallback(
    async <T,>(fn: string, args: Record<string, unknown> = {}, done?: string): Promise<T | null> => {
      setBusy(true);
      const { data, error } = await supabase.rpc(fn, { p_key: key, ...args });
      setBusy(false);
      if (error) {
        if (error.message.includes("not_admin")) lock();
        toast(explain(error.message), false);
        return null;
      }
      if (done) toast(done);
      return (data ?? true) as T;
    },
    [key, lock, toast]
  );

  const confirm: Confirm = useCallback((opts) => new Promise<boolean>((resolve) => setAsk({ ...opts, resolve })), []);

  // "Remember on this phone": unlock straight away with the saved password
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    const saved = store.get(KEY_STORE);
    if (!saved) {
      queueMicrotask(() => setChecking(false));
      return;
    }
    supabase.rpc("admin_login", { p_key: saved }).then(({ data }) => {
      if (data === true) {
        setKey(saved);
        setUnlocked(true);
      } else store.set(KEY_STORE, "");
      setChecking(false);
    });
  }, []);

  if (checking) {
    return <main className="flex min-h-dvh items-center justify-center text-(--muted)">Opening…</main>;
  }
  if (!unlocked) {
    return (
      <LockScreen
        onUnlock={(k, remember) => {
          if (remember) store.set(KEY_STORE, k);
          setKey(k);
          setUnlocked(true);
        }}
      />
    );
  }

  const navActive = UNDER_MORE.includes(tab) ? "more" : tab;
  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <AdminCtx.Provider value={{ call, busy, toast, confirm, go }}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <header className="ld-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-(--line) bg-(--bg)/85 px-5 pb-3 backdrop-blur-md">
          {UNDER_MORE.includes(tab) ? (
            <button onClick={() => go("more")} aria-label="Back" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full">
              <IChevron size={22} className="rotate-180" />
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/admin-192.png" alt="" width={34} height={34} className="rounded-[10px]" />
          )}
          <div className="mr-auto flex flex-col leading-tight">
            <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-(--muted)">Light Dey Admin</span>
            <h1 className="font-display text-[22px] font-extrabold tracking-tight">{TITLES[tab]}</h1>
          </div>
          <button onClick={() => setRefresh((n) => n + 1)} aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-full border border-(--line) bg-(--raised)">
            <IRefresh size={18} className={busy ? "animate-spin" : ""} />
          </button>
          <button onClick={lock} aria-label="Lock" className="flex h-10 w-10 items-center justify-center rounded-full border border-(--line) bg-(--raised)">
            <ILock size={18} />
          </button>
        </header>

        <main key={`${tab}-${refresh}`} className="ld-card-in flex flex-1 flex-col gap-4 px-5 pb-32 pt-4">
          {tab === "home" && <Overview />}
          {tab === "live" && <Live />}
          {tab === "areas" && <Areas />}
          {tab === "announce" && <Announce />}
          {tab === "more" && <More />}
          {tab === "towns" && <Towns />}
          {tab === "phones" && <Phones />}
          {tab === "questions" && <Questions />}
          {tab === "download" && <Download />}
          <Link href="/" className="mt-2 self-center text-[13px] font-medium text-(--muted) underline underline-offset-4">
            Open the Light Dey app
          </Link>
        </main>

        {/* Bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-(--line) bg-(--bg)/90 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur-md" aria-label="Admin sections">
          <div className="mx-auto flex max-w-md">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={navActive === id ? "page" : undefined}
                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${navActive === id ? "text-(--light-text)" : "text-(--muted)"}`}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${navActive === id ? "bg-(--light)/15" : ""}`}>
                  <Icon size={21} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </nav>

        {toastMsg && (
          <div key={toastMsg.n} role="status" className="ld-card-in fixed inset-x-0 bottom-24 z-40 mx-auto flex w-[calc(100%-40px)] max-w-sm items-center gap-2 rounded-2xl bg-(--text) px-4 py-3 text-[15px] font-medium text-(--bg) shadow-lg">
            {toastMsg.ok && <ICheck size={18} />}
            {toastMsg.text}
          </div>
        )}

        {ask && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => { ask.resolve(false); setAsk(null); }}>
            <div className="ld-card-in mx-auto flex w-full max-w-md flex-col gap-3 rounded-t-[28px] bg-(--card) p-5 pb-[max(env(safe-area-inset-bottom),20px)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <span className="mx-auto h-1 w-10 rounded-full bg-(--line-strong)" />
              <h2 className="text-lg font-bold">{ask.title}</h2>
              {ask.body && <p className="text-[15px] leading-relaxed text-(--soft)">{ask.body}</p>}
              <button
                onClick={() => { ask.resolve(true); setAsk(null); }}
                className={ask.danger ? "flex min-h-12 items-center justify-center rounded-2xl bg-[#E5484D] text-base font-bold text-white" : btn}
              >
                {ask.action}
              </button>
              <button onClick={() => { ask.resolve(false); setAsk(null); }} className={`${btnSoft} min-h-12`}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminCtx.Provider>
  );
}

function LockScreen({ onUnlock }: { onUnlock: (key: string, remember: boolean) => void }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    setBusy(true);
    setError(null);
    const { data } = await supabase.rpc("admin_login", { p_key: key });
    setBusy(false);
    if (data === true) onUnlock(key, remember);
    else setError("Wrong password.");
  }

  return (
    <main className="ld-safe-top mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 pb-16">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/admin-192.png" alt="" width={72} height={72} className="rounded-[20px] shadow-[0_12px_40px_-12px_rgba(255,190,30,0.6)]" />
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">Light Dey Admin</h1>
        <p className="text-[15px] text-(--muted)">For the Light Dey team only.</p>
      </div>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); unlock(); }}>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            autoFocus
            className={`${field} pr-12`}
          />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-(--muted)">
            <IEye size={19} />
          </button>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-[#FFC531]" />
          Remember on this phone
        </label>
        <button disabled={busy || key.length < 12} className={btn}>
          {busy ? "Checking…" : "Unlock"}
        </button>
        {error && <p className="text-center text-[15px] text-(--soft)" role="status">{error}</p>}
      </form>
      <p className="text-center text-[12px] text-(--muted)">
        Tip: add this page to your home screen to use it like an app.
      </p>
    </main>
  );
}