"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { store } from "@/lib/helpers";
import { IconInfo, IconWarning } from "@/components/Icons";

type Note = { id: number; message: string; level: "info" | "alert"; city: string | null };

// A notice from the Light Dey team ("National grid collapse…"), for everyone or one town.
// Closing it hides that notice on this phone; a new one shows again.
export function Announcement({ city }: { city: string }) {
  const [note, setNote] = useState<{ city: string; note: Note | null } | null>(null);
  const [closed, setClosed] = useState<string | null>(() => store.get("lightdey_closed_notice"));

  useEffect(() => {
    let alive = true;
    supabase.rpc("active_announcement", { p_city: city }).then(({ data }) => {
      if (alive) setNote({ city, note: (data as Note[] | null)?.[0] ?? null });
    });
    return () => {
      alive = false;
    };
  }, [city]);

  const n = note?.city === city ? note.note : null;
  if (!n || closed === String(n.id)) return null;
  const alert = n.level === "alert";

  return (
    <div
      role="status"
      className={`ld-card-in flex items-start gap-3 rounded-[20px] border p-3.5 ${
        alert ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--card)"
      }`}
    >
      {alert ? <IconWarning size={20} className="mt-0.5" /> : <IconInfo size={20} className="mt-0.5 text-(--light-text)" />}
      <span className="flex-1 text-[15px] font-medium leading-snug">{n.message}</span>
      <button
        onClick={() => {
          store.set("lightdey_closed_notice", String(n.id));
          setClosed(String(n.id));
        }}
        aria-label="Close notice"
        className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-70"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}