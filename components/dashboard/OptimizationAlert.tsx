"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, TrendingDown } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { deleteSubscription } from "@/lib/actions/subscriptions";
import { toast } from "sonner";
import type { SubscriptionWithCategory } from "@/types";

interface OptimizationAlertProps {
  candidates: SubscriptionWithCategory[];
}

export default function OptimizationAlert({
  candidates,
}: OptimizationAlertProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = candidates.filter((c) => !dismissed.includes(c.id));

  if (visible.length === 0) return null;

  const totalWasteable = visible.reduce((acc, c) => acc + c.monthly_cost, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6 border-rose-500/20 ring-1 ring-rose-500/15"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-rose-500/10 rounded-lg p-2 flex-shrink-0 mt-0.5">
          <TrendingDown className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            Optimiza tu gasto
          </h3>
          <p className="text-xs text-noir-500 mt-0.5">
            Podrías ahorrar{" "}
            <span className="text-rose-400 font-medium">
              {formatCurrency(totalWasteable)}/mes
            </span>{" "}
            cancelando suscripciones sin usar
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {visible.map((sub) => (
            <OptimizationItem
              key={sub.id}
              sub={sub}
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
  onDismiss,
}: {
  sub: SubscriptionWithCategory;
  onDismiss: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!confirm(`¿Cancelar ${sub.name}? Esta acción no se puede deshacer.`))
      return;
    setCancelling(true);
    try {
      await deleteSubscription(sub.id);
      toast.success(`${sub.name} cancelada. ¡Ahorro de ${formatCurrency(sub.monthly_cost)}/mes!`);
    } catch {
      toast.error("Error al cancelar");
      setCancelling(false);
    }
  }

  return (
    <motion.div
      layout
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="flex items-center gap-3 bg-rose-500/5 border border-rose-500/10 rounded-xl px-3 py-2.5"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{sub.name}</p>
        <p className="text-xs text-noir-500">
          {sub.last_used_at
            ? `Sin usar desde ${new Date(sub.last_used_at).toLocaleDateString("es-ES")}`
            : "Nunca marcada como usada"}
          {" · "}
          <span className="text-rose-300">{formatCurrency(sub.monthly_cost)}/mes</span>
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20
                     px-2.5 py-1 rounded-lg transition-all font-medium disabled:opacity-50"
        >
          Cancelar
        </button>
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
