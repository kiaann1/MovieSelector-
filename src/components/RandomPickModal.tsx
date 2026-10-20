"use client";

import Link from "next/link";
import { Poster } from "./Poster";

type Item = {
  id: number;
  tmdbId: number;
  mediaType: string;
  title: string;
  year?: string | null;
  posterUrl?: string | null;
  overview?: string | null;
};

type Props = {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onAgain: () => void;
};

export function RandomPickModal({ open, item, onClose, onAgain }: Props) {
  if (!open || !item) return null;
  const href = item.mediaType === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-sm animate-pop border border-gold/25 bg-ink-elevated rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative">
          <Poster src={item.posterUrl} alt={item.title} className="aspect-[2/3] w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-gold mb-1">Tonight&apos;s pick</p>
            <h2 className="font-display text-2xl text-cream leading-tight">{item.title}</h2>
            {item.year && <p className="text-muted text-sm mt-1">{item.year}</p>}
          </div>
        </div>
        <div className="flex gap-2 p-4">
          <button type="button" className="btn-secondary flex-1" onClick={onAgain}>
            Spin again
          </button>
          <Link href={href} className="btn-primary flex-1 text-center" onClick={onClose}>
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
