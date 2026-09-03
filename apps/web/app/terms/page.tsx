import type { ReactNode } from "react";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata = { title: "Terms — Startup Atlas" };

const CONTACT_EMAIL = "parthsohaney04@gmail.com";
const LAST_UPDATED = "September 3, 2026";

function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-3 text-base font-semibold text-neutral-900">{children}</h2>;
}

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p className="text-xs text-neutral-400">Last updated: {LAST_UPDATED}</p>

      <p>
        These terms cover your use of Startup Atlas — a directory of startups, jobs, and the
        people behind them, city by city. By using the site, submitting a listing, booking an ad,
        or offering/requesting a referral, you agree to them. If you don't agree, please don't use
        the site. Questions go to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <H2>1. What Startup Atlas is</H2>
      <p>
        Startup Atlas is an independent, self-run project (not a registered company) that maps
        startups, jobs, and walk-in interviews across Indian cities, sourced from public records,
        company websites, and community submissions. It's provided as-is and free to browse.
      </p>

      <H2>2. Data accuracy — no guarantee</H2>
      <p>
        Every listing carries a confidence tier derived from how well-sourced it is (published,
        probable, or under review) — we work to keep listings accurate and up to date, but we
        don't guarantee correctness, completeness, or that a company is still operating, hiring,
        or reachable at a listed contact. Don't rely on anything here as your only source before
        making a decision (accepting a job offer, sending money, etc.). Spotted an error? Tell us
        via the submit form or by email — we'd rather fix it than leave it wrong.
      </p>

      <H2>3. Submissions and claimed listings</H2>
      <p>
        Anyone can submit a new company or suggest an edit to an existing listing. By submitting,
        you confirm the information is accurate to your knowledge and that you have the right to
        share it. Every submission and edit is reviewed by a human before it goes live — nothing
        is auto-published. We may edit, decline, or remove any submission at our discretion,
        including listings that turn out to be fake, spam, or duplicate.
      </p>

      <H2>4. Referral program</H2>
      <p>
        The referral program lets someone who works at a company offer to refer candidates for a
        fee (split between the referrer and the platform), and lets a candidate request that
        referral. This is a facilitation service only:
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>We don't guarantee a referral leads to an interview, offer, or hire.</li>
        <li>We verify a referrer's proof of employment before publishing an offer, but we can't independently confirm every claim made in a pitch — use your judgment.</li>
        <li>Payment is released to the referrer only once the referral is confirmed as delivered; if it isn't, the candidate is refunded (see §6).</li>
        <li>Impersonating an employee you aren't, or submitting fake proof of employment, will get an offer permanently removed and may be reported.</li>
      </ul>

      <H2>5. Advertising</H2>
      <p>
        Boosted pins, sponsor tiles, flash promos, and banners are booked through the advertise
        page and reviewed before going live — we can decline or pull an ad that's misleading,
        illegal, or otherwise inappropriate for the site, without a refund in cases of
        misrepresentation on the booking form.
      </p>

      <H2>6. Payments</H2>
      <p>
        All payments on this site — ads, subscriptions, referral/connect fees — go through a
        manual pay-and-verify flow: you pay via UPI to the number/QR shown, then submit the
        transaction ID for us to confirm by hand against our bank statement. We are not a payment
        aggregator and never process, store, or have access to your card, bank, or UPI
        credentials — that transaction happens entirely within your own UPI app. Confirmation is
        usually done within a day; if a payment can't be verified (wrong transaction ID, no
        matching entry), we'll reach out on the contact you provided before taking any action.
      </p>
      <p>
        Refunds: if we cancel or decline a booking/offer after payment, or a referral isn't
        delivered, we refund the amount paid to the same UPI details, usually within 5–7 business
        days. Outside of those cases, payments are non-refundable once a service (an ad going
        live, a referral being delivered) has been provided.
      </p>

      <H2>7. Acceptable use</H2>
      <p>You agree not to:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>scrape, bulk-download, or systematically republish the site's data;</li>
        <li>submit false, defamatory, or misleading information about a company or person;</li>
        <li>use the public contact directory for spam, harassment, or unsolicited bulk outreach;</li>
        <li>attempt to bypass, disable, or interfere with the site's security or normal operation;</li>
        <li>impersonate a company, employee, or candidate you aren't.</li>
      </ul>
      <p>We may suspend or remove access, listings, or offers tied to any account or submission that breaks these rules.</p>

      <H2>8. Intellectual property</H2>
      <p>
        The Startup Atlas name, design, and original content (excluding the underlying factual
        data about companies, which is sourced from public records) belong to the site operator.
        By submitting content (a listing, an edit, a referral pitch), you grant us a
        non-exclusive, royalty-free license to publish, display, and edit it on the site for as
        long as the listing/offer remains active.
      </p>

      <H2>9. Third-party links</H2>
      <p>
        Listings link out to company websites, job boards, and news articles we don't control.
        We're not responsible for the content, accuracy, or practices of those external sites.
      </p>

      <H2>10. Limitation of liability</H2>
      <p>
        Startup Atlas is provided "as is," without warranties of any kind. To the fullest extent
        permitted by law, we aren't liable for any loss or damage arising from your use of the
        site or reliance on its data — including a missed job opportunity, a bad-faith referral,
        or a business decision made based on a listing. This doesn't limit any liability that
        can't be excluded under Indian law.
      </p>

      <H2>11. Indemnification</H2>
      <p>
        You agree to hold us harmless from any claim arising from content you submit (a listing,
        edit, referral offer, or proof of employment) or your breach of these terms.
      </p>

      <H2>12. Termination</H2>
      <p>
        We can remove a listing, ad, referral offer, or restrict access to the site at any time,
        for any reason connected to these terms — most often, a data-quality or abuse issue.
      </p>

      <H2>13. Governing law</H2>
      <p>These terms are governed by the laws of India. Any dispute will be handled in accordance with Indian law.</p>

      <H2>14. Changes to these terms</H2>
      <p>
        We may update these terms as the site evolves. Meaningful changes will update the date at
        the top of this page; continuing to use the site afterward means you accept the update.
      </p>

      <H2>15. Contact</H2>
      <p>
        Everything on this page traces back to one inbox —{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 hover:underline">
          {CONTACT_EMAIL}
        </a>
        . Ads and sponsored placements are reviewed by hand before going live; see the advertise
        page for pricing.
      </p>
    </LegalPageShell>
  );
}
