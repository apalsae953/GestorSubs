import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*, subscriptions(name)")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-1">Notificaciones</h1>
      <p className="text-sm text-noir-500 mb-8">
        Historial de alertas enviadas
      </p>

      {!notifications || notifications.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-8 h-8 text-noir-700 mb-3" />
          <p className="text-sm text-noir-600">Sin notificaciones aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="glass-card px-4 py-3 flex items-start gap-3"
            >
              {n.status === "sent" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  {(n as { subscriptions?: { name?: string } }).subscriptions?.name ?? "Suscripción eliminada"}
                </p>
                <p className="text-xs text-noir-500 mt-0.5">{n.type.replace("_", " ")}</p>
              </div>
              <span className="text-xs text-noir-600 flex-shrink-0">
                {formatDate(n.sent_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
