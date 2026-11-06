import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json({ error: 'Archivo no válido' }, { status: 400 });
  }

  // Sube la imagen a tu Vercel Blob
  const blob = await put(filename, request.body, {
    access: 'public',
  });

  // Devuelve la URL de la imagen ya subida a tu Frontend
  return NextResponse.json(blob);
}