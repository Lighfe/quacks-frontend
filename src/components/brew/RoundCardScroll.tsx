import { useEffect, useRef } from "react";

import type { LegalAction } from "@/lib/game-api";

export type ScrollMode = "choice" | "notice" | "read";

// Parchment scroll over the game screen. Text and button labels come only
// from the view (game.card.text, legal[].label).
export function RoundCardScroll({
  text,
  mode,
  choices,
  pending,
  error,
  onChoose,
  onClose,
}: {
  text: string;
  mode: ScrollMode;
  choices: LegalAction[];
  pending: boolean;
  error: string | null;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const firstBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstBtn.current?.focus();
  }, [mode]);

  // Capture phase on window: swallows every key so brew shortcuts get no input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (mode === "choice") {
        if (e.key === "Escape") e.preventDefault();
        return;
      }
      if (e.key === "Escape" || (e.key === "Enter" && mode === "notice")) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [mode, onClose]);

  const btn =
    "pixel-border bg-parchment-ink px-3 py-2 font-pixel text-[10px] text-parchment disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-3"
      onClick={mode === "read" ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Round card"
        data-testid="card-scroll"
        data-mode={mode}
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <ScrollRod />
        <div className="mx-3 flex min-h-0 flex-col gap-4 border-x-4 border-parchment-shade bg-parchment px-5 py-5 text-parchment-ink sm:mx-5">
          <p data-testid="card-text" className="min-h-0 overflow-y-auto text-xl leading-snug">
            {text}
          </p>
          {error && mode === "choice" ? <p className="text-destructive">{error}</p> : null}
          <div className="flex flex-wrap justify-center gap-2">
            {mode === "choice" ? (
              choices.map((a, i) => (
                <button
                  key={a.id}
                  ref={i === 0 ? firstBtn : undefined}
                  type="button"
                  disabled={pending}
                  onClick={() => onChoose(a.id)}
                  className={btn}
                >
                  {a.label}
                </button>
              ))
            ) : (
              <button ref={firstBtn} type="button" onClick={onClose} className={btn}>
                {mode === "notice" ? "Continue" : "Close"}
              </button>
            )}
          </div>
        </div>
        <ScrollRod />
      </div>
    </div>
  );
}

// Rolled end of the scroll: stepped pixel rod with knobs.
function ScrollRod() {
  return (
    <svg viewBox="0 0 64 6" preserveAspectRatio="none" shapeRendering="crispEdges" className="h-5 w-full shrink-0" aria-hidden="true">
      <rect x="0" y="1" width="3" height="4" fill="var(--parchment-ink)" />
      <rect x="61" y="1" width="3" height="4" fill="var(--parchment-ink)" />
      <rect x="3" y="0" width="58" height="6" fill="var(--parchment-shade)" />
      <rect x="3" y="1" width="58" height="2" fill="var(--parchment)" />
      <rect x="3" y="5" width="58" height="1" fill="var(--parchment-ink)" opacity="0.4" />
    </svg>
  );
}
