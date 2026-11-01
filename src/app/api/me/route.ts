import { getCurrentUser, jsonError } from "@/lib/auth";

/** Datos del usuario autenticado (o 401). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autenticado", 401);
  return Response.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
}
