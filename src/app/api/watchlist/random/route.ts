import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { media, watchlistItems } from "@/lib/db/schema";
import { getSessionUserId } from "@/lib/session";
import { posterUrl } from "@/lib/tmdb";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { mediaType?: "movie" | "tv" | "all" };
    const filter = body.mediaType ?? "all";
    const db = getDb();

    const rows = await db
      .select({ watchlistId: watchlistItems.id, media })
      .from(watchlistItems)
      .innerJoin(media, eq(watchlistItems.mediaId, media.id))
      .where(eq(watchlistItems.userId, userId));

    const pool =
      filter === "all" ? rows : rows.filter((r) => r.media.mediaType === filter);

    if (pool.length === 0) {
      return NextResponse.json({ error: "Watchlist is empty" }, { status: 404 });
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    return NextResponse.json({
      item: {
        watchlistId: pick.watchlistId,
        ...pick.media,
        posterUrl: posterUrl(pick.media.posterPath),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Random pick failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
