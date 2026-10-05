"use client";

import { useEffect, useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import { buzz, getLocation } from "@/lib/helpers";

const KINDS = [
  { id: "low_current", label: "Low current", emoji: "🔅" },
  { id: "blinking", label: "Keeps blinking", emoji: "⚡" },
  { id: "transformer", label: "Transformer", emoji: "🔧" },
  { id: "wire_pole", label: "Wire / pole down", emoji: "⚠️" },
  { id: "estimated_bill", label: "Estimated bill", emoji: "🧾" },
  { id: "token", label: "Token issue", emoji: "🔢" },
  { id: "disconnected", label: "Disconnected", emoji: "✂️" },
  { id: "other", label: "Other", emoji: "💬" },
] as const;
type Kind = (typeof KINDS)[number]["id"];

const NOTE_MAX = 25;
const label = (k: string) => KINDS.find((x) => x.id === k)?.label ?? k;

type Count = { kind: string; people: number };

// "Any complaint about light in Sango?" One tap on a suggestion, an optional 25-character note, send.
// Shows what neighbours complained about this week (totals only, never the notes).
export function ComplaintBox({ areaId, areaName }: { areaId: string; areaName: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ areaId: string; text: string } | null>(null);
  const [counts, setCounts] = useState<{ areaId: string; rows: Count[] } | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase.rpc("area_complaints", { p_area: areaId }).then(({ data }) => {
      if (alive) setCounts({ areaId, rows: ((data as Count[] | null) ?? []).map((r) => ({ ...r, people: Number(r.people) })) });
    });
    return () => {
      alive = false;
    };
  }, [areaId, refresh]);

  const rows = counts?.areaId === areaId ? counts.rows : [];
  const message = msg?.areaId === areaId ? msg.text : null;

  async function send() {
    if (!kind) return;
    buzz(10);
    setBusy(true);
    setMsg(null);
    const loc = await getLocation();
    if (!loc.ok) {
      setBusy(false);
      setMsg({
        areaId,
        text:
          loc.reason === "denied"
            ? "Location is blocked. Allow it in your browser settings to send a complaint."
            : "Couldn't get your location. Turn it on (or move near a window) and try again.",
      });
      return;
    }
    const { error } = await supabase.rpc("add_complaint", {
      p_area_id: areaId,
      p_device_id: getDeviceId(),
      p_kind: kind,
      p_note: note.trim() || null,
      p_lat: loc.lat,
      p_lng: loc.lng,
    });
    setBusy(false);
    if (error) {
      const m = error.message;
      setMsg({
        areaId,
        text: m.includes("too_far")
          ? `You need to be in ${areaName} to complain about it.`
          : m.includes("already_sent")
            ? "You already sent this one recently. Thanks 🙏"
            : m.includes("too_many")
              ? "That's enough complaints for today. Thanks for speaking up 🙏"
              : "Couldn't send that. Check your data and try again.",
      });
      return;
    }
    buzz([20, 40, 20]);
    setMsg({ areaId, text: "Noted ✅ Thanks for speaking up for your area." });
    setKind(null);
    setNote("");
    setOpen(false);
    setRefresh((n) => n + 1);
  }

  return (
    <section className="flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5" aria-label="Complaints">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setMsg(null);
        }}
        aria-expanded={open}
        className="flex min-h-8 items-center justify-between gap-3 text-left"
      >
        <span className="flex flex-col">
          <span className="text-base font-bold">Any complaint about light in {areaName}?</span>
          <span className="text-[13px] text-(--muted)">Low current, bills, faults… tell us</span>
        </span>
        <svg
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="ld-card-in flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => {
                  buzz(6);
                  setKind(kind === k.id ? null : k.id);
                }}
                aria-pressed={kind === k.id}
                className={`min-h-10 rounded-full border px-3 text-[14px] font-bold ${
                  kind === k.id ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised)"
                }`}
              >
                {k.emoji} {k.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-[13px] text-(--muted)">
              <span>Add a short note (optional)</span>
              <span className={note.length >= NOTE_MAX ? "font-bold text-(--light-text)" : ""}>
                {note.length}/{NOTE_MAX}
              </span>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              maxLength={NOTE_MAX}
              placeholder="e.g. Since last Friday"
              className="min-h-12 rounded-2xl border border-(--line) bg-(--raised) px-4 text-base outline-none placeholder:text-(--muted) focus:border-(--light)"
            />
          </label>

          <button
            onClick={send}
            disabled={!kind || busy}
            className="min-h-12 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-40"
          >
            {busy ? "Sending…" : kind ? `Send: ${label(kind)}` : "Pick a complaint above"}
          </button>
          <p className="text-[12px] text-(--muted)">📍 We check you&apos;re in {areaName}. Your name is never shown.</p>
        </div>
      )}

      {message && (
        <p className="text-sm text-(--soft)" role="status">
          {message}
        </p>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-(--divider) pt-3">
          <span className="text-[13px] font-bold uppercase tracking-[1px] text-(--muted)">This week in {areaName}</span>
          <ul className="flex flex-col gap-1.5">
            {rows.slice(0, 4).map((r) => (
              <li key={r.kind} className="flex items-center justify-between text-[15px]">
                <span>
                  {KINDS.find((k) => k.id === r.kind)?.emoji} {label(r.kind)}
                </span>
                <span className="font-bold text-(--light-text)">
                  {r.people} {r.people === 1 ? "person" : "people"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}