import type { AreaStatus } from "@/lib/types";
import { timeAgo } from "@/lib/helpers";
import { Bulb } from "@/components/Bulb";

export function StatusCard({ area }: { area: AreaStatus }) {
  const total = area.on_count + area.off_count;

  if (area.status === "unknown") {
    return (
      <div className="ld-card-in relative flex flex-col gap-3 overflow-hidden rounded-[28px] border-2 border-dashed border-(--line-strong) px-6 py-7">
        <div className="flex items-start justify-between gap-3">
          <span className="pt-2 text-[13px] font-bold uppercase tracking-[1.5px] text-(--muted)">{area.name}</span>
          <Bulb mode="unknown" size={76} />
        </div>
        <span className="font-display text-[38px] font-extrabold leading-none tracking-tight">
          You&apos;re the first one here.
        </span>
        <span className="text-base leading-relaxed text-(--soft)">
          Nobody has reported from {area.name} in the last hour. Tell us what&apos;s happening.
        </span>
      </div>
    );
  }

  const on = area.status === "on";
  return (
    <div
      className={
        on
          ? "ld-glow relative flex flex-col gap-2 overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#FFD866_0%,#FFC531_45%,#FFB300_100%)] px-6 pb-7 pt-5 text-(--ink) shadow-[0_18px_50px_-18px_rgba(255,190,30,0.7)]"
          : "ld-card-in relative flex flex-col gap-2 overflow-hidden rounded-[28px] border border-(--line) bg-[linear-gradient(160deg,var(--raised)_0%,var(--card)_100%)] px-6 pb-7 pt-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`pt-3 text-[13px] font-bold uppercase tracking-[1.5px] ${on ? "" : "text-(--muted)"}`}>
          Right now in {area.name}
        </span>
        <Bulb mode={on ? "on" : "off"} />
      </div>
      <span className="-mt-2 font-display text-[56px] font-extrabold leading-[0.95] tracking-[-2px]">
        {on ? "Light dey." : "No light."}
      </span>
      <span className={`text-[17px] font-bold ${on ? "" : "text-(--soft)"}`}>
        {on ? "Charge everything now ⚡" : "Hold on, e go come 🙏"}
      </span>
      <span className={`text-[14px] font-medium ${on ? "opacity-75" : "text-(--muted)"}`}>
        Last report {timeAgo(area.last_report_at)} · {total} {total === 1 ? "person" : "people"} reported
      </span>
    </div>
  );
}