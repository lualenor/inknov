import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";

/** Lista los proyectos del usuario autenticado (y solo los suyos). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const projects = await db.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { notes: true } } },
  });

  return Response.json({ projects });
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre para el proyecto").max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().max(8).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")
    .optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const project = await db.project.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        icon: parsed.data.icon || "📖",
        color: parsed.data.color || "#F5C044",
      },
    });

    return Response.json({ project }, { status: 201 });
  } catch {
    return jsonError("No se pudo crear el proyecto", 500);
  }
}
