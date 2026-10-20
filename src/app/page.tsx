"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { MediaCard } from "@/components/MediaCard";
import { posterUrl } from "@/lib/tmdb-client";

type Result = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  year: string;
};

export default function SearchPage() {
  const [type, setType] = useState<"movie" | "tv">("movie");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  useEffect(() => {
    if (deferredQuery.trim().length < 2) {
      setResults([]);
      setPending(false);
      return;
    }
    const ctrl = new AbortController();
    setPending(true);
    (async () => {
      try {
        setError("");
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(deferredQuery)}&type=${type}`,
          { signal: ctrl.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data.results ?? []);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!ctrl.signal.aborted) setPending(false);
      }
    })();
    return () => ctrl.abort();
  }, [deferredQuery, type]);

  async function addToWatchlist(item: Result) {
    setAdding(item.tmdbId);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add");
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
          <p className="brand-mark text-gold text-xs mb-2 md:hidden">MovieSelector</p>
          <h1 className="font-display text-cream leading-none">Find something</h1>
          <p className="mt-2 text-muted text-sm max-w-xl">
            Search films and series, then park them on your list.
          </p>
        </div>
      </header>

      <div className="search-toolbar mb-6 md:mb-0">
        <div className="type-toggle mb-4 md:mb-0 flex gap-2 rounded-2xl border border-cream/10 bg-surface/50 p-1">
          {(["movie", "tv"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 min-h-11 rounded-xl text-sm font-medium transition px-4 ${
                type === t ? "bg-gold text-ink" : "text-muted hover:text-cream"
              }`}
            >
              {t === "movie" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={type === "movie" ? "Search movies…" : "Search TV shows…"}
          className="input-field w-full"
          autoFocus
        />
      </div>

      {pending && <p className="text-muted text-sm mb-3">Searching…</p>}
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <div className="media-grid">
        {results.map((item) => (
          <MediaCard
            key={`${item.mediaType}-${item.tmdbId}`}
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
        ))}
      </div>
      {!pending && deferredQuery.length >= 2 && results.length === 0 && !error && (
        <p className="text-muted text-sm text-center py-10">No results</p>
      )}
    </main>
  );
}
