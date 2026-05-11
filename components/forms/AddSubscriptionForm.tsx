"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus, Zap, Search, Check } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "sonner";
import { createSubscription, updateSubscription } from "@/lib/actions/subscriptions";
import { getCategories } from "@/lib/actions/subscriptions";
import {
  subscriptionSchema,
  type SubscriptionFormValues,
} from "@/lib/validations/subscription";
import { POPULAR_SERVICES, SERVICE_CATEGORIES } from "@/lib/popular-services";
import type { Category } from "@/types";
import { cn, getNextBillingDate } from "@/lib/utils";
import { addDays, format, isBefore, parseISO } from "date-fns";

interface AddSubscriptionFormProps {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  initialValues?: Partial<SubscriptionFormValues>;
}

const BILLING_OPTIONS = [
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "weekly", label: "Semanal" },
] as const;

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "€ EUR" },
  { value: "USD", label: "$ USD" },
  { value: "GBP", label: "£ GBP" },
] as const;

export default function AddSubscriptionForm({
  open,
  onClose,
  editId,
  initialValues,
}: AddSubscriptionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"popular" | "manual">("popular");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [savingPopular, setSavingPopular] = useState<string | null>(null);

  const defaultNextBilling = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      billing_cycle: "monthly",
      currency: "EUR",
      notify_days_before: 3,
      used_this_month: false,
      next_billing_date: defaultNextBilling,
      ...initialValues,
    },
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (initialValues) {
      let nextDate = initialValues.next_billing_date;
      
      // If editing and the date is in the past, project the next one
      if (nextDate && initialValues.billing_cycle) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        while (isBefore(parseISO(nextDate), today)) {
          nextDate = getNextBillingDate(nextDate, initialValues.billing_cycle);
        }
      }

      reset({
        ...initialValues,
        next_billing_date: nextDate,
      });
      setTab("manual");
    }
  }, [initialValues]);

  // Reset form and tabs when opening for a new subscription
  useEffect(() => {
    if (open && !initialValues) {
      setTab("popular");
      setSearch("");
      setActiveCategory("Todos");
      reset({
        name: "",
        url: "",
        price: undefined as unknown as number,
        currency: "EUR",
        billing_cycle: "monthly",
        next_billing_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        category_id: "",
        used_this_month: false,
        notify_days_before: 3,
        description: "",
        logo_url: "",
      });
    }
  }, [open]);

  const isEditing = !!editId;

  async function onSubmit(data: SubscriptionFormValues) {
    setLoading(true);
    try {
      if (isEditing) {
        // Update existing subscription
        await updateSubscription(editId!, {
          name: data.name,
          description: data.description || null,
          url: data.url || null,
          price: data.price,
          currency: data.currency,
          billing_cycle: data.billing_cycle,
          next_billing_date: data.next_billing_date,
          category_id: data.category_id || null,
          used_this_month: data.used_this_month,
          notify_days_before: data.notify_days_before,
        });
        toast.success(`${data.name} actualizada correctamente`);
      } else {
        // Create new subscription
        await createSubscription({
          name: data.name,
          description: data.description || null,
          url: data.url || null,
          logo_url: data.logo_url || null,
          price: data.price,
          currency: data.currency,
          billing_cycle: data.billing_cycle,
          next_billing_date: data.next_billing_date,
          start_date: format(new Date(), "yyyy-MM-dd"),
          category_id: data.category_id || null,
          status: "active",
          last_used_at: null,
          used_this_month: data.used_this_month,
          notify_days_before: data.notify_days_before,
          source: "manual",
        });
        toast.success(`${data.name} añadida correctamente`);
      }
      reset();
      onClose();
    } catch {
      toast.error("Error al guardar la suscripción");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPopular(svcName: string) {
    const svc = POPULAR_SERVICES.find((s) => s.name === svcName);
    if (!svc) return;
    setSavingPopular(svcName);
    try {
      await createSubscription({
        name: svc.name,
        description: svc.description,
        url: svc.url,
        logo_url: null,
        price: svc.price,
        currency: svc.currency,
        billing_cycle: svc.billing_cycle,
        next_billing_date: defaultNextBilling,
        start_date: format(new Date(), "yyyy-MM-dd"),
        category_id: null,
        status: "active",
        last_used_at: null,
        used_this_month: false,
        notify_days_before: 3,
        source: "manual",
      });
      toast.success(`${svc.name} añadida`);
      onClose();
    } catch {
      toast.error(`Error añadiendo ${svc.name}`);
    } finally {
      setSavingPopular(null);
    }
  }

  function fillFromPopular(svcName: string) {
    const svc = POPULAR_SERVICES.find((s) => s.name === svcName);
    if (!svc) return;
    setValue("name", svc.name);
    setValue("url", svc.url);
    setValue("price", svc.price);
    setValue("currency", svc.currency);
    setValue("billing_cycle", svc.billing_cycle);
    setTab("manual");
    toast(`Datos de ${svc.name} cargados — puedes editarlos`);
  }

  const filtered = POPULAR_SERVICES.filter((s) => {
    const matchCat = activeCategory === "Todos" || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-[100dvh] w-full max-w-md bg-noir-900 border-l border-white/5 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {isEditing ? "Editar suscripción" : "Nueva suscripción"}
                </h2>
                <p className="text-xs text-noir-500 mt-0.5">
                  {isEditing ? "Modifica los datos" : "Añade un servicio nuevo"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-noir-500 hover:text-white hover:bg-white/8 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs — only shown when creating */}
            {!isEditing && (
              <div className="flex gap-1 px-6 pt-4 pb-0">
                <button
                  onClick={() => setTab("popular")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
                    tab === "popular"
                      ? "bg-violet-600/15 text-violet-300 border border-violet-500/30"
                      : "text-noir-400 hover:text-white"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Populares
                </button>
                <button
                  onClick={() => setTab("manual")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
                    tab === "manual"
                      ? "bg-violet-600/15 text-violet-300 border border-violet-500/30"
                      : "text-noir-400 hover:text-white"
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Manual
                </button>
              </div>
            )}

            {/* Popular tab */}
            {tab === "popular" && !isEditing && (
              <div className="flex-1 flex flex-col overflow-hidden pt-4">
                {/* Search */}
                <div className="px-6 pb-3">
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
                <div className="px-6 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {SERVICE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                        activeCategory === cat
                          ? "bg-violet-600 text-white"
                          : "bg-noir-800 text-noir-400 hover:text-white border border-white/6"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {filtered.map((svc) => {
                      const isSaving = savingPopular === svc.name;
                      return (
                        <div
                          key={svc.name}
                          className="flex items-center gap-3 p-3 rounded-xl border border-white/6
                                     bg-noir-800/60 hover:border-white/15 transition-all group"
                        >
                          <FontAwesomeIcon icon={svc.icon} className="w-5 h-5 text-violet-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{svc.name}</p>
                            <p className="text-xs text-noir-500">
                              {svc.price} {svc.currency}/{svc.billing_cycle === "monthly" ? "mes" : "año"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddPopular(svc.name)}
                            disabled={!!savingPopular}
                            title="Añadir directamente"
                            className="p-1.5 rounded-lg bg-violet-600/10 hover:bg-violet-600/30
                                       text-violet-400 hover:text-violet-300 transition-all flex-shrink-0
                                       disabled:opacity-40"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer hint */}
                <div className="px-6 py-4 border-t border-white/5">
                  <p className="text-xs text-noir-600 text-center">
                    Toca{" "}
                    <span className="inline-flex items-center gap-0.5 text-violet-500">
                      <Plus className="w-3 h-3" />
                    </span>{" "}
                    para añadir directamente, o{" "}
                    <button
                      onClick={() => setTab("manual")}
                      className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                    >
                      rellena manualmente
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Manual tab / edit form */}
            {(tab === "manual" || isEditing) && (
              <>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
                >
                  <Field label="Nombre *" error={errors.name?.message}>
                    <input
                      {...register("name")}
                      placeholder="ej: Netflix, Spotify…"
                      className={inputCls(!!errors.name)}
                    />
                  </Field>

                  <Field label="Sitio web" error={errors.url?.message}>
                    <input
                      {...register("url")}
                      placeholder="https://netflix.com"
                      className={inputCls(!!errors.url)}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Precio *" error={errors.price?.message}>
                      <input
                        {...register("price", { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="9.99"
                        className={inputCls(!!errors.price)}
                      />
                    </Field>
                    <Field label="Moneda">
                      <select {...register("currency")} className={inputCls(false)}>
                        {CURRENCY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Ciclo de facturación">
                    <div className="grid grid-cols-2 gap-2">
                      {BILLING_OPTIONS.map((opt) => {
                        const current = watch("billing_cycle");
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setValue("billing_cycle", opt.value)}
                            className={cn(
                              "py-2 px-3 rounded-xl text-sm font-medium border transition-all",
                              current === opt.value
                                ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                                : "bg-noir-800 border-white/8 text-noir-400 hover:border-white/15 hover:text-white"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field
                    label="Próximo cobro *"
                    error={errors.next_billing_date?.message}
                  >
                    <input
                      {...register("next_billing_date")}
                      type="date"
                      className={cn(inputCls(!!errors.next_billing_date), "dark:[color-scheme:dark]")}
                    />
                  </Field>

                  <Field label="Categoría">
                    <select {...register("category_id")} className={inputCls(false)}>
                      <option value="">Sin categoría</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="flex items-center justify-between py-3 px-4 bg-noir-800 rounded-xl border border-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">Usada este mes</p>
                      <p className="text-xs text-noir-500 mt-0.5">
                        Ayuda al algoritmo de optimización
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register("used_this_month")}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-noir-700 peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>

                  <Field label={`Notificar ${watch("notify_days_before")} días antes`}>
                    <input
                      {...register("notify_days_before", { valueAsNumber: true })}
                      type="range"
                      min="0"
                      max="14"
                      className="w-full accent-violet-500"
                    />
                  </Field>

                  <Field label="Notas (opcional)" error={errors.description?.message}>
                    <textarea
                      {...register("description")}
                      rows={2}
                      placeholder="Ej: Plan familiar, compartido con…"
                      className={cn(inputCls(!!errors.description), "resize-none")}
                    />
                  </Field>
                </form>

                <div className="px-6 pt-5 pb-5 border-t border-white/5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
                  <button
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={loading}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl
                               flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {loading
                      ? "Guardando…"
                      : isEditing
                      ? "Guardar cambios"
                      : "Guardar suscripción"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-noir-300 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full px-3.5 py-2.5 bg-noir-800 border rounded-xl text-sm text-foreground placeholder:text-noir-600",
    "focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all duration-200",
    hasError ? "border-rose-500/50" : "border-white/8 focus:border-violet-500/40"
  );
}
