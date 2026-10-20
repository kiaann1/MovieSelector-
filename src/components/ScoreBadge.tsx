type Props = {
  myRating?: number | null;
  imdbRating?: string | null;
  rtRating?: string | null;
  compact?: boolean;
};

export function ScoreBadge({ myRating, imdbRating, rtRating, compact }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      {myRating != null && (
        <span className="rounded-md bg-gold/20 px-2 py-0.5 font-display text-gold tracking-wide">
          You {myRating.toFixed(1)}
        </span>
      )}
      {imdbRating && (
        <span className="rounded-md bg-cream/5 px-2 py-0.5 text-cream/80">IMDb {imdbRating}</span>
      )}
      {rtRating && (
        <span className="rounded-md bg-cream/5 px-2 py-0.5 text-cream/80">RT {rtRating}</span>
      )}
    </div>
  );
}
