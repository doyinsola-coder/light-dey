"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import {
  Card, Skeleton, useAdmin, phone, type Tab,
  IFlag, IMerge, IMegaphone, IChevron, ILive, ISearch, IPhone, ISwords, ITown, IQuestion, IDownload, IChart,
} from "./ui";

type Home = {
  people_today: number;
  reports_today: number;
  areas_today: number;
  people_yday_sofar: number;
  people_week: number;
  areas_week: number;
  opened_week: number;
  returning_week: number;
};
type FeedRow = { id: number; status: "on" | "off"; area: string; city: string; device_id: string; created_at: string };
type Stats = Record<string, number> & { top_towns_week?: { city: string; reports: number; people: number }[] };
type GrowthData = {
  tracking_since: string | null;
  opened_today: number;
  opened_week: number;
  returning_week: number;
  new_week: number;
  by_source_week: { source: string; n: number }[];
  reporters_week: number;
  returning_reporters_week: number;
};

const SOURCE: Record<string, string> = { tiktok: "TikTok", ig: "Instagram", x: "X", wa: "WhatsApp", fb: "Facebook", li: "LinkedIn", direct: "Direct or unknown" };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

// ─── Home: like a banking app. Today's number on top, tools as round buttons, reports as "transactions" ───
export function Overview({ onAlerts }: { onAlerts?: (n: number) => void }) {
  const { call, go, openPhone } = useAdmin();
  const [h, setH] = useState<Home | null>(null);
  const [alerts, setAlerts] = useState<{ n: number; top: number } | null>(null);
  const [dupes, setDupes] = useState(0);
  const [feed, setFeed] = useState<FeedRow[] | null>(null);

  useEffect(() => {
    call<Home>("admin_home").then((d) => d && setH(d));
    call<{ blocked: boolean; reports: number }[]>("admin_suspicious").then((d) => {
      const open = (d ?? []).filter((x) => !x.blocked);
      setAlerts({ n: open.length, top: Math.max(0, ...open.map((x) => Number(x.reports))) });
      onAlerts?.(open.length);
    });
    call<unknown[]>("admin_duplicates", { p_city: null }).then((d) => setDupes(d?.length ?? 0));
    call<FeedRow[]>("admin_live_feed", { p_city: null }).then((d) => d && setFeed(d.slice(0, 5)));
  }, [call, onAlerts]);

  if (!h) return <Skeleton rows={6} />;

  const diff = h.people_today - h.people_yday_sofar;
  const actions: { tab: Tab; sub?: string; label: string; Icon: (p: { size?: number }) => React.ReactElement; badge?: number; red?: boolean }[] = [
    { tab: "areas", label: "Find area", Icon: ISearch },
    { tab: "areas", sub: "dupes", label: "Duplicates", Icon: IMerge, badge: dupes },
    { tab: "live", sub: "alerts", label: "Phones", Icon: IPhone, badge: alerts?.n ?? 0, red: true },
    { tab: "battles", label: "Battles", Icon: ISwords },
    { tab: "towns", label: "Towns", Icon: ITown },
    { tab: "questions", label: "Questions", Icon: IQuestion },
    { tab: "growth", label: "Growth", Icon: IChart },
    { tab: "download", label: "Download", Icon: IDownload },
  ];

  return (
    <>
      {/* The "balance" card */}
      <section className="flex flex-col gap-1.5 rounded-[26px] bg-[linear-gradient(145deg,#FFD866_0%,#FFC531_45%,#FFB300_100%)] px-5 py-4.5 text-(--ink)">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-extrabold">People who reported today</span>
          {h.people_yday_sofar > 0 || h.people_today > 0 ? (
            <span className="rounded-full bg-black/10 px-2.5 py-1 text-[12px] font-extrabold">
              {diff === 0 ? "Same as yesterday" : `${diff > 0 ? "+" : ""}${diff} vs yesterday`}
            </span>
          ) : null}
        </div>
        <span className="font-display text-[52px] font-extrabold leading-[1.05] tracking-[-2px]">{h.people_today.toLocaleString()}</span>
        <span className="text-[14px] font-semibold opacity-75">
          {h.reports_today.toLocaleString()} reports from {h.areas_today.toLocaleString()} areas
        </span>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <button onClick={() => go("live")} className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-(--ink) text-[14px] font-extrabold text-(--light)">
            <ILive size={16} /> Live feed
          </button>
          <button onClick={() => go("announce")} className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-black/35 text-[14px] font-extrabold">
            <IMegaphone size={16} /> Post notice
          </button>
        </div>
      </section>

      {/* Round quick actions */}
      <nav aria-label="Quick actions" className="grid grid-cols-4 gap-x-1.5 gap-y-3.5">
        {actions.map(({ tab, sub, label, Icon, badge, red }) => (
          <button key={label} onClick={() => go(tab, sub)} className="flex flex-col items-center gap-1.5 text-[12px] font-bold">
            <span className="relative flex h-13 w-13 items-center justify-center rounded-full border border-(--line) bg-(--raised) text-(--light-text)">
              <Icon size={21} />
              {!!badge && (
                <span
                  className={`absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold ${
                    red ? "bg-[#E5484D] text-white" : "bg-(--light) text-(--ink)"
                  }`}
                >
                  {badge}
                </span>
              )}
            </span>
            {label}
          </button>
        ))}
      </nav>

      {/* Alert bar, only when phones act strangely */}
      {!!alerts?.n && (
        <button
          onClick={() => go("live", "alerts")}
          className="flex min-h-16 items-center gap-3 rounded-[20px] border border-[#E5484D]/40 bg-[#E5484D]/10 px-4 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5484D]/20 text-[#E5484D]">
            <IFlag size={18} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-extrabold">
              {alerts.n} phone{alerts.n === 1 ? "" : "s"} acting strangely
            </span>
            <span className="text-[12px] text-(--soft)">
              {alerts.top >= 20 ? `One sent ${alerts.top} reports today. ` : ""}Check before you block.
            </span>
          </span>
          <IChevron size={18} className="text-(--muted)" />
        </button>
      )}

      {/* Small numbers */}
      <div className="grid grid-cols-3 gap-2">
        <Mini n={h.people_week.toLocaleString()} label="people this week" />
        <Mini n={h.opened_week ? `${pct(h.returning_week, h.opened_week)}%` : "–"} label="came back" good={pct(h.returning_week, h.opened_week) >= 30} />
        <Mini n={h.areas_week.toLocaleString()} label="areas in use" />
      </div>

      {/* Recent reports, like a bank's transactions */}
      <section className="flex flex-col">
        <div className="flex items-baseline justify-between pb-1">
          <h2 className="font-display text-[15px] font-bold">Recent reports</h2>
          <button onClick={() => go("live")} className="min-h-9 text-[13px] font-extrabold text-(--light-text)">
            See all
          </button>
        </div>
        {feed === null ? (
          <Skeleton rows={3} />
        ) : feed.length === 0 ? (
          <p className="py-3 text-[14px] text-(--muted)">No reports yet.</p>
        ) : (
          feed.map((r) => (
            <button key={r.id} onClick={() => openPhone(r.device_id)} className="flex items-center gap-3 border-b border-(--divider) py-3 text-left last:border-0">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${r.status === "on" ? "bg-(--light)/15" : "bg-(--raised)"}`}>
                <span className={`h-3 w-3 rounded-full ${r.status === "on" ? "bg-(--light)" : "bg-(--off-dot)"}`} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-extrabold">{r.area}</span>
                <span className="text-[12px] text-(--muted)">
                  {r.city} · {phone(r.device_id)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className={`text-[13px] font-extrabold ${r.status === "on" ? "text-(--light-text)" : "text-(--soft)"}`}>
                  {r.status === "on" ? "Light dey" : "No light"}
                </span>
                <span className="text-[12px] text-(--muted)">{timeAgo(r.created_at)}</span>
              </span>
            </button>
          ))
        )}
      </section>
    </>
  );
}

function Mini({ n, label, good }: { n: string; label: string; good?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[18px] border border-(--line) bg-(--card) p-3">
      <span className={`font-display text-[19px] font-extrabold ${good ? "text-[#30A46C]" : ""}`}>{n}</span>
      <span className="text-[11px] text-(--muted)">{label}</span>
    </div>
  );
}

// ─── Growth: who comes back, which platform brings people, busiest towns, all-time totals ───
export function Growth() {
  const { call } = useAdmin();
  const [g, setG] = useState<GrowthData | null>(null);
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    call<GrowthData>("admin_growth").then((d) => d && setG(d));
    call<Stats>("admin_stats").then((d) => d && setS(d));
  }, [call]);

  if (!g || !s) return <Skeleton rows={5} />;
  const top = s.top_towns_week ?? [];
  const maxTown = Math.max(1, ...top.map((t) => t.reports));
  const maxSrc = Math.max(1, ...g.by_source_week.map((x) => x.n));

  return (
    <>
      <Card
        title="From opening to coming back"
        sub={g.tracking_since ? `This week · counting since ${new Date(g.tracking_since).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Starts counting once the update is live"}
      >
        <Funnel label="Opened the app" n={g.opened_week} of={g.opened_week} />
        <Funnel label="Came back (2+ days)" n={g.returning_week} of={g.opened_week} />
        <Funnel label="Reported" n={g.reporters_week} of={Math.max(g.opened_week, g.reporters_week)} />
        <Funnel label="Reported in an earlier week too" n={g.returning_reporters_week} of={Math.max(g.opened_week, g.reporters_week)} />
      </Card>

      <Card title="New phones by platform" sub={`${g.new_week.toLocaleString()} new this week, from ?from= links`}>
        {g.by_source_week.length === 0 ? (
          <span className="text-[13px] text-(--muted)">None yet. Use links like lightdeyng.vercel.app/?from=tiktok in your bios.</span>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {g.by_source_week.map((x) => (
              <li key={x.source} className="flex flex-col gap-1">
                <span className="flex justify-between text-[14px]">
                  <span className="font-bold">{SOURCE[x.source] ?? x.source}</span>
                  <span className="text-(--muted)">{x.n}</span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-(--raised)">
                  <span className="block h-full rounded-full bg-(--light)" style={{ width: `${(x.n / maxSrc) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {top.length > 0 && (
        <Card title="Busiest towns this week">
          <ul className="flex flex-col gap-3">
            {top.map((t) => (
              <li key={t.city} className="flex flex-col gap-1.5">
                <span className="flex justify-between text-[15px]">
                  <span className="font-bold">{t.city}</span>
                  <span className="text-(--muted)">{t.reports} reports · {t.people} people</span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-(--raised)">
                  <span className="block h-full rounded-full bg-(--light)" style={{ width: `${(t.reports / maxTown) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="All time">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[15px]">
          {[
            ["Reports", s.reports_all],
            ["People", s.people_all],
            ["Complaints this week", s.complaints_week],
            ["Question answers", s.answers_all],
            ["Towns", s.towns],
            ["Areas", s.areas],
            ["Blocked phones", s.blocked],
          ].map(([label, n]) => (
            <div key={label as string} className="flex flex-col">
              <dt className="text-[12px] text-(--muted)">{label}</dt>
              <dd className="font-bold">{Number(n ?? 0).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}

function Funnel({ label, n, of }: { label: string; n: number; of: number }) {
  const w = of ? Math.max(2, (n / of) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <span className="flex justify-between text-[14px]">
        <span className="font-bold">{label}</span>
        <span>
          {n.toLocaleString()}
          {of && n !== of ? <span className="text-(--muted)"> · {pct(n, of)}%</span> : null}
        </span>
      </span>
      <span className="h-3 overflow-hidden rounded-md bg-(--raised)">
        <span className="block h-full rounded-md bg-(--light)" style={{ width: `${w}%` }} />
      </span>
    </div>
  );
}