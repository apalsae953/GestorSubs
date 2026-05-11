"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  MoreHorizontal,
  Trash2,
  Edit,
  CheckCircle2,
  Circle,
  ExternalLink,
  Calendar,
  Activity,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  getBillingUrgency,
  cycleLabel,
  generateInitials,
} from "@/lib/utils";
import { deleteSubscription, updateSubscriptionStatus } from "@/lib/actions/subscriptions";
import { logUsageManual, unlogUsageManual } from "@/lib/actions/usage";
import type { SubscriptionWithCategory } from "@/types";
import { cn } from "@/lib/utils";

interface SubscriptionCardProps {
  subscription: SubscriptionWithCategory;
  onEdit?: (sub: SubscriptionWithCategory) => void;
}

export default function SubscriptionCard({
  subscription: sub,
  onEdit,
}: SubscriptionCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);

  const urgency = getBillingUrgency(sub.next_billing_date);
  const days = daysUntil(sub.next_billing_date);
  const initials = generateInitials(sub.name);
  const logoSrc = sub.logo_url ?? `https://logo.clearbit.com/${sub.url?.replace(/https?:\/\//, "").split("/")[0]}`;

  async function handleDelete() {
    if (!confirm(`¿Eliminar ${sub.name}?`)) return;
    setIsDeleting(true);
    try {
      await deleteSubscription(sub.id);
      toast.success(`${sub.name} eliminada`);
    } catch {
      toast.error("Error al eliminar");
      setIsDeleting(false);
    }
  }

  async function handleToggleUsed() {
    if (usageLoading) return;
    setUsageLoading(true);
    try {
      if (sub.used_this_month) {
        await unlogUsageManual(sub.id);
        toast.success("Uso desmarcado");
      } else {
        const res = await logUsageManual(sub.id);
        if (res?.alreadyLogged) {
          toast.info(`${sub.name} ya estaba registrada hoy`);
        } else {
          toast.success("Uso registrado");
        }
      }
    } catch {
      toast.error("Error al actualizar uso");
    } finally {
      setUsageLoading(false);
    }
  }

  async function handleStatusChange(status: "active" | "paused" | "cancelled") {
    setStatusLoading(true);
    try {
      await updateSubscriptionStatus(sub.id, status);
      const labels = { active: "reactivada", paused: "pausada", cancelled: "cancelada" };
      toast.success(`${sub.name} ${labels[status]}`);
    } catch {
      toast.error("Error al cambiar el estado");
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: isDeleting ? 0 : 1, scale: isDeleting ? 0.95 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "glass-card p-5 relative group cursor-default",
        urgency === "urgent" && sub.status === "active" && "ring-1 ring-rose-500/30",
        urgency === "soon" && sub.status === "active" && "ring-1 ring-amber-500/20",
        sub.status === "paused" && "opacity-60",
        sub.status === "cancelled" && "opacity-40"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Logo / Initials */}
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-noir-700 flex items-center justify-center">
          {!logoError && sub.url ? (
            <Image
              src={logoSrc}
              alt={sub.name}
              width={40}
              height={40}
              onError={() => setLogoError(true)}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span
              className="text-sm font-semibold"
              style={{ color: sub.category_color ?? "#8b5cf6" }}
            >
              {initials}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-white truncate">{sub.name}</h3>
            {sub.url && (
              <a
                href={sub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-noir-600 hover:text-noir-400 transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {sub.category_name && (
              <>
                <span className="category-dot" style={{ background: sub.category_color ?? "#6b7280" }} />
                <span className="text-xs text-noir-500">{sub.category_name}</span>
              </>
            )}
            {sub.status === "paused" && (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">PAUSADA</span>
            )}
            {sub.status === "cancelled" && (
              <span className="text-[10px] font-semibold text-noir-500 bg-white/5 px-1.5 py-0.5 rounded-md">CANCELADA</span>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="p-1.5 text-noir-600 hover:text-white hover:bg-white/8 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-8 w-40 bg-noir-800 border border-white/8 rounded-xl shadow-2xl z-20 py-1 overflow-hidden"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => { onEdit?.(sub); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-noir-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => { handleToggleUsed(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-noir-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {sub.used_this_month ? (
                    <Circle className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {sub.used_this_month ? "No usada" : "Usada este mes"}
                </button>
                <div className="h-px bg-white/5 my-1" />
                {sub.status !== "paused" && sub.status !== "cancelled" && (
                  <button
                    onClick={() => { handleStatusChange("paused"); setShowMenu(false); }}
                    disabled={statusLoading}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                  >
                    <PauseCircle className="w-3.5 h-3.5" /> Pausar
                  </button>
                )}
                {sub.status !== "active" && (
                  <button
                    onClick={() => { handleStatusChange("active"); setShowMenu(false); }}
                    disabled={statusLoading}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Reactivar
                  </button>
                )}
                {sub.status !== "cancelled" && (
                  <button
                    onClick={() => { handleStatusChange("cancelled"); setShowMenu(false); }}
                    disabled={statusLoading}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-noir-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancelar suscripción
                  </button>
                )}
                <div className="h-px bg-white/5 my-1" />
                <button
                  onClick={() => { handleDelete(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xl font-semibold text-white">
            {formatCurrency(sub.price, sub.currency)}
          </p>
          <p className="text-xs text-noir-500">/{cycleLabel(sub.billing_cycle)}</p>
        </div>

        {/* Next billing */}
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5",
            urgency === "urgent"
              ? "text-rose-300 bg-rose-500/15"
              : urgency === "soon"
              ? "text-amber-300 bg-amber-500/15"
              : "text-noir-500 bg-white/5"
          )}
        >
          <Calendar className="w-3 h-3" />
          {days < 0 ? `Hace ${Math.abs(days)}d` : days === 0 ? "Hoy" : days === 1 ? "Mañana" : `en ${days}d`}
        </div>
      </div>

      {/* Last used row */}
      <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-noir-600 flex-shrink-0" />
          {sub.last_used_at ? (
            <span className={cn(
              "text-xs",
              sub.used_this_month ? "text-emerald-400" : "text-noir-500"
            )}>
              {sub.used_this_month
                ? "Usado recientemente"
                : `Sin usar desde ${formatDate(sub.last_used_at)}`}
            </span>
          ) : (
            <span className="text-xs text-noir-600">Sin registros de uso</span>
          )}
          {sub.used_this_month && (
            <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
                <span className="text-[10px] text-noir-600 uppercase font-medium">Este mes</span>
                <span className="text-xs font-semibold text-white">{sub.usage_count_month} {sub.usage_count_month === 1 ? 'día' : 'días'}</span>
             </div>
             <div className="w-px h-6 bg-white/5" />
             <div className="flex flex-col">
                <span className="text-[10px] text-noir-600 uppercase font-medium">Total</span>
                <span className="text-xs font-semibold text-noir-300">{sub.usage_count} {sub.usage_count === 1 ? 'uso' : 'usos'}</span>
             </div>
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleUsed(); }}
            className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-lg transition-all border flex items-center gap-1.5",
              sub.used_this_month 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20",
              usageLoading && "opacity-50 cursor-wait"
            )}
          >
            {usageLoading ? (
              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : null}
            {sub.used_this_month ? "REGISTRADO" : "REGISTRAR USO"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
