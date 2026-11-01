import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function requireOwnedNote(noteId: string, userId: string) {
  return db.note.findFirst({ where: { id: noteId, userId } });
}

/** Trae una nota completa (con su contenido) para el editor. */
export async function GET(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const note = await requireOwnedNote(id, user.id);
  if (!note) return jsonError("Nota no encontrada", 404);

  return Response.json({ note });
}

const MAX_CONTENT_JSON = 2 * 1024 * 1024; // 2 MB de documento JSON

const updateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  contentJson: z.string().max(MAX_CONTENT_JSON).optional(),
  plainText: z.string().max(20_000).optional(),
});

/** Guarda una nota (autoguardado del editor). */
export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const note = await requireOwnedNote(id, user.id);
  if (!note) return jsonError("Nota no encontrada", 404);

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Contenido inválido", 400);
    }

    const updated = await db.note.update({
      where: { id: note.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title || "Sin título" } : {}),
        ...(parsed.data.contentJson !== undefined
          ? { contentJson: parsed.data.contentJson }
          : {}),
        ...(parsed.data.plainText !== undefined ? { plainText: parsed.data.plainText } : {}),
      },
      select: { id: true, title: true, updatedAt: true },
    });

    return Response.json({ note: updated });
  } catch {
    return jsonError("No se pudo guardar la nota", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const note = await requireOwnedNote(id, user.id);
  if (!note) return jsonError("Nota no encontrada", 404);

  await db.note.delete({ where: { id: note.id } });
  return Response.json({ ok: true });
}
