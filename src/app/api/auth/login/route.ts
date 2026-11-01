import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, jsonError, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const { email, password } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });

    // Mensaje genérico para no revelar si el correo existe
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return jsonError("Correo o contraseña incorrectos", 401);
    }

    await createSession({ userId: user.id, email: user.email });

    return Response.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return jsonError("No se pudo iniciar sesión", 500);
  }
}
