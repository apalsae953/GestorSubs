"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, AlertCircle, X, TrendingDown, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { deleteSubscription } from "@/lib/actions/subscriptions";
import { getUsageWarning, type UsageWarningLevel } from "@/lib/usage-warnings";
import { toast } from "sonner";
import type { SubscriptionWithCategory } from "@/types";

interface OptimizationAlertProps {
  candidates: SubscriptionWithCategory[];
}

const LEVEL_CONFIG: Record<
  Exclude<UsageWarningLevel, "none">,
  {
    bg: string;
    border: string;
    ring: string;
    icon: typeof AlertTriangle;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    textColor: string;
  }
> = {
  info: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/15",
    ring: "",
    icon: Info,
    iconColor: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-400",
    textColor: "text-blue-300",
  },
  warning: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/15",
    ring: "",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    textColor: "text-amber-300",
  },
  danger: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    ring: "ring-1 ring-orange-500/10",
    icon: AlertCircle,
    iconColor: "text-orange-400",
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-400",
    textColor: "text-orange-300",
  },
  critical: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    ring: "ring-1 ring-rose-500/15",
    icon: ShieldAlert,
    iconColor: "text-rose-400",
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-400",
    textColor: "text-rose-300",
  },
};

export default function OptimizationAlert({
  candidates,
}: OptimizationAlertProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Calculate warning level for each candidate and sort by severity
  const itemsWithWarnings = candidates
    .map((sub) => ({ sub, warning: getUsageWarning(sub) }))
    .filter(({ warning }) => warning.level !== "none")
    .filter(({ sub }) => !dismissed.includes(sub.id))
    .sort((a, b) => {
      const order: Record<UsageWarningLevel, number> = {
        none: 0,
        info: 1,
        warning: 2,
        danger: 3,
        critical: 4,
      };
      return order[b.warning.level] - order[a.warning.level];
    });

  if (itemsWithWarnings.length === 0) return null;

  const criticalCount = itemsWithWarnings.filter(
    (i) => i.warning.level === "critical" || i.warning.level === "danger"
  ).length;
  const totalWasteable = itemsWithWarnings
    .filter((i) => i.warning.level === "critical" || i.warning.level === "danger")
    .reduce((acc, i) => acc + i.sub.monthly_cost, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-violet-500/10 rounded-lg p-2 flex-shrink-0 mt-0.5">
          <TrendingDown className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            Optimiza tu gasto
          </h3>
          <p className="text-xs text-noir-500 mt-0.5">
            {criticalCount > 0 ? (
              <>
                Podrías ahorrar{" "}
                <span className="text-rose-400 font-medium">
                  {formatCurrency(totalWasteable)}/mes
                </span>{" "}
                cancelando {criticalCount} servicio{criticalCount > 1 ? "s" : ""} sin uso
              </>
            ) : (
              "Revisa el uso de tus servicios para optimizar gastos"
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {itemsWithWarnings.map(({ sub, warning }) => (
            <OptimizationItem
              key={sub.id}
              sub={sub}
              warningLevel={warning.level as Exclude<UsageWarningLevel, "none">}
              warningDescription={warning.description}
              warningLabel={warning.label}
              usageRatio={warning.usageRatio}
              onDismiss={() => setDismissed((d) => [...d, sub.id])}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function OptimizationItem({
  sub,
  warningLevel,
  warningDescription,
  warningLabel,
  usageRatio,
  onDismiss,
}: {
  sub: SubscriptionWithCategory;
  warningLevel: Exclude<UsageWarningLevel, "none">;
  warningDescription: string;
  warningLabel: string;
  usageRatio: number;
  onDismiss: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const config = LEVEL_CONFIG[warningLevel];
  const Icon = config.icon;

  async function handleCancel() {
    if (!confirm(`¿Cancelar ${sub.name}? Esta acción no se puede deshacer.`))
      return;
    setCancelling(true);
    try {
      await deleteSubscription(sub.id);
      toast.success(`${sub.name} cancelada`);
    } catch {
      toast.error("Error al cancelar");
      setCancelling(false);
    }
  }

  const showCancelButton = warningLevel === "danger" || warningLevel === "critical";

  return (
    <motion.div
      layout
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className={`flex items-center gap-3 ${config.bg} border ${config.border} ${config.ring} rounded-xl px-3 py-2.5`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm text-white font-medium truncate">{sub.name}</p>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.badgeBg} ${config.badgeText}`}
          >
            {warningLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-noir-500 truncate">
            {warningDescription}
            {" · "}
            <span className={config.textColor}>
              {formatCurrency(sub.monthly_cost)}/mes
            </span>
          </p>
        </div>
        {/* Mini progress bar showing cycle usage */}
        <div className="mt-1.5 h-1 bg-noir-700 rounded-full overflow-hidden w-full max-w-[120px]">
          <div
            className={`h-full rounded-full transition-all ${
              warningLevel === "critical"
                ? "bg-rose-500"
                : warningLevel === "danger"
                ? "bg-orange-500"
                : warningLevel === "warning"
                ? "bg-amber-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${Math.round(usageRatio * 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {showCancelButton && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20
                       px-2.5 py-1 rounded-lg transition-all font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 text-noir-600 hover:text-noir-400 hover:bg-white/5 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
