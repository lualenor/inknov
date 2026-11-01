"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  Bold,
  Check,
  CloudOff,
  FileDown,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Redo2,
  Strikethrough,
  TextQuote,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { navigate } from "@/components/inknov/app";
import {
  AppHeader,
  ConfirmDelete,
  downloadExport,
} from "@/components/inknov/shared";
import type { NoteFull, SessionUser } from "@/components/inknov/types";

type SaveState = "saved" | "saving" | "unsaved" | "error";

export function EditorView({
  user,
  projectId,
  noteId,
  onLogout,
}: {
  user: SessionUser;
  projectId: string;
  noteId: string;
  onLogout: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState<NoteFull | null>(null);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [uploads, setUploads] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const handleFilesRef = useRef<(files: FileList | File[]) => Promise<void>>(
    async () => {}
  );

  /** Autoguardado con debounce: acumula cambios y los envía juntos. */
  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const payload = pendingRef.current;
    if (!Object.keys(payload).length) return;
    pendingRef.current = {};
    setSaveState("saving");
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!res.ok) throw new Error("save failed");
      if (mountedRef.current) setSaveState("saved");
    } catch {
      if (mountedRef.current) setSaveState("error");
    }
  }, [noteId]);

  const scheduleSave = useCallback(
    (patch: Record<string, string>) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      setSaveState("unsaved");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushSave, 900);
    },
    [flushSave]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      ImageExt.configure({ inline: true, allowBase64: false }),
      Placeholder.configure({ placeholder: "Empieza a escribir…" }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "px-1" },
      handlePaste: (_view, event) => {
        const files = (event as ClipboardEvent).clipboardData?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          void handleFilesRef.current(files);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      scheduleSave({
        contentJson: JSON.stringify(ed.getJSON()),
        plainText: ed.getText().slice(0, 4000),
      });
    },
  });

  // Cargar la nota
  useEffect(() => {
    if (!editor) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/notes/${noteId}`);
        if (!alive) return;
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (!res.ok) {
          setMissing(true);
          return;
        }
        const data = await res.json();
        const loaded = data.note as NoteFull;
        setNote(loaded);
        setTitle(loaded.title);
        if (loaded.contentJson) {
          try {
            editor.commands.setContent(JSON.parse(loaded.contentJson), false);
          } catch {
            editor.commands.setContent(`<p></p>`, false);
          }
        }
      } catch {
        if (alive) setMissing(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editor, noteId, onLogout]);

  // Guardar lo pendiente al salir de la vista
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      void flushSave();
    };
  }, [flushSave]);

  /** Subida de imágenes JPG/PNG desde el celular. */
  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!editor) return;
      for (const file of Array.from(fileList)) {
        if (!/^image\/(jpeg|png)$/.test(file.type)) {
          toast({
            title: "Formato no permitido",
            description: "Solo se admiten imágenes JPG o PNG.",
            variant: "destructive",
          });
          continue;
        }
        setUploads((n) => n + 1);
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(`/api/notes/${noteId}/images`, {
            method: "POST",
            body: fd,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast({
              title: data.error ?? "No se pudo subir la imagen",
              variant: "destructive",
            });
          } else {
            editor
              .chain()
              .focus()
              .setImage({ src: data.image.url, alt: file.name })
              .run();
            // La inserción de la imagen también debe guardarse
            scheduleSave({
              contentJson: JSON.stringify(editor.getJSON()),
              plainText: editor.getText().slice(0, 4000),
            });
          }
        } catch {
          toast({
            title: "Sin conexión para subir la imagen",
            variant: "destructive",
          });
        } finally {
          setUploads((n) => n - 1);
        }
      }
    },
    [editor, noteId, scheduleSave, toast]
  );

  useEffect(() => {
    handleFilesRef.current = handleFiles;
  }, [handleFiles]);

  async function deleteNote() {
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) navigate(`#/app/p/${projectId}`);
    else
      toast({ title: "No se pudo eliminar la nota", variant: "destructive" });
  }

  if (missing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-5xl">🍂</span>
        <h1 className="text-xl font-semibold">Nota no encontrada</h1>
        <Button className="rounded-full" onClick={() => navigate("#/app")}>
          Volver a mis proyectos
        </Button>
      </div>
    );
  }

  const busyUploading = uploads > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={onLogout} />

      {/* Barra de contexto: volver, estado de guardado, exportar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(`#/app/p/${projectId}`)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <SaveIndicator state={saveState} onRetry={flushSave} />
          </div>
          <Button
            variant="outline"
            className="h-9 rounded-full bg-card font-semibold shrink-0"
            onClick={() => downloadExport(`/api/notes/${noteId}/export`)}
          >
            <FileDown className="h-4 w-4 mr-1.5 text-gold" /> Word
          </Button>
        </div>
      </div>

      <main className="container mx-auto max-w-3xl px-4 flex-1">
        {!note ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : (
          <>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleSave({ title: e.target.value });
              }}
              placeholder="Título de la nota"
              aria-label="Título de la nota"
              maxLength={200}
              className="mt-6 w-full bg-transparent font-serif text-2xl sm:text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50"
            />

            {/* Barra de herramientas */}
            <div className="sticky top-28 z-20 -mx-4 px-4 py-2 mt-4 bg-background/95 backdrop-blur-md">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                <ToolBtn
                  label="Deshacer"
                  disabled={!editor?.can().undo()}
                  onClick={() => editor?.chain().focus().undo().run()}
                >
                  <Undo2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Rehacer"
                  disabled={!editor?.can().redo()}
                  onClick={() => editor?.chain().focus().redo().run()}
                >
                  <Redo2 className="h-4 w-4" />
                </ToolBtn>
                <Divider />
                <ToolBtn
                  label="Título"
                  active={editor?.isActive("heading", { level: 2 })}
                  onClick={() =>
                    editor?.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                >
                  <Heading2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Subtítulo"
                  active={editor?.isActive("heading", { level: 3 })}
                  onClick={() =>
                    editor?.chain().focus().toggleHeading({ level: 3 }).run()
                  }
                >
                  <Heading3 className="h-4 w-4" />
                </ToolBtn>
                <Divider />
                <ToolBtn
                  label="Negrita"
                  active={editor?.isActive("bold")}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Cursiva"
                  active={editor?.isActive("italic")}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Subrayado"
                  active={editor?.isActive("underline")}
                  onClick={() =>
                    editor?.chain().focus().toggleUnderline().run()
                  }
                >
                  <UnderlineIcon className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Tachado"
                  active={editor?.isActive("strike")}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough className="h-4 w-4" />
                </ToolBtn>
                <Divider />
                <ToolBtn
                  label="Lista con viñetas"
                  active={editor?.isActive("bulletList")}
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                >
                  <List className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Lista numerada"
                  active={editor?.isActive("orderedList")}
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Cita"
                  active={editor?.isActive("blockquote")}
                  onClick={() =>
                    editor?.chain().focus().toggleBlockquote().run()
                  }
                >
                  <TextQuote className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  label="Separador"
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                >
                  <Minus className="h-4 w-4" />
                </ToolBtn>
                <Divider />
                <ToolBtn
                  label="Insertar imagen (JPG o PNG)"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {busyUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </ToolBtn>
              </div>
            </div>

            {/* Área de escritura */}
            <div className="inknov-editor mt-4 pb-40">
              <EditorContent editor={editor} />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="fixed bottom-5 right-5 pb-safe">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full bg-card shadow-lg border-border"
                aria-label="Eliminar nota"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          </>
        )}
      </main>

      <ConfirmDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar «${note?.title ?? "la nota"}»?`}
        description="La nota y sus imágenes se borrarán para siempre."
        onConfirm={deleteNote}
      />
    </div>
  );
}

function SaveIndicator({
  state,
  onRetry,
}: {
  state: SaveState;
  onRetry: () => void;
}) {
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-emerald-600" /> Guardado
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
      </span>
    );
  }
  if (state === "unsaved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
        Sin guardar
      </span>
    );
  }
  return (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1 text-xs text-destructive font-medium"
    >
      <CloudOff className="h-3.5 w-3.5" /> Error — reintentar
    </button>
  );
}

function ToolBtn({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-9 w-9 grid place-items-center rounded-xl shrink-0 transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-foreground/75 hover:bg-secondary hover:text-foreground",
        disabled && "opacity-30 pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border shrink-0" aria-hidden />;
}
