/** Client-safe TMDB image helper (no API key). */
export const TMDB_IMAGE = "https://image.tmdb.org/t/p";

export function posterUrl(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" | "original" = "w342",
) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE}/${size}${path}`;
}
