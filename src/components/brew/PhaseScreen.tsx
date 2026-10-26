import type { View } from "@/lib/game-api";
import { LogPanel } from "./LogPanel";
import { PixelFrame } from "./PixelFrame";

// Plain screen for every non-brew phase: one button per legal action.
export function PhaseScreen({
  view,
  shownSeat,
  onAction,
  pending,
  error,
}: {
  view: View;
  shownSeat: string;
  onAction: (id: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const waiting = !view.to_act.includes(shownSeat);
  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PixelFrame>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <h1 className="font-pixel text-sm text-accent">Quacks</h1>
            <span className="font-pixel text-[10px]">
              Round {view.game.round}/{view.game.rounds}
            </span>
            <span className="font-pixel text-[10px] text-muted-foreground">
              {view.game.phase}
            </span>
            <span className="font-pixel text-[10px] text-muted-foreground">{view.you}</span>
          </div>
        </PixelFrame>
        <PixelFrame title="Actions">
          {waiting && view.to_act.length > 0 ? (
            <p className="mb-2 text-muted-foreground">Waiting for {view.to_act.join(", ")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {view.legal.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                onClick={() => onAction(a.id)}
                className="pixel-border bg-primary px-3 py-2 font-pixel text-[10px] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {a.label}
              </button>
            ))}
          </div>
          {error ? <p className="mt-2 text-destructive">{error}</p> : null}
        </PixelFrame>
        <LogPanel log={view.log} />
      </div>
    </main>
  );
}
