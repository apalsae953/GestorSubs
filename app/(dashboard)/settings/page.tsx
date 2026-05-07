"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Bell, User, Code } from "lucide-react";
import type { Profile } from "@/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
            setFullName(data.full_name ?? "");
            setNotifyEmail(data.notify_email ?? false);
          }
        });
    });
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, notify_email: notifyEmail })
      .eq("id", profile.id);
    if (error) toast.error("Error al guardar");
    else toast.success("Ajustes guardados");
    setSaving(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl"
    >
      <h1 className="text-2xl font-semibold text-white mb-1">Ajustes</h1>
      <p className="text-sm text-noir-500 mb-8">
        Gestiona tu perfil y notificaciones
      </p>

      <div className="space-y-4">
        {/* Profile */}
        <Section icon={<User className="w-4 h-4" />} title="Perfil">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-noir-400 uppercase tracking-wide block mb-1.5">
                Nombre
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-3.5 py-2.5 bg-noir-900 border border-white/8 rounded-xl text-sm
                           text-foreground placeholder:text-noir-600
                           focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-noir-400 uppercase tracking-wide">
                Email
              </label>
              <p className="mt-1 text-sm text-noir-400 bg-noir-900 border border-white/5 rounded-xl px-3.5 py-2.5">
                {profile?.email ?? "…"}
              </p>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={<Bell className="w-4 h-4" />} title="Notificaciones">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-violet-400" />
                Recordatorios por email
              </p>
              <p className="text-xs text-noir-500 mt-0.5">
                Recibe un email días antes de cada renovación
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-noir-700 rounded-full peer peer-checked:bg-violet-600
                              peer-checked:after:translate-x-5 after:content-[''] after:absolute
                              after:top-0.5 after:left-0.5 after:bg-white after:rounded-full
                              after:h-4 after:w-4 after:transition-all" />
            </label>
          </div>
          {notifyEmail && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-xs text-noir-500 mt-3 pt-3 border-t border-white/5"
            >
              Los emails se enviarán a{" "}
              <span className="text-violet-400">{profile?.email}</span>{" "}
              con la antelación configurada en cada suscripción.
            </motion.p>
          )}
        </Section>

        {/* API info */}
        <Section icon={<Code className="w-4 h-4" />} title="Extensión de Chrome">
          <div className="space-y-2">
            <p className="text-xs text-noir-500">
              Endpoint para añadir suscripciones desde la extensión:
            </p>
            <code className="block text-xs text-violet-300 bg-noir-900 px-3 py-2.5 rounded-lg border border-white/5 font-mono break-all">
              POST {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/add-sub
            </code>
            <p className="text-xs text-noir-600 mt-1">
              Header:{" "}
              <span className="text-noir-400 font-mono">
                Authorization: Bearer &lt;EXTENSION_API_SECRET&gt;
              </span>
            </p>
          </div>
        </Section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium
                     rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </motion.div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-noir-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}
