import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { watchlistItems, watchedEntries, episodeProgress } from "@/lib/db/schema";
import { upsertMediaFromTmdb } from "@/lib/media-service";
import { getSessionUserId } from "@/lib/session";
import { getTvSeason, posterUrl } from "@/lib/tmdb";

type Params = { params: Promise<{ type: string; id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, id } = await params;
    const mediaType = type === "tv" ? "tv" : "movie";
    const tmdbId = Number(id);
    if (!Number.isFinite(tmdbId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const row = await upsertMediaFromTmdb(tmdbId, mediaType);
    const db = getDb();

    const [onWatchlist, watched, episodes] = await Promise.all([
      db.query.watchlistItems.findFirst({
        where: and(eq(watchlistItems.userId, userId), eq(watchlistItems.mediaId, row.id)),
      }),
      db.query.watchedEntries.findFirst({
        where: and(eq(watchedEntries.userId, userId), eq(watchedEntries.mediaId, row.id)),
      }),
      mediaType === "tv"
        ? db.query.episodeProgress.findMany({
            where: and(eq(episodeProgress.userId, userId), eq(episodeProgress.mediaId, row.id)),
          })
        : Promise.resolve([]),
    ]);

    let seasonsWithEpisodes = null;
    if (mediaType === "tv") {
      const meta = row.metaJson as { seasons?: { season_number: number }[] };
      const seasonNums = (meta.seasons ?? []).map((s) => s.season_number);
      seasonsWithEpisodes = await Promise.all(
        seasonNums.map(async (n) => {
          const season = await getTvSeason(tmdbId, n);
          return {
            ...season,
            episodes: season.episodes.map((ep) => {
              const progress = episodes.find(
                (p) => p.season === n && p.episode === ep.episodeNumber,
              );
              return {
                ...ep,
                watched: progress?.watched ?? false,
                myRating: progress?.myRating ? Number(progress.myRating) : null,
                watchedOn: progress?.watchedOn ?? null,
              };
            }),
          };
        }),
      );
    }

    return NextResponse.json({
      media: {
        ...row,
        posterUrl: posterUrl(row.posterPath),
        myRating: watched?.myRating ? Number(watched.myRating) : null,
        feelings: watched?.feelings ?? [],
        comments: watched?.comments ?? "",
        watchedOn: watched?.watchedOn ?? null,
        onWatchlist: Boolean(onWatchlist),
        isWatched: Boolean(watched),
      },
      seasons: seasonsWithEpisodes,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
