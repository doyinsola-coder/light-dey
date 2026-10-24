"use client";

import { useState } from "react";
import type { Status } from "@/lib/types";
import { MAX_PLACES, type Place } from "@/lib/places";

type Info = Record<string, { name: string; status: Status }>;

type Props = {
  places: Place[];
  info: Info;
  currentId: string;
  currentName: string; // the area on screen, even if it isn't saved
  onSelect: (p: Place) => void;
  onAdd: () => void;
  onSave: () => void; // save the area on screen as a place
  onRemove: (id: string) => void;
};

function Dot({ status }: { status: Status | undefined }) {
  if (status === "on") return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--light) shadow-[0_0_8px_rgba(255,197,49,0.8)]" />;
  if (status === "off") return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--off-dot)" />;
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-(--off-dot)" />;
}

const Plus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const Cross = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// One row of chips: your saved places with a live dot each. Tap to switch.
export function PlacesBar({ places, info, currentId, currentName, onSelect, onAdd, onSave, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const saved = places.some((p) => p.id === currentId);
  const room = places.length < MAX_PLACES;

  return (
    <nav aria-label="My places" className="-mx-5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-5">
        <span className="text-[12px] font-bold uppercase tracking-[1.2px] text-(--muted)">My places</span>
        {places.length > 1 && (
          <button onClick={() => setEditing(!editing)} className="min-h-8 text-[13px] font-bold text-(--light-text)">
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>
      <ul className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {places.map((p) => {
          const active = p.id === currentId;
          const i = info[p.id];
          return (
            <li key={p.id} className="shrink-0">
              {editing ? (
                <button
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${i?.name ?? "this place"}`}
                  className="flex min-h-10 items-center gap-2 rounded-full border border-dashed border-(--line-strong) px-3.5 text-[14px] font-bold text-(--soft)"
                >
                  <Cross />
                  <span className="max-w-36 truncate">{i?.name ?? "…"}</span>
                </button>
              ) : (
                <button
                  onClick={() => onSelect(p)}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[14px] font-bold transition-colors ${
                    active ? "border-(--light) bg-(--light)/15" : "border-(--line) bg-(--raised)"
                  }`}
                >
                  <Dot status={i?.status} />
                  <span className="max-w-36 truncate">{i?.name ?? "…"}</span>
                </button>
              )}
            </li>
          );
        })}
        {!saved && !editing && (
          <li className="shrink-0">
            <span className="flex min-h-10 items-center gap-2 rounded-full border border-(--light) bg-(--light)/15 pl-3.5 pr-1.5 text-[14px] font-bold">
              <span className="max-w-32 truncate">{currentName}</span>
              {room && (
                <button onClick={onSave} className="flex h-7 items-center gap-1 rounded-full bg-(--light) px-2.5 text-[12px] font-bold text-(--ink)">
                  <Plus /> Save
                </button>
              )}
            </span>
          </li>
        )}
        {room && !editing && (
          <li className="shrink-0">
            <button
              onClick={onAdd}
              className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-(--line-strong) px-3.5 text-[14px] font-bold text-(--soft)"
            >
              <Plus /> {places.length === 0 ? "Add a place" : "Add"}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}