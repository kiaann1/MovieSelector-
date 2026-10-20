import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { media, watchlistItems, watchedEntries } from "@/lib/db/schema";
import { upsertMediaFromTmdb } from "@/lib/media-service";
import { getSessionUserId } from "@/lib/session";
import { posterUrl } from "@/lib/tmdb";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    const rows = await db
      .select({
        watchlistId: watchlistItems.id,
        addedAt: watchlistItems.addedAt,
        media,
      })
      .from(watchlistItems)
      .innerJoin(media, eq(watchlistItems.mediaId, media.id))
      .where(eq(watchlistItems.userId, userId))
      .orderBy(desc(watchlistItems.addedAt));

    return NextResponse.json({
      items: rows.map((r) => ({
        watchlistId: r.watchlistId,
        addedAt: r.addedAt,
        ...r.media,
        posterUrl: posterUrl(r.media.posterPath),
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      tmdbId?: number;
      mediaType?: "movie" | "tv";
    };
    if (!body.tmdbId || !body.mediaType) {
      return NextResponse.json({ error: "tmdbId and mediaType required" }, { status: 400 });
    }

    const row = await upsertMediaFromTmdb(body.tmdbId, body.mediaType);
    const db = getDb();

    const alreadyWatched = await db.query.watchedEntries.findFirst({
      where: and(eq(watchedEntries.userId, userId), eq(watchedEntries.mediaId, row.id)),
    });
    if (alreadyWatched) {
      return NextResponse.json({ error: "Already watched" }, { status: 409 });
    }

    const existing = await db.query.watchlistItems.findFirst({
      where: and(eq(watchlistItems.userId, userId), eq(watchlistItems.mediaId, row.id)),
    });
    if (existing) {
      return NextResponse.json({ ok: true, mediaId: row.id, already: true });
    }

    await db.insert(watchlistItems).values({ userId, mediaId: row.id });
    return NextResponse.json({ ok: true, mediaId: row.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const mediaId = Number(searchParams.get("mediaId"));
    if (!Number.isFinite(mediaId)) {
      return NextResponse.json({ error: "mediaId required" }, { status: 400 });
    }
    const db = getDb();
    await db
      .delete(watchlistItems)
      .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.mediaId, mediaId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to remove";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
