"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Poster } from "@/components/Poster";
import { ScoreBadge } from "@/components/ScoreBadge";
import { RatingWizard, WizardPayload } from "@/components/RatingWizard";
import { posterUrl } from "@/lib/tmdb-client";

type Episode = {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  aired: boolean;
  stillPath: string | null;
  watched: boolean;
  myRating: number | null;
};

type Season = {
  seasonNumber: number;
  name: string;
  episodes: Episode[];
};

type MediaDetail = {
  id: number;
  tmdbId: number;
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
};

export default function TvDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [error, setError] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [ratingEpisode, setRatingEpisode] = useState<{ season: number; episode: number } | null>(null);
  const [epRating, setEpRating] = useState(7);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/media/tv/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setMedia(data.media);
      setSeasons(data.seasons ?? []);
      if (data.seasons?.[0]?.seasonNumber) {
        setActiveSeason(data.seasons[0].seasonNumber);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const season = useMemo(
    () => seasons.find((s) => s.seasonNumber === activeSeason),
    [seasons, activeSeason],
  );

  const progress = useMemo(() => {
    const aired = seasons.flatMap((s) => s.episodes.filter((e) => e.aired));
    const watched = aired.filter((e) => e.watched);
    return { aired: aired.length, watched: watched.length };
  }, [seasons]);

  async function addWatchlist() {
    if (!media) return;
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: media.tmdbId, mediaType: "tv" }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Failed");
    else await load();
  }

  async function toggleEpisode(seasonNum: number, ep: Episode, watched: boolean) {
    const res = await fetch(`/api/tv/${params.id}/episodes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season: seasonNum,
        episode: ep.episodeNumber,
        watched,
        myRating: ep.myRating,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed");
      return;
    }
    await load();
    if (data.seriesComplete) {
      setWizardOpen(true);
    }
  }

  async function saveEpisodeRating() {
    if (!ratingEpisode) return;
    const res = await fetch(`/api/tv/${params.id}/episodes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season: ratingEpisode.season,
        episode: ratingEpisode.episode,
        watched: true,
        myRating: epRating,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed");
      return;
    }
    setRatingEpisode(null);
    await load();
    if (data.seriesComplete) setWizardOpen(true);
  }

  async function submitSeriesWizard(payload: WizardPayload) {
    if (!media) return;
    const res = await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: media.id,
        tmdbId: media.tmdbId,
        mediaType: "tv",
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
      <div className="animate-fade-in">
        <div className="detail-layout mb-8">
          <div className="detail-hero">
            <Poster
              src={media.posterUrl}
              alt={media.title}
              className="poster-lg h-48 w-32 rounded-xl shrink-0 md:h-auto md:w-full"
            />
            <div className="min-w-0 md:hidden">
              <p className="text-xs uppercase tracking-[0.2em] text-gold mb-1">Series</p>
              <h1 className="font-display text-3xl text-cream leading-tight">{media.title}</h1>
              {media.year && <p className="text-muted mt-1">{media.year}</p>}
              <p className="text-sm text-cream/60 mt-2">
                {progress.watched}/{progress.aired} aired episodes
              </p>
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
              <p className="text-xs uppercase tracking-[0.2em] text-gold mb-1">Series</p>
              <h1 className="font-display text-4xl text-cream leading-tight">{media.title}</h1>
              {media.year && <p className="text-muted mt-2 text-lg">{media.year}</p>}
              <p className="text-sm text-cream/60 mt-2">
                {progress.watched}/{progress.aired} aired episodes
              </p>
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

            <div className="mt-4 flex flex-wrap gap-2">
              {!media.onWatchlist && !media.isWatched && (
                <button type="button" className="btn-primary" onClick={addWatchlist}>
                  Add to watchlist
                </button>
              )}
              {!media.isWatched &&
                progress.aired > 0 &&
                progress.watched >= progress.aired && (
                  <button type="button" className="btn-primary" onClick={() => setWizardOpen(true)}>
                    Rate series
                  </button>
                )}
              {media.isWatched && (
                <button type="button" className="btn-secondary" onClick={() => setWizardOpen(true)}>
                  Edit series rating
                </button>
              )}
            </div>

            {(media.castJson?.length ?? 0) > 0 && (
              <section className="mt-6">
                <h2 className="font-display text-xl text-cream mb-2">Cast</h2>
                <ul className="space-y-1 text-sm text-muted columns-1 md:columns-2 gap-8">
                  {media.castJson!.slice(0, 6).map((c) => (
                    <li key={c.name} className="break-inside-avoid mb-1">
                      <span className="text-cream/85">{c.name}</span>
                      {c.character ? ` — ${c.character}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <section className="mt-2">
          <h2 className="font-display text-2xl text-cream mb-3">Episodes</h2>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {seasons.map((s) => (
              <button
                key={s.seasonNumber}
                type="button"
                onClick={() => setActiveSeason(s.seasonNumber)}
                className={`min-h-10 shrink-0 rounded-xl px-3 text-sm border transition ${
                  activeSeason === s.seasonNumber
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-cream/10 text-muted"
                }`}
              >
                S{s.seasonNumber}
              </button>
            ))}
          </div>

          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {season?.episodes.map((ep) => (
              <div
                key={ep.episodeNumber}
                className={`flex gap-3 rounded-xl border p-3 ${
                  ep.watched ? "border-gold/25 bg-gold/5" : "border-cream/8 bg-surface/40"
                }`}
              >
                <Poster
                  src={posterUrl(ep.stillPath, "w185")}
                  alt={ep.name}
                  className="h-16 w-28 rounded-md shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-cream font-medium">
                    E{ep.episodeNumber}. {ep.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {ep.airDate || "TBA"}
                    {!ep.aired ? " · Not aired" : ""}
                    {ep.myRating != null ? ` · ${ep.myRating}/10` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={ep.watched ? "btn-secondary text-xs min-h-9 px-2" : "btn-primary text-xs min-h-9 px-2"}
                      disabled={!ep.aired && !ep.watched}
                      onClick={() => toggleEpisode(activeSeason, ep, !ep.watched)}
                    >
                      {ep.watched ? "Unwatch" : "Watched"}
                    </button>
                    {ep.watched && (
                      <button
                        type="button"
                        className="btn-ghost text-xs min-h-9"
                        onClick={() => {
                          setEpRating(ep.myRating ?? 7);
                          setRatingEpisode({ season: activeSeason, episode: ep.episodeNumber });
                        }}
                      >
                        Rate /10
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {ratingEpisode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setRatingEpisode(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-gold/20 bg-ink-elevated p-5 animate-slide-up">
            <h3 className="font-display text-xl text-cream mb-3">
              Rate S{ratingEpisode.season}E{ratingEpisode.episode}
            </h3>
            <div className="flex items-end justify-center gap-2 mb-3">
              <span className="font-display text-5xl text-gold">{epRating.toFixed(1)}</span>
              <span className="text-muted mb-1">/10</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={epRating}
              onChange={(e) => setEpRating(Number(e.target.value))}
              className="w-full accent-gold mb-4"
            />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setRatingEpisode(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" onClick={saveEpisodeRating}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <RatingWizard
        open={wizardOpen}
        title={media.title}
        posterUrl={media.posterUrl}
        onClose={() => setWizardOpen(false)}
        onSubmit={submitSeriesWizard}
      />
    </main>
  );
}
