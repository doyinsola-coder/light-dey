"use client";

import { useEffect, useState } from "react";
import { Card, Skeleton, useAdmin, IFlag, IMerge, IMegaphone, IChevron, IBolt, IUsers, IAreas, ILive } from "./ui";

type Stats = Record<string, number> & { top_towns_week?: { city: string; reports: number; people: number }[] };
type Attention = { alerts: number; dupes: number; notice: string | null };
type Growth = {
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

export function Overview() {
  const { call, go } = useAdmin();
  const [s, setS] = useState<Stats | null>(null);
  const [att, setAtt] = useState<Attention | null>(null);
  const [g, setG] = useState<Growth | null>(null);

  useEffect(() => {
    call<Stats>("admin_stats").then((d) => d && setS(d));
    call<Growth>("admin_growth").then((d) => d && setG(d));
    Promise.all([
      call<unknown[]>("admin_suspicious"),
      call<unknown[]>("admin_duplicates", { p_city: null }),
      call<{ message: string; live: boolean }[]>("admin_announcements"),
    ]).then(([a, d, n]) =>
      setAtt({
        alerts: (a as { blocked: boolean }[] | null)?.filter((x) => !x.blocked).length ?? 0,
        dupes: d?.length ?? 0,
        notice: n?.find((x) => x.live)?.message ?? null,
      })
    );
  }, [call]);

  if (!s) return <Skeleton rows={5} />;

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const top = s.top_towns_week ?? [];
  const max = Math.max(1, ...top.map((t) => t.reports));

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] text-(--muted)">{hello}</span>
        <p className="text-[17px] leading-snug">
          <strong className="font-display text-[26px] font-extrabold">{Number(s.people_today).toLocaleString()}</strong>{" "}
          people reported today, from {Number(s.areas_today).toLocaleString()} areas.
        </p>
      </div>

      {/* Hero numbers */}
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={<IBolt size={18} />} n={s.reports_today} label="Reports today" accent />
        <Tile icon={<IUsers size={18} />} n={s.people_week} label="People this week" />
        <Tile icon={<ILive size={18} />} n={s.reports_week} label="Reports this week" />
        <Tile icon={<IAreas size={18} />} n={s.areas_with_reports ?? 0} label="Areas in use" />
      </div>

      {/* Things that need you */}
      <Card title="Needs your attention">
        {!att ? (
          <Skeleton rows={2} />
        ) : (
          <div className="flex flex-col gap-2">
            <Row icon={<IFlag size={19} />} tone={att.alerts ? "red" : undefined} title={att.alerts ? `${att.alerts} phone${att.alerts === 1 ? "" : "s"} acting strangely` : "No strange phones today"} sub="Fake-report alerts" onClick={() => go("live")} />
            <Row icon={<IMerge size={19} />} tone={att.dupes ? "yellow" : undefined} title={att.dupes ? `${att.dupes} possible duplicate areas` : "No duplicate areas"} sub="Merge look-alike names" onClick={() => go("areas")} />
            <Row icon={<IMegaphone size={19} />} title={att.notice ? "Notice is live" : "No notice showing"} sub={att.notice ?? "Post a message to all users or one town"} onClick={() => go("announce")} />
          </div>
        )}
      </Card>

      {g && <GrowthCard g={g} />}

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
                  <span className="block h-full rounded-full bg-(--light)" style={{ width: `${(t.reports / max) * 100}%` }} />
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

// Are people coming back, and which platform brings them? (from ?from= links)
function GrowthCard({ g }: { g: Growth }) {
  const max = Math.max(1, ...g.by_source_week.map((x) => x.n));
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return (
    <Card
      title="Coming back"
      sub={g.tracking_since ? `Counting since ${new Date(g.tracking_since).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Starts counting once the update is live"}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[15px]">
        <div className="flex flex-col">
          <dt className="text-[12px] text-(--muted)">Opened the app this week</dt>
          <dd className="font-bold">{g.opened_week.toLocaleString()} <span className="font-normal text-(--muted)">· {g.opened_today} today</span></dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[12px] text-(--muted)">Came back (2+ days)</dt>
          <dd className="font-bold">{g.returning_week.toLocaleString()} <span className="font-normal text-(--muted)">· {pct(g.returning_week, g.opened_week)}%</span></dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[12px] text-(--muted)">Reporters this week</dt>
          <dd className="font-bold">{g.reporters_week.toLocaleString()}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[12px] text-(--muted)">Reported in an earlier week too</dt>
          <dd className="font-bold">{g.returning_reporters_week.toLocaleString()} <span className="font-normal text-(--muted)">· {pct(g.returning_reporters_week, g.reporters_week)}%</span></dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2.5 border-t border-(--divider) pt-3">
        <span className="text-[13px] font-bold">New phones this week: {g.new_week.toLocaleString()}</span>
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
                  <span className="block h-full rounded-full bg-(--light)" style={{ width: `${(x.n / max) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Tile({ icon, n, label, accent }: { icon: React.ReactNode; n: number; label: string; accent?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-[22px] p-4 ${
        accent
          ? "bg-[linear-gradient(145deg,#FFD866_0%,#FFC531_50%,#FFB300_100%)] text-(--ink)"
          : "border border-(--line) bg-(--card)"
      }`}
    >
      <span className={accent ? "" : "text-(--light-text)"}>{icon}</span>
      <span className="font-display text-[30px] font-extrabold leading-none tracking-tight">{Number(n ?? 0).toLocaleString()}</span>
      <span className={`text-[13px] ${accent ? "font-medium opacity-80" : "text-(--muted)"}`}>{label}</span>
    </div>
  );
}

function Row({ icon, title, sub, tone, onClick }: { icon: React.ReactNode; title: string; sub: string; tone?: "red" | "yellow"; onClick: () => void }) {
  const toneCls = tone === "red" ? "bg-[#E5484D]/15 text-[#E5484D]" : tone === "yellow" ? "bg-(--light)/20 text-(--light-text)" : "bg-(--raised) text-(--muted)";
  return (
    <button onClick={onClick} className="flex min-h-14 items-center gap-3 rounded-2xl p-2 text-left active:bg-(--raised)">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneCls}`}>{icon}</span>
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="line-clamp-1 text-[13px] text-(--muted)">{sub}</span>
      </span>
      <IChevron size={18} className="text-(--muted)" />
    </button>
  );
}