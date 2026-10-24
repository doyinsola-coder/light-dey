import type { Metadata } from "next";
import Link from "next/link";
import { MAKER, whatsappChatLink } from "@/lib/brand";
import { PhoneId } from "./PhoneId";

export const metadata: Metadata = {
  title: "Privacy · Light Dey?",
  description: "What Light Dey collects, why, and how to have it deleted.",
};

const UPDATED = "24 October 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-4 font-display text-[22px] font-extrabold tracking-tight">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <main className="ld-safe-top mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-5 pb-12 text-[15px] leading-relaxed text-(--soft)">
      <Link href="/" className="flex min-h-11 items-center gap-1 self-start pr-3 text-[15px] font-medium text-(--text)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to Light Dey
      </Link>

      <h1 className="font-display text-[34px] font-extrabold leading-tight tracking-tight text-(--text)">Your privacy</h1>
      <p className="text-[13px] text-(--muted)">Last updated {UPDATED}</p>

      <p>
        Light Dey shows whether there&apos;s light in your area, using reports from people who live there. We built it to
        collect as little about you as possible. <strong className="text-(--text)">No sign-up, no name, no phone number, no email.</strong>
      </p>

      <H>What we collect</H>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong className="text-(--text)">A random phone ID.</strong> Created on your phone the first time you use Light Dey.
          It isn&apos;t linked to your name or number. We use it to allow one report every 15 minutes, stop spam, and count
          how many people come back.
        </li>
        <li>
          <strong className="text-(--text)">Your reports:</strong> the area, &quot;light dey&quot; or &quot;no light&quot;, the time,
          and when light came if you tell us.
        </li>
        <li>
          <strong className="text-(--text)">A rough location, about 1 km.</strong> When you report, complain or add an area or
          town, your phone shares its location so we can check you&apos;re really there. We check it, then only save it rounded
          to about 1 km. Your exact spot is never saved.
        </li>
        <li>
          <strong className="text-(--text)">Complaints</strong> you choose to send, including the short note if you add one.
          Notes are never shown to other users.
        </li>
        <li>
          <strong className="text-(--text)">Quick question answers</strong>, if you answer them (for example, what meter you use
          or what band you&apos;re on). We check your location is in your area&apos;s town, but we don&apos;t save it with the
          answer. Skipping is always fine.
        </li>
        <li>
          <strong className="text-(--text)">Which days you open the app, and how you found it.</strong> If you came from a
          link like one on TikTok or X, we note that word (for example &quot;tiktok&quot;) with your phone ID. Only totals are
          ever looked at, such as how many people came from TikTok this week.
        </li>
        <li>
          <strong className="text-(--text)">Your places.</strong> The areas you save under My places are kept on your phone.
          We don&apos;t store your list.
        </li>
        <li>
          <strong className="text-(--text)">Alert settings.</strong> If you turn on &quot;notify me when light comes&quot;, we keep
          the technical address your browser gives us for sending notifications, and the areas you follow.
        </li>
        <li>
          <strong className="text-(--text)">Settings on your phone only:</strong> your area, light/dark mode and similar. These
          stay on your phone.
        </li>
      </ul>

      <H>Why</H>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>To show live light status, today&apos;s hours, the map and the rankings.</li>
        <li>
          To keep reports honest: one report per phone every 15 minutes, and only from people in the area. A phone that keeps
          sending fake reports can be blocked, and what it sent removed.
        </li>
        <li>To send the alerts you asked for.</li>
        <li>
          To understand power supply and complaints across Nigeria, and share that as{" "}
          <strong className="text-(--text)">totals</strong> (see below).
        </li>
      </ul>
      <p>By reporting, sending a complaint or answering a question, you agree to us using your data this way. You can stop at any time.</p>

      <H>Who we share it with</H>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong className="text-(--text)">Everyone using the app</strong> sees each area&apos;s status, report counts,
          complaint totals and quick question totals. Never who reported or who answered.
        </li>
        <li>
          <strong className="text-(--text)">Electricity companies, regulators, researchers, media and partners</strong> may
          receive summaries, for example &quot;Sango averaged 9 hours of light a day this week&quot; or &quot;40% of reports in
          Tanke mention low current&quot;. These are totals by area. We do not give anyone your phone ID or your individual
          reports, and we don&apos;t sell personal data.
        </li>
        <li>
          <strong className="text-(--text)">Services that run the app:</strong> our database host (Supabase), our website host
          (Vercel), map images from OpenStreetMap, and your phone&apos;s notification service (Google or Apple) if you turn on
          alerts. They only get what&apos;s needed to do that job.
        </li>
      </ul>

      <H>How long we keep it</H>
      <p>
        We keep reports, complaints and answers so the app can show history and rankings. If you ask, we delete everything linked to
        your phone ID. Totals that were already calculated stay, because they can&apos;t be traced back to you.
      </p>

      <H>Your choices</H>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>You can use Light Dey to check status without reporting or sharing your location.</li>
        <li>You can turn off location or alerts in your phone or browser settings at any time.</li>
        <li>
          You can ask us what we hold, or to delete it. Send us your Light Dey ID (below) and we&apos;ll handle it.
        </li>
      </ul>
      <PhoneId />

      <H>Contact</H>
      <p>
        Light Dey is built by {MAKER.name} ({MAKER.handle}). For privacy questions or deletion requests, message on{" "}
        <a href={whatsappChatLink("Hi, I have a privacy request for Light Dey")} target="_blank" rel="noopener noreferrer" className="font-bold text-(--light-text) underline underline-offset-4">
          WhatsApp
        </a>{" "}
        or{" "}
        <a href={MAKER.url} target="_blank" rel="noopener noreferrer" className="font-bold text-(--light-text) underline underline-offset-4">
          X
        </a>
        .
      </p>
      <p>
        We follow the Nigeria Data Protection Act 2023. If you&apos;re not happy with how we handle your data, you can also
        contact the Nigeria Data Protection Commission.
      </p>
      <p>If this page changes, we&apos;ll update the date at the top.</p>
    </main>
  );
}