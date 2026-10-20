import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { episodeProgress, watchedEntries } from "@/lib/db/schema";
import { upsertMediaFromTmdb } from "@/lib/media-service";
import { getSessionUserId } from "@/lib/session";
import { getTvSeason } from "@/lib/tmdb";

type Params = { params: Promise<{ id: string }> };
type EpRef = { season: number; episode: number };

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function completionFromAired(opts: {
  userId: number;
  mediaId: number;
  airedEps: EpRef[];
}) {
  const { userId, mediaId, airedEps } = opts;
  const db = getDb();

  const [progress, alreadySeriesWatched] = await Promise.all([
    db.query.episodeProgress.findMany({
      where: and(eq(episodeProgress.userId, userId), eq(episodeProgress.mediaId, mediaId)),
    }),
    db.query.watchedEntries.findFirst({
      where: and(eq(watchedEntries.userId, userId), eq(watchedEntries.mediaId, mediaId)),
    }),
  ]);

  const watchedKeys = new Set(
    progress.filter((p) => p.watched).map((p) => `${p.season}:${p.episode}`),
  );
  const allWatched =
    airedEps.length > 0 && airedEps.every((ep) => watchedKeys.has(`${ep.season}:${ep.episode}`));

  return {
    seriesComplete: allWatched && !alreadySeriesWatched,
    alreadyRated: Boolean(alreadySeriesWatched),
    airedCount: airedEps.length,
    watchedCount: progress.filter((p) => p.watched).length,
  };
}

async function loadAiredEpisodes(tmdbId: number, seasonNums: number[]) {
  const seasonsData = await Promise.all(seasonNums.map((n) => getTvSeason(tmdbId, n)));
  return seasonsData.flatMap((s) =>
    s.episodes
      .filter((e) => e.aired)
      .map((e) => ({ season: s.seasonNumber, episode: e.episodeNumber })),
  );
}

async function bulkMarkWatched(opts: {
  userId: number;
  mediaId: number;
  episodes: EpRef[];
  watchedOn: string;
}) {
  const { userId, mediaId, episodes, watchedOn } = opts;
  if (episodes.length === 0) return;

  const db = getDb();
  const existing = await db.query.episodeProgress.findMany({
    where: and(eq(episodeProgress.userId, userId), eq(episodeProgress.mediaId, mediaId)),
  });
  const byKey = new Map(existing.map((p) => [`${p.season}:${p.episode}`, p]));

  const toInsert: {
    userId: number;
    mediaId: number;
    season: number;
    episode: number;
    watched: boolean;
    myRating: null;
    watchedOn: string;
  }[] = [];
  const toUpdateIds: number[] = [];

  for (const ep of episodes) {
    const key = `${ep.season}:${ep.episode}`;
    const row = byKey.get(key);
    if (!row) {
      toInsert.push({
        userId,
        mediaId,
        season: ep.season,
        episode: ep.episode,
        watched: true,
        myRating: null,
        watchedOn,
      });
    } else if (!row.watched) {
      toUpdateIds.push(row.id);
    }
  }

  const jobs: Promise<unknown>[] = [];

  for (const batch of chunk(toInsert, 100)) {
    if (batch.length) {
      jobs.push(db.insert(episodeProgress).values(batch));
    }
  }

  for (const batch of chunk(toUpdateIds, 200)) {
    if (batch.length) {
      jobs.push(
        db
          .update(episodeProgress)
          .set({ watched: true, watchedOn })
          .where(inArray(episodeProgress.id, batch)),
      );
    }
  }

  await Promise.all(jobs);
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

    if (body.markAll) {
      const scope = body.scope === "season" ? "season" : "series";
      const targetSeasons =
        scope === "season" && Number.isFinite(body.season)
          ? [Number(body.season)]
          : seasonNums;

      if (targetSeasons.length === 0) {
        return NextResponse.json({ error: "No seasons found" }, { status: 400 });
      }

      // Fetch episode lists once (parallel). Series complete needs all seasons.
      const seasonsNeeded =
        scope === "series" ? targetSeasons : Array.from(new Set([...targetSeasons, ...seasonNums]));
      const seasonsData = await Promise.all(seasonsNeeded.map((n) => getTvSeason(tmdbId, n)));

      const toMark = seasonsData
        .filter((s) => targetSeasons.includes(s.seasonNumber))
        .flatMap((s) =>
          s.episodes
            .filter((e) => e.aired)
            .map((e) => ({ season: s.seasonNumber, episode: e.episodeNumber })),
        );

      const allAired = seasonsData.flatMap((s) =>
        s.episodes
          .filter((e) => e.aired)
          .map((e) => ({ season: s.seasonNumber, episode: e.episodeNumber })),
      );

      await bulkMarkWatched({
        userId,
        mediaId: row.id,
        episodes: toMark,
        watchedOn,
      });

      const completion = await completionFromAired({
        userId,
        mediaId: row.id,
        airedEps: allAired,
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

    const airedEps = await loadAiredEpisodes(tmdbId, seasonNums);
    const completion = await completionFromAired({
      userId,
      mediaId: row.id,
      airedEps,
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
