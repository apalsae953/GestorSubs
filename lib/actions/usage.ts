"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

export async function logUsageManual(subId: string): Promise<{ ok: boolean; alreadyLogged?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const today = format(new Date(), "yyyy-MM-dd");

  // Check if already logged today
  const { data: existing } = await supabase
    .from("usage_logs")
    .select("id")
    .eq("sub_id", subId)
    .gte("used_at", `${today}T00:00:00Z`)
    .limit(1)
    .single();

  if (!existing) {
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      sub_id: subId,
      source: "manual",
    });
  }

  await supabase
    .from("subscriptions")
    .update({ last_used_at: today, used_this_month: true })
    .eq("id", subId)
    .eq("user_id", user.id);

  revalidatePath("/checkin");
  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
  return { ok: true, alreadyLogged: !!existing };
}

export async function unlogUsageManual(subId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = format(new Date(), "yyyy-MM-dd");
  await supabase
    .from("usage_logs")
    .delete()
    .eq("sub_id", subId)
    .gte("used_at", `${today}T00:00:00Z`);

  await supabase
    .from("subscriptions")
    .update({ used_this_month: false })
    .eq("id", subId)
    .eq("user_id", user.id);

  revalidatePath("/checkin");
  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
}
