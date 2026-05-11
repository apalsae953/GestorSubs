"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  SubscriptionWithCategory,
  DashboardStats,
  SpendingSnapshot,
} from "@/types";
import { toMonthly } from "@/lib/utils";
import { getUsageWarning } from "@/lib/usage-warnings";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import type { UsageLog } from "@/types";

export async function getSubscriptions(): Promise<SubscriptionWithCategory[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Query base table to include all statuses (active, paused, cancelled)
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      category:categories(name, color, icon)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getSubscriptions error:", error);
    return [];
  }

  // Fetch usage counts for each sub (only current month for efficiency)
  const { data: usageLogs } = await supabase
    .from("usage_logs")
    .select("sub_id, used_at")
    .eq("user_id", user.id)
    .gte("used_at", startOfMonthDate.toISOString());

  const now = new Date();
  const startOfMonthDate = startOfMonth(now);

  const usageStats = (usageLogs ?? []).reduce((acc, log) => {
    const id = log.sub_id;
    const date = log.used_at.split('T')[0];
    if (!acc[id]) acc[id] = new Set<string>();
    acc[id].add(date);
    return acc;
  }, {} as Record<string, Set<string>>);

  return (subs as any[]).map(s => {
    // Manual calculation of monthly cost (previously done in view)
    let monthly_cost = s.price;
    if (s.billing_cycle === 'weekly') monthly_cost = s.price * 4.33;
    if (s.billing_cycle === 'quarterly') monthly_cost = s.price / 3;
    if (s.billing_cycle === 'yearly') monthly_cost = s.price / 12;

    const daysUsed = usageStats[s.id]?.size ?? 0;

    return {
      ...s,
      monthly_cost: Math.round(monthly_cost * 100) / 100,
      category_name: s.category?.name ?? "Otro",
      category_color: s.category?.color ?? "#6b7280",
      category_icon: s.category?.icon ?? "MoreHorizontal",
      usage_count: daysUsed, // Count unique days in current month
      usage_count_month: daysUsed,
    };
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: DashboardStats = {
    totalMonthly: 0,
    totalYearly: 0,
    activeCount: 0,
    mostExpensive: null,
    topThree: [],
    recentlyAdded: [],
    optimizationCandidates: [],
    spendingByCategory: [],
    monthlyHistory: [],
    usedTodayCount: 0,
    allSubscriptions: [],
  };

  if (!user) return empty;

  const subs = await getSubscriptions();
  const active = subs.filter((s) => s.status === "active");

  const totalMonthly = active.reduce((acc, s) => acc + s.monthly_cost, 0);
  const totalYearly = totalMonthly * 12;

  const optimizationCandidates = active.filter((s) =>
    getUsageWarning(s).level !== "none"
  );

  // Spending by category
  const categoryMap = new Map<
    string,
    { value: number; color: string }
  >();
  for (const s of active) {
    const key = s.category_name ?? "Otro";
    const color = s.category_color ?? "#6b7280";
    const existing = categoryMap.get(key);
    if (existing) {
      existing.value += s.monthly_cost;
    } else {
      categoryMap.set(key, { value: s.monthly_cost, color });
    }
  }
  const spendingByCategory = Array.from(categoryMap.entries()).map(
    ([name, { value, color }]) => ({ name, value, color })
  );

  // Monthly history (last 6 months)
  const monthlyHistory = Array.from({ length: 6 }, (_, i) => {
    const monthStart = subMonths(startOfMonth(new Date()), 5 - i);
    const monthEnd = endOfMonth(monthStart);
    const monthTotal = active
      .filter(s => new Date(s.created_at) <= monthEnd)
      .reduce((acc, s) => acc + s.monthly_cost, 0);
    return {
      month: format(monthStart, "MMM yy"),
      total: Math.round(monthTotal * 100) / 100,
    };
  });

  const usedTodayCount = active.filter(s => s.used_this_month).length;

  return {
    totalMonthly,
    totalYearly,
    activeCount: active.length,
    mostExpensive: [...active].sort((a, b) => b.monthly_cost - a.monthly_cost)[0] ?? null,
    topThree: [...active]
      .sort((a, b) => b.monthly_cost - a.monthly_cost)
      .slice(0, 3),
    recentlyAdded: [...subs]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5),
    optimizationCandidates,
    spendingByCategory,
    monthlyHistory,
    usedTodayCount,
    allSubscriptions: subs,
  };
}

export async function getMonthUsageLogs(): Promise<UsageLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const from = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const { data } = await supabase
    .from("usage_logs")
    .select("sub_id, used_at")
    .eq("user_id", user.id)
    .gte("used_at", `${from}T00:00:00Z`);

  return (data ?? []) as UsageLog[];
}

export async function updateSubscriptionStatus(
  id: string,
  status: "active" | "paused" | "cancelled"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("subscriptions")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
}

export async function createSubscription(
  data: Omit<
    SubscriptionWithCategory,
    | "id"
    | "user_id"
    | "created_at"
    | "updated_at"
    | "monthly_cost"
    | "category_name"
    | "category_color"
    | "category_icon"
    | "usage_count"
    | "usage_count_month"
  >
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("subscriptions").insert({
    ...data,
    user_id: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function updateSubscription(
  id: string,
  data: Partial<
    Omit<
      SubscriptionWithCategory,
      | "id"
      | "user_id"
      | "created_at"
      | "updated_at"
      | "monthly_cost"
      | "category_name"
      | "category_color"
      | "category_icon"
      | "usage_count"
      | "usage_count_month"
    >
  >
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("subscriptions")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function toggleUsedThisMonth(id: string, value: boolean) {
  return updateSubscription(id, { used_this_month: value });
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return data ?? [];
}
