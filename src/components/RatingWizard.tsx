"use client";

import { useState } from "react";
import { FEELING_CHIPS } from "@/lib/feelings";
import { Poster } from "./Poster";

export type WizardPayload = {
  myRating: number;
  feelings: string[];
  comments: string;
  watchedOn: string;
};

type Props = {
  open: boolean;
  title: string;
  posterUrl?: string | null;
  onClose: () => void;
  onSubmit: (payload: WizardPayload) => Promise<void>;
};

const STEPS = ["Score", "Feelings", "Notes", "Date"] as const;

export function RatingWizard({ open, title, posterUrl, onClose, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState(7);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [customFeeling, setCustomFeeling] = useState("");
  const [comments, setComments] = useState("");
  const [watchedOn, setWatchedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function toggleFeeling(f: string) {
    setFeelings((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function addCustom() {
    const v = customFeeling.trim();
    if (!v) return;
    if (!feelings.includes(v)) setFeelings((p) => [...p, v]);
    setCustomFeeling("");
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      await onSubmit({ myRating: rating, feelings, comments, watchedOn });
      setStep(0);
      setRating(7);
      setFeelings([]);
      setComments("");
      setWatchedOn(new Date().toISOString().slice(0, 10));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg animate-slide-up rounded-t-3xl sm:rounded-3xl border border-gold/20 bg-ink-elevated shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-4 border-b border-gold/10 p-5">
          <Poster src={posterUrl} alt={title} className="h-20 w-14 shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-gold/80">Rate</p>
            <h2 className="truncate font-display text-xl text-cream">{title}</h2>
            <div className="mt-2 flex gap-1.5">
              {STEPS.map((label, i) => (
                <span
                  key={label}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-gold" : "bg-cream/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-muted text-sm">How was it out of 10?</p>
              <div className="flex items-end justify-center gap-2">
                <span className="font-display text-6xl text-gold tabular-nums">{rating.toFixed(1)}</span>
                <span className="mb-2 text-muted">/10</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full accent-gold"
              />
              <div className="flex flex-wrap justify-center gap-2">
                {[0, 2, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`min-h-11 min-w-11 rounded-xl border px-3 text-sm transition ${
                      rating === n
                        ? "border-gold bg-gold/20 text-gold"
                        : "border-cream/10 text-cream/70 hover:border-gold/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-muted text-sm">How did it make you feel?</p>
              <div className="flex flex-wrap gap-2">
                {FEELING_CHIPS.map((f) => {
                  const on = feelings.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFeeling(f)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm transition ${
                        on
                          ? "border-gold bg-gold/20 text-gold"
                          : "border-cream/10 text-cream/80 hover:border-gold/40"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={customFeeling}
                  onChange={(e) => setCustomFeeling(e.target.value)}
                  placeholder="Custom feeling"
                  className="input-field flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                />
                <button type="button" onClick={addCustom} className="btn-secondary">
                  Add
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-muted text-sm">Any notes?</p>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={5}
                placeholder="What stuck with you…"
                className="input-field w-full resize-none"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-muted text-sm">When did you watch it?</p>
              <input
                type="date"
                value={watchedOn}
                onChange={(e) => setWatchedOn(e.target.value)}
                className="input-field w-full"
              />
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3 pt-2">
            {step > 0 ? (
              <button type="button" className="btn-secondary flex-1" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : (
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>
                Cancel
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn-primary flex-1" onClick={() => setStep((s) => s + 1)}>
                Next
              </button>
            ) : (
              <button type="button" className="btn-primary flex-1" disabled={saving} onClick={finish}>
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
