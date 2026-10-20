"use client";

import { useEffect, useMemo, useState } from "react";
import { MOVIE_GENRES } from "@/lib/genres";
import { fileToAvatarDataUrl } from "@/lib/image";
import { posterUrl } from "@/lib/tmdb-client";
import { Poster } from "./Poster";

type MoviePick = {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  year?: string;
};

type Props = {
  onBack: () => void;
  onComplete: (createdPin: string) => void;
};

const STEPS = ["Name", "Photo", "Genres", "Favourites", "PIN"] as const;

export function OnboardingWizard({ onBack, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<MoviePick[]>([]);
  const [pinMode, setPinMode] = useState<"auto" | "custom">("auto");
  const [customPin, setCustomPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<MoviePick[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createPhase, setCreatePhase] = useState(0);

  const createMessages = useMemo(
    () => [
      "Setting up your vault…",
      "Saving your taste…",
      "Creating your account…",
    ],
    [],
  );

  useEffect(() => {
    if (step !== 3) return;
    const ctrl = new AbortController();
    setLoadingSuggestions(true);

    const run = async () => {
      try {
        let url: string;
        if (search.trim().length >= 2) {
          url = `/api/search?q=${encodeURIComponent(search.trim())}&type=movie`;
        } else if (genres.length > 0) {
          url = `/api/discover?genres=${encodeURIComponent(genres.join(","))}`;
        } else {
          setSuggestions([]);
          setLoadingSuggestions(false);
          return;
        }
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load movies");
        setSuggestions(
          (data.results ?? []).map(
            (r: {
              tmdbId: number;
              title: string;
              posterPath?: string | null;
              year?: string;
            }) => ({
              tmdbId: r.tmdbId,
              title: r.title,
              posterPath: r.posterPath,
              year: r.year,
            }),
          ),
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoadingSuggestions(false);
      }
    };

    const t = setTimeout(run, search.trim().length >= 2 ? 280 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [step, search, genres]);

  function toggleGenre(name: string) {
    setGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name],
    );
  }

  function toggleFavorite(movie: MoviePick) {
    setFavorites((prev) => {
      const exists = prev.some((m) => m.tmdbId === movie.tmdbId);
      if (exists) return prev.filter((m) => m.tmdbId !== movie.tmdbId);
      if (prev.length >= 8) return prev;
      return [...prev, movie];
    });
  }

  async function onAvatarChange(file: File | null) {
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarDataUrl(dataUrl);
      setError("");
    } catch {
      setError("Could not process that photo");
    }
  }

  function canNext() {
    if (step === 0) return name.trim().length >= 1;
    if (step === 1) return true;
    if (step === 2) return genres.length >= 1;
    if (step === 3) return favorites.length >= 1;
    if (step === 4) {
      if (pinMode === "auto") return true;
      return /^\d{4,8}$/.test(customPin) && customPin === confirmPin;
    }
    return false;
  }

  async function finish() {
    setError("");
    setCreating(true);
    setCreatePhase(0);

    const phaseTimer = setInterval(() => {
      setCreatePhase((p) => Math.min(p + 1, createMessages.length - 1));
    }, 900);

    const minWait = new Promise((r) => setTimeout(r, 2400));

    try {
      const resPromise = fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatarDataUrl,
          favoriteGenres: genres,
          favoriteMovies: favorites,
          autoPin: pinMode === "auto",
          pin: pinMode === "custom" ? customPin : undefined,
        }),
      });

      const [res] = await Promise.all([resPromise, minWait]);
      const data = await res.json();
      clearInterval(phaseTimer);

      if (!res.ok) {
        setCreating(false);
        setError(data.error || "Could not create account");
        return;
      }

      onComplete(data.pin as string);
    } catch (e) {
      clearInterval(phaseTimer);
      setCreating(false);
      setError(e instanceof Error ? e.message : "Could not create account");
    }
  }

  if (creating) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center px-4 animate-fade-in">
        <div className="relative mb-8 h-20 w-20">
          <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
          {avatarDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarDataUrl}
              alt=""
              className="absolute inset-2 rounded-full object-cover"
            />
          ) : (
            <div className="absolute inset-2 rounded-full bg-gold/15 flex items-center justify-center font-display text-2xl text-gold">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <p className="brand-mark text-gold text-xs mb-3">MovieSelector</p>
        <h2 className="font-display text-3xl text-cream mb-2">{createMessages[createPhase]}</h2>
        <p className="text-muted text-sm">Hang tight, {name.split(" ")[0]}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto animate-slide-up">
      <button type="button" className="btn-ghost mb-2 -ml-2" onClick={onBack}>
        ← Back
      </button>

      <div className="mb-6 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                i <= step ? "bg-gold" : "bg-cream/10"
              }`}
            />
          </div>
        ))}
      </div>

      <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">
        Step {step + 1} · {STEPS[step]}
      </p>

      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="font-display text-3xl text-cream">What should we call you?</h2>
          <input
            className="input-field w-full text-lg"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="font-display text-3xl text-cream">Add a profile picture</h2>
          <p className="text-muted text-sm">Optional — you can skip this.</p>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-gold/30 bg-surface">
              {avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-3xl text-gold">
                  {name.slice(0, 1).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <label className="btn-secondary cursor-pointer">
              Choose photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="font-display text-3xl text-cream">Favourite genres</h2>
          <p className="text-muted text-sm">Pick at least one.</p>
          <div className="flex flex-wrap gap-2">
            {MOVIE_GENRES.map((g) => {
              const on = genres.includes(g.name);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenre(g.name)}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-sm transition ${
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
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="font-display text-3xl text-cream">Favourite movies</h2>
          <p className="text-muted text-sm">
            From your genres, or search. Pick at least one (up to 8).
          </p>
          <input
            className="input-field w-full"
            placeholder="Search any movie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {favorites.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {favorites.map((m) => (
                <button
                  key={m.tmdbId}
                  type="button"
                  onClick={() => toggleFavorite(m)}
                  className="rounded-lg border border-gold/40 bg-gold/15 px-2 py-1 text-xs text-gold"
                >
                  {m.title} ×
                </button>
              ))}
            </div>
          )}
          {loadingSuggestions && <p className="text-muted text-sm">Loading…</p>}
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {suggestions.map((m) => {
              const selected = favorites.some((f) => f.tmdbId === m.tmdbId);
              return (
                <button
                  key={m.tmdbId}
                  type="button"
                  onClick={() => toggleFavorite(m)}
                  className={`text-left rounded-xl overflow-hidden border transition ${
                    selected ? "border-gold ring-1 ring-gold/40" : "border-cream/10"
                  }`}
                >
                  <Poster
                    src={posterUrl(m.posterPath, "w185")}
                    alt={m.title}
                    className="aspect-[2/3] w-full"
                  />
                  <p className="p-1.5 text-[11px] leading-tight text-cream/80 line-clamp-2">
                    {m.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="font-display text-3xl text-cream">Your PIN</h2>
          <p className="text-muted text-sm">
            Use this on your phone and laptop. Keep it somewhere safe.
          </p>
          <div className="flex gap-2 rounded-2xl border border-cream/10 bg-surface/50 p-1">
            <button
              type="button"
              className={`flex-1 min-h-11 rounded-xl text-sm font-medium ${
                pinMode === "auto" ? "bg-gold text-ink" : "text-muted"
              }`}
              onClick={() => setPinMode("auto")}
            >
              Auto generate
            </button>
            <button
              type="button"
              className={`flex-1 min-h-11 rounded-xl text-sm font-medium ${
                pinMode === "custom" ? "bg-gold text-ink" : "text-muted"
              }`}
              onClick={() => setPinMode("custom")}
            >
              Custom
            </button>
          </div>
          {pinMode === "auto" ? (
            <p className="rounded-xl border border-cream/10 bg-ink/40 p-4 text-sm text-cream/75">
              We&apos;ll create a 4-digit PIN and show it once after your account is ready.
            </p>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                className="input-field w-full text-center text-2xl tracking-[0.35em]"
                placeholder="PIN"
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
              <input
                type="password"
                inputMode="numeric"
                className="input-field w-full text-center text-2xl tracking-[0.35em]"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
              {customPin && confirmPin && customPin !== confirmPin && (
                <p className="text-danger text-sm">PINs don&apos;t match</p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-danger text-sm">{error}</p>}

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <button type="button" className="btn-secondary flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        ) : (
          <div className="flex-1" />
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </button>
        ) : (
          <button type="button" className="btn-primary flex-1" disabled={!canNext()} onClick={finish}>
            Create account
          </button>
        )}
      </div>
    </div>
  );
}
