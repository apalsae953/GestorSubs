"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  List,
  Settings,
  LogOut,
  Radar,
  Bell,
  CheckSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Suscripciones", icon: List },
  { href: "/checkin", label: "Check-in", icon: CheckSquare },
  { href: "/notifications", label: "Notificaciones", icon: Bell },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 flex flex-col border-r border-white/5 bg-noir-900/80 backdrop-blur-sm flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center group-hover:bg-violet-500 transition-colors">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold text-white tracking-tight">
            SubScout
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link key={href} href={href}>
              <motion.div
                className={cn("nav-item", active && "active")}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    active ? "text-violet-400" : "text-noir-500"
                  )}
                />
                {label}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto w-1 h-4 rounded-full bg-violet-500"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-violet-400">
              {(profile?.full_name ?? profile?.email ?? "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {profile?.full_name ?? "Usuario"}
            </p>
            <p className="text-[11px] text-noir-500 truncate">
              {profile?.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-noir-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
