import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const EMPTY_DOC = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

const createSchema = z.object({
  title: z.string().trim().max(200).optional(),
});

/** Crea una nota dentro de un proyecto propio. */
export async function POST(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const project = await db.project.findFirst({ where: { id, userId: user.id } });
  if (!project) return jsonError("Proyecto no encontrado", 404);

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return jsonError("Título inválido", 400);
    }

    const note = await db.note.create({
      data: {
        projectId: project.id,
        userId: user.id,
        title: parsed.data.title || "Sin título",
        contentJson: EMPTY_DOC,
      },
    });

    return Response.json({ note }, { status: 201 });
  } catch {
    return jsonError("No se pudo crear la nota", 500);
  }
}
