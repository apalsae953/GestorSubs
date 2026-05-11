"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { cn, isBillingDay } from "@/lib/utils";
import { daysUntil } from "@/lib/utils";
import type { UsageLog, SubscriptionWithCategory } from "@/types";

interface ActivityCalendarProps {
  usageLogs: UsageLog[];
  subscriptions: SubscriptionWithCategory[];
}

const DAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"];

export default function ActivityCalendar({ usageLogs, subscriptions }: ActivityCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to Monday-start grid
  const leadingPad = (getDay(monthStart) + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array(leadingPad).fill(null),
    ...days,
  ];

  function usagesOnDay(date: Date) {
    return usageLogs.filter((log) => isSameDay(new Date(log.used_at), date));
  }

  function billingsOnDay(date: Date) {
    return subscriptions.filter(
      (s) => s.status === "active" && isBillingDay(date, s)
    );
  }

  const upcomingBillings = subscriptions
    .filter((s) => s.status === "active")
    .sort(
      (a, b) =>
        parseISO(a.next_billing_date).getTime() - parseISO(b.next_billing_date).getTime()
    )
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Calendar card */}
      <div className="glass-card p-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white capitalize">
            {format(viewDate, "MMMM yyyy", { locale: es })}
          </h3>
          <div className="flex gap-0.5">
            <button
              onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="p-1.5 text-noir-500 hover:text-white hover:bg-white/8 rounded-lg transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="p-1.5 text-noir-500 hover:text-white hover:bg-white/8 rounded-lg transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] text-noir-600 font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const usages = usagesOnDay(date);
            const billings = billingsOnDay(date);
            const today = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "relative flex flex-col items-center py-1 rounded-lg",
                  today && "bg-violet-600/20"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium leading-none",
                    today ? "text-violet-300" : "text-noir-400"
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="flex gap-0.5 mt-1 h-1.5">
                  {usages.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {billings.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-noir-500">Uso registrado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-noir-500">Cobro</span>
          </div>
        </div>
      </div>

      {/* Upcoming billings */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-3.5 h-3.5 text-noir-500" />
          <h3 className="text-xs font-semibold text-noir-400 uppercase tracking-wide">
            Próximos cobros
          </h3>
        </div>
        {upcomingBillings.length === 0 ? (
          <p className="text-xs text-noir-600">Sin cobros próximos</p>
        ) : (
          <div className="space-y-2.5">
            {upcomingBillings.map((s) => {
              const d = daysUntil(s.next_billing_date);
              return (
                <div key={s.id} className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: s.category_color ?? "#8b5cf6" }}
                  />
                  <span className="text-xs text-white flex-1 truncate">{s.name}</span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold tabular-nums",
                      d <= 0 ? "text-rose-400" : d <= 3 ? "text-rose-400" : d <= 7 ? "text-amber-400" : "text-noir-500"
                    )}
                  >
                    {d < 0 ? `Hace ${Math.abs(d)}d` : d === 0 ? "Hoy" : d === 1 ? "Mañana" : `en ${d}d`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
