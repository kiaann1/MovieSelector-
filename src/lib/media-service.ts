import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { media } from "./db/schema";
import { fetchExternalScores } from "./omdb";
import { getMovieDetail, getTvDetail } from "./tmdb";

export async function upsertMediaFromTmdb(tmdbId: number, mediaType: "movie" | "tv") {
  const db = getDb();
  const detail =
    mediaType === "movie" ? await getMovieDetail(tmdbId) : await getTvDetail(tmdbId);

  const existing = await db.query.media.findFirst({
    where: and(eq(media.tmdbId, tmdbId), eq(media.mediaType, mediaType)),
  });

  let scores = {
    imdbRating: existing?.imdbRating ?? null,
    rtRating: existing?.rtRating ?? null,
  };
  if (detail.imdbId && (!scores.imdbRating || !scores.rtRating)) {
    scores = await fetchExternalScores(detail.imdbId);
  }

  const payload = {
    tmdbId: detail.tmdbId,
    mediaType: detail.mediaType,
    title: detail.title,
    posterPath: detail.posterPath,
    overview: detail.overview,
    year: detail.year,
    imdbId: detail.imdbId,
    castJson: detail.cast,
    metaJson: {
      genres: detail.genres,
      ...(mediaType === "movie"
        ? { runtime: (detail as Awaited<ReturnType<typeof getMovieDetail>>).runtime }
        : {
            numberOfSeasons: (detail as Awaited<ReturnType<typeof getTvDetail>>).numberOfSeasons,
            numberOfEpisodes: (detail as Awaited<ReturnType<typeof getTvDetail>>).numberOfEpisodes,
            seasons: (detail as Awaited<ReturnType<typeof getTvDetail>>).seasons,
          }),
    },
    imdbRating: scores.imdbRating,
    rtRating: scores.rtRating,
    updatedAt: new Date(),
  };

  if (existing) {
    const [row] = await db
      .update(media)
      .set(payload)
      .where(eq(media.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db.insert(media).values(payload).returning();
  return row;
}
