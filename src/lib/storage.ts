import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";

/**
 * Almacenamiento de imágenes de Inknov con doble modo, pensado para
 * empezar gratis y crecer sin cambiar código:
 *
 * 1. Vercel Blob (producción): si existe BLOB_READ_WRITE_TOKEN, los bytes
 *    se suben a Blob y la base de datos guarda la URL pública.
 * 2. Base de datos (por defecto / modo sin configuración): los bytes se
 *    guardan en la columna `data` (BLOB/bytea) y se sirven mediante la
 *    ruta /api/images/[id]. Ideal para desarrollo local y auto-alojamiento.
 */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

export type SavedImage = {
  id: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
};

export function validateImageType(mimeType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export async function saveImage(input: {
  userId: string;
  noteId?: string | null;
  mimeType: string;
  data: Buffer;
  width: number;
  height: number;
}): Promise<SavedImage> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    const path = `inknov/${input.userId}/${Date.now()}-${randomUUID()}`;
    const blob = await put(path, input.data, {
      token: blobToken,
      contentType: input.mimeType,
      access: "public",
    });
    const asset = await db.imageAsset.create({
      data: {
        userId: input.userId,
        noteId: input.noteId ?? null,
        mimeType: input.mimeType,
        size: input.data.byteLength,
        width: input.width,
        height: input.height,
        storage: "blob",
        blobUrl: blob.url,
      },
    });
    return toSavedImage(asset.id, blob.url, asset);
  }

  const asset = await db.imageAsset.create({
    data: {
      userId: input.userId,
      noteId: input.noteId ?? null,
      mimeType: input.mimeType,
      size: input.data.byteLength,
      width: input.width,
      height: input.height,
      storage: "db",
      data: new Uint8Array(input.data),
    },
  });
  return toSavedImage(asset.id, `/api/images/${asset.id}`, asset);
}

type AssetLike = {
  id: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
};

function toSavedImage(id: string, url: string, asset: AssetLike): SavedImage {
  return {
    id,
    url,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    size: asset.size,
  };
}

/** URL pública para incrustar en el editor. */
export function imageUrlFor(asset: { id: string; storage: string; blobUrl: string | null }): string {
  return asset.storage === "blob" && asset.blobUrl ? asset.blobUrl : `/api/images/${asset.id}`;
}

/**
 * Recupera los bytes reales de una imagen (para incrustarla en el .docx).
 * Acepta la URL tal como quedó guardada en el contenido del editor.
 */
export async function loadImageBytes(
  src: string,
  userId: string
): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    // Modo base de datos: /api/images/<id>
    const match = src.match(/\/api\/images\/([a-z0-9]+)/i);
    if (match) {
      const asset = await db.imageAsset.findFirst({
        where: { id: match[1], userId },
      });
      if (!asset) return null;
      if (asset.storage === "db" && asset.data) {
        return { data: Buffer.from(asset.data), mimeType: asset.mimeType };
      }
      if (asset.blobUrl) {
        return downloadBlob(asset.blobUrl, asset.mimeType);
      }
      return null;
    }

    // Modo Vercel Blob: URL absoluta
    if (/^https?:\/\//i.test(src)) {
      return downloadBlob(src, "image/jpeg");
    }

    return null;
  } catch {
    return null;
  }
}

async function downloadBlob(
  url: string,
  fallbackMime: string
): Promise<{ data: Buffer; mimeType: string } | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") ?? fallbackMime;
  return { data: buffer, mimeType };
}
