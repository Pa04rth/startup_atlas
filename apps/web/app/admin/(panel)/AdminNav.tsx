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
              (active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900")
            }
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
