import { differenceInDays } from "date-fns";
import type { SubscriptionWithCategory, BillingCycle } from "@/types";

export type UsageWarningLevel = "none" | "info" | "warning" | "danger" | "critical";

export interface UsageWarning {
  level: UsageWarningLevel;
  label: string;
  description: string;
  daysSinceUse: number;
  daysInCycle: number;
  usageRatio: number; // 0-1, how much of the cycle passed unused
}

/**
 * Returns the number of days in a billing cycle.
 */
function cycleDays(cycle: BillingCycle): number {
  switch (cycle) {
    case "weekly":
      return 7;
    case "monthly":
      return 30;
    case "quarterly":
      return 90;
    case "yearly":
      return 365;
    default:
      return 30;
  }
}

/**
 * Calculates a graduated usage warning for a subscription.
 *
 * Logic:
 * - Subscriptions created less than 3 days ago → no warning ever (grace period).
 * - No usage ever + more than 7 days since creation → escalate based on time.
 * - Has last_used_at → escalate based on days since last use vs cycle length.
 *
 * Levels:
 * - none:     Used recently or within grace period.
 * - info:     ~25% of cycle without use (e.g. 7 days for monthly).
 * - warning:  ~50% of cycle without use (e.g. 14 days for monthly).
 * - danger:   ~75% of cycle without use (e.g. 21 days for monthly).
 * - critical: Approaching or past the full cycle without use.
 */
export function getUsageWarning(sub: SubscriptionWithCategory): UsageWarning {
  const none: UsageWarning = {
    level: "none",
    label: "",
    description: "",
    daysSinceUse: 0,
    daysInCycle: cycleDays(sub.billing_cycle),
    usageRatio: 0,
  };

  // If used this month, no warning
  if (sub.used_this_month) return none;

  const totalCycleDays = cycleDays(sub.billing_cycle);
  const createdDaysAgo = differenceInDays(new Date(), new Date(sub.created_at));

  // Grace period: less than 3 days since creation → never warn
  if (createdDaysAgo < 3) return none;

  let daysSinceUse: number;

  if (sub.last_used_at) {
    daysSinceUse = differenceInDays(new Date(), new Date(sub.last_used_at));
  } else {
    // Never used → count from creation date
    daysSinceUse = createdDaysAgo;
  }

  // If used within the last 3 days, no warning
  if (daysSinceUse < 3) return none;

  const ratio = Math.min(daysSinceUse / totalCycleDays, 1);

  let level: UsageWarningLevel;
  let label: string;
  let description: string;

  if (ratio >= 0.9) {
    // Critical: almost a full cycle (or more) without use
    level = "critical";
    label = "Sin usar";
    description =
      daysSinceUse >= totalCycleDays
        ? `Llevas un ciclo completo (${daysSinceUse} dias) sin usar este servicio`
        : `${daysSinceUse} dias sin usar, el cobro se acerca`;
  } else if (ratio >= 0.65) {
    // Danger: 65-90% of cycle
    level = "danger";
    label = "Poco uso";
    description = `${daysSinceUse} dias sin usar de ${totalCycleDays} del ciclo`;
  } else if (ratio >= 0.4) {
    // Warning: 40-65% of cycle
    level = "warning";
    label = "Revisa";
    description = `${daysSinceUse} dias sin usar`;
  } else if (ratio >= 0.2) {
    // Info: 20-40% of cycle
    level = "info";
    label = "Sin uso reciente";
    description = `${daysSinceUse} dias sin usar`;
  } else {
    return none;
  }

  return {
    level,
    label,
    description,
    daysSinceUse,
    daysInCycle: totalCycleDays,
    usageRatio: ratio,
  };
}

/**
 * Updated optimization check: only flag subscriptions with "danger" or "critical" warnings.
 * Replaces the old shouldCancelSuggestion logic.
 */
export function shouldCancelSuggestion(
  sub: SubscriptionWithCategory,
  minMonthlyPrice: number = 3
): boolean {
  if (sub.monthly_cost < minMonthlyPrice) return false;

  const warning = getUsageWarning(sub);
  return warning.level === "danger" || warning.level === "critical";
}
