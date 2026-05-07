/**
 * POST /api/notify
 *
 * Sends an email notification via Resend for an upcoming subscription renewal.
 * Called internally (e.g., a cron job or server action).
 *
 * Body: { userId, subscriptionId }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  // Internal-only: verify shared secret
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${process.env.EXTENSION_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, subscriptionId } = (await req.json()) as {
    userId: string;
    subscriptionId: string;
  };

  const supabase = await createClient();

  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("profiles")
      .select("email, notify_email")
      .eq("id", userId)
      .single(),
  ]);

  if (!sub || !profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!profile.notify_email) {
    return NextResponse.json({ skipped: true, reason: "Email notifications disabled" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const renewalDate = new Date(sub.next_billing_date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cycleLabel: Record<string, string> = {
    monthly: "mes",
    yearly: "año",
    quarterly: "trimestre",
    weekly: "semana",
  };

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1f;border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:28px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;margin-right:12px;">
                  <span style="font-size:18px;">📡</span>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">SubScout</p>
                  <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;">Gestor de suscripciones</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#aeaeb2;font-size:13px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Recordatorio de renovación</p>
            <h1 style="margin:0 0 24px;color:#fff;font-size:24px;font-weight:700;line-height:1.2;">
              ${sub.name} se renueva pronto
            </h1>

            <!-- Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border-radius:12px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin:0 0 4px;color:#636366;font-size:12px;">Servicio</p>
                        <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">${sub.name}</p>
                      </td>
                      <td align="right">
                        <p style="margin:0 0 4px;color:#636366;font-size:12px;">Importe</p>
                        <p style="margin:0;color:#a78bfa;font-size:18px;font-weight:700;">${sub.price} ${sub.currency}<span style="color:#636366;font-size:13px;font-weight:400;">/${cycleLabel[sub.billing_cycle] ?? sub.billing_cycle}</span></p>
                      </td>
                    </tr>
                    <tr><td colspan="2"><div style="height:1px;background:rgba(255,255,255,0.06);margin:16px 0;"></div></td></tr>
                    <tr>
                      <td colspan="2">
                        <p style="margin:0 0 4px;color:#636366;font-size:12px;">Fecha de renovación</p>
                        <p style="margin:0;color:#fff;font-size:15px;font-weight:500;">📅 ${renewalDate}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#636366;font-size:14px;line-height:1.6;">
              Si ya no usas este servicio, considera cancelarlo desde SubScout para optimizar tu gasto mensual.
            </p>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#7c3aed;border-radius:10px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscriptions"
                     style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">
                    Ver mis suscripciones →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:#3a3a3c;font-size:12px;text-align:center;">
              Recibiste este email porque tienes las notificaciones activadas en SubScout.<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color:#636366;">Desactivar notificaciones</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "SubScout <noreply@resend.dev>",
      to: profile.email,
      subject: `🔔 ${sub.name} se renueva el ${renewalDate} — ${sub.price} ${sub.currency}`,
      html,
    });

    if (error) throw new Error(error.message);

    await supabase.from("notifications").insert({
      user_id: userId,
      sub_id: subscriptionId,
      type: "renewal_reminder",
      channel: "email",
      message: `Renovación de ${sub.name} el ${renewalDate}`,
      status: "sent",
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    await supabase.from("notifications").insert({
      user_id: userId,
      sub_id: subscriptionId,
      type: "renewal_reminder",
      channel: "email",
      message: msg,
      status: "failed",
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
