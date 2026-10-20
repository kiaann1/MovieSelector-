import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { media, watchedEntries, watchlistItems } from "@/lib/db/schema";
import { upsertMediaFromTmdb } from "@/lib/media-service";
import { getSessionUserId } from "@/lib/session";
import { posterUrl } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "newest";
    const mediaType = searchParams.get("type");
    const db = getDb();

    let order;
    switch (sort) {
      case "highest":
        order = desc(watchedEntries.myRating);
        break;
      case "lowest":
        order = asc(watchedEntries.myRating);
        break;
      case "title":
        order = asc(media.title);
        break;
      case "oldest":
        order = asc(watchedEntries.watchedOn);
        break;
      default:
        order = desc(watchedEntries.watchedOn);
    }

    const rows = await db
      .select({
        entryId: watchedEntries.id,
        myRating: watchedEntries.myRating,
        feelings: watchedEntries.feelings,
        comments: watchedEntries.comments,
        watchedOn: watchedEntries.watchedOn,
        createdAt: watchedEntries.createdAt,
        media,
      })
      .from(watchedEntries)
      .innerJoin(media, eq(watchedEntries.mediaId, media.id))
      .where(eq(watchedEntries.userId, userId))
      .orderBy(order);

    const filtered =
      mediaType === "movie" || mediaType === "tv"
        ? rows.filter((r) => r.media.mediaType === mediaType)
        : rows;

    return NextResponse.json({
      items: filtered.map((r) => ({
        ...r.media,
        entryId: r.entryId,
        myRating: Number(r.myRating),
        feelings: r.feelings ?? [],
        comments: r.comments ?? "",
        watchedOn: r.watchedOn,
        entryCreatedAt: r.createdAt,
        posterUrl: posterUrl(r.media.posterPath),
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load watched";
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
      mediaId?: number;
      myRating?: number;
      feelings?: string[];
      comments?: string;
      watchedOn?: string;
    };

    const db = getDb();
    let mediaId = body.mediaId;

    if (!mediaId) {
      if (!body.tmdbId || !body.mediaType) {
        return NextResponse.json({ error: "media identity required" }, { status: 400 });
      }
      const row = await upsertMediaFromTmdb(body.tmdbId, body.mediaType);
      mediaId = row.id;
    }

    if (body.myRating == null || body.myRating < 0 || body.myRating > 10) {
      return NextResponse.json({ error: "myRating 0–10 required" }, { status: 400 });
    }

    const watchedOn = body.watchedOn || new Date().toISOString().slice(0, 10);

    await db
      .delete(watchlistItems)
      .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.mediaId, mediaId)));

    const existing = await db.query.watchedEntries.findFirst({
      where: and(eq(watchedEntries.userId, userId), eq(watchedEntries.mediaId, mediaId)),
    });

    if (existing) {
      const [updated] = await db
        .update(watchedEntries)
        .set({
          myRating: String(body.myRating),
          feelings: body.feelings ?? [],
          comments: body.comments ?? "",
          watchedOn,
        })
        .where(eq(watchedEntries.id, existing.id))
        .returning();
      return NextResponse.json({ ok: true, entry: updated });
    }

    const [created] = await db
      .insert(watchedEntries)
      .values({
        userId,
        mediaId,
        myRating: String(body.myRating),
        feelings: body.feelings ?? [],
        comments: body.comments ?? "",
        watchedOn,
      })
      .returning();

    return NextResponse.json({ ok: true, entry: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save watched";
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
      .delete(watchedEntries)
      .where(and(eq(watchedEntries.userId, userId), eq(watchedEntries.mediaId, mediaId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
