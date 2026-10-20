import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { media, users, watchedEntries, watchlistItems } from "@/lib/db/schema";
import { MOVIE_GENRES } from "@/lib/genres";
import { getSessionUserId } from "@/lib/session";
import {
  discoverMoviesByGenres,
  discoverTvByGenres,
  getMovieRecommendations,
  getSimilarMovies,
} from "@/lib/tmdb";

type RecItem = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  year: string;
  voteAverage: number | null;
  reason: string;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pageParam = Number(searchParams.get("page"));
    const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.min(pageParam, 8) : 1 + Math.floor(Math.random() * 4);

    const db = getDb();
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [watchlist, watched] = await Promise.all([
      db
        .select({ media })
        .from(watchlistItems)
        .innerJoin(media, eq(watchlistItems.mediaId, media.id))
        .where(eq(watchlistItems.userId, userId)),
      db
        .select({ media, myRating: watchedEntries.myRating })
        .from(watchedEntries)
        .innerJoin(media, eq(watchedEntries.mediaId, media.id))
        .where(and(eq(watchedEntries.userId, userId), gte(watchedEntries.myRating, "7"))),
    ]);

    const exclude = new Set<string>([
      ...watchlist.map((r) => `${r.media.mediaType}:${r.media.tmdbId}`),
      ...watched.map((r) => `${r.media.mediaType}:${r.media.tmdbId}`),
      ...(user.favoriteMovies ?? []).map((m) => `movie:${m.tmdbId}`),
    ]);

    const genreIds: number[] = [];
    for (const name of user.favoriteGenres ?? []) {
      const match = MOVIE_GENRES.find((g) => g.name.toLowerCase() === name.toLowerCase());
      if (match) genreIds.push(match.id);
    }

    const buckets: RecItem[] = [];
    const shuffledGenres = shuffle(genreIds).slice(0, 3);

    if (shuffledGenres.length > 0) {
      const [movies, shows] = await Promise.all([
        discoverMoviesByGenres(shuffledGenres, page),
        discoverTvByGenres(shuffledGenres, page),
      ]);
      for (const m of movies) {
        buckets.push({ ...m, reason: "Matches your genres" });
      }
      for (const s of shows) {
        buckets.push({ ...s, reason: "TV in your genres" });
      }
    }

    const seedIds = shuffle([
      ...(user.favoriteMovies ?? []).map((m) => m.tmdbId),
      ...watched
        .filter((w) => w.media.mediaType === "movie")
        .map((w) => w.media.tmdbId),
    ]).slice(0, 4);

    for (const id of seedIds) {
      const [similar, recommended] = await Promise.all([
        getSimilarMovies(id).catch(() => []),
        getMovieRecommendations(id).catch(() => []),
      ]);
      for (const m of shuffle(similar).slice(0, 8)) {
        buckets.push({ ...m, reason: "Similar to titles you like" });
      }
      for (const m of shuffle(recommended).slice(0, 8)) {
        buckets.push({ ...m, reason: "Recommended for you" });
      }
    }

    const seen = new Set<string>();
    const unique: RecItem[] = [];
    for (const item of shuffle(buckets)) {
      const key = `${item.mediaType}:${item.tmdbId}`;
      if (exclude.has(key) || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
      if (unique.length >= 36) break;
    }

    return NextResponse.json(
      {
        results: unique,
        page,
        basedOn: {
          genres: user.favoriteGenres ?? [],
          favoriteMovies: (user.favoriteMovies ?? []).map((m) => m.title),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Recommendations failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
