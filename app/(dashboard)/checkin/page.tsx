import { getSubscriptions } from "@/lib/actions/subscriptions";
import CheckinClient from "./CheckinClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";

export default async function CheckinPage() {
  const supabase = await createClient();
  const todayDate = format(new Date(), "yyyy-MM-dd");

  const [subscriptions, { data: todayLogs }] = await Promise.all([
    getSubscriptions(),
    supabase
      .from("usage_logs")
      .select("sub_id")
      .gte("used_at", `${todayDate}T00:00:00Z`),
  ]);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  const todayUsedIds = (todayLogs ?? []).map((l) => l.sub_id);

  return (
    <CheckinClient
      subscriptions={subscriptions}
      today={today}
      todayUsedIds={todayUsedIds}
    />
  );
}
