import type { ReactNode } from "react";
import { logout } from "@/lib/admin/actions";
import { AdminNav } from "./AdminNav";

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-3">
          <AdminNav />
          <form
            action={async () => {
              "use server";
              await logout();
            }}
          >
            <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-700">
              Log out
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
