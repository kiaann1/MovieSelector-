export type ExternalScores = {
  imdbRating: string | null;
  rtRating: string | null;
};

export async function fetchExternalScores(imdbId: string | null | undefined): Promise<ExternalScores> {
  if (!imdbId) return { imdbRating: null, rtRating: null };
  const key = process.env.OMDB_API_KEY;
  if (!key) return { imdbRating: null, rtRating: null };

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", key);
  url.searchParams.set("i", imdbId);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return { imdbRating: null, rtRating: null };
  const data = (await res.json()) as {
    Response?: string;
    imdbRating?: string;
    Ratings?: { Source: string; Value: string }[];
  };
  if (data.Response === "False") return { imdbRating: null, rtRating: null };

  const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value ?? null;
  const imdb = data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null;
  return { imdbRating: imdb, rtRating: rt };
}
