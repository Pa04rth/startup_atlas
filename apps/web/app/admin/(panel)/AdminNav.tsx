"use client";

import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/review", label: "Review queue" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/ads", label: "Ads" },
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
              "rounded-sm px-2.5 py-1.5 no-underline transition " +
              (active
                ? "bg-[#2d2b2b] text-[#f8f4f4]"
                : "text-[#605d5d] hover:bg-[#201f1d]/[0.05] hover:text-[#201f1d]")
            }
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
