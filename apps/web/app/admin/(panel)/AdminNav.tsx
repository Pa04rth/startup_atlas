"use client";

import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/review", label: "Review queue" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/ingest", label: "Run ingest" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <a
            key={item.href}
            href={item.href}
            className={
              "rounded-md px-2.5 py-1.5 transition " +
              (active ? "bg-[#3987e5] text-white" : "text-[#c3c2b7] hover:bg-white/5 hover:text-white")
            }
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
