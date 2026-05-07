"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import StatsBar from "@/components/dashboard/StatsBar";
import { SpendingAreaChart, CategoryDonutChart } from "@/components/dashboard/SpendingChart";
import TopSubscriptions from "@/components/dashboard/TopSubscriptions";
import OptimizationAlert from "@/components/dashboard/OptimizationAlert";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";
import AddSubscriptionForm from "@/components/forms/AddSubscriptionForm";
import type { DashboardStats, SubscriptionWithCategory, UsageLog } from "@/types";

interface DashboardClientProps {
  stats: DashboardStats;
  usageLogs: UsageLog[];
}

export default function DashboardClient({ stats, usageLogs }: DashboardClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editSub, setEditSub] = useState<SubscriptionWithCategory | null>(null);

  function openEdit(sub: SubscriptionWithCategory) {
    setEditSub(sub);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditSub(null);
  }

  return (
    <>
      <div className="flex gap-6 items-start">
        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
              <p className="text-sm text-noir-500 mt-0.5">
                Resumen de tus suscripciones activas
              </p>
            </div>
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500
                         text-white text-sm font-medium rounded-xl transition-all shadow-glow
                         focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <Plus className="w-4 h-4" />
              Añadir suscripción
            </button>
          </motion.div>

          <StatsBar stats={stats} />

          {stats.optimizationCandidates.length > 0 && (
            <div className="mt-6">
              <OptimizationAlert candidates={stats.optimizationCandidates} />
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="lg:col-span-2">
              <SpendingAreaChart data={stats.monthlyHistory} />
            </div>
            <CategoryDonutChart data={stats.spendingByCategory} />
          </div>

          {/* Top 3 + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <TopSubscriptions items={stats.topThree} />

            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-noir-400">
                  Suscripciones recientes
                </h3>
                <a
                  href="/subscriptions"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Ver todas →
                </a>
              </div>

              {stats.recentlyAdded.length === 0 ? (
                <EmptyState onAdd={() => setFormOpen(true)} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.recentlyAdded.map((sub) => (
                    <SubscriptionCard
                      key={sub.id}
                      subscription={sub}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel: calendar ── */}
        <aside className="w-72 flex-shrink-0 hidden xl:block sticky top-8">
          <ActivityCalendar
            usageLogs={usageLogs}
            subscriptions={stats.allSubscriptions}
          />
        </aside>
      </div>

      <AddSubscriptionForm
        open={formOpen}
        onClose={closeForm}
        editId={editSub?.id ?? null}
        initialValues={
          editSub
            ? {
                name: editSub.name,
                url: editSub.url ?? "",
                price: editSub.price,
                currency: editSub.currency as "EUR" | "USD" | "GBP",
                billing_cycle: editSub.billing_cycle,
                next_billing_date: editSub.next_billing_date,
                category_id: editSub.category_id ?? "",
                used_this_month: editSub.used_this_month,
                notify_days_before: editSub.notify_days_before,
                description: editSub.description ?? "",
              }
            : undefined
        }
      />
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-12 h-12 rounded-2xl bg-violet-600/10 flex items-center justify-center mb-4">
        <Plus className="w-6 h-6 text-violet-400" />
      </div>
      <p className="text-sm font-medium text-white mb-1">Sin suscripciones</p>
      <p className="text-xs text-noir-500 mb-5 max-w-[200px]">
        Añade tu primera suscripción para empezar a controlar tu gasto
      </p>
      <button
        onClick={onAdd}
        className="px-4 py-2 text-sm font-medium text-violet-400 bg-violet-500/10
                   hover:bg-violet-500/20 rounded-xl transition-all"
      >
        Añadir primera suscripción
      </button>
    </motion.div>
  );
}
