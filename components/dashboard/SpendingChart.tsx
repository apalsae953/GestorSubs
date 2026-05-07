"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

// ─── Area Chart (gasto mensual) ────────────────────────────────────────────────
interface SpendingAreaChartProps {
  data: DashboardStats["monthlyHistory"];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-noir-800 border border-white/8 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-noir-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function SpendingAreaChart({ data }: SpendingAreaChartProps) {
  const currentTotal = data[data.length - 1]?.total ?? 0;
  const average = data.length > 0 
    ? data.reduce((acc, d) => acc + d.total, 0) / data.length 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-noir-400">
          Gasto mensual
        </h3>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-noir-800 border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          <span className="text-[10px] text-noir-400 font-medium">Media: {formatCurrency(average)}</span>
        </div>
      </div>
      <p className="text-2xl font-semibold text-white mb-6">
        {formatCurrency(currentTotal)}
        <span className="text-sm text-noir-500 font-normal ml-1.5">/ mes</span>
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fill: "#636366", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#636366", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}€`}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#violetGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#1c1c1e", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ─── Donut Chart (gasto por categoría) ─────────────────────────────────────────
interface CategoryDonutChartProps {
  data: DashboardStats["spendingByCategory"];
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-medium text-noir-400 mb-1">
        Por categoría
      </h3>
      <p className="text-2xl font-semibold text-white mb-4">
        {data.length} <span className="text-sm text-noir-500 font-normal">categorías</span>
      </p>

      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <PieChart width={100} height={100}>
            <Pie
              data={data.length > 0 ? data : [{ name: "Vacío", value: 1, color: "#3a3a3c" }]}
              cx={46}
              cy={46}
              innerRadius={30}
              outerRadius={46}
              dataKey="value"
              strokeWidth={0}
            >
              {(data.length > 0 ? data : [{ color: "#3a3a3c" }]).map(
                (entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                )
              )}
            </Pie>
          </PieChart>
          {data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-noir-600">–</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {data.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="category-dot"
                style={{ background: item.color }}
              />
              <span className="text-xs text-noir-400 flex-1 truncate">
                {item.name}
              </span>
              <span className="text-xs font-medium text-white">
                {total > 0
                  ? `${Math.round((item.value / total) * 100)}%`
                  : "–"}
              </span>
            </div>
          ))}
          {data.length > 4 && (
            <p className="text-xs text-noir-600">+{data.length - 4} más</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
