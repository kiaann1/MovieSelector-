import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createSessionToken,
  hashPin,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pin?: string };
    const pin = body.pin?.trim() ?? "";
    if (pin.length < 4) {
      return NextResponse.json({ error: "Enter your PIN" }, { status: 400 });
    }

    const db = getDb();
    const pinHash = await hashPin(pin);
    const user = await db.query.users.findFirst({
      where: eq(users.pinHash, pinHash),
    });

    if (!user) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, avatarDataUrl: user.avatarDataUrl },
    });
    res.cookies.set(AUTH_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unlock failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
