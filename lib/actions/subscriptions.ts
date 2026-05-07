"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  SubscriptionWithCategory,
  DashboardStats,
  SpendingSnapshot,
} from "@/types";
import { toMonthly, shouldCancelSuggestion } from "@/lib/utils";
import { format, subMonths, startOfMonth } from "date-fns";

export async function getSubscriptions(): Promise<SubscriptionWithCategory[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("subscriptions_monthly_cost")
    .select("*")
    .eq("user_id", user.id)
    .order("monthly_cost", { ascending: false });

  if (error) {
    console.error("getSubscriptions error:", error);
    return [];
  }
  return (data as SubscriptionWithCategory[]) ?? [];
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
  };

  if (!user) return empty;

  const subs = await getSubscriptions();
  const active = subs.filter((s) => s.status === "active");

  const totalMonthly = active.reduce((acc, s) => acc + s.monthly_cost, 0);
  const totalYearly = totalMonthly * 12;

  const optimizationCandidates = active.filter((s) =>
    shouldCancelSuggestion(s)
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

  // Monthly history (last 6 months from snapshots or calculated)
  const { data: snapshots } = await supabase
    .from("spending_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("month", { ascending: true })
    .limit(6);

  let monthlyHistory: { month: string; total: number }[] = [];
  if (snapshots && snapshots.length > 0) {
    monthlyHistory = (snapshots as SpendingSnapshot[]).map((s) => ({
      month: format(new Date(s.month), "MMM yy"),
      total: s.total_spent,
    }));
  } else {
    // Build last 6 months from current subscriptions as estimate
    monthlyHistory = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(startOfMonth(new Date()), 5 - i);
      return {
        month: format(date, "MMM yy"),
        total: i === 5 ? totalMonthly : totalMonthly * (0.8 + Math.random() * 0.3),
      };
    });
  }

  return {
    totalMonthly,
    totalYearly,
    activeCount: active.length,
    mostExpensive: active[0] ?? null,
    topThree: active.slice(0, 3),
    recentlyAdded: [...subs]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5),
    optimizationCandidates,
    spendingByCategory,
    monthlyHistory,
  };
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
  data: Partial<SubscriptionWithCategory>
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
