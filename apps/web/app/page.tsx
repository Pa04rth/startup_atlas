import { cities } from "@startup-atlas/config";
import { ClassicalShell } from "@/components/landing/ClassicalShell";
import { DiptychHero } from "@/components/landing/DiptychHero";
import { MonumentSymbols } from "@/components/landing/MonumentSymbols";
import { DeveloperCredit } from "@/components/DeveloperCredit";

export default function HomePage() {
  return (
    <ClassicalShell>
      <MonumentSymbols />
      <DiptychHero cities={cities} />

      <footer
        className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 border-t px-6 py-8 text-center text-xs text-[var(--color-neutral-600)] sm:flex-row sm:justify-between sm:text-left"
        style={{ borderColor: "var(--color-divider)" }}
      >
        <span>© {new Date().getFullYear()} Startup Atlas</span>
        <div className="flex items-center gap-2.5">
          <DeveloperCredit avatarSize={24} iconSize={14} />
        </div>
        <div className="flex gap-5">
          <a href="/privacy" className="text-inherit transition hover:text-[var(--color-accent-700)]">
            Privacy
          </a>
          <a href="/terms" className="text-inherit transition hover:text-[var(--color-accent-700)]">
            Terms
          </a>
        </div>
      </footer>
    </ClassicalShell>
  );
}
