import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE, parseSessionToken } from "./auth";
import { getDb } from "./db";
import { users } from "./db/schema";

export async function getSessionUserId(): Promise<number | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  const parsed = await parseSessionToken(token);
  return parsed?.userId ?? null;
}

export async function requireUserId(): Promise<number> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return userId;
}

export async function getSessionUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const db = getDb();
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}
