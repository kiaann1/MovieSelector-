"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function WatchlistPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wizardItem, setWizardItem] = useState<Item | null>(null);
  const [randomItem, setRandomItem] = useState<Item | null>(null);
  const [randomOpen, setRandomOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
      body: JSON.stringify({ mediaType: "all" }),
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
      <header className="mb-6 flex items-end justify-between gap-3 animate-fade-in">
        <div>
          <p className="brand-mark text-gold text-xs mb-2">Queue</p>
          <h1 className="font-display text-4xl text-cream leading-none">Watchlist</h1>
          <p className="mt-2 text-muted text-sm">{items.length} waiting</p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={pickRandom} disabled={!items.length}>
          Random
        </button>
      </header>

      {loading && <p className="text-muted text-sm">Loading…</p>}
      {error && <p className="text-danger text-sm">{error}</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-cream/15 p-8 text-center">
          <p className="text-cream/80 mb-3">Your queue is empty.</p>
          <Link href="/" className="btn-secondary inline-flex">
            Search titles
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
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
