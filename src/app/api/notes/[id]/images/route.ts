import { imageSize } from "image-size";
import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";
import {
  MAX_IMAGE_BYTES,
  saveImage,
  validateImageType,
} from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Subida de imágenes desde el celular (JPG / PNG).
 * Recibe multipart/form-data con el campo "file" y devuelve la URL lista
 * para incrustar en el editor. La imagen queda vinculada a la nota.
 */
export async function POST(request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const note = await db.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return jsonError("Nota no encontrada", 404);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Adjunta una imagen en el campo 'file'", 400);
    }
    if (!validateImageType(file.type)) {
      return jsonError("Formato no permitido. Usa JPG o PNG.", 415);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return jsonError("La imagen supera el límite de 8 MB.", 413);
    }

    const data = Buffer.from(await file.arrayBuffer());

    let width = 0;
    let height = 0;
    try {
      const dims = imageSize(data);
      width = dims.width ?? 0;
      height = dims.height ?? 0;
    } catch {
      return jsonError("El archivo no es una imagen válida.", 415);
    }

    const saved = await saveImage({
      userId: user.id,
      noteId: note.id,
      mimeType: file.type,
      data,
      width,
      height,
    });

    return Response.json({ image: saved }, { status: 201 });
  } catch (error) {
    console.error("uploadImage", error);
    return jsonError("No se pudo subir la imagen", 500);
  }
}
