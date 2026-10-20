"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaCard } from "@/components/MediaCard";
import { posterUrl } from "@/lib/tmdb-client";

type Rec = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  year: string;
  reason: string;
};

export default function ForYouPage() {
  const [results, setResults] = useState<Rec[]>([]);
  const [basedOn, setBasedOn] = useState<{ genres: string[]; favoriteMovies: string[] }>({
    genres: [],
    favoriteMovies: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<number | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/recommendations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setResults(data.results ?? []);
      setBasedOn(data.basedOn ?? { genres: [], favoriteMovies: [] });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addToWatchlist(item: Rec) {
    setAdding(item.tmdbId);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add");
      setResults((prev) => prev.filter((r) => !(r.tmdbId === item.tmdbId && r.mediaType === item.mediaType)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not add");
    } finally {
      setAdding(null);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in">
        <div>
          <p className="brand-mark text-gold text-xs mb-2">Picks</p>
          <h1 className="font-display text-cream leading-none">You may like</h1>
          <p className="mt-2 text-muted text-sm max-w-xl">
            Based on your genres
            {basedOn.genres.length ? ` (${basedOn.genres.slice(0, 4).join(", ")})` : ""}
            {basedOn.favoriteMovies.length
              ? ` and favourites like ${basedOn.favoriteMovies.slice(0, 2).join(", ")}`
              : ""}
            .
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => load({ silent: results.length > 0 })}
          disabled={loading && results.length === 0}
        >
          Refresh
        </button>
      </header>

      {error && <p className="text-danger text-sm">{error}</p>}

      {loading && results.length === 0 && (
        <p className="text-muted text-sm">Finding titles…</p>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-cream/15 p-8 text-center max-w-lg">
          <p className="text-cream/80 mb-2">No suggestions yet.</p>
          <p className="text-muted text-sm">
            Add favourite genres on your Account tab to unlock better picks.
          </p>
        </div>
      )}

      <div className="media-grid">
        {results.map((item) => (
          <div key={`${item.mediaType}-${item.tmdbId}`} className="space-y-1">
            <MediaCard
              tmdbId={item.tmdbId}
              mediaType={item.mediaType}
              title={item.title}
              year={item.year}
              overview={item.overview}
              posterUrl={posterUrl(item.posterPath)}
              actions={
                <button
                  type="button"
                  className="btn-primary text-sm px-3"
                  disabled={adding === item.tmdbId}
                  onClick={() => addToWatchlist(item)}
                >
                  {adding === item.tmdbId ? "Adding…" : "Add to watchlist"}
                </button>
              }
            />
            <p className="px-3 text-xs text-gold/80">{item.reason}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
