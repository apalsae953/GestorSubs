"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter } from "lucide-react";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import AddSubscriptionForm from "@/components/forms/AddSubscriptionForm";
import type { SubscriptionWithCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";

type SortKey = "monthly_cost" | "next_billing_date" | "name";
type FilterStatus = "all" | "active" | "paused" | "cancelled";

export default function SubscriptionsClient({
  subscriptions,
}: {
  subscriptions: SubscriptionWithCategory[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editSub, setEditSub] = useState<SubscriptionWithCategory | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("monthly_cost");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");

  const filtered = useMemo(() => {
    return subscriptions
      .filter((s) => {
        if (filterStatus !== "all" && s.status !== filterStatus) return false;
        if (
          search &&
          !s.name.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "monthly_cost") return b.monthly_cost - a.monthly_cost;
        if (sortKey === "next_billing_date")
          return (
            new Date(a.next_billing_date).getTime() -
            new Date(b.next_billing_date).getTime()
          );
        return a.name.localeCompare(b.name);
      });
  }, [subscriptions, search, sortKey, filterStatus]);

  const totalMonthly = filtered.reduce((acc, s) => acc + s.monthly_cost, 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-semibold text-white">Suscripciones</h1>
          <p className="text-sm text-noir-500 mt-0.5">
            {filtered.length} suscripción{filtered.length !== 1 ? "es" : ""} ·{" "}
            <span className="text-violet-400">
              {formatCurrency(totalMonthly)}/mes
            </span>
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500
                     text-white text-sm font-medium rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Añadir
        </button>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar suscripción…"
            className="w-full pl-9 pr-4 py-2.5 bg-noir-800 border border-white/8 rounded-xl text-sm
                       text-foreground placeholder:text-noir-600
                       focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 bg-noir-800 border border-white/8 rounded-xl p-1">
          {(["all", "active", "paused", "cancelled"] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === status
                    ? "bg-violet-600 text-white"
                    : "text-noir-500 hover:text-white"
                }`}
              >
                {status === "all"
                  ? "Todas"
                  : status === "active"
                  ? "Activas"
                  : status === "paused"
                  ? "Pausadas"
                  : "Canceladas"}
              </button>
            )
          )}
        </div>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2.5 bg-noir-800 border border-white/8 rounded-xl text-sm
                     text-noir-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40
                     transition-all dark:[color-scheme:dark]"
        >
          <option value="monthly_cost">Ordenar por precio</option>
          <option value="next_billing_date">Próximo cobro</option>
          <option value="name">Nombre A–Z</option>
        </select>
      </div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-noir-600 text-sm py-16"
          >
            No se encontraron suscripciones
          </motion.p>
        ) : (
          <motion.div
            key="grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onEdit={(s) => {
                  setEditSub(s);
                  setFormOpen(true);
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AddSubscriptionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditSub(null);
        }}
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
