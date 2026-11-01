import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";
import { docxResponse, exportProjectDocx } from "@/lib/docx";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Descarga el proyecto COMPLETO como .docx:
 * portada + todas las notas con su texto formateado e imágenes incrustadas.
 */
export async function GET(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    include: { notes: { orderBy: { createdAt: "asc" } } },
  });
  if (!project) return jsonError("Proyecto no encontrado", 404);

  try {
    const buffer = await exportProjectDocx(
      { name: project.name, description: project.description },
      project.notes.map((n) => ({
        title: n.title,
        contentJson: n.contentJson,
        plainText: n.plainText,
      })),
      user.id
    );
    return docxResponse(buffer, project.name);
  } catch (error) {
    console.error("exportProjectDocx", error);
    return jsonError("No se pudo generar el documento Word", 500);
  }
}
