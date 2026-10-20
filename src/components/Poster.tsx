type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

export function Poster({ src, alt, className = "" }: Props) {
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface to-ink text-muted text-xs p-2 text-center">
          No poster
        </div>
      )}
    </div>
  );
}
