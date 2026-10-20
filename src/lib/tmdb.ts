const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE = "https://image.tmdb.org/t/p";

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers: HeadersInit = { Accept: "application/json" };
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const key = process.env.TMDB_API_KEY;
    if (!key) throw new Error("TMDB_ACCESS_TOKEN or TMDB_API_KEY is not set");
    url.searchParams.set("api_key", key);
  }

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`TMDB error ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export type TmdbSearchItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  vote_average?: number;
};

export type TmdbCastMember = {
  name: string;
  character?: string;
  profile_path?: string | null;
};

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" | "original" = "w342") {
  if (!path) return null;
  return `${TMDB_IMAGE}/${size}${path}`;
}

export async function searchMedia(query: string, type: "movie" | "tv") {
  const data = await tmdbFetch<{ results: TmdbSearchItem[] }>(`/search/${type}`, {
    query,
    include_adult: "false",
  });
  return data.results.map((r) => ({
    tmdbId: r.id,
    mediaType: type,
    title: (type === "movie" ? r.title : r.name) ?? "Untitled",
    overview: r.overview ?? "",
    posterPath: r.poster_path ?? null,
    year: (type === "movie" ? r.release_date : r.first_air_date)?.slice(0, 4) ?? "",
    voteAverage: r.vote_average ?? null,
  }));
}

export async function discoverMoviesByGenres(genreIds: number[], page = 1) {
  const data = await tmdbFetch<{ results: TmdbSearchItem[] }>("/discover/movie", {
    with_genres: genreIds.join(","),
    sort_by: "popularity.desc",
    include_adult: "false",
    page: String(page),
  });
  return data.results.map((r) => ({
    tmdbId: r.id,
    mediaType: "movie" as const,
    title: r.title ?? "Untitled",
    overview: r.overview ?? "",
    posterPath: r.poster_path ?? null,
    year: r.release_date?.slice(0, 4) ?? "",
    voteAverage: r.vote_average ?? null,
  }));
}

export async function getMovieDetail(id: number) {
  const data = await tmdbFetch<{
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string;
    runtime: number | null;
    genres: { id: number; name: string }[];
    imdb_id?: string | null;
    credits?: { cast: TmdbCastMember[] };
    external_ids?: { imdb_id?: string | null };
  }>(`/movie/${id}`, { append_to_response: "credits,external_ids" });

  const imdbId = data.imdb_id || data.external_ids?.imdb_id || null;
  return {
    tmdbId: data.id,
    mediaType: "movie" as const,
    title: data.title,
    overview: data.overview ?? "",
    posterPath: data.poster_path,
    year: data.release_date?.slice(0, 4) ?? "",
    imdbId,
    runtime: data.runtime,
    genres: data.genres?.map((g) => g.name) ?? [],
    cast: (data.credits?.cast ?? []).slice(0, 12).map((c) => ({
      name: c.name,
      character: c.character,
    })),
  };
}

export async function getTvDetail(id: number) {
  const data = await tmdbFetch<{
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    first_air_date: string;
    number_of_seasons: number;
    number_of_episodes: number;
    genres: { id: number; name: string }[];
    seasons: {
      season_number: number;
      name: string;
      episode_count: number;
      air_date: string | null;
    }[];
    credits?: { cast: TmdbCastMember[] };
    external_ids?: { imdb_id?: string | null };
  }>(`/tv/${id}`, { append_to_response: "credits,external_ids" });

  return {
    tmdbId: data.id,
    mediaType: "tv" as const,
    title: data.name,
    overview: data.overview ?? "",
    posterPath: data.poster_path,
    year: data.first_air_date?.slice(0, 4) ?? "",
    imdbId: data.external_ids?.imdb_id ?? null,
    genres: data.genres?.map((g) => g.name) ?? [],
    numberOfSeasons: data.number_of_seasons,
    numberOfEpisodes: data.number_of_episodes,
    seasons: (data.seasons ?? []).filter((s) => s.season_number > 0),
    cast: (data.credits?.cast ?? []).slice(0, 12).map((c) => ({
      name: c.name,
      character: c.character,
    })),
  };
}

export async function getTvSeason(tvId: number, seasonNumber: number) {
  const data = await tmdbFetch<{
    season_number: number;
    name: string;
    episodes: {
      id: number;
      episode_number: number;
      name: string;
      overview: string;
      air_date: string | null;
      runtime: number | null;
      still_path: string | null;
    }[];
  }>(`/tv/${tvId}/season/${seasonNumber}`);

  const today = new Date().toISOString().slice(0, 10);
  return {
    seasonNumber: data.season_number,
    name: data.name,
    episodes: (data.episodes ?? []).map((e) => ({
      episodeNumber: e.episode_number,
      name: e.name,
      overview: e.overview ?? "",
      airDate: e.air_date,
      runtime: e.runtime,
      stillPath: e.still_path,
      aired: !e.air_date || e.air_date <= today,
    })),
  };
}
