/**
 * POST /api/add-sub
 *
 * Protected endpoint for the Chrome Extension.
 * Auth: Bearer token in Authorization header  (EXTENSION_API_SECRET env var)
 *       OR a valid Supabase session cookie (for logged-in browser users).
 *
 * Body: { name, price?, url?, billing_cycle?, currency? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addSubApiSchema } from "@/lib/validations/subscription";
import { addDays, format } from "date-fns";

export async function POST(req: NextRequest) {
  // ── 1. Auth: API secret key (extension) ──────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const isApiKeyAuth =
    authHeader.startsWith("Bearer ") &&
    authHeader.slice(7) === process.env.EXTENSION_API_SECRET;

  // ── 2. Auth: Supabase session (browser) ───────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isApiKeyAuth && !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // When using API key, we need a user_id to associate the subscription.
  // The extension must send an `x-user-id` header in this case.
  const userId =
    user?.id ?? req.headers.get("x-user-id") ?? null;

  if (!userId) {
    return NextResponse.json(
      { error: "Missing x-user-id header" },
      { status: 400 }
    );
  }

  // ── 3. Validate body ───────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addSubApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { name, price, url, billing_cycle, currency } = parsed.data;

  // ── 4. Insert ──────────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      name,
      price: price ?? 0,
      url: url ?? null,
      billing_cycle: billing_cycle ?? "monthly",
      currency: currency ?? "EUR",
      next_billing_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      start_date: format(new Date(), "yyyy-MM-dd"),
      status: "active",
      source: "extension",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, subscription: data }, { status: 201 });
}

// ── CORS preflight for Chrome Extension ─────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
    },
  });
}
