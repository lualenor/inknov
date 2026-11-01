"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogoBadge } from "@/components/inknov/logo";
import { navigate } from "@/components/inknov/app";

const FEATURES = [
  {
    emoji: "🗂️",
    title: "Proyectos y carpetas",
    text: "Diario personal, poemas, estudio o tu próximo libro: cada cosa en su propio espacio.",
  },
  {
    emoji: "🖼️",
    title: "Fotos que inspiran",
    text: "Sube una imagen desde tu celular —la foto de una rosa, un atardecer— y escribe a su lado o debajo.",
  },
  {
    emoji: "📄",
    title: "Exporta a Word",
    text: "Descarga una nota o el proyecto completo en .docx con el formato y las imágenes incrustadas.",
  },
  {
    emoji: "🔒",
    title: "Privacidad total",
    text: "Cada usuario tiene su espacio aislado. Nadie puede ver tus textos ni tus imágenes.",
  },
];

export function LandingView() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoBadge size={36} />
          <span className="font-semibold text-lg tracking-tight">Inknov</span>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-border bg-card"
          onClick={() => navigate("#/login")}
        >
          Entrar
        </Button>
      </header>

      <main className="flex-1">
        <section className="container mx-auto max-w-5xl px-4 pt-10 pb-14 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-block drop-shadow-[0_18px_35px_rgba(140,109,31,0.35)]"
          >
            <LogoBadge size={148} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="mt-6 text-3xl sm:text-5xl font-bold tracking-tight text-balance"
          >
            Tu refugio privado
            <br />
            para escribir.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="mt-4 text-muted-foreground text-base sm:text-lg max-w-xl mx-auto text-balance"
          >
            Organiza tus proyectos creativos, escribe desde el celular, guarda
            imágenes que te inspiran y descarga todo como documento de Word.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full px-8 h-12 text-base font-semibold shadow-lg shadow-primary/30"
              onClick={() => navigate("#/register")}
            >
              Crear cuenta gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto rounded-full px-8 h-12 text-base bg-card"
              onClick={() => navigate("#/login")}
            >
              Ya tengo cuenta
            </Button>
          </motion.div>
        </section>

        <section className="container mx-auto max-w-5xl px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08, duration: 0.45 }}
                className="bg-card rounded-3xl border border-border p-6 shadow-sm"
              >
                <div className="h-11 w-11 rounded-2xl bg-primary/25 flex items-center justify-center text-xl">
                  {f.emoji}
                </div>
                <h2 className="mt-4 font-semibold text-lg">{f.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {f.text}
                </p>
              </motion.article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="container mx-auto max-w-5xl px-4 py-6 pb-safe flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoBadge size={22} />
            <span>Inknov</span>
          </div>
          <p>Código abierto (MIT) · Instálala en tu celular desde el navegador</p>
        </div>
      </footer>
    </div>
  );
}
