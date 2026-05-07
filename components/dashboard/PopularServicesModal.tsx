"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Plus, Search } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "sonner";
import { createSubscription } from "@/lib/actions/subscriptions";
import { POPULAR_SERVICES, SERVICE_CATEGORIES } from "@/lib/popular-services";
import { addDays, format } from "date-fns";

interface PopularServicesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PopularServicesModal({ open, onClose }: PopularServicesModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");

  const filtered = POPULAR_SERVICES.filter((s) => {
    const matchCat = activeCategory === "Todos" || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);

    const nextBilling = format(addDays(new Date(), 30), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");

    const toAdd = POPULAR_SERVICES.filter((s) => selected.has(s.name));

    let ok = 0;
    for (const svc of toAdd) {
      try {
        await createSubscription({
          name: svc.name,
          description: svc.description,
          url: svc.url,
          logo_url: null,
          price: svc.price,
          currency: svc.currency,
          billing_cycle: svc.billing_cycle,
          next_billing_date: nextBilling,
          start_date: today,
          category_id: null,
          status: "active",
          last_used_at: null,
          used_this_month: false,
          notify_days_before: 3,
          source: "manual",
        });
        ok++;
      } catch {
        toast.error(`Error añadiendo ${svc.name}`);
      }
    }

    if (ok > 0) {
      toast.success(`${ok} servicio${ok > 1 ? "s" : ""} añadido${ok > 1 ? "s" : ""} correctamente`);
    }

    setSelected(new Set());
    setSaving(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-noir-900 border-t border-white/8
                       rounded-t-3xl max-h-[90vh] flex flex-col md:rounded-2xl
                       md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                       md:w-full md:max-w-2xl md:max-h-[85vh]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-noir-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-semibold text-white">Servicios populares</h2>
                <p className="text-xs text-noir-500 mt-0.5">
                  Selecciona los que tienes contratados
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-noir-500 hover:text-white hover:bg-white/8 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar servicio…"
                  className="w-full pl-9 pr-4 py-2.5 bg-noir-800 border border-white/8 rounded-xl
                             text-sm text-foreground placeholder:text-noir-600
                             focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    activeCategory === cat
                      ? "bg-violet-600 text-white"
                      : "bg-noir-800 text-noir-400 hover:text-white border border-white/6"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filtered.map((svc) => {
                  const isSelected = selected.has(svc.name);
                  return (
                    <motion.button
                      key={svc.name}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggleSelect(svc.name)}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border text-left
                                  transition-all duration-150 ${
                                    isSelected
                                      ? "bg-violet-600/15 border-violet-500/40"
                                      : "bg-noir-800/60 border-white/6 hover:border-white/15"
                                  }`}
                    >
                      <FontAwesomeIcon icon={svc.icon} className="w-5 h-5 text-violet-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{svc.name}</p>
                        <p className="text-xs text-noir-500">
                          {svc.price} {svc.currency}/{svc.billing_cycle === "monthly" ? "mes" : "año"}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-4 border-t border-white/5">
              <button
                onClick={handleAdd}
                disabled={selected.size === 0 || saving}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                           text-white text-sm font-semibold rounded-xl transition-all
                           flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {selected.size === 0
                  ? "Selecciona servicios"
                  : saving
                  ? "Añadiendo…"
                  : `Añadir ${selected.size} servicio${selected.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
