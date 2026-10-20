"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaCard } from "@/components/MediaCard";
import { RatingWizard, WizardPayload } from "@/components/RatingWizard";

type Item = {
  id: number;
  entryId: number;
  tmdbId: number;
  mediaType: string;
  title: string;
  year?: string | null;
  overview?: string | null;
  posterUrl?: string | null;
  myRating: number;
  imdbRating?: string | null;
  rtRating?: string | null;
  feelings?: string[];
  comments?: string;
  watchedOn: string;
};

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "highest", label: "Highest rated" },
  { id: "lowest", label: "Lowest rated" },
  { id: "title", label: "Title A–Z" },
] as const;

export default function WatchedPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("newest");
  const [type, setType] = useState<"all" | "movie" | "tv">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort });
      if (type !== "all") params.set("type", type);
      const res = await fetch(`/api/watched?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [sort, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitEdit(payload: WizardPayload) {
    if (!editing) return;
    const res = await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: editing.id,
        tmdbId: editing.tmdbId,
        mediaType: editing.mediaType,
        ...payload,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");

    setItems((prev) =>
      prev.map((item) =>
        item.entryId === editing.entryId
          ? {
              ...item,
              myRating: payload.myRating,
              feelings: payload.feelings,
              comments: payload.comments,
              watchedOn: payload.watchedOn,
              overview: payload.comments || item.overview,
            }
          : item,
      ),
    );
    setEditing(null);
    await load();
  }

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in">
        <div>
          <p className="brand-mark text-gold text-xs mb-2">Archive</p>
          <h1 className="font-display text-cream leading-none">Watched</h1>
          <p className="mt-2 text-muted text-sm max-w-xl">
            Sorted by your rating first — IMDb & RT are secondary.
          </p>
        </div>
      </header>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {(["all", "movie", "tv"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`min-h-10 shrink-0 rounded-xl px-3 text-sm border transition ${
              type === t
                ? "border-gold bg-gold/15 text-gold"
                : "border-cream/10 text-muted hover:text-cream"
            }`}
          >
            {t === "all" ? "All" : t === "movie" ? "Movies" : "TV"}
          </button>
        ))}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSort(s.id)}
            className={`min-h-10 shrink-0 rounded-xl px-3 text-sm border transition ${
              sort === s.id
                ? "border-gold bg-gold/15 text-gold"
                : "border-cream/10 text-muted hover:text-cream"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      {loading && items.length === 0 && (
        <p className="text-muted text-sm">Loading…</p>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="text-muted text-center py-12">Nothing watched yet.</p>
      )}

      <div className="media-grid">
        {items.map((item) => (
          <MediaCard
            key={item.entryId}
            tmdbId={item.tmdbId}
            mediaType={item.mediaType}
            title={item.title}
            year={item.year}
            overview={item.comments || item.overview}
            posterUrl={item.posterUrl}
            myRating={item.myRating}
            imdbRating={item.imdbRating}
            rtRating={item.rtRating}
            footer={
              <>
                <span>Watched {item.watchedOn}</span>
                {(item.feelings ?? []).map((f) => (
                  <span key={f} className="rounded-md bg-cream/5 px-2 py-0.5 text-cream/70">
                    {f}
                  </span>
                ))}
              </>
            }
            actions={
              <button
                type="button"
                className="btn-secondary text-sm px-3"
                onClick={() => setEditing(item)}
              >
                Edit
              </button>
            }
          />
        ))}
      </div>

      <RatingWizard
        open={Boolean(editing)}
        mode="edit"
        seedKey={editing?.entryId}
        title={editing?.title ?? ""}
        posterUrl={editing?.posterUrl}
        initial={
          editing
            ? {
                myRating: editing.myRating,
                feelings: editing.feelings ?? [],
                comments: editing.comments ?? "",
                watchedOn: editing.watchedOn,
              }
            : null
        }
        onClose={() => setEditing(null)}
        onSubmit={submitEdit}
      />
    </main>
  );
}
