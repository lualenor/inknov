"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileDown,
  Loader2,
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
  downloadExport,
  relativeTime,
} from "@/components/inknov/shared";
import type { NoteSummary, Project, SessionUser } from "@/components/inknov/types";

type ProjectWithNotes = Project & { notes: NoteSummary[] };

export function ProjectView({
  user,
  projectId,
  onLogout,
}: {
  user: SessionUser;
  projectId: string;
  onLogout: () => void;
}) {
  const [project, setProject] = useState<ProjectWithNotes | null>(null);
  const [missing, setMissing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<NoteSummary | null>(null);
  const [projectDeleteOpen, setProjectDeleteOpen] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        setMissing(true);
        return;
      }
      const data = await res.json();
      setProject(data.project);
    } catch {
      toast({
        title: "Sin conexión",
        description: "No pudimos cargar el proyecto.",
        variant: "destructive",
      });
    }
  }, [projectId, onLogout, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function createNote() {
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: data.error ?? "No se pudo crear la nota",
          variant: "destructive",
        });
        return;
      }
      navigate(`#/app/p/${projectId}/n/${data.note.id}`);
    } catch {
      toast({ title: "Sin conexión", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function deleteNote(note: NoteSummary) {
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: `«${note.title}» eliminada` });
      load();
    } else {
      toast({ title: "No se pudo eliminar la nota", variant: "destructive" });
    }
  }

  async function removeProject() {
    if (!project) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) navigate("#/app");
    else toast({ title: "No se pudo eliminar", variant: "destructive" });
  }

  if (missing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-5xl">🍃</span>
        <h1 className="text-xl font-semibold">Proyecto no encontrado</h1>
        <p className="text-sm text-muted-foreground">
          Puede que haya sido eliminado.
        </p>
        <Button className="rounded-full" onClick={() => navigate("#/app")}>
          Volver a mis proyectos
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={onLogout} />

      <main className="container mx-auto max-w-3xl px-4 pb-32 flex-1">
        <button
          onClick={() => navigate("#/app")}
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Mis proyectos
        </button>

        {!project ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-20 rounded-3xl" />
            <Skeleton className="h-20 rounded-3xl" />
          </div>
        ) : (
          <>
            {/* Encabezado del proyecto */}
            <header className="mt-3 bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="h-14 w-14 shrink-0 rounded-2xl grid place-items-center text-2xl"
                    style={{ backgroundColor: `${project.color}38` }}
                  >
                    {project.icon}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight line-clamp-1">
                      {project.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {project.notes.length}{" "}
                      {project.notes.length === 1 ? "nota" : "notas"}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-muted-foreground shrink-0"
                      aria-label="Opciones del proyecto"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl w-56">
                    <DropdownMenuItem className="rounded-xl" onClick={() => setEditOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar proyecto
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl"
                      onClick={() => downloadExport(`/api/projects/${project.id}/export`)}
                    >
                      <FileDown className="h-4 w-4 mr-2" /> Exportar a Word
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl text-destructive focus:text-destructive"
                      onClick={() => setProjectDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {project.description && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {project.description}
                </p>
              )}
            </header>

            {/* Lista de notas */}
            <section className="mt-5 space-y-3">
              {project.notes.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center">
                  <div className="text-5xl">📝</div>
                  <h3 className="mt-4 font-semibold text-lg">Este proyecto está vacío</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Crea tu primera nota y empieza a escribir. Puedes adjuntar
                    imágenes cuando quieras.
                  </p>
                </div>
              ) : (
                project.notes.map((note, i) => (
                  <motion.article
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.25 }}
                    className="relative bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-md transition-all"
                  >
                    <button
                      className="text-left w-full pr-10"
                      onClick={() => navigate(`#/app/p/${projectId}/n/${note.id}`)}
                      aria-label={`Abrir nota ${note.title}`}
                    >
                      <h3 className="font-semibold text-base line-clamp-1">
                        {note.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {note.plainText || "Nota vacía — tócala para escribir"}
                      </p>
                      <p className="mt-2.5 text-xs text-muted-foreground">
                        Editada {relativeTime(note.updatedAt)}
                      </p>
                    </button>
                    <div className="absolute top-4 right-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground"
                            aria-label={`Opciones de ${note.title}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl w-52">
                          <DropdownMenuItem
                            className="rounded-xl"
                            onClick={() =>
                              downloadExport(`/api/notes/${note.id}/export`)
                            }
                          >
                            <FileDown className="h-4 w-4 mr-2" /> Exportar a Word
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl text-destructive focus:text-destructive"
                            onClick={() => setNoteToDelete(note)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.article>
                ))
              )}
            </section>
          </>
        )}
      </main>

      {/* Botón flotante: nueva nota */}
      {!missing && (
        <Button
          onClick={createNote}
          disabled={creating}
          className="fixed bottom-6 right-5 h-14 rounded-full px-5 font-semibold text-base shadow-xl shadow-primary/40"
        >
          {creating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5 mr-1.5" />
          )}
          Nueva nota
        </Button>
      )}

      <ProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSaved={(updated) => {
          toast({ title: "Proyecto actualizado" });
          if (project) {
            setProject({ ...project, ...updated });
          }
        }}
      />

      <ConfirmDelete
        open={projectDeleteOpen}
        onOpenChange={setProjectDeleteOpen}
        title={project ? `¿Eliminar «${project.name}»?` : ""}
        description="Se borrarán el proyecto y todas sus notas. Esta acción no se puede deshacer."
        onConfirm={removeProject}
      />

      <ConfirmDelete
        open={noteToDelete !== null}
        onOpenChange={(v) => !v && setNoteToDelete(null)}
        title={noteToDelete ? `¿Eliminar «${noteToDelete.title}»?` : ""}
        description="La nota y sus imágenes se borrarán para siempre."
        onConfirm={async () => {
          if (noteToDelete) await deleteNote(noteToDelete);
        }}
      />
    </div>
  );
}
