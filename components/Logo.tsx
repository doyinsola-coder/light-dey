export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFC531" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18h6" /><path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
      </svg>
      <span className="font-display text-[22px] font-extrabold tracking-tight">Light Dey?</span>
    </div>
  );
}