"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { logUsageManual, unlogUsageManual } from "@/lib/actions/usage";
import { formatCurrency, generateInitials } from "@/lib/utils";
import type { SubscriptionWithCategory } from "@/types";
import { cn } from "@/lib/utils";
import AddSubscriptionForm from "@/components/forms/AddSubscriptionForm";
import PopularServicesModal from "@/components/dashboard/PopularServicesModal";

interface CheckinClientProps {
  subscriptions: SubscriptionWithCategory[];
  today: string;
}

export default function CheckinClient({ subscriptions, today }: CheckinClientProps) {
  const [used, setUsed] = useState<Set<string>>(
    () => new Set(subscriptions.filter((s) => s.used_this_month).map((s) => s.id))
  );
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [popularOpen, setPopularOpen] = useState(false);

  const active = subscriptions.filter((s) => s.status === "active");
  const usedCount = used.size;
  const pct = active.length > 0 ? Math.round((usedCount / active.length) * 100) : 0;

  async function toggleUsed(sub: SubscriptionWithCategory) {
    if (loading.has(sub.id)) return;

    setLoading((l) => new Set(l).add(sub.id));
    const wasUsed = used.has(sub.id);

    // Optimistic
    setUsed((prev) => {
      const next = new Set(prev);
      wasUsed ? next.delete(sub.id) : next.add(sub.id);
      return next;
    });

    try {
      if (wasUsed) {
        await unlogUsageManual(sub.id);
        toast(`${sub.name} desmarcada`);
      } else {
        const res = await logUsageManual(sub.id);
        if (res.alreadyLogged) {
          toast.success(`${sub.name} ya estaba registrada hoy`);
        } else {
          toast.success(`✓ ${sub.name} marcada como usada`);
        }
      }
    } catch {
      // Revert on error
      setUsed((prev) => {
        const next = new Set(prev);
        wasUsed ? next.add(sub.id) : next.delete(sub.id);
        return next;
      });
      toast.error("Error al guardar");
    } finally {
      setLoading((l) => { const n = new Set(l); n.delete(sub.id); return n; });
    }
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-xs text-noir-500 uppercase tracking-widest mb-1 capitalize">
            {today}
          </p>
          <h1 className="text-2xl font-semibold text-white">Check-in diario</h1>
          <p className="text-sm text-noir-500 mt-0.5">
            Toca los servicios que has usado hoy
          </p>
        </motion.div>

        {/* Progress bar */}
        {active.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4 mb-6"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-medium text-white">
                {usedCount} de {active.length} servicios usados hoy
              </span>
              <span className="text-sm font-semibold text-violet-400">{pct}%</span>
            </div>
            <div className="h-2 bg-noir-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {pct === 100 && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-emerald-400 mt-2 flex items-center gap-1"
              >
                <Zap className="w-3 h-3" /> ¡Todo registrado!
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Grid */}
        {active.length === 0 ? (
          <EmptyState
            onAdd={() => setFormOpen(true)}
            onPopular={() => setPopularOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <AnimatePresence>
              {active.map((sub, i) => (
                <CheckinCard
                  key={sub.id}
                  sub={sub}
                  isUsed={used.has(sub.id)}
                  isLoading={loading.has(sub.id)}
                  index={i}
                  onToggle={() => toggleUsed(sub)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setPopularOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                       bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20
                       text-violet-400 text-sm font-medium transition-all"
          >
            <Zap className="w-4 h-4" />
            Añadir servicio popular
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-white/5 hover:bg-white/8 border border-white/8
                       text-noir-400 hover:text-white text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Manual
          </button>
        </div>
      </div>

      <AddSubscriptionForm open={formOpen} onClose={() => setFormOpen(false)} />
      <PopularServicesModal open={popularOpen} onClose={() => setPopularOpen(false)} />
    </>
  );
}

// ── CheckinCard ────────────────────────────────────────────────────────────────
function CheckinCard({
  sub,
  isUsed,
  isLoading,
  index,
  onToggle,
}: {
  sub: SubscriptionWithCategory;
  isUsed: boolean;
  isLoading: boolean;
  index: number;
  onToggle: () => void;
}) {
  const [logoError, setLogoError] = useState(false);
  const logoSrc = `https://logo.clearbit.com/${sub.url?.replace(/https?:\/\//, "").split("/")[0]}`;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.94 }}
      onClick={onToggle}
      disabled={isLoading}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border",
        "transition-all duration-200 select-none w-full aspect-square",
        isUsed
          ? "bg-emerald-500/10 border-emerald-500/30 shadow-glow-emerald"
          : "bg-noir-800/60 border-white/6 hover:border-white/15 hover:bg-noir-700/60"
      )}
    >
      {/* Logo */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-noir-700 flex items-center justify-center flex-shrink-0">
        {!logoError && sub.url ? (
          <Image
            src={logoSrc}
            alt={sub.name}
            width={48}
            height={48}
            onError={() => setLogoError(true)}
            unoptimized
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="text-lg font-bold"
            style={{ color: sub.category_color ?? "#8b5cf6" }}
          >
            {generateInitials(sub.name)}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <p className={cn("text-sm font-semibold leading-tight", isUsed ? "text-white" : "text-noir-300")}>
          {sub.name}
        </p>
        <p className="text-xs mt-0.5 text-noir-600">
          {formatCurrency(sub.price, sub.currency)}
        </p>
      </div>

      {/* Check overlay */}
      <AnimatePresence>
        {isUsed && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-2.5 right-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-noir-900/60 rounded-2xl">
          <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </motion.button>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
function EmptyState({ onAdd, onPopular }: { onAdd: () => void; onPopular: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card flex flex-col items-center justify-center py-16 text-center mb-6"
    >
      <div className="text-4xl mb-4">📭</div>
      <p className="text-sm font-medium text-white mb-1">Sin suscripciones todavía</p>
      <p className="text-xs text-noir-500 mb-6 max-w-[220px]">
        Añade tus servicios para hacer check-in cada día
      </p>
      <button
        onClick={onPopular}
        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-all"
      >
        Añadir servicios populares
      </button>
    </motion.div>
  );
}
