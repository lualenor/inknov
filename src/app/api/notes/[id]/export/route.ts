import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";
import { docxResponse, exportNoteDocx } from "@/lib/docx";

type Ctx = { params: Promise<{ id: string }> };

/** Descarga UNA nota como .docx con texto formateado e imágenes incrustadas. */
export async function GET(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const note = await db.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return jsonError("Nota no encontrada", 404);

  try {
    const buffer = await exportNoteDocx(
      {
        title: note.title,
        contentJson: note.contentJson,
        plainText: note.plainText,
      },
      user.id
    );
    return docxResponse(buffer, note.title || "nota");
  } catch (error) {
    console.error("exportNoteDocx", error);
    return jsonError("No se pudo generar el documento Word", 500);
  }
}
