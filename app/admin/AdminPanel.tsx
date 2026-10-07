"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCities, loadCities } from "@/lib/cities";
import { IconCheck } from "@/components/Icons";

const ERRORS: Record<string, string> = {
  not_admin: "Wrong password. Unlock again.",
  invalid_name: "That name is too short or too long.",
  unknown_town: "That town isn't in that state.",
  already_there: "That's already on the list.",
  outside_nigeria: "Those numbers aren't in Nigeria. Check the lat and lng.",
  invalid_state: "Pick a state.",
};
const explain = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Couldn't save that. Check your data and try again.";

const field =
  "min-h-12 w-full rounded-2xl border border-(--line) bg-(--raised) px-4 text-base outline-none placeholder:text-(--muted) focus:border-(--light)";
const label = (st: string) => (st === "FCT" ? "FCT (Abuja)" : `${st} State`);

export function AdminPanel() {
  const cities = useCities();
  const states = useMemo(() => [...new Set(cities.map((c) => c.state))].sort((a, b) => a.localeCompare(b)), [cities]);

  // The password lives only in this tab's memory: close the tab and you're locked out again
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const [area, setArea] = useState("");

  const [tState, setTState] = useState("");
  const [tName, setTName] = useState("");
  const [tCoords, setTCoords] = useState("");

  const towns = useMemo(
    () => cities.filter((c) => c.state === state).sort((a, b) => a.city.localeCompare(b.city)),
    [cities, state]
  );

  async function unlock() {
    setBusy(true);
    setMsg(null);
    const { data } = await supabase.rpc("admin_login", { p_key: key });
    setBusy(false);
    if (data === true) setUnlocked(true);
    else setMsg({ text: "Wrong password." });
  }

  async function addArea() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_add_area", { p_key: key, p_state: state, p_city: town, p_name: area });
    setBusy(false);
    if (error) {
      if (error.message.includes("not_admin")) setUnlocked(false);
      setMsg({ text: explain(error.message) });
      return;
    }
    setMsg({ text: `Added ${area.trim()} to ${town}.`, ok: true });
    setArea("");
  }

  async function addTown() {
    // Accepts "8.4799, 4.5418" (what Google Maps copies) or two numbers with a space
    const nums = tCoords.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    if (nums.length < 2) {
      setMsg({ text: "Paste the lat and lng, e.g. 7.3500, 3.8700" });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("admin_add_city", {
      p_key: key,
      p_state: tState,
      p_city: tName,
      p_lat: nums[0],
      p_lng: nums[1],
    });
    setBusy(false);
    if (error) {
      if (error.message.includes("not_admin")) setUnlocked(false);
      setMsg({ text: explain(error.message) });
      return;
    }
    await loadCities(true);
    setMsg({ text: `Added ${tName.trim()} to ${label(tState)}.`, ok: true });
    setTName("");
    setTCoords("");
  }

  return (
    <main className="ld-safe-top mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-12">
      <Link href="/" className="flex min-h-11 items-center gap-1 self-start pr-3 text-[15px] font-medium">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to Light Dey
      </Link>
      <h1 className="font-display text-[34px] font-extrabold leading-tight tracking-tight">Admin</h1>

      {!unlocked ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            unlock();
          }}
        >
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin password" autoComplete="current-password" className={field} />
          <button disabled={busy || key.length < 12} className="min-h-12 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-40">
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5">
            <h2 className="text-lg font-bold">Add an area</h2>
            <select value={state} onChange={(e) => { setState(e.target.value); setTown(""); }} className={field}>
              <option value="" disabled>Choose state</option>
              {states.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <select value={town} onChange={(e) => setTown(e.target.value)} disabled={!state} className={field}>
              <option value="" disabled>Choose town</option>
              {towns.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
            </select>
            <input value={area} onChange={(e) => setArea(e.target.value.slice(0, 60))} placeholder="Area name, e.g. Oluyole Estate" className={field} />
            <button onClick={addArea} disabled={busy || !town || area.trim().length < 2} className="min-h-12 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-40">
              {busy ? "Saving…" : "Add area"}
            </button>
          </section>

          <section className="flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5">
            <h2 className="text-lg font-bold">Add a town</h2>
            <p className="text-[13px] text-(--muted)">
              For the location: open Google Maps, long-press the middle of the town, and copy the numbers it shows.
            </p>
            <select value={tState} onChange={(e) => setTState(e.target.value)} className={field}>
              <option value="" disabled>Choose state</option>
              {states.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <input value={tName} onChange={(e) => setTName(e.target.value.slice(0, 40))} placeholder="Town name" className={field} />
            <input value={tCoords} onChange={(e) => setTCoords(e.target.value)} placeholder="Location, e.g. 7.3500, 3.8700" inputMode="decimal" className={field} />
            <button onClick={addTown} disabled={busy || !tState || tName.trim().length < 2} className="min-h-12 rounded-2xl bg-(--light) px-4 text-base font-bold text-(--ink) disabled:opacity-40">
              {busy ? "Saving…" : "Add town"}
            </button>
          </section>
        </>
      )}

      {msg && (
        <p role="status" className={`flex items-center gap-1.5 text-[15px] ${msg.ok ? "font-bold text-(--light-text)" : "text-(--soft)"}`}>
          {msg.ok && <IconCheck size={16} />}
          {msg.text}
        </p>
      )}
    </main>
  );
}