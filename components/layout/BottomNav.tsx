"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  CheckSquare,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/subscriptions", icon: List, label: "Suscripciones" },
  { href: "/checkin", icon: CheckSquare, label: "Check-in" },
  { href: "/notifications", icon: Bell, label: "Alertas" },
  { href: "/settings", icon: Settings, label: "Ajustes" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/5 bg-noir-900/95 backdrop-blur-sm">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
              active ? "text-violet-400" : "text-noir-500"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
