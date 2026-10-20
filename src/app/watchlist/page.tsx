"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MediaCard } from "@/components/MediaCard";
import { RatingWizard, WizardPayload } from "@/components/RatingWizard";
import { RandomPickModal } from "@/components/RandomPickModal";

type Item = {
  id: number;
  tmdbId: number;
  mediaType: string;
  title: string;
  year?: string | null;
  overview?: string | null;
  posterUrl?: string | null;
  imdbRating?: string | null;
  rtRating?: string | null;
};

type Filter = "all" | "movie" | "tv";

export default function WatchlistPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wizardItem, setWizardItem] = useState<Item | null>(null);
  const [randomItem, setRandomItem] = useState<Item | null>(null);
  const [randomOpen, setRandomOpen] = useState(false);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.mediaType === filter)),
    [items, filter],
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items ?? []);
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

  async function remove(mediaId: number) {
    await fetch(`/api/watchlist?mediaId=${mediaId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== mediaId));
  }

  async function markWatchedMovie(item: Item) {
    if (item.mediaType === "tv") {
      window.location.href = `/tv/${item.tmdbId}`;
      return;
    }
    setWizardItem(item);
  }

  async function submitWizard(payload: WizardPayload) {
    if (!wizardItem) return;
    const res = await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: wizardItem.id,
        tmdbId: wizardItem.tmdbId,
        mediaType: wizardItem.mediaType,
        ...payload,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setItems((prev) => prev.filter((i) => i.id !== wizardItem.id));
  }

  async function pickRandom() {
    const res = await fetch("/api/watchlist/random", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType: filter }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Nothing to pick");
      return;
    }
    setRandomItem(data.item);
    setRandomOpen(true);
  }

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in">
        <div>
          <p className="brand-mark text-gold text-xs mb-2">Queue</p>
          <h1 className="font-display text-cream leading-none">Watchlist</h1>
          <p className="mt-2 text-muted text-sm">
            {filtered.length} waiting
            {filter !== "all" ? ` · ${filter === "movie" ? "movies" : "TV"}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={pickRandom}
          disabled={!filtered.length}
        >
          Random
        </button>
      </header>

      <div className="mb-6 flex gap-2 rounded-2xl border border-cream/10 bg-surface/50 p-1 max-w-md">
        {(
          [
            { id: "all", label: "All" },
            { id: "movie", label: "Movies" },
            { id: "tv", label: "TV Shows" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`flex-1 min-h-11 rounded-xl text-sm font-medium transition ${
              filter === t.id ? "bg-gold text-ink" : "text-muted hover:text-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      {loading && items.length === 0 && (
        <p className="text-muted text-sm">Loading…</p>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-cream/15 p-8 text-center max-w-lg">
          <p className="text-cream/80 mb-3">Your queue is empty.</p>
          <Link href="/" className="btn-secondary inline-flex">
            Search titles
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && filtered.length === 0 && (
        <p className="text-muted text-sm py-8 text-center">
          No {filter === "movie" ? "movies" : "TV shows"} in your watchlist.
        </p>
      )}

      <div className="media-grid">
        {filtered.map((item) => (
          <MediaCard
            key={item.id}
            tmdbId={item.tmdbId}
            mediaType={item.mediaType}
            title={item.title}
            year={item.year}
            overview={item.overview}
            posterUrl={item.posterUrl}
            imdbRating={item.imdbRating}
            rtRating={item.rtRating}
            actions={
              <>
                <button type="button" className="btn-primary text-sm px-3" onClick={() => markWatchedMovie(item)}>
                  {item.mediaType === "tv" ? "Track episodes" : "Watched"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => remove(item.id)}>
                  Remove
                </button>
              </>
            }
          />
        ))}
      </div>

      <RatingWizard
        open={Boolean(wizardItem)}
        title={wizardItem?.title ?? ""}
        posterUrl={wizardItem?.posterUrl}
        onClose={() => setWizardItem(null)}
        onSubmit={submitWizard}
      />

      <RandomPickModal
        open={randomOpen}
        item={randomItem}
        onClose={() => setRandomOpen(false)}
        onAgain={pickRandom}
      />
    </main>
  );
}
