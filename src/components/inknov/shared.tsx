"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogoBadge, initialsOf } from "@/components/inknov/logo";
import { navigate } from "@/components/inknov/app";
import {
  PROJECT_COLORS,
  PROJECT_EMOJIS,
  type Project,
  type SessionUser,
} from "@/components/inknov/types";

export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function longDateLabel(): string {
  return new Date()
    .toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();
}

/** Cabecera sticky con la insignia y el menú de cuenta. */
export function AppHeader({
  user,
  onLogout,
}: {
  user: SessionUser;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between gap-2">
        <button
          onClick={() => navigate("#/app")}
          className="flex items-center gap-2.5 min-w-0"
          aria-label="Ir a mis proyectos"
        >
          <LogoBadge size={34} />
          <span className="font-semibold text-lg tracking-tight">Inknov</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Menú de cuenta"
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold grid place-items-center shadow-sm ring-2 ring-card hover:brightness-105 transition"
            >
              {initialsOf(user.name)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-2xl">
            <DropdownMenuLabel>
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">
                {user.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-destructive focus:text-destructive rounded-xl"
            >
              <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/** Diálogo de confirmación para acciones destructivas (controlado o libre). */
export function ConfirmDelete({
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [busy, setBusy] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="rounded-3xl sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Eliminando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Crear o editar un proyecto (nombre, descripción, emoji y color). */
export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project | null;
  onSaved: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>("📖");
  const [color, setColor] = useState<string>("#F5C044");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setIcon(project?.icon ?? "📖");
      setColor(project?.color ?? "#F5C044");
      setError(null);
    }
  }, [open, project]);

  async function save() {
    if (!name.trim()) {
      setError("Escribe un nombre para el proyecto");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", {
        method: project ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          icon,
          color,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el proyecto");
        return;
      }
      onSaved(data.project as Project);
      onOpenChange(false);
    } catch {
      setError("Sin conexión. Revisa tu internet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto thin-scrollbar">
        <DialogHeader>
          <DialogTitle>{project ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Ajusta el nombre, el ícono o el color de tu proyecto."
              : "Una carpeta para tus textos: un diario, poemas, un libro…"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Nombre</Label>
            <Input
              id="project-name"
              value={name}
              maxLength={120}
              placeholder="Ej. Poemas de otoño"
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-desc">Descripción (opcional)</Label>
            <Textarea
              id="project-desc"
              value={description}
              maxLength={300}
              placeholder="¿De qué trata este proyecto?"
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl bg-background min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label>Ícono</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {PROJECT_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Ícono ${e}`}
                  onClick={() => setIcon(e)}
                  className={`h-9 w-9 grid place-items-center rounded-xl text-lg transition ${
                    icon === e
                      ? "bg-primary/35 ring-2 ring-primary"
                      : "hover:bg-secondary"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-8 w-8 rounded-full transition ${
                    color === c
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                      : "hover:scale-110"
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            onClick={save}
            disabled={busy}
            className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/25"
          >
            {busy ? "Guardando…" : project ? "Guardar cambios" : "Crear proyecto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Descarga un archivo de exportación respetando la sesión (cookies). */
export function downloadExport(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
