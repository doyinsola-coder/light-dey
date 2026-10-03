"use client";

import { useState } from "react";

type Props = {
  imageUrl: string; // e.g. /api/card?area=… or /api/leaderboard-card?type=cities
  fileName: string; // what the saved image is called
  text: string; // caption that goes with it
  label?: string;
};

// Makes the Status image and opens the phone's share sheet (WhatsApp is right there).
// On laptops, where sharing files isn't supported, it downloads the image instead.
export function ShareCardButton({ imageUrl, fileName, text, label = "Share card to Status" }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`${imageUrl}${imageUrl.includes("?") ? "&" : "?"}t=${Date.now()}`);
      if (!res.ok) throw new Error("card");
      const blob = await res.blob();
      const safeName = `${fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      const file = new File([blob], safeName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = safeName;
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
        {busy ? "Making your card…" : label}
      </button>
      {note && <p className="text-sm text-(--muted)" role="status">{note}</p>}
    </div>
  );
}