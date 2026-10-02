import type { AreaStatus } from "@/lib/types";

// Neighbours disagree a lot = light is probably on in some streets and not others
export function isMixed(area: AreaStatus) {
  const total = area.on_count + area.off_count;
  return total >= 3 && Math.min(area.on_count, area.off_count) / total >= 0.34;
}

export function MixedNotice({ area, onAddStreet }: { area: AreaStatus; onAddStreet: () => void }) {
  if (!isMixed(area)) return null;
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-(--line-strong) bg-(--card) p-4" role="note">
      <div className="flex flex-col gap-1">
        <strong className="text-base">Mixed reports in {area.name}</strong>
        <span className="text-[15px] text-(--soft)">
          {area.on_count} say light dey, {area.off_count} say no light. Light may be on in some streets only.
        </span>
      </div>
      <button
        onClick={onAddStreet}
        className="min-h-12 rounded-2xl border border-(--line) bg-(--raised) px-4 text-[15px] font-bold"
      >
        Add your street for a clearer picture
      </button>
    </div>
  );
}