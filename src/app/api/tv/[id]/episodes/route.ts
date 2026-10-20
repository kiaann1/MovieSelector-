import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { episodeProgress, watchedEntries } from "@/lib/db/schema";
import { upsertMediaFromTmdb } from "@/lib/media-service";
import { getSessionUserId } from "@/lib/session";
import { getTvSeason } from "@/lib/tmdb";

type Params = { params: Promise<{ id: string }> };

async function seriesCompletion(opts: {
  userId: number;
  mediaId: number;
  tmdbId: number;
  seasonNums: number[];
}) {
  const { userId, mediaId, tmdbId, seasonNums } = opts;
  const db = getDb();
  const allSeasons = await Promise.all(seasonNums.map((n) => getTvSeason(tmdbId, n)));
  const airedEps = allSeasons.flatMap((s) =>
    s.episodes
      .filter((e) => e.aired)
      .map((e) => ({ season: s.seasonNumber, episode: e.episodeNumber })),
  );

  const progress = await db.query.episodeProgress.findMany({
    where: and(eq(episodeProgress.userId, userId), eq(episodeProgress.mediaId, mediaId)),
  });

  const allWatched =
    airedEps.length > 0 &&
    airedEps.every((ep) =>
      progress.some((p) => p.season === ep.season && p.episode === ep.episode && p.watched),
    );

  const alreadySeriesWatched = await db.query.watchedEntries.findFirst({
    where: and(eq(watchedEntries.userId, userId), eq(watchedEntries.mediaId, mediaId)),
  });

  return {
    seriesComplete: allWatched && !alreadySeriesWatched,
    alreadyRated: Boolean(alreadySeriesWatched),
    airedCount: airedEps.length,
    watchedCount: progress.filter((p) => p.watched).length,
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tmdbId = Number((await params).id);
    const row = await upsertMediaFromTmdb(tmdbId, "tv");
    const db = getDb();
    const progress = await db.query.episodeProgress.findMany({
      where: and(eq(episodeProgress.userId, userId), eq(episodeProgress.mediaId, row.id)),
    });
    return NextResponse.json({ mediaId: row.id, progress });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load episodes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tmdbId = Number((await params).id);
    const body = (await request.json()) as {
      season?: number;
      episode?: number;
      watched?: boolean;
      myRating?: number | null;
      watchedOn?: string | null;
      markAll?: boolean;
      scope?: "season" | "series";
    };

    const row = await upsertMediaFromTmdb(tmdbId, "tv");
    const db = getDb();
    const meta = row.metaJson as { seasons?: { season_number: number }[] };
    const seasonNums = (meta.seasons ?? []).map((s) => s.season_number);
    const watchedOn = new Date().toISOString().slice(0, 10);

    // Bulk: mark all aired episodes in a season or the whole series
    if (body.markAll) {
      const scope = body.scope === "season" ? "season" : "series";
      const targetSeasons =
        scope === "season" && Number.isFinite(body.season)
          ? [Number(body.season)]
          : seasonNums;

      if (targetSeasons.length === 0) {
        return NextResponse.json({ error: "No seasons found" }, { status: 400 });
      }

      const seasonsData = await Promise.all(targetSeasons.map((n) => getTvSeason(tmdbId, n)));
      const toMark = seasonsData.flatMap((s) =>
        s.episodes
          .filter((e) => e.aired)
          .map((e) => ({ season: s.seasonNumber, episode: e.episodeNumber })),
      );

      for (const ep of toMark) {
        const existing = await db.query.episodeProgress.findFirst({
          where: and(
            eq(episodeProgress.userId, userId),
            eq(episodeProgress.mediaId, row.id),
            eq(episodeProgress.season, ep.season),
            eq(episodeProgress.episode, ep.episode),
          ),
        });

        if (existing) {
          if (!existing.watched) {
            await db
              .update(episodeProgress)
              .set({ watched: true, watchedOn })
              .where(eq(episodeProgress.id, existing.id));
          }
        } else {
          await db.insert(episodeProgress).values({
            userId,
            mediaId: row.id,
            season: ep.season,
            episode: ep.episode,
            watched: true,
            myRating: null,
            watchedOn,
          });
        }
      }

      const completion = await seriesCompletion({
        userId,
        mediaId: row.id,
        tmdbId,
        seasonNums,
      });

      return NextResponse.json({
        ok: true,
        mediaId: row.id,
        marked: toMark.length,
        ...completion,
      });
    }

    if (!Number.isFinite(body.season) || !Number.isFinite(body.episode)) {
      return NextResponse.json({ error: "season and episode required" }, { status: 400 });
    }

    const watched = body.watched ?? true;
    const singleWatchedOn = watched ? body.watchedOn || watchedOn : null;

    const existing = await db.query.episodeProgress.findFirst({
      where: and(
        eq(episodeProgress.userId, userId),
        eq(episodeProgress.mediaId, row.id),
        eq(episodeProgress.season, body.season!),
        eq(episodeProgress.episode, body.episode!),
      ),
    });

    if (existing) {
      await db
        .update(episodeProgress)
        .set({
          watched,
          myRating:
            body.myRating === null || body.myRating === undefined
              ? existing.myRating
              : String(body.myRating),
          watchedOn: singleWatchedOn,
        })
        .where(eq(episodeProgress.id, existing.id));
    } else {
      await db.insert(episodeProgress).values({
        userId,
        mediaId: row.id,
        season: body.season!,
        episode: body.episode!,
        watched,
        myRating: body.myRating != null ? String(body.myRating) : null,
        watchedOn: singleWatchedOn,
      });
    }

    const completion = await seriesCompletion({
      userId,
      mediaId: row.id,
      tmdbId,
      seasonNums,
    });

    return NextResponse.json({
      ok: true,
      mediaId: row.id,
      ...completion,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update episode";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
