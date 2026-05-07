import Link from "next/link";
import { Radar } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
            <Radar className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">
            SubScout
          </span>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-noir-500 mt-6">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
