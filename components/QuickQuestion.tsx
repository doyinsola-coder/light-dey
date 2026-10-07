"use client";

import { useEffect, useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import { buzz, getLocation } from "@/lib/helpers";
import { IconCheck, IconSparkles } from "@/components/Icons";

type Option = { id: string; label: string };
type Question = { id: string; text: string; options: Option[] };
type Row = { scope: "area" | "city"; place: string; answer: string; n: number };

// One short question a day ("What meter do you use?"). One tap to answer, then see what others said.
// Answers are anonymous and only shown as totals: per area once it has 10+ answers, otherwise per town.
export function QuickQuestion({ areaId, areaName }: { areaId: string; areaName: string }) {
  const [q, setQ] = useState<{ areaId: string; question: Question | null } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ question: Question; mine: string; rows: Row[] } | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.rpc("next_question", { p_device_id: getDeviceId() }).then(({ data }) => {
      if (!alive) return;
      const row = (data as Question[] | null)?.[0] ?? null;
      setQ({ areaId, question: row });
    });
    return () => {
      alive = false;
    };
  }, [areaId]);

  const question = q?.areaId === areaId ? q.question : null;

  async function answer(id: string) {
    if (!question || busy) return;
    buzz(8);
    setPicked(id);
    setBusy(true);
    setError(null);
    const loc = await getLocation();
    if (!loc.ok) {
      setBusy(false);
      setPicked(null);
      setError(
        loc.reason === "denied"
          ? "Location is blocked. Allow it in your browser settings to answer."
          : "Couldn't get your location. Turn it on (or move near a window) and try again."
      );
      return;
    }
    const { error: err } = await supabase.rpc("answer_question", {
      p_device_id: getDeviceId(),
      p_question: question.id,
      p_answer: id,
      p_area_id: areaId,
      p_lat: loc.lat,
      p_lng: loc.lng,
    });
    if (err) {
      setBusy(false);
      setPicked(null);
      setError(
        err.message.includes("too_far")
          ? `Answer when you're in ${areaName}'s town. It keeps the numbers honest.`
          : "Couldn't save that. Check your data and try again."
      );
      return;
    }
    const { data } = await supabase.rpc("question_results", { p_question: question.id, p_area_id: areaId });
    setBusy(false);
    buzz([15, 30, 15]);
    setResults({ question, mine: id, rows: ((data as Row[] | null) ?? []).map((r) => ({ ...r, n: Number(r.n) })) });
  }

  async function skip() {
    if (!question) return;
    setGone(true);
    await supabase.rpc("answer_question", {
      p_device_id: getDeviceId(),
      p_question: question.id,
      p_answer: "__skip",
      p_area_id: areaId,
      p_lat: null,
      p_lng: null,
    });
  }

  if (gone) return null;

  if (results) {
    const total = results.rows.reduce((s, r) => s + r.n, 0) || 1;
    const place = results.rows[0]?.place ?? areaName;
    const scope = results.rows[0]?.scope === "area" ? "in" : "across";
    return (
      <section className="ld-card-in flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5" aria-label="What people said">
        <span className="flex items-center gap-1.5 text-[14px] font-bold text-(--light-text)">
          <IconCheck size={16} /> Thanks. Here&apos;s what people {scope} {place} said
        </span>
        <span className="text-base font-bold">{results.question.text}</span>
        <ul className="flex flex-col gap-2">
          {results.question.options.map((o) => {
            const n = results.rows.find((r) => r.answer === o.id)?.n ?? 0;
            const pct = Math.round((n / total) * 100);
            const mine = o.id === results.mine;
            return (
              <li key={o.id} className="flex flex-col gap-1">
                <span className="flex justify-between text-[14px]">
                  <span className={mine ? "font-bold" : ""}>{o.label}{mine ? " (you)" : ""}</span>
                  <span className="text-(--muted)">{pct}%</span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-(--raised)">
                  <span
                    className={`block h-full rounded-full transition-[width] duration-700 ${mine ? "bg-(--light)" : "bg-(--line-strong)"}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
        <span className="text-[12px] text-(--muted)">
          {total} {total === 1 ? "answer" : "answers"} so far. A new question tomorrow.
        </span>
      </section>
    );
  }

  if (!question) return null;

  return (
    <section className="ld-card-in flex flex-col gap-3 rounded-[24px] border border-(--line) bg-(--card) p-4.5" aria-label="Quick question">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[1px] text-(--muted)">
          <IconSparkles size={15} /> Quick question
        </span>
        <button onClick={skip} className="min-h-8 px-1 text-[13px] font-bold text-(--muted)">
          Skip
        </button>
      </div>
      <span className="text-[17px] font-bold leading-snug">{question.text}</span>
      <div className="flex flex-col gap-2">
        {question.options.map((o) => (
          <button
            key={o.id}
            onClick={() => answer(o.id)}
            disabled={busy}
            className={`min-h-12 rounded-2xl border px-4 text-left text-[15px] font-bold transition-colors ${
              picked === o.id ? "border-(--light) bg-(--light) text-(--ink)" : "border-(--line) bg-(--raised)"
            } disabled:opacity-70`}
          >
            {picked === o.id && busy ? "Saving…" : o.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-(--soft)" role="status">{error}</p>
      ) : (
        <p className="text-[12px] text-(--muted)">Anonymous. Only totals are ever shown. Helps us show DisCos what your area needs.</p>
      )}
    </section>
  );
}