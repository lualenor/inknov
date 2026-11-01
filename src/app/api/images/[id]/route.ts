import { db } from "@/lib/db";
import { getCurrentUser, jsonError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Sirve los bytes de una imagen guardada en la base de datos.
 * Solo el dueño puede verla: si la imagen no es tuya, responde 404.
 */
export async function GET(_request: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);

  const { id } = await ctx.params;
  const asset = await db.imageAsset.findFirst({ where: { id, userId: user.id } });
  if (!asset) return jsonError("Imagen no encontrada", 404);

  // Si la imagen vive en Vercel Blob, redirige a su URL firmada
  if (asset.storage === "blob" && asset.blobUrl) {
    return Response.redirect(asset.blobUrl, 302);
  }

  if (!asset.data) return jsonError("Imagen no encontrada", 404);

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
