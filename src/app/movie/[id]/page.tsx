"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Poster } from "@/components/Poster";
import { ScoreBadge } from "@/components/ScoreBadge";
import { RatingWizard, WizardPayload } from "@/components/RatingWizard";

type MediaDetail = {
  id: number;
  tmdbId: number;
  mediaType: string;
  title: string;
  year?: string | null;
  overview?: string | null;
  posterUrl?: string | null;
  imdbRating?: string | null;
  rtRating?: string | null;
  castJson?: { name: string; character?: string }[];
  myRating?: number | null;
  onWatchlist?: boolean;
  isWatched?: boolean;
  feelings?: string[];
  comments?: string;
  watchedOn?: string | null;
};

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [error, setError] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/media/movie/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setMedia(data.media);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addWatchlist() {
    if (!media) return;
    setBusy(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: media.tmdbId, mediaType: "movie" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitWizard(payload: WizardPayload) {
    if (!media) return;
    const res = await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: media.id,
        tmdbId: media.tmdbId,
        mediaType: "movie",
        ...payload,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    router.push("/watched");
  }

  if (error) {
    return (
      <main className="page-shell">
        <p className="text-danger">{error}</p>
      </main>
    );
  }

  if (!media) {
    return (
      <main className="page-shell">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="animate-fade-in detail-layout">
        <div className="detail-hero">
          <Poster
            src={media.posterUrl}
            alt={media.title}
            className="poster-lg h-48 w-32 rounded-xl shrink-0 md:h-auto md:w-full"
          />
          <div className="min-w-0 md:hidden">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-1">Film</p>
            <h1 className="font-display text-3xl text-cream leading-tight">{media.title}</h1>
            {media.year && <p className="text-muted mt-1">{media.year}</p>}
            <div className="mt-3">
              <ScoreBadge
                myRating={media.myRating}
                imdbRating={media.imdbRating}
                rtRating={media.rtRating}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="hidden md:block mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-1">Film</p>
            <h1 className="font-display text-4xl text-cream leading-tight">{media.title}</h1>
            {media.year && <p className="text-muted mt-2 text-lg">{media.year}</p>}
            <div className="mt-4">
              <ScoreBadge
                myRating={media.myRating}
                imdbRating={media.imdbRating}
                rtRating={media.rtRating}
              />
            </div>
          </div>

          {media.overview && (
            <p className="mt-2 md:mt-0 text-cream/70 leading-relaxed max-w-3xl">{media.overview}</p>
          )}

          {(media.castJson?.length ?? 0) > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-xl text-cream mb-2">Cast</h2>
              <ul className="space-y-1 text-sm text-muted columns-1 md:columns-2 gap-8">
                {media.castJson!.slice(0, 8).map((c) => (
                  <li key={c.name} className="break-inside-avoid mb-1">
                    <span className="text-cream/85">{c.name}</span>
                    {c.character ? ` — ${c.character}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            {!media.isWatched && !media.onWatchlist && (
              <button type="button" className="btn-primary" disabled={busy} onClick={addWatchlist}>
                Add to watchlist
              </button>
            )}
            {!media.isWatched && (
              <button type="button" className="btn-primary" onClick={() => setWizardOpen(true)}>
                Mark watched
              </button>
            )}
            {media.isWatched && (
              <button type="button" className="btn-secondary" onClick={() => setWizardOpen(true)}>
                Edit rating
              </button>
            )}
          </div>
        </div>
      </div>

      <RatingWizard
        open={wizardOpen}
        title={media.title}
        posterUrl={media.posterUrl}
        onClose={() => setWizardOpen(false)}
        onSubmit={submitWizard}
      />
    </main>
  );
}
