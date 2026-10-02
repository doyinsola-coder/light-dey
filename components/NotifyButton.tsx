"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Mode = "checking" | "off" | "on" | "busy" | "unsupported" | "ios-install" | "blocked";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlB64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function initialMode(): Mode {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) {
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return iOS ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  return "checking";
}

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js");
}

export function NotifyButton({ areaId, areaName }: { areaId: string; areaName: string }) {
  const [state, setState] = useState<{ areaId: string; mode: Mode }>(() => ({ areaId, mode: initialMode() }));
  const [error, setError] = useState<string | null>(null);
  const mode: Mode = state.areaId === areaId ? state.mode : initialMode();

  // Is this phone already following this area?
  useEffect(() => {
    if (initialMode() !== "checking") return;
    let alive = true;
    getRegistration()
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return false;
        const { data } = await supabase.rpc("has_push_subscription", { p_endpoint: sub.endpoint, p_area_id: areaId });
        return Boolean(data);
      })
      .then((on) => alive && setState({ areaId, mode: on ? "on" : "off" }))
      .catch(() => alive && setState({ areaId, mode: "off" }));
    return () => {
      alive = false;
    };
  }, [areaId]);

  async function turnOn() {
    setError(null);
    setState({ areaId, mode: "busy" });
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState({ areaId, mode: permission === "denied" ? "blocked" : "off" });
        return;
      }
      const reg = await getRegistration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID) }));
      const json = sub.toJSON();
      const { error: err } = await supabase.rpc("save_push_subscription", {
        p_endpoint: sub.endpoint,
        p_p256dh: json.keys?.p256dh ?? "",
        p_auth: json.keys?.auth ?? "",
        p_area_id: areaId,
      });
      if (err) throw new Error(err.message);
      setState({ areaId, mode: "on" });
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("too_many_areas")
          ? "You can get alerts for up to 5 areas. Turn one off first."
          : "Couldn't turn on alerts. Try again."
      );
      setState({ areaId, mode: "off" });
    }
  }

  async function turnOff() {
    setError(null);
    setState({ areaId, mode: "busy" });
    try {
      const sub = await (await getRegistration()).pushManager.getSubscription();
      if (sub) await supabase.rpc("remove_push_subscription", { p_endpoint: sub.endpoint, p_area_id: areaId });
    } catch {
      // nothing to undo
    }
    setState({ areaId, mode: "off" });
  }

  if (mode === "unsupported" || mode === "checking") return null;

  if (mode === "ios-install") {
    return (
      <div className="rounded-[22px] bg-(--card) p-4 text-[15px] text-(--soft)">
        <strong className="text-(--text)">Want an alert when light comes?</strong> On iPhone, tap Share, then{" "}
        <strong className="text-(--text)">Add to Home Screen</strong>, and open Light Dey from there.
      </div>
    );
  }

  if (mode === "blocked") {
    return (
      <p className="rounded-[22px] bg-(--card) p-4 text-[15px] text-(--soft)">
        Alerts are blocked for this site. Allow notifications in your browser settings to get them.
      </p>
    );
  }

  const on = mode === "on";
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={on ? turnOff : turnOn}
        disabled={mode === "busy"}
        aria-pressed={on}
        className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 text-left disabled:opacity-60 ${
          on ? "border-(--light) bg-(--raised)" : "border-(--line) bg-(--raised)"
        }`}
      >
        <span className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span className="flex flex-col">
            <span className="text-[15px] font-bold">{on ? `Alerts on for ${areaName}` : "Notify me when light comes"}</span>
            <span className="text-[13px] text-(--muted)">{on ? "Tap to turn off" : `We'll ping you when ${areaName} gets light`}</span>
          </span>
        </span>
        <span
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${on ? "bg-(--light)" : "bg-(--divider)"}`}
          aria-hidden="true"
        >
          <span className={`h-5 w-5 rounded-full transition-transform ${on ? "translate-x-5 bg-(--ink)" : "bg-(--muted)"}`} />
        </span>
      </button>
      {error && <p className="text-sm text-(--muted)" role="status">{error}</p>}
    </div>
  );
}