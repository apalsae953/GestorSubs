"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { formatCurrency, generateInitials } from "@/lib/utils";
import type { SubscriptionWithCategory } from "@/types";
import { Crown } from "lucide-react";

interface TopSubscriptionsProps {
  items: SubscriptionWithCategory[];
}

export default function TopSubscriptions({ items }: TopSubscriptionsProps) {
  const max = items[0]?.monthly_cost ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Crown className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-medium text-white">Top 3 más caras</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-noir-600 text-center py-4">
          Sin suscripciones activas
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((sub, i) => (
            <TopItem key={sub.id} sub={sub} rank={i + 1} max={max} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function TopItem({
  sub,
  rank,
  max,
}: {
  sub: SubscriptionWithCategory;
  rank: number;
  max: number;
}) {
  const [logoError, setLogoError] = useState(false);
  const pct = (sub.monthly_cost / max) * 100;
  const logoSrc = `https://logo.clearbit.com/${sub.url?.replace(/https?:\/\//, "").split("/")[0]}`;
  const rankColors = ["text-amber-400", "text-noir-300", "text-amber-700"];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold w-4 text-center ${rankColors[rank - 1]}`}>
          {rank}
        </span>
        <div className="w-7 h-7 rounded-lg overflow-hidden bg-noir-700 flex items-center justify-center flex-shrink-0">
          {!logoError && sub.url ? (
            <Image
              src={logoSrc}
              alt={sub.name}
              width={28}
              height={28}
              onError={() => setLogoError(true)}
              unoptimized
            />
          ) : (
            <span
              className="text-xs font-semibold"
              style={{ color: sub.category_color ?? "#8b5cf6" }}
            >
              {generateInitials(sub.name)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{sub.name}</p>
        </div>
        <p className="text-sm font-semibold text-white flex-shrink-0">
          {formatCurrency(sub.monthly_cost)}/mo
        </p>
      </div>

      {/* Progress bar */}
      <div className="ml-7 h-1 bg-noir-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.4 + rank * 0.1, duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${sub.category_color ?? "#8b5cf6"}99, ${sub.category_color ?? "#8b5cf6"})`,
          }}
        />
      </div>
    </div>
  );
}
