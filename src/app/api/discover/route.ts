import { NextResponse } from "next/server";
import { MOVIE_GENRES } from "@/lib/genres";
import { discoverMoviesByGenres } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genresParam = searchParams.get("genres") ?? "";
    const names = genresParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ids: number[] = [];
    for (const name of names) {
      const match = MOVIE_GENRES.find((g) => g.name.toLowerCase() === name.toLowerCase());
      if (match) ids.push(match.id);
    }

    if (ids.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = await discoverMoviesByGenres(ids);
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Discover failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
