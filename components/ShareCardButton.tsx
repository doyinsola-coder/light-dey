"use client";

import { useState } from "react";

type Props = { areaId: string; areaName: string; text: string };

// Makes the Status image and opens the phone's share sheet (WhatsApp is right there).
// On laptops, where sharing files isn't supported, it downloads the image instead.
export function ShareCardButton({ areaId, areaName, text }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/card?area=${areaId}&t=${Date.now()}`);
      if (!res.ok) throw new Error("card");
      const blob = await res.blob();
      const fileName = `light-dey-${areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(href), 5000);
        setNote("Image saved. Post it on your WhatsApp Status.");
      }
    } catch (e) {
      // Closing the share sheet isn't an error
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setNote("Couldn't make the image. Check your data and try again.");
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={share}
        disabled={busy}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-bold text-[#08210F] disabled:opacity-70"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
        </svg>
        {busy ? "Making your card…" : "Share card to Status"}
      </button>
      {note && <p className="text-sm text-(--muted)" role="status">{note}</p>}
    </div>
  );
}