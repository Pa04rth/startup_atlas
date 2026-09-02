import type { ReactNode } from "react";
import { logout } from "@/lib/admin/actions";
import { AdminNav } from "./AdminNav";
import { pageClass } from "./_theme";

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className={pageClass}>
      <div className="border-b border-white/10 bg-[#1a1a19]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3987e5] text-sm font-bold text-white">
              S
            </span>
            <span className="text-sm font-semibold text-white">Startup Atlas Admin</span>
          </div>
          <AdminNav />
          <form
            action={async () => {
              "use server";
              await logout();
            }}
          >
            <button type="submit" className="text-sm text-[#898781] transition hover:text-white">
              Log out
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
