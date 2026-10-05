// Shared pieces for the share-card images (area card + leaderboard card).

// WhatsApp Status is 9:16
export const W = 1080;
export const H = 1920;

export const C = {
  bg: "#0E1014",
  bg2: "#171B23",
  panel: "#1A1F28",
  text: "#F3F1EA",
  muted: "#9AA3B2",
  line: "#2B313C",
  light: "#FFC531",
  lightTop: "#FFD866",
  lightBottom: "#FFB300",
  ink: "#14120B",
  off: "#5B6472",
  empty: "#1F242D",
};

// Bricolage Grotesque from Google Fonts (TTF, only the letters we pass in). Returns null if it can't load.
async function loadFont(weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@${weight}&text=${encodeURIComponent(text)}`
      )
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

// Every piece of text on the card must be in `text`, or those letters fall back to the default font.
export async function cardFonts(text: string) {
  const [extraBold, bold] = await Promise.all([loadFont(800, text), loadFont(700, text)]);
  const fonts = [
    ...(extraBold ? [{ name: "Bricolage", data: extraBold, weight: 800 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "Bricolage", data: bold, weight: 700 as const, style: "normal" as const }] : []),
  ];
  return { fonts, family: fonts.length ? "Bricolage" : "sans-serif" };
}

const BULB = "M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z";

export function Logo({ color = C.text, accent = C.light }: { color?: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, color }}>
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d={BULB} />
      </svg>
      <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>Light Dey?</div>
    </div>
  );
}

// The big bulb drawing. on = glowing with rays, off = dark and grey, unknown = dashed with a "?"
export function BulbArt({ mode, size }: { mode: "on" | "off" | "unknown"; size: number }) {
  const rays = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      {mode === "on" && (
        <div
          style={{
            position: "absolute",
            left: -size * 0.15,
            top: -size * 0.15,
            width: size * 1.3,
            height: size * 1.3,
            borderRadius: size,
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 35%, rgba(255,255,255,0) 68%)",
          }}
        />
      )}
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", left: 0, top: 0 }}>
        {mode === "on" &&
          rays.map((i) => (
            <line
              key={i}
              x1="50"
              y1="3"
              x2="50"
              y2={i % 2 ? "11" : "15"}
              stroke={C.ink}
              strokeOpacity="0.45"
              strokeWidth="2.6"
              strokeLinecap="round"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        <g transform="translate(18 18) scale(2.667)" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Satori (the card renderer) can't take <></> inside an <svg>, so each part is its own element */}
          {mode !== "unknown" && (
            <path d={BULB} fill={mode === "on" ? "#FFFBEA" : C.panel} stroke={mode === "on" ? C.ink : C.off} strokeWidth="1.3" />
          )}
          {mode !== "unknown" && (
            <path d="M10 10.5l1 1.5 1-2 1 2 1-1.5" stroke={mode === "on" ? "#E0A100" : C.off} strokeWidth="1.1" />
          )}
          {mode === "unknown" && <path d={BULB} stroke={C.muted} strokeWidth="1.3" strokeDasharray="2.2 2.2" />}
          <path d="M9 18h6M10 21h4" stroke={mode === "on" ? C.ink : mode === "off" ? C.off : C.muted} strokeWidth="1.3" />
          {mode === "unknown" && (
            <path d="M10.2 7.6a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.6" stroke={C.light} strokeWidth="1.4" />
          )}
          {mode === "unknown" && <path d="M12 12.9h.01" stroke={C.light} strokeWidth="1.8" />}
        </g>
      </svg>
    </div>
  );
}

// The bottom of every card: a big call-to-action pill with the link, and the maker credit
export function CardFooter({
  question,
  site,
  credit,
  onYellow = false,
}: {
  question: string;
  site: string;
  credit: string;
  onYellow?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "38px 44px",
          borderRadius: 44,
          background: onYellow ? C.ink : C.light,
          color: onYellow ? C.light : C.ink,
        }}
      >
        <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1 }}>{question}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 42, fontWeight: 700, opacity: 0.9 }}>
          <div>{site}</div>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", fontSize: 32, fontWeight: 700, color: onYellow ? "rgba(20,18,11,0.6)" : C.muted }}>
        {credit}
      </div>
    </div>
  );
}

// Text that shows on every card, for the font download
export const KIT_TEXT = "Light Dey? → 0123456789";