export type BillingCycle = "monthly" | "yearly" | "weekly" | "quarterly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  price: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  start_date: string;
  category_id: string | null;
  status: SubscriptionStatus;
  last_used_at: string | null;
  used_this_month: boolean;
  notify_days_before: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithCategory extends Subscription {
  monthly_cost: number;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  usage_count: number;
  usage_count_month: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  notify_email: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpendingSnapshot {
  id: string;
  user_id: string;
  month: string;
  total_spent: number;
  created_at: string;
}

export interface DashboardStats {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  mostExpensive: SubscriptionWithCategory | null;
  topThree: SubscriptionWithCategory[];
  recentlyAdded: SubscriptionWithCategory[];
  optimizationCandidates: SubscriptionWithCategory[];
  spendingByCategory: { name: string; value: number; color: string }[];
  monthlyHistory: { month: string; total: number }[];
}
