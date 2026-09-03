import type { ReactNode } from "react";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata = { title: "Privacy — Startup Atlas" };

const CONTACT_EMAIL = "parthsohaney04@gmail.com";
const LAST_UPDATED = "September 3, 2026";

function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-3 text-base font-semibold text-neutral-900">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p className="text-xs text-neutral-400">Last updated: {LAST_UPDATED}</p>

      <p>
        Startup Atlas ("we", "us") is an independent project, not a company with a call center or
        a legal department — this page explains, in plain terms, what we collect, why, and how you
        can control it. If anything here is unclear, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 hover:underline">
          {CONTACT_EMAIL}
        </a>{" "}
        and a person (not a bot) will answer.
      </p>

      <H2>1. What we collect</H2>
      <p>Depending on how you use the site, we collect:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong>Basic visit data</strong> — the page you viewed, the page you came from
          (referrer), and which city section you were browsing. Logged against a day, not against
          you: no cookie, account, or device fingerprint ties this back to an individual visitor.
        </li>
        <li>
          <strong>Submission/claim form data</strong> — company details you enter, plus your email
          (kept private, used only if we need to follow up — never published).
        </li>
        <li>
          <strong>Advertise form data</strong> — the city, ad type, and contact email you provide
          to book a slot.
        </li>
        <li>
          <strong>Referral program data</strong> — if you offer a referral: your name, work email,
          role, LinkedIn URL, an optional pitch, and a proof-of-employment image (a badge, an
          internal tool screenshot, a redacted payslip — whatever you're comfortable sharing). If
          you request a referral: your name, email, phone (optional), and a resume link.
        </li>
        <li>
          <strong>Payment verification data</strong> — for ads, subscriptions, or referral/connect
          payments (all handled manually via UPI, never through a card form), we collect your name
          (optional), an email or phone to reach you, and the UPI transaction ID (UTR) you provide
          so we can confirm the payment against our bank statement. We never see or store your
          card number, UPI PIN, or bank credentials — that transaction happens entirely inside your
          own UPI app.
        </li>
        <li>
          <strong>Public business contacts</strong> — HR, careers, and leadership emails or URLs we
          find on a company's own public website or careers page, published with a link to where we
          sourced them. See §5.
        </li>
      </ul>
      <p>
        We do not run ad-tracking pixels, third-party analytics scripts, or cross-site tracking of
        any kind. Our hosting and storage providers (see §4) may keep their own standard technical
        logs (like IP address, as part of normal request handling) — that's infrastructure-level
        logging outside our application, not something we separately collect or query.
      </p>

      <H2>2. Why we collect it</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Basic visit data — to see which cities and pages people actually use, so we build the right things next.</li>
        <li>Form data — to do the thing the form says it does: review a submission, confirm a payment, connect a referral to a candidate.</li>
        <li>Contact emails — to reach you about your own submission/booking/offer, never for marketing.</li>
      </ul>
      <p>We don't sell, rent, or trade your data to anyone, for any reason.</p>

      <H2>3. Cookies</H2>
      <p>
        Browsing Startup Atlas sets no cookies on your device. There's no analytics cookie, no
        advertising cookie, and no cross-site identifier — the visit data described in §1 is
        counted without one, which is why we can't (and don't) tie it back to you.
      </p>

      <H2>4. Who we share data with</H2>
      <p>We use a small number of infrastructure providers to run the site. None of them get your data for their own use:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li><strong>Cloudflare R2</strong> — object storage for company logos and referral proof images.</li>
        <li><strong>Our hosting provider</strong> — runs the application and database.</li>
        <li><strong>OpenStreetMap / Nominatim</strong> — used only to geocode business addresses; no personal data is sent there.</li>
      </ul>
      <p>We'd only disclose data beyond this if legally required to (e.g. a valid court order) — nothing broader.</p>

      <H2>5. The public contact directory</H2>
      <p>
        Startup Atlas publishes free HR/careers/leadership contact info to make job-hunting easier.
        Two rules keep this honest:
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>We only publish contacts that were already public on a company's own website — never a residential address, personal number, or anything scraped from a source that wasn't meant to be public.</li>
        <li>Every published contact links to the exact page we sourced it from, so you can verify it yourself.</li>
      </ul>
      <p>
        If a contact belongs to you and you'd like it removed — no reason required — email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 hover:underline">
          {CONTACT_EMAIL}
        </a>{" "}
        and we'll take it down.
      </p>

      <H2>6. Referral proof images</H2>
      <p>
        Proof-of-employment images submitted with a referral offer are reviewed by hand to confirm
        the offer is genuine, then kept on file for that purpose — they are never shown publicly or
        shared with the candidate, the employer, or anyone else.
      </p>

      <H2>7. How long we keep data</H2>
      <p>
        Submission, advertise, and payment-verification records are kept for as long as the
        related listing/ad/offer is active, plus a reasonable period after for our own
        record-keeping (e.g. resolving a payment dispute) — after which we delete what's no longer
        needed. Referral proof images are deleted once an offer is rejected or no longer active.
        You can ask us to delete your data earlier at any time (see §8).
      </p>

      <H2>8. Your choices</H2>
      <p>You can, at any time, by emailing {CONTACT_EMAIL}:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>ask what data we hold about you;</li>
        <li>ask us to correct or delete it;</li>
        <li>ask us to remove a public contact, submission, or referral offer tied to you;</li>
        <li>opt out of any future contact from us.</li>
      </ul>
      <p>We'll respond within a reasonable time — this is a small, human-run project, not an automated request queue.</p>

      <H2>9. Children</H2>
      <p>Startup Atlas isn't directed at children, and we don't knowingly collect data from anyone under 18.</p>

      <H2>10. Security</H2>
      <p>
        We take reasonable technical measures to protect what we hold — encrypted connections,
        access controls on internal tooling, and no card or bank credentials ever touching our
        servers. That said, no online service can guarantee perfect security, and we won't pretend
        to be the exception.
      </p>

      <H2>11. Changes to this policy</H2>
      <p>
        If this policy changes in a meaningful way, we'll update the date at the top of this page.
        Continuing to use the site after a change means you're okay with the update.
      </p>

      <H2>12. Contact</H2>
      <p>
        Questions, requests, or just a data-privacy concern you want to raise — email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPageShell>
  );
}
