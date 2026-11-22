"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, ShieldCheck } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  const items = [
    { href: "/", label: "Sagen", icon: BookOpen, active: pathname === "/" },
    {
      href: "/portfolio",
      label: "Portfolio",
      icon: Award,
      active: pathname.startsWith("/portfolio"),
    },
    {
      href: "/datenschutz",
      label: "Datenschutz",
      icon: ShieldCheck,
      active: pathname.startsWith("/datenschutz"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Hauptnavigation"
      className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe"
    >
      <div className="grid grid-cols-3 max-w-md mx-auto px-2 pt-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                item.active
                  ? "text-emerald-700 bg-emerald-50/80"
                  : "text-slate-500 active:bg-slate-100"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
