import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function requireOwnedProject(projectId: string, userId: string) {
  // Se filtra SIEMPRE por userId: un usuario nunca puede tocar proyectos ajenos
  return db.project.findFirst({ where: { id: projectId, userId } });
}

/** Detalle de un proyecto + lista de sus notas. */
export async function GET(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    include: {
      notes: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          plainText: true,
          updatedAt: true,
          createdAt: true,
        },
      },
    },
  });
  if (!project) return jsonError("Proyecto no encontrado", 404);

  return Response.json({ project });
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().max(8).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const project = await requireOwnedProject(id, user.id);
  if (!project) return jsonError("Proyecto no encontrado", 404);

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const updated = await db.project.update({
      where: { id: project.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description || null }
          : {}),
        ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      },
    });

    return Response.json({ project: updated });
  } catch {
    return jsonError("No se pudo actualizar el proyecto", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const project = await requireOwnedProject(id, user.id);
  if (!project) return jsonError("Proyecto no encontrado", 404);

  // Las notas e imágenes asociadas se borran en cascada (ver schema.prisma)
  await db.project.delete({ where: { id: project.id } });
  return Response.json({ ok: true });
}
