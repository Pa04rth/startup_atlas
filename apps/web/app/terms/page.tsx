export const metadata = { title: "Terms — Startup Atlas" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">Terms</h1>
      <div className="mt-6 space-y-4">
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
      </div>
    </main>
  );
}
