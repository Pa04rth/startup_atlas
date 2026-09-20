import type { ReactNode } from "react";
import { Cormorant_Garamond, Lora } from "next/font/google";
import { logout } from "@/lib/admin/actions";
import { AdminNav } from "./AdminNav";
import { pageClass, mutedText } from "./_theme";

// Same families as the public site, scoped to the admin subtree via
// .variable on the wrapper below rather than the root layout — the rest of
// the app keeps Inter.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-heading",
});
const lora = Lora({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body" });

// Every admin page reads live operational state — the review queue, pending
// submissions and payments, ingestion runs, page views. None of it may come
// from a build-time render: these pages use no dynamic API of their own (auth
// is checked in middleware.ts, not here), so Next would otherwise statically
// render them once at build and serve that same HTML forever. That is exactly
// what froze the dashboard's "last 7 days" chart on its build date. Set on the
// layout so it covers every route in the panel, not just the dashboard.
export const dynamic = "force-dynamic";

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${cormorant.variable} ${lora.variable} ${pageClass}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="border-b border-[#201f1d]/12 bg-[#f8f4f4]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <a href="/" className="text-inherit no-underline">
            <span className="text-[19px]" style={{ fontFamily: "var(--font-heading)" }}>
              Startup Atlas.
            </span>
            <span className={`ml-2 text-[10.5px] uppercase tracking-[0.16em] ${mutedText}`}>Admin</span>
          </a>
          <AdminNav />
          <form
            action={async () => {
              "use server";
              await logout();
            }}
          >
            <button type="submit" className={`text-sm transition hover:text-[#201f1d] ${mutedText}`}>
              Log out
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
