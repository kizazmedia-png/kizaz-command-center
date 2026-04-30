"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/content", label: "Content", icon: "✎" },
  { href: "/seo", label: "SEO", icon: "⌕" },
  { href: "/social", label: "Email & Social", icon: "✉" },
  { href: "/monetization", label: "Monetization", icon: "$" },
  { href: "/operations", label: "Operations", icon: "✓" },
  { href: "/data", label: "Data", icon: "▤" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-40">
        <Link href="/dashboard" className="font-bold text-ink">
          Kizaz <span className="text-accent">Command</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          className="p-2 text-ink"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={[
          "bg-white border-r border-gray-200 flex flex-col",
          "md:w-64 md:min-h-screen md:sticky md:top-0",
          mobileOpen ? "block" : "hidden md:flex",
        ].join(" ")}
      >
        <div className="hidden md:block px-6 py-6 border-b border-gray-100">
          <Link href="/dashboard" className="text-xl font-bold text-ink">
            Kizaz <span className="text-accent">Command</span>
          </Link>
          <p className="text-xs text-text mt-1">AI-powered control center</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                  active
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-text hover:bg-gray-100 hover:text-ink",
                ].join(" ")}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-gray-100 text-xs text-text">
          v0.1.0
        </div>
      </aside>
    </>
  );
}
