// Shared pieces for the share-card images (area card + leaderboard card).

// WhatsApp Status is 9:16
export const W = 1080;
export const H = 1920;

export const C = {
  bg: "#0E1014",
  text: "#F3F1EA",
  muted: "#9AA3B2",
  line: "#2B313C",
  light: "#FFC531",
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

export function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.light} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
      </svg>
      <div style={{ fontSize: 54, fontWeight: 800 }}>Light Dey?</div>
    </div>
  );
}