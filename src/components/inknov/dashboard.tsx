"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileDown,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { navigate } from "@/components/inknov/app";
import {
  AppHeader,
  ConfirmDelete,
  ProjectDialog,
  greeting,
  longDateLabel,
  relativeTime,
  downloadExport,
} from "@/components/inknov/shared";
import type { Project, SessionUser } from "@/components/inknov/types";

export function DashboardView({
  user,
  onLogout,
}: {
  user: SessionUser;
  onLogout: () => void;
}) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const { toast } = useToast();

  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      toast({
        title: "Sin conexión",
        description: "No pudimos cargar tus proyectos. Revisa tu internet.",
        variant: "destructive",
      });
      setProjects([]);
    }
  }, [onLogout, toast]);

  useEffect(() => {
    // Carga inicial de datos del servidor (patrón estándar de montaje)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function removeProject(p: Project) {
    const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: `«${p.name}» eliminado` });
      load();
    } else {
      toast({ title: "No se pudo eliminar el proyecto", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={onLogout} />

      <main className="container mx-auto max-w-5xl px-4 pb-28 flex-1">
        {/* Saludo (estilo Habitactive) */}
        <section className="pt-8 pb-6">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground">
            {longDateLabel()}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todo lo que escribas aquí es solo tuyo.
          </p>
        </section>

        <section className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">
            MIS PROYECTOS
          </h2>
          <Button
            className="rounded-full h-10 px-4 font-semibold shadow-md shadow-primary/25"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo
          </Button>
        </section>

        {projects === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-3xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-6 bg-card border border-dashed border-border rounded-3xl p-10 text-center">
            <div className="text-5xl">📚</div>
            <h3 className="mt-4 font-semibold text-lg">Aún no tienes proyectos</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Crea tu primera carpeta: «Diario personal», «Poemas», «Libro
              nuevo»… todo quedará privado.
            </p>
            <Button
              className="mt-5 rounded-full px-6 h-11 font-semibold shadow-md shadow-primary/25"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Crear mi primer proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p, i) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
                className="relative bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <button
                  className="text-left w-full"
                  onClick={() => navigate(`#/app/p/${p.id}`)}
                  aria-label={`Abrir proyecto ${p.name}`}
                >
                  <div
                    className="h-12 w-12 rounded-2xl grid place-items-center text-2xl"
                    style={{ backgroundColor: `${p.color}38` }}
                  >
                    {p.icon}
                  </div>
                  <h3 className="mt-3.5 font-semibold text-base leading-snug line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2 min-h-10">
                    {p.description || "Sin descripción"}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {p._count?.notes ?? 0}{" "}
                    {(p._count?.notes ?? 0) === 1 ? "nota" : "notas"} ·{" "}
                    {relativeTime(p.updatedAt)}
                  </p>
                </button>

                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground"
                        aria-label={`Opciones de ${p.name}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl w-52">
                      <DropdownMenuItem
                        className="rounded-xl"
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-xl"
                        onClick={() => downloadExport(`/api/projects/${p.id}/export`)}
                      >
                        <FileDown className="h-4 w-4 mr-2" /> Exportar a Word
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-xl text-destructive focus:text-destructive"
                        onClick={() => setToDelete(p)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
        onSaved={() => {
          toast({ title: editing ? "Proyecto actualizado" : "Proyecto creado" });
          load();
        }}
      />

      <ConfirmDelete
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={toDelete ? `¿Eliminar «${toDelete.name}»?` : ""}
        description="Se borrarán el proyecto y todas sus notas con sus imágenes. Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (toDelete) await removeProject(toDelete);
        }}
      />
    </div>
  );
}
