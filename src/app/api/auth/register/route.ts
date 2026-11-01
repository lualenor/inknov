import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword, jsonError } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre").max(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo electrónico inválido")
    .max(160),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(200),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const { name, email, password } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("Ese correo ya está registrado. Inicia sesión.", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { name, email, passwordHash },
    });

    await createSession({ userId: user.id, email: user.email });

    return Response.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return jsonError("No se pudo crear la cuenta", 500);
  }
}
