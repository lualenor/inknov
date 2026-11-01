import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Autenticación de Inknov.
 * - Contraseñas hasheadas con bcrypt (nunca se guardan en texto plano).
 * - Sesión firmada como JWT (HS256) dentro de una cookie httpOnly:
 *   no es legible desde JavaScript en el navegador (protege frente a XSS).
 * - Cada consulta filtra por `userId`, así que el aislamiento entre
 *   usuarios se garantiza a nivel de base de datos.
 */

const SESSION_COOKIE = "inknov_session";
const SESSION_DAYS = 30;

function sessionSecret(): Uint8Array {
  const value =
    process.env.JWT_SECRET ??
    "inknov-dev-secret-cambialo-en-produccion";
  return new TextEncoder().encode(value);
}

export type SessionPayload = { userId: string; email: string };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(sessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub) return null;
    return { userId: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

/** Usuario autenticado (o null). Usar al inicio de cada API route. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
