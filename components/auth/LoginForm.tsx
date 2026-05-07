"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { loginAction } from "../../app/(auth)/login/actions";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleAction(formData: FormData) {
    setIsPending(true);
    setError(null);
    
    try {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        setIsPending(false);
      } else if (result?.success) {
        // Use window.location to ensure a hard navigation and fresh middleware run
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
      setIsPending(false);
    }
  }

  return (
    <div className="glass-card p-8">
      <h1 className="text-2xl font-semibold text-white mb-1">
        Bienvenido de nuevo
      </h1>
      <p className="text-noir-400 text-sm mb-8">
        Inicia sesión para ver tus suscripciones
      </p>

      {error && (
        <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-3 mb-5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      <form action={handleAction} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-noir-300">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="w-full px-3.5 py-2.5 bg-noir-900 border border-white/8 rounded-xl text-sm
                       text-foreground placeholder:text-noir-600
                       focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                       transition-all duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-noir-300">Contraseña</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-noir-900 border border-white/8 rounded-xl text-sm
                       text-foreground placeholder:text-noir-600
                       focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                       transition-all duration-200"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700
                     text-white text-sm font-medium rounded-xl
                     flex items-center justify-center gap-2
                     transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
