"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingWizard } from "@/components/OnboardingWizard";

type Mode = "welcome" | "join" | "new" | "pin-reveal";

function UnlockFlow() {
  const [mode, setMode] = useState<Mode>("welcome");
  const [pin, setPin] = useState("");
  const [revealedPin, setRevealedPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  async function onUnlock(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wrong PIN");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setLoading(false);
    }
  }

  function continueAfterReveal() {
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-10 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.04%22/%3E%3C/svg%3E')] opacity-80" />

      {mode === "welcome" && (
        <div className="relative w-full max-w-sm md:max-w-xl animate-fade-in text-center md:rounded-3xl md:border md:border-gold/20 md:bg-ink-elevated/80 md:p-12 md:shadow-2xl md:backdrop-blur-sm">
          <p className="brand-mark text-gold text-sm mb-3">MovieSelector</p>
          <h1 className="font-display text-5xl md:text-6xl text-cream mb-3 leading-none">Your reel starts here</h1>
          <p className="text-muted text-sm md:text-base mb-10 max-w-md mx-auto">
            Track films & series, rate what you finish, sync across your devices.
          </p>
          <div className="space-y-3 md:flex md:gap-3 md:space-y-0 md:justify-center">
            <button type="button" className="btn-primary w-full md:w-auto md:min-w-[10rem]" onClick={() => setMode("join")}>
              Already joined
            </button>
            <button type="button" className="btn-secondary w-full md:w-auto md:min-w-[10rem]" onClick={() => setMode("new")}>
              New here
            </button>
          </div>
        </div>
      )}

      {mode === "join" && (
        <div className="relative w-full max-w-sm animate-slide-up">
          <button type="button" className="btn-ghost mb-4 -ml-2" onClick={() => setMode("welcome")}>
            ← Back
          </button>
          <div className="text-center mb-8">
            <p className="brand-mark text-gold text-sm mb-2">Welcome back</p>
            <h1 className="font-display text-4xl text-cream mb-2">Enter your PIN</h1>
            <p className="text-muted text-sm">Works on laptop, desktop, and phone</p>
          </div>
          <form onSubmit={onUnlock} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="••••"
              className="input-field w-full text-center text-2xl tracking-[0.4em]"
              autoFocus
            />
            {error && <p className="text-danger text-sm text-center">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading || pin.length < 4}>
              {loading ? "Unlocking…" : "Unlock"}
            </button>
          </form>
        </div>
      )}

      {mode === "new" && (
        <div className="relative w-full">
          <OnboardingWizard
            onBack={() => setMode("welcome")}
            onComplete={(createdPin) => {
              setRevealedPin(createdPin);
              setMode("pin-reveal");
            }}
          />
        </div>
      )}

      {mode === "pin-reveal" && (
        <div className="relative w-full max-w-sm animate-pop text-center">
          <p className="brand-mark text-gold text-sm mb-3">You&apos;re in</p>
          <h1 className="font-display text-4xl text-cream mb-3">Account ready</h1>
          <p className="text-muted text-sm mb-6">
            Save this PIN — you&apos;ll need it on your other devices.
          </p>
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-6 py-5 mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2">Your PIN</p>
            <p className="font-display text-5xl tracking-[0.35em] text-cream">{revealedPin}</p>
          </div>
          <button type="button" className="btn-primary w-full" onClick={continueAfterReveal}>
            Enter MovieSelector
          </button>
        </div>
      )}
    </main>
  );
}

export default function UnlockPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <p className="text-muted">Loading…</p>
        </main>
      }
    >
      <UnlockFlow />
    </Suspense>
  );
}
