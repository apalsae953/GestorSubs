import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import type { BillingCycle, SubscriptionWithCategory } from "@/types";

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
  return differenceInDays(new Date(dateStr), new Date());
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

// Optimization algorithm: flag if not used in 30 days and price >= threshold
export function shouldCancelSuggestion(
  sub: SubscriptionWithCategory,
  minMonthlyPrice: number = 5
): boolean {
  if (sub.used_this_month) return false;
  if (sub.monthly_cost < minMonthlyPrice) return false;

  if (!sub.last_used_at) return true;

  const daysSinceUse = differenceInDays(
    new Date(),
    new Date(sub.last_used_at)
  );
  return daysSinceUse >= 30;
}

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
