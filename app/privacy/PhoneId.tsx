"use client";

import { useEffect, useState } from "react";

// Shows this phone's random Light Dey ID, so people can ask for their data to be deleted.
export function PhoneId() {
  const [id, setId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem("lightdey_device_id");
    } catch {}
    // read once after the page loads (localStorage isn't there on the server)
    const t = setTimeout(() => setId(v), 0);
    return () => clearTimeout(t);
  }, []);

  if (!id) return <p className="text-[15px] text-(--muted)">This phone hasn&apos;t reported yet, so we hold nothing linked to it.</p>;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--raised) p-3">
      <span className="text-[13px] text-(--muted)">This phone&apos;s Light Dey ID</span>
      <code className="break-all text-[14px]">{id}</code>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
          } catch {}
        }}
        className="min-h-10 self-start rounded-full bg-(--light) px-4 text-[14px] font-bold text-(--ink)"
      >
        {copied ? "Copied" : "Copy ID"}
      </button>
    </div>
  );
}