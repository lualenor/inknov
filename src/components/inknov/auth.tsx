"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoBadge } from "@/components/inknov/logo";
import { navigate } from "@/components/inknov/app";
import type { SessionUser } from "@/components/inknov/types";

type Props = {
  mode: "login" | "register";
  onAuthed: (user: SessionUser) => void;
};

export function AuthView({ mode, onAuthed }: Props) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Algo salió mal. Intenta de nuevo.");
        return;
      }
      onAuthed(data.user as SessionUser);
      navigate("#/app");
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta otra vez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="container mx-auto max-w-5xl px-4 h-16 flex items-center">
        <button
          className="flex items-center gap-2.5"
          onClick={() => navigate("#/")}
          aria-label="Volver al inicio"
        >
          <LogoBadge size={36} />
          <span className="font-semibold text-lg tracking-tight">Inknov</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-3xl border border-border shadow-xl shadow-black/5 p-7 sm:p-9">
            <div className="flex flex-col items-center text-center">
              <LogoBadge size={64} />
              <h1 className="mt-4 text-2xl font-bold tracking-tight">
                {isRegister ? "Crea tu espacio privado" : "Bienvenido de vuelta"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isRegister
                  ? "Tu escritorio de escritura, protegido y siempre contigo."
                  : "Continúa donde te quedaste."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Tu nombre</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Ej. Luisa Restrepo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={60}
                    className="h-11 rounded-xl bg-background"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 8 : undefined}
                  className="h-11 rounded-xl bg-background"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/25 rounded-xl px-3.5 py-2.5"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/30"
              >
                {loading
                  ? "Un momento…"
                  : isRegister
                    ? "Crear mi cuenta"
                    : "Iniciar sesión"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isRegister ? "¿Ya tienes cuenta? " : "¿Aún no tienes cuenta? "}
              <Link
                href={isRegister ? "#/login" : "#/register"}
                className="font-semibold text-gold hover:underline underline-offset-4"
              >
                {isRegister ? "Inicia sesión" : "Regístrate gratis"}
              </Link>
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground leading-relaxed">
            Tus textos e imágenes son privados: cada cuenta es un espacio
            aislado e independiente.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
