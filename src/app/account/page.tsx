"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MOVIE_GENRES } from "@/lib/genres";
import { fileToAvatarDataUrl } from "@/lib/image";
import { posterUrl } from "@/lib/tmdb-client";
import { Poster } from "@/components/Poster";

type FavoriteMovie = {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  year?: string;
};

type User = {
  id: number;
  name: string;
  avatarDataUrl: string | null;
  favoriteGenres: string[];
  favoriteMovies: FavoriteMovie[];
  createdAt?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setUser(data.user);
      setName(data.user.name);
      setGenres(data.user.favoriteGenres ?? []);
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

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
    setSaved(false);
  }

  async function onAvatar(file: File | null) {
    if (!file || !user) return;
    try {
      const avatarDataUrl = await fileToAvatarDataUrl(file);
      setSaving(true);
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setUser(data.user);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, favoriteGenres: genres }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setUser(data.user);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/unlock");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="page-shell">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell">
        <p className="text-danger">{error || "Not signed in"}</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in">
        <div>
          <p className="brand-mark text-gold text-xs mb-2">Profile</p>
          <h1 className="font-display text-cream leading-none">Account</h1>
          <p className="mt-2 text-muted text-sm">Your taste powers You may like.</p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={logout}>
          Log out
        </button>
      </header>

      <section className="rounded-2xl border border-cream/10 bg-surface/50 p-5 mb-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-gold/30 bg-ink shrink-0">
            {user.avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-3xl text-gold">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label className="btn-secondary cursor-pointer inline-flex text-sm">
              Change photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="text-xs text-muted mt-2">PIN stays the same across devices.</p>
          </div>
        </div>

        <label className="block mt-5 text-sm text-muted mb-1.5">Display name</label>
        <input
          className="input-field w-full"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
      </section>

      <section className="mb-6 max-w-3xl">
        <h2 className="font-display text-2xl text-cream mb-3">Favourite genres</h2>
        <div className="flex flex-wrap gap-2">
          {MOVIE_GENRES.map((g) => {
            const on = genres.includes(g.name);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.name)}
                className={`min-h-10 rounded-xl border px-3 py-2 text-sm transition ${
                  on
                    ? "border-gold bg-gold/20 text-gold"
                    : "border-cream/10 text-cream/80 hover:border-gold/40"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </section>

      {(user.favoriteMovies?.length ?? 0) > 0 && (
        <section className="mb-6 max-w-3xl">
          <h2 className="font-display text-2xl text-cream mb-3">Favourite movies</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {user.favoriteMovies.map((m) => (
              <div key={m.tmdbId} className="rounded-xl overflow-hidden border border-cream/10">
                <Poster
                  src={posterUrl(m.posterPath, "w185")}
                  alt={m.title}
                  className="aspect-[2/3] w-full"
                />
                <p className="p-1.5 text-[11px] text-cream/75 line-clamp-2">{m.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <p className="text-danger text-sm mb-3">{error}</p>}
      {saved && <p className="text-gold text-sm mb-3">Saved</p>}

      <button type="button" className="btn-primary" disabled={saving || !name.trim()} onClick={saveProfile}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </main>
  );
}
