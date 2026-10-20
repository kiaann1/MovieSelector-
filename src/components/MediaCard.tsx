"use client";

import Link from "next/link";
import { Poster } from "./Poster";
import { ScoreBadge } from "./ScoreBadge";

type Props = {
  tmdbId: number;
  mediaType: "movie" | "tv" | string;
  title: string;
  year?: string | null;
  posterUrl?: string | null;
  overview?: string | null;
  myRating?: number | null;
  imdbRating?: string | null;
  rtRating?: string | null;
  actions?: React.ReactNode;
};

export function MediaCard({
  tmdbId,
  mediaType,
  title,
  year,
  posterUrl,
  overview,
  myRating,
  imdbRating,
  rtRating,
  actions,
}: Props) {
  const href = mediaType === "tv" ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;

  return (
    <article className="flex gap-3 rounded-2xl border border-cream/8 bg-surface/60 p-3 transition hover:border-gold/25">
      <Link href={href} className="shrink-0">
        <Poster src={posterUrl} alt={title} className="h-[132px] w-[88px] rounded-lg" />
      </Link>
      <div className="min-w-0 flex-1 flex flex-col">
        <Link href={href} className="group">
          <h3 className="font-display text-lg leading-snug text-cream group-hover:text-gold transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-muted">
            {mediaType === "tv" ? "TV" : "Film"}
            {year ? ` · ${year}` : ""}
          </p>
        </Link>
        {overview && <p className="mt-2 text-sm text-cream/55 line-clamp-2">{overview}</p>}
        <div className="mt-auto pt-2">
          <ScoreBadge myRating={myRating} imdbRating={imdbRating} rtRating={rtRating} compact />
        </div>
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}
