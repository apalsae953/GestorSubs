"use client";

import { motion } from "framer-motion";
import { TrendingUp, CreditCard, AlertTriangle, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

interface StatsBarProps {
  stats: DashboardStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const items = [
    {
      label: "Gasto mensual",
      value: formatCurrency(stats.totalMonthly),
      icon: CreditCard,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Uso de hoy",
      value: `${stats.usedTodayCount} / ${stats.activeCount}`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Gasto anual",
      value: formatCurrency(stats.totalYearly),
      icon: Calendar,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Optimizables",
      value: stats.optimizationCandidates.length.toString(),
      icon: AlertTriangle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      highlight: stats.optimizationCandidates.length > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className={`glass-card p-5 ${item.highlight ? "ring-1 ring-rose-500/20" : ""}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-noir-500 mb-1">{item.label}</p>
              <p className="text-xl font-semibold text-white">{item.value}</p>
            </div>
            <div className={`${item.bg} rounded-lg p-2 flex-shrink-0`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
