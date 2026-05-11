import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { differenceInDays, isBefore, parseISO } from "date-fns";
import { getNextBillingDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function daysUntilLocal(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(target, today);
}

function buildSubjectLine(name: string, daysLeft: number, price: number, currency: string): string {
  if (daysLeft === 0) return `🔔 ${name} se renueva HOY — ${price} ${currency}`;
  if (daysLeft === 1) return `⏰ ${name} se renueva mañana — ${price} ${currency}`;
  return `📅 ${name} se renueva en ${daysLeft} días — ${price} ${currency}`;
}

function buildEmailHtml(sub: {
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
}, daysLeft: number, appUrl: string): string {
  const cycleLabel: Record<string, string> = {
    monthly: "mes", yearly: "año", quarterly: "trimestre", weekly: "semana",
  };

  const [y, m, d] = sub.next_billing_date.split("-").map(Number);
  const renewalDate = new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  const urgencyColor = daysLeft === 0 ? "#f87171" : daysLeft <= 3 ? "#fb923c" : "#a78bfa";
  const urgencyLabel =
    daysLeft === 0
      ? "¡Hoy se renueva!"
      : daysLeft === 1
      ? "Se renueva mañana"
      : `Se renueva en ${daysLeft} días`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1f;border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:28px 32px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">SubScout</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Recordatorio de renovación</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <div style="display:inline-block;background:${urgencyColor}20;border:1px solid ${urgencyColor}40;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
              <span style="color:${urgencyColor};font-size:13px;font-weight:600;">${urgencyLabel}</span>
            </div>
            <h1 style="margin:0 0 24px;color:#fff;font-size:22px;font-weight:700;line-height:1.3;">
              ${sub.name} se renueva el ${renewalDate}
            </h1>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:12px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin:0 0 4px;color:#636366;font-size:12px;">Servicio</p>
                        <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">${sub.name}</p>
                      </td>
                      <td align="right">
                        <p style="margin:0 0 4px;color:#636366;font-size:12px;">Importe</p>
                        <p style="margin:0;color:#a78bfa;font-size:18px;font-weight:700;">${sub.price} ${sub.currency}<span style="color:#636366;font-size:13px;font-weight:400;">/${cycleLabel[sub.billing_cycle] ?? sub.billing_cycle}</span></p>
                      </td>
                    </tr>
                    <tr><td colspan="2"><div style="height:1px;background:rgba(255,255,255,0.06);margin:14px 0;"></div></td></tr>
                    <tr>
                      <td colspan="2">
                        <p style="margin:0 0 4px;color:#636366;font-size:12px;">Fecha de renovación</p>
                        <p style="margin:0;color:#fff;font-size:14px;font-weight:500;">${renewalDate}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;color:#636366;font-size:14px;line-height:1.6;">
              Si ya no usas este servicio, considera cancelarlo desde SubScout.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#7c3aed;border-radius:10px;">
                  <a href="${appUrl}/subscriptions" style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">
                    Ver mis suscripciones →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:#3a3a3c;font-size:12px;text-align:center;">
              Recibiste este email porque tienes las notificaciones activadas en SubScout.<br>
              <a href="${appUrl}/settings" style="color:#636366;">Desactivar notificaciones</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://subscout.vercel.app";

  // Fetch all subscriptions (active and paused) to advance dates
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*")
    .in("status", ["active", "paused"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subs?.length) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  // Get unique user ids and fetch profiles
  const userIds = [...new Set(subs.map((s) => s.user_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, notify_email, full_name")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check which notifications were already sent today to avoid duplicates
  const todayStr = today.toISOString().split("T")[0];
  const { data: todayLogs } = await supabase
    .from("notifications")
    .select("sub_id")
    .eq("type", "renewal_reminder")
    .eq("status", "sent")
    .gte("created_at", `${todayStr}T00:00:00Z`);

  const alreadySentToday = new Set(todayLogs?.map((n) => n.sub_id) ?? []);

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    const profile = profileMap.get(sub.user_id);

    if (!profile?.notify_email || !profile?.email) { skipped++; continue; }
    if (alreadySentToday.has(sub.id)) { skipped++; continue; }

    const daysLeft = daysUntilLocal(sub.next_billing_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Advance date if it has passed
    if (daysLeft < 0) {
      let nextDate = sub.next_billing_date;
      // Advance until it's today or in the future
      while (isBefore(parseISO(nextDate), today)) {
        nextDate = getNextBillingDate(nextDate, sub.billing_cycle);
      }
      
      await supabase
        .from("subscriptions")
        .update({ 
          next_billing_date: nextDate,
          used_this_month: false // Reset usage for the new cycle
        })
        .eq("id", sub.id);
      
      // Update sub object for the rest of the loop
      sub.next_billing_date = nextDate;
      sub.used_this_month = false;
      skipped++;
      continue;
    }

    // 2. Only notify if active
    if (sub.status !== "active") { skipped++; continue; }

    // 3. Only notify if within the window [0, notify_days_before]
    if (daysLeft > sub.notify_days_before) { skipped++; continue; }

    const subject = buildSubjectLine(sub.name, daysLeft, sub.price, sub.currency);
    const html = buildEmailHtml(sub, daysLeft, appUrl);

    try {
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "SubScout <onboarding@resend.dev>",
        to: profile.email,
        subject,
        html,
      });

      await supabase.from("notifications").insert({
        user_id: sub.user_id,
        sub_id: sub.id,
        type: "renewal_reminder",
        channel: "email",
        message: sendError ? sendError.message : `Aviso de ${sub.name} — ${daysLeft}d`,
        status: sendError ? "failed" : "sent",
      });

      if (!sendError) sent++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, total: subs.length });
}
