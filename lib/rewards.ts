"use client";

import { useEffect, useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";

// Points for confirmed reports, turned into data through Damacsub. Off until switched on in LD Admin.
export type Points =
  | { enabled: false }
  | {
      enabled: true;
      balance: number;
      today: number;
      week: number;
      per_gb: number;
      daily_cap: number;
      pts: { confirmed: number; first: number; streak: number; referral: number };
      claims_left: number;
      claim: { status: "pending" | "paid" | "rejected"; at: string; done_at: string | null; note: string | null } | null;
      signup_url: string;
      ref: string;
      invited: number;
      invited_ok: number;
    };

export type Contest =
  | { active: false; ended?: undefined }
  | {
      active: boolean;
      ended: boolean;
      starts: string;
      ends: string;
      prizes: string | null;
      mine: number;
      top: { who: string; n: number; me: boolean }[];
    };

// refreshKey: bump it (e.g. after a report) to fetch again
export function usePoints(refreshKey: string | number) {
  const [state, setState] = useState<{ key: string | number; p: Points } | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.rpc("my_points", { p_device_id: getDeviceId() }).then(({ data, error }) => {
      if (alive && !error && data) setState({ key: refreshKey, p: data as Points });
    });
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  return state?.p ?? null;
}

export function useContest(on: boolean) {
  const [c, setC] = useState<Contest | null>(null);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    supabase.rpc("contest_board", { p_device_id: getDeviceId() }).then(({ data }) => {
      if (alive && data) setC(data as Contest);
    });
    return () => {
      alive = false;
    };
  }, [on]);
  return on ? c : null;
}

export function inviteLink(ref: string) {
  return `${window.location.origin}/?ref=${ref}&from=invite`;
}

// Share sheet when the phone has one, else copy the link, else WhatsApp
export async function shareInvite(ref: string): Promise<"shared" | "copied" | "whatsapp"> {
  const url = inviteLink(ref);
  const text = `I use Light Dey to know when light comes in my area. Join with my link and report when light comes or goes: ${url}`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch {
      // closed the share sheet: fall through to copy
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    return "whatsapp";
  }
}

export const CLAIM_ERRORS: Record<string, string> = {
  invalid_contact: "That doesn't look like a phone number or email. Use the one on your Damacsub account.",
  not_enough: "You don't have enough points yet.",
  already_claimed: "You've already claimed data this month. Next claim on the 1st.",
  contact_used: "That Damacsub account already got data this month.",
  month_full: "This month's data is finished. More on the 1st.",
  rewards_off: "Rewards are paused right now.",
  blocked: "This phone can't claim rewards.",
};