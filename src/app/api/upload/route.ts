import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") || "image.jpg";

    const blob = await put(filename, request.body as ReadableStream, {
      access: "public",
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("Error al subir archivo a Vercel Blob:", error);
    return NextResponse.json(
      { error: "No se pudo subir la imagen" },
      { status: 500 }
    );
  }
}