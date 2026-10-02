import type { AreaStatus } from "@/lib/types";
import { timeAgo } from "@/lib/helpers";

export function StatusCard({ area }: { area: AreaStatus }) {
  const total = area.on_count + area.off_count;

  if (area.status === "unknown") {
    return (
      <div className="ld-card-in flex flex-col gap-3 rounded-[28px] border-2 border-dashed border-(--line-strong) px-6 py-8">
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-(--muted)">{area.name}</span>
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
          ? "ld-glow flex flex-col gap-2.5 rounded-[28px] bg-(--light) px-6 py-7 text-(--ink)"
          : "ld-card-in flex flex-col gap-2.5 rounded-[28px] border border-(--line) bg-(--raised) px-6 py-7"
      }
    >
      <span className={`text-[13px] font-bold uppercase tracking-[1.5px] ${on ? "" : "text-(--muted)"}`}>
        Right now in {area.name}
      </span>
      <span className="font-display text-[56px] font-extrabold leading-[0.95] tracking-[-2px]">
        {on ? "Light dey." : "No light."}
      </span>
      <span className={`text-[15px] font-medium ${on ? "" : "text-(--soft)"}`}>
        Last report {timeAgo(area.last_report_at)} · {total} {total === 1 ? "person" : "people"} reported
      </span>
    </div>
  );
}