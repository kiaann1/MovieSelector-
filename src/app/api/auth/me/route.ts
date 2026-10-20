import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { FavoriteMovie, users } from "@/lib/db/schema";
import { getSessionUser, getSessionUserId } from "@/lib/session";
import { DEFAULT_THEME, isThemeId } from "@/lib/themes";

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    avatarDataUrl: user.avatarDataUrl,
    favoriteGenres: user.favoriteGenres,
    favoriteMovies: user.favoriteMovies,
    theme: isThemeId(user.theme) ? user.theme : DEFAULT_THEME,
    createdAt: user.createdAt,
  };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      name?: string;
      avatarDataUrl?: string | null;
      favoriteGenres?: string[];
      favoriteMovies?: FavoriteMovie[];
      theme?: string;
    };

    const updates: Partial<typeof users.$inferInsert> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (body.avatarDataUrl !== undefined) {
      updates.avatarDataUrl =
        body.avatarDataUrl && body.avatarDataUrl.length < 600_000
          ? body.avatarDataUrl
          : null;
    }
    if (body.favoriteGenres) {
      updates.favoriteGenres = body.favoriteGenres;
    }
    if (body.favoriteMovies) {
      updates.favoriteMovies = body.favoriteMovies;
    }
    if (isThemeId(body.theme)) {
      updates.theme = body.theme;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({ user: publicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
