import { getDashboardStats, getMonthUsageLogs } from "@/lib/actions/subscriptions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const [stats, usageLogs] = await Promise.all([
    getDashboardStats(),
    getMonthUsageLogs(),
  ]);
  return <DashboardClient stats={stats} usageLogs={usageLogs} />;
}
