import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata = { title: "Terms — Startup Atlas" };

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms">
      <p>
        Startup Atlas is provided as-is, for informational purposes. Company data is sourced from
        public records and websites and labelled with a confidence tier — we work to keep it
        accurate but don't guarantee it. Report an error via the submit form or by emailing{" "}
        <a href="mailto:parthsohaney04@gmail.com" className="text-emerald-700 hover:underline">
          parthsohaney04@gmail.com
        </a>
        .
      </p>
      <p>
        Ads and sponsored placements are booked manually and reviewed before going live. Payment
        is via UPI, verified by hand against the transaction id you provide — see the advertise
        page for details.
      </p>
    </LegalPageShell>
  );
}
