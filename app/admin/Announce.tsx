"use client";

import { useEffect, useMemo, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import { useCities } from "@/lib/cities";
import { Card, Empty, Segments, Skeleton, useAdmin, stateLabel, field, btn, btnSoft, IMegaphone, IInfo, IWarn } from "./ui";

type Notice = { id: number; message: string; city: string | null; level: "info" | "alert"; starts_at: string; ends_at: string; live: boolean };

const DURATIONS = [
  { h: 2, label: "2 hours" },
  { h: 6, label: "6 hours" },
  { h: 24, label: "1 day" },
  { h: 72, label: "3 days" },
  { h: 168, label: "1 week" },
];
const MAX = 160;

function until(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const h = Math.round(ms / 3600000);
  return h < 1 ? "ends within the hour" : h < 48 ? `ends in ${h}h` : `ends in ${Math.round(h / 24)} days`;
}

// A message at the top of the app: for everyone, or for one town
export function Announce() {
  const { call, busy, confirm } = useAdmin();
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((a, b) => a.localeCompare(b)), [cities]);

  const [message, setMessage] = useState("");
  const [who, setWho] = useState<"all" | "town">("all");
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const [level, setLevel] = useState<"info" | "alert">("info");
  const [hours, setHours] = useState(24);
  const towns = useMemo(() => cities.filter((c) => c.state === state).sort((a, b) => a.city.localeCompare(b.city)), [cities, state]);

  const [list, setList] = useState<Notice[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    call<Notice[]>("admin_announcements").then((d) => d && setList(d));
  }, [call, tick]);

  const ready = message.trim().length >= 3 && (who === "all" || town);

  async function post() {
    const ok = await confirm({
      title: who === "all" ? "Show this to everyone?" : `Show this to people in ${town}?`,
      body: message.trim(),
      action: "Post notice",
    });
    if (!ok) return;
    const id = await call("admin_announce", { p_message: message, p_city: who === "all" ? null : town, p_hours: hours, p_level: level }, "Notice posted.");
    if (id) {
      setMessage("");
      setTick((n) => n + 1);
    }
  }

  return (
    <>
      <Card title="New notice" sub="Shows at the top of the app. People can close it.">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            rows={3}
            placeholder="e.g. National grid collapse. Light is out in many places. Reports may be slow."
            className={`${field} resize-none py-3 leading-snug`}
          />
          <span className={`absolute bottom-2 right-3 text-[12px] ${message.length >= MAX ? "font-bold text-(--light-text)" : "text-(--muted)"}`}>
            {message.length}/{MAX}
          </span>
        </div>

        <Segments value={who} onChange={setWho} items={[{ id: "all", label: "Everyone" }, { id: "town", label: "One town" }]} />
        {who === "town" && (
          <div className="grid grid-cols-2 gap-2">
            <select value={state} onChange={(e) => { setState(e.target.value); setTown(""); }} className={field} aria-label="State">
              <option value="" disabled>State</option>
              {states.map((s) => <option key={s} value={s}>{stateLabel(s)}</option>)}
            </select>
            <select value={town} onChange={(e) => setTown(e.target.value)} disabled={!state} className={field} aria-label="Town">
              <option value="" disabled>Town</option>
              {towns.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
            </select>
          </div>
        )}

        <Segments value={level} onChange={setLevel} items={[{ id: "info", label: "Info" }, { id: "alert", label: "Important" }]} />

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-(--muted)">Show for</span>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.h}
                onClick={() => setHours(d.h)}
                aria-pressed={hours === d.h}
                className={`min-h-10 rounded-full border px-3.5 text-[14px] font-bold ${hours === d.h ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised)"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {message.trim() && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-(--muted)">Preview</span>
            <div className={`flex items-start gap-3 rounded-[20px] border p-3.5 ${level === "alert" ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--bg)"}`}>
              {level === "alert" ? <IWarn size={20} className="mt-0.5" /> : <IInfo size={20} className="mt-0.5 text-(--light-text)" />}
              <span className="flex-1 text-[15px] font-medium leading-snug">{message.trim()}</span>
            </div>
          </div>
        )}

        <button disabled={busy || !ready} onClick={post} className={btn}>
          <IMegaphone size={18} /> Post notice
        </button>
      </Card>

      <Card title="Recent notices">
        {list === null ? (
          <Skeleton rows={2} />
        ) : list.length === 0 ? (
          <Empty icon={<IMegaphone size={28} />} text="No notices yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((n) => (
              <li key={n.id} className="flex flex-col gap-2 rounded-2xl bg-(--raised) p-3.5">
                <div className="flex items-center gap-2 text-[12px]">
                  {n.live ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#30A46C]/15 px-2 py-0.5 font-bold text-[#30A46C]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#30A46C]" /> Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-(--card) px-2 py-0.5 font-bold text-(--muted)">Ended</span>
                  )}
                  <span className="font-bold">{n.city ?? "Everyone"}</span>
                  {n.level === "alert" && <span className="font-bold text-(--light-text)">Important</span>}
                  <span className="ml-auto text-(--muted)">{n.live ? until(n.ends_at) : timeAgo(n.starts_at)}</span>
                </div>
                <p className="text-[15px] leading-snug">{n.message}</p>
                {n.live && (
                  <button
                    disabled={busy}
                    onClick={async () => { if (await call("admin_end_announcement", { p_id: n.id }, "Notice ended.")) setTick((t) => t + 1); }}
                    className={`${btnSoft} self-start`}
                  >
                    End now
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}