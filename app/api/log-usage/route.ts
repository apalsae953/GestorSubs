/**
 * POST /api/log-usage
 *
 * Called by the Chrome Extension when the user visits a subscription domain.
 * Marks the matching subscription as used today.
 *
 * Auth: Authorization: Bearer <supabase_access_token>
 * Body: { url: string }   e.g. { url: "https://www.netflix.com/browse" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function extractDomain(url: string): string {
  try {
    return url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function POST(req: NextRequest) {
  // Auth via Supabase JWT
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return undefined; },
        set(name: string, value: string, options: any) {},
        remove(name: string, options: any) {}
      },
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const body = await req.json().catch(() => ({}));
  const { url } = body as { url?: string };
  if (!url) {
    return withCors(NextResponse.json({ error: "Missing url" }, { status: 400 }));
  }

  const visitedDomain = extractDomain(url);

  // Find matching subscription by comparing domains
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, name, url, used_this_month, last_used_at")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!subscriptions?.length) {
    return withCors(NextResponse.json({ matched: false, reason: "No active subscriptions" }));
  }

  // Match visited domain against subscription URLs
  const matched = subscriptions.find((sub) => {
    if (!sub.url) return false;
    const subDomain = extractDomain(sub.url);
    return visitedDomain === subDomain || visitedDomain.endsWith(`.${subDomain}`);
  });

  if (!matched) {
    return withCors(NextResponse.json({ matched: false, domain: visitedDomain }));
  }

  const today = new Date().toISOString().split("T")[0];

  // Avoid duplicate logs for the same day
  const { data: existing } = await supabase
    .from("usage_logs")
    .select("id")
    .eq("sub_id", matched.id)
    .gte("used_at", `${today}T00:00:00Z`)
    .limit(1)
    .single();

  if (!existing) {
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      sub_id: matched.id,
      source: "extension",
    });
  }

  // Update subscription usage fields
  await supabase
    .from("subscriptions")
    .update({
      last_used_at: today,
      used_this_month: true,
    })
    .eq("id", matched.id);

  return withCors(NextResponse.json({
    matched: true,
    subscription: matched.name,
    alreadyLoggedToday: !!existing,
  }));
}

// CORS for Chrome Extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
