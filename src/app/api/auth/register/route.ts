import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createSessionToken,
  generatePin,
  hashPin,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { FavoriteMovie, users } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      avatarDataUrl?: string | null;
      favoriteGenres?: string[];
      favoriteMovies?: FavoriteMovie[];
      pin?: string;
      autoPin?: boolean;
    };

    const name = body.name?.trim() ?? "";
    if (name.length < 1) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let pin = body.pin?.trim() ?? "";
    if (body.autoPin || !pin) {
      pin = generatePin(4);
    }
    if (!/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4–8 digits" },
        { status: 400 },
      );
    }

    const db = getDb();
    const pinHash = await hashPin(pin);

    const existing = await db.query.users.findFirst({
      where: eq(users.pinHash, pinHash),
    });
    if (existing) {
      return NextResponse.json(
        { error: "That PIN is already taken — pick another" },
        { status: 409 },
      );
    }

    const avatar =
      body.avatarDataUrl && body.avatarDataUrl.length < 600_000
        ? body.avatarDataUrl
        : null;

    const [user] = await db
      .insert(users)
      .values({
        name,
        pinHash,
        avatarDataUrl: avatar,
        favoriteGenres: body.favoriteGenres ?? [],
        favoriteMovies: body.favoriteMovies ?? [],
      })
      .returning();

    const token = await createSessionToken(user.id);
    const res = NextResponse.json({
      ok: true,
      pin,
      user: {
        id: user.id,
        name: user.name,
        avatarDataUrl: user.avatarDataUrl,
        favoriteGenres: user.favoriteGenres,
        favoriteMovies: user.favoriteMovies,
      },
    });
    res.cookies.set(AUTH_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
