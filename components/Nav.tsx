"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/resources", label: "Resources" },
  { href: "/reservations", label: "Reservations" },
  { href: "/reports", label: "Usage report", adminOnly: true },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.filter((l) => !l.adminOnly || isAdmin).map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
