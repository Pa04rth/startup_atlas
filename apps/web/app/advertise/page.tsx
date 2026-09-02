import { AdvertiseForm } from "@/components/forms/AdvertiseForm";

export const metadata = { title: "Advertise — Startup Atlas" };

const infoRows = [
  { icon: "⚡", label: "Boosted pins, sponsor tiles, flash promos, and banners" },
  { icon: "🔍", label: "Manually verified before going live — no gateway, just UPI" },
  { icon: "📩", label: "Confirmation by email, usually within a day" },
];

export default function AdvertisePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 px-6 py-16">
      <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_1.1fr] md:items-start">
        <div className="text-white">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-100/70 transition hover:text-white"
          >
            ← Back to home
          </a>

          <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight">Advertise on Startup Atlas</h1>
          <p className="mt-3 text-emerald-100/80">
            Get your company or job posting in front of everyone browsing the map.
          </p>

          <div className="mt-8 space-y-3">
            {infoRows.map((row) => (
              <div key={row.label} className="flex items-center gap-3 text-sm text-emerald-50/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base">
                  {row.icon}
                </span>
                {row.label}
              </div>
            ))}
          </div>
        </div>

        <AdvertiseForm />
      </div>
    </main>
  );
}
