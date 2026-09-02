import type { ReactNode } from "react";

export function LegalPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
        >
          ← Back to home
        </a>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-700">{children}</div>
        </div>
      </div>
    </main>
  );
}
