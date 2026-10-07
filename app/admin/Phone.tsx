"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/helpers";
import { useAdmin, phone as phoneName, btnSoft, btnDanger, btn, Skeleton, ICheck, IBan, ITrash, IClose, ICopy } from "./ui";

type Profile = {
  device_id: string;
  blocked: { reason: string | null; at: string } | null;
  trusted: { note: string | null; at: string } | null;
  reports_24h: number;
  reports_7d: number;
  reports_all: number;
  complaints: number;
  answers: number;
  first_seen: string | null;
  last_seen: string | null;
  areas: { id: string; name: string; city: string; n: number; last_at: string }[];
  recent: { id: number; status: "on" | "off"; created_at: string; area: string; city: string }[];
};

// Everything one phone did, and what you can do about it: block, unblock, pardon, delete its reports
export function PhoneSheet({ deviceId, onClose, onChanged }: { deviceId: string; onClose: () => void; onChanged: () => void }) {
  const { call, busy, confirm, toast } = useAdmin();
  const [p, setP] = useState<Profile | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    call<Profile>("admin_device", { p_device_id: deviceId }).then((d) => d && setP(d));
  }, [call, deviceId, tick]);

  const done = () => {
    setTick((n) => n + 1);
    onChanged();
  };
  const name = phoneName(deviceId);

  return (
    <div className="fixed inset-0 z-[45] flex items-end bg-black/50" onClick={onClose}>
      <div
        className="ld-card-in mx-auto flex max-h-[88dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-(--card) p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={name}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[24px] font-extrabold tracking-tight">{name}</h2>
            <div className="flex flex-wrap gap-1.5">
              {p?.blocked && <span className="rounded-full bg-[#E5484D]/15 px-2.5 py-0.5 text-[12px] font-bold text-[#E5484D]">Blocked</span>}
              {p?.trusted && <span className="rounded-full bg-[#30A46C]/15 px-2.5 py-0.5 text-[12px] font-bold text-[#30A46C]">Pardoned</span>}
              {p && !p.blocked && !p.trusted && <span className="rounded-full bg-(--raised) px-2.5 py-0.5 text-[12px] font-bold text-(--muted)">Normal</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-(--raised)">
            <IClose size={18} />
          </button>
        </div>

        {!p ? (
          <Skeleton rows={4} />
        ) : (
          <>
            {(p.blocked?.reason || p.trusted?.note) && (
              <p className="rounded-2xl bg-(--raised) p-3 text-[14px] text-(--soft)">
                {p.blocked ? `Blocked ${timeAgo(p.blocked.at)}: ${p.blocked.reason ?? "no reason"}` : `Pardoned ${timeAgo(p.trusted!.at)}: ${p.trusted!.note ?? "no note"}`}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                ["24 hours", p.reports_24h],
                ["7 days", p.reports_7d],
                ["all time", p.reports_all],
              ].map(([l, n]) => (
                <div key={l as string} className="flex flex-col rounded-2xl bg-(--raised) p-3">
                  <span className="font-display text-[24px] font-extrabold leading-none">{Number(n)}</span>
                  <span className="text-[12px] text-(--muted)">reports, {l}</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-(--muted)">
              {Number(p.complaints)} complaints · {Number(p.answers)} answers
              {p.first_seen ? ` · first report ${timeAgo(p.first_seen)}` : ""}
            </p>

            {/* What you can do */}
            <div className="grid grid-cols-2 gap-2">
              {p.blocked ? (
                <button
                  disabled={busy}
                  className={btnSoft + " min-h-12"}
                  onClick={async () => { if (await call("admin_unblock_device", { p_device_id: deviceId }, "Unblocked.")) done(); }}
                >
                  Unblock
                </button>
              ) : (
                <button
                  disabled={busy}
                  className={btnDanger + " min-h-12"}
                  onClick={async () => {
                    if (!(await confirm({ title: `Block ${name}?`, body: "It can't report, complain or answer again. What it sent in the last 24 hours is deleted.", action: "Block phone", danger: true }))) return;
                    if (await call("admin_block_device", { p_device_id: deviceId, p_reason: "Blocked by admin", p_wipe: true }, "Phone blocked.")) done();
                  }}
                >
                  <IBan size={17} /> Block
                </button>
              )}
              {p.trusted ? (
                <button
                  disabled={busy}
                  className={btnSoft + " min-h-12"}
                  onClick={async () => { if (await call("admin_unpardon_device", { p_device_id: deviceId }, "Pardon removed.")) done(); }}
                >
                  Remove pardon
                </button>
              ) : (
                <button
                  disabled={busy}
                  className={btn + " min-h-12 text-[15px]"}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Pardon ${name}?`,
                      body: p.blocked
                        ? "It gets unblocked, stops showing in alerts, and always counts in battles."
                        : "It stops showing in alerts and always counts in battles. Use this for honest people who just report a lot.",
                      action: "Pardon",
                    });
                    if (ok && (await call("admin_pardon_device", { p_device_id: deviceId, p_note: "Pardoned by admin" }, "Phone pardoned."))) done();
                  }}
                >
                  <ICheck size={17} /> Pardon
                </button>
              )}
              <button
                disabled={busy}
                className={btnSoft + " col-span-2 min-h-12"}
                onClick={async () => {
                  if (!(await confirm({ title: "Delete its last 24 hours?", body: "Removes every report this phone sent in the last 24 hours. The phone isn't blocked.", action: "Delete reports", danger: true }))) return;
                  const n = await call<number>("admin_wipe_device", { p_device_id: deviceId, p_hours: 24 });
                  if (n !== null) {
                    toast(`Deleted ${n} report${Number(n) === 1 ? "" : "s"}.`);
                    done();
                  }
                }}
              >
                <ITrash size={16} /> Delete its last 24 hours of reports
              </button>
            </div>

            {p.areas.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[1px] text-(--muted)">Where it reports</span>
                <ul className="flex flex-col gap-1.5">
                  {p.areas.map((a) => (
                    <li key={a.id} className="flex justify-between text-[14px]">
                      <span><strong>{a.name}</strong> <span className="text-(--muted)">{a.city}</span></span>
                      <span className="text-(--muted)">{a.n} · {timeAgo(a.last_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.recent.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[1px] text-(--muted)">Latest reports</span>
                <ul className="flex flex-col gap-1">
                  {p.recent.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-[14px]">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.status === "on" ? "bg-(--light)" : "bg-(--off-dot)"}`} />
                      <span className="flex-1">{r.status === "on" ? "Light dey" : "No light"} · {r.area}, {r.city}</span>
                      <span className="text-[12px] text-(--muted)">{timeAgo(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                navigator.clipboard?.writeText(deviceId).then(() => toast("Phone ID copied."), () => {});
              }}
              className="flex items-center gap-1.5 self-start text-[13px] font-bold text-(--muted)"
            >
              <ICopy size={15} /> Copy full phone ID
            </button>
          </>
        )}
      </div>
    </div>
  );
}