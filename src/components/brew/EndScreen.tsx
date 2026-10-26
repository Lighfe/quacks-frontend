import type { View } from "@/lib/game-api";
import { LogPanel } from "./LogPanel";
import { PixelFrame } from "./PixelFrame";

export function EndScreen({ view, onNewGame }: { view: View; onNewGame: () => void }) {
  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PixelFrame title="Game over">
          <ul className="flex flex-col gap-1">
            {view.seats.map((s) => (
              <li key={s.id} data-testid={`final-${s.id}`} className="font-pixel text-[10px]">
                {s.id}: {s.points} points
              </li>
            ))}
          </ul>
          <p className="mt-3 font-pixel text-xs text-accent">
            Winner: {view.game.winner ?? "—"}
          </p>
          <button
            type="button"
            onClick={onNewGame}
            className="pixel-border mt-4 bg-primary px-3 py-2 font-pixel text-[10px] text-primary-foreground"
          >
            New game
          </button>
        </PixelFrame>
        <LogPanel log={view.log} />
      </div>
    </main>
  );
}
