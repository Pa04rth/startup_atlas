export const metadata = { title: "Privacy — Startup Atlas" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">Privacy</h1>
      <div className="mt-6 space-y-4">
        <p>
          Startup Atlas publishes only public business contacts (HR, careers, and leadership emails
          or URLs) that we found on a company's own public website or careers page — never
          residential addresses or personal contact details.
        </p>
        <p>
          Every published contact links to the public page we sourced it from. If you'd like a
          contact removed, email{" "}
          <a href="mailto:parthsohaney04@gmail.com" className="text-emerald-700 hover:underline">
            parthsohaney04@gmail.com
          </a>{" "}
          and we'll take it down.
        </p>
        <p>
          We collect basic, first-party page-view analytics (page path, referrer, city) to
          understand traffic. We don't sell data to third parties.
        </p>
      </div>
    </main>
  );
}
