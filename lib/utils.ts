import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays, addWeeks, addMonths, addQuarters, addYears, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { BillingCycle, SubscriptionWithCategory } from "@/types";

export function getNextBillingDate(currentDate: string, cycle: BillingCycle): string {
  const date = parseISO(currentDate);
  let nextDate: Date;

  switch (cycle) {
    case "weekly":
      nextDate = addWeeks(date, 1);
      break;
    case "monthly":
      nextDate = addMonths(date, 1);
      break;
    case "quarterly":
      nextDate = addQuarters(date, 1);
      break;
    case "yearly":
      nextDate = addYears(date, 1);
      break;
    default:
      nextDate = addMonths(date, 1);
  }

  return format(nextDate, "yyyy-MM-dd");
}

export function isBillingDay(date: Date, sub: { next_billing_date: string, billing_cycle: BillingCycle }): boolean {
  const billingDate = parseISO(sub.next_billing_date);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  billingDate.setHours(0, 0, 0, 0);

  // If it's the exact next billing date, yes
  if (isSameDay(billingDate, targetDate)) return true;

  // Otherwise, check if it's a future (or past) recurrence
  // We check if targetDate is a recurrence of billingDate
  const diffDays = differenceInDays(targetDate, billingDate);
  
  if (sub.billing_cycle === "weekly") {
    return diffDays % 7 === 0;
  }
  
  if (sub.billing_cycle === "monthly") {
    // Same day of month (approximate, handling end-of-month is tricky)
    return targetDate.getDate() === billingDate.getDate();
  }
  
  if (sub.billing_cycle === "quarterly") {
    return targetDate.getDate() === billingDate.getDate() && 
           (targetDate.getMonth() - billingDate.getMonth()) % 3 === 0;
  }
  
  if (sub.billing_cycle === "yearly") {
    return targetDate.getDate() === billingDate.getDate() && 
           targetDate.getMonth() === billingDate.getMonth();
  }

  return false;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "EUR"
): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "d MMM yyyy", { locale: es });
}

export function formatMonth(dateStr: string): string {
  return format(new Date(dateStr), "MMM yy", { locale: es });
}

export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(target, today);
}

export function toMonthly(price: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "weekly":
      return price * 4.33;
    case "monthly":
      return price;
    case "quarterly":
      return price / 3;
    case "yearly":
      return price / 12;
    default:
      return price;
  }
}

export function toYearly(price: number, cycle: BillingCycle): number {
  return toMonthly(price, cycle) * 12;
}

export function cycleLabel(cycle: BillingCycle): string {
  const labels: Record<BillingCycle, string> = {
    weekly: "semanal",
    monthly: "mensual",
    quarterly: "trimestral",
    yearly: "anual",
  };
  return labels[cycle];
}

export function getBillingUrgency(
  nextBillingDate: string
): "urgent" | "soon" | "normal" {
  const days = daysUntil(nextBillingDate);
  if (days <= 2) return "urgent";
  if (days <= 7) return "soon";
  return "normal";
}

// Re-export the new graduated warning system for backward compat
export { shouldCancelSuggestion } from "@/lib/usage-warnings";

export function getLogoUrl(name: string, url?: string | null): string {
  if (url) return url;
  const domain = extractDomain(name);
  return `https://logo.clearbit.com/${domain}`;
}

function extractDomain(name: string): string {
  const knownDomains: Record<string, string> = {
    netflix: "netflix.com",
    spotify: "spotify.com",
    "amazon prime": "amazon.com",
    "disney+": "disneyplus.com",
    "hbo max": "hbomax.com",
    "apple tv": "apple.com",
    youtube: "youtube.com",
    "adobe creative": "adobe.com",
    figma: "figma.com",
    github: "github.com",
    notion: "notion.so",
    slack: "slack.com",
    dropbox: "dropbox.com",
    "google one": "google.com",
    icloud: "icloud.com",
    chatgpt: "openai.com",
    "microsoft 365": "microsoft.com",
    duolingo: "duolingo.com",
  };
  const lower = name.toLowerCase();
  for (const [key, domain] of Object.entries(knownDomains)) {
    if (lower.includes(key)) return domain;
  }
  return `${lower.replace(/\s+/g, "")}.com`;
}

export function generateInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
