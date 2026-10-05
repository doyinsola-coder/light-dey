// Tap to open. Uses <details>, so it works without any extra code.
export function HowItWorks() {
  return (
    <details className="group rounded-[22px] bg-(--card) p-4">
      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-base font-bold">
        How it works
        <svg className="transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <ul className="mt-3 flex list-disc flex-col gap-2.5 pl-5 text-[15px] leading-relaxed text-(--soft)">
        <li>Everyone who picks the same area sees the same status.</li>
        <li>
          We count the <strong className="text-(--text)">last hour</strong> of reports. The majority wins. If it&apos;s a tie,
          the newest report wins.
        </li>
        <li>
          You can only report for <strong className="text-(--text)">the area you&apos;re in right now</strong>. We check your
          location when you tap, so nobody can report for a place they&apos;re not.
        </li>
        <li>Each phone can report once every 15 minutes, so nobody can spam it.</li>
        <li>
          Reporting late? After you tap, choose <strong className="text-(--text)">&quot;came earlier&quot;</strong> and we&apos;ll
          count the hours from then. It can&apos;t go back past a neighbour&apos;s report.
        </li>
        <li>No login. Nobody sees your name, and your exact spot is never saved (only a rough ~1 km area).</li>
        <li>
          Big area? Light can be on in one street and off in the next. If reports keep disagreeing,{" "}
          <strong className="text-(--text)">add your street</strong> as its own area.
        </li>
        <li>Turn on alerts and you&apos;ll get a ping when your area goes from no light to light.</li>
      </ul>
    </details>
  );
}