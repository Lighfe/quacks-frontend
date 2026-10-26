import type { GameInfo } from "@/lib/game-api";
import { PixelFrame } from "./PixelFrame";

export function RoundHeader({ game }: { game: GameInfo }) {
  return (
    <PixelFrame>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <h1 className="font-pixel text-sm text-accent text-pixel-shadow">Quacks</h1>
        <span className="font-pixel text-[10px] text-foreground">
          Round {game.round}/{game.rounds}
        </span>
        <span className="font-pixel text-[10px] text-muted-foreground">{game.phase}</span>
        <span className="font-pixel text-[10px] text-muted-foreground">
          Explosion limit {game.explosion_limit}
        </span>
        {game.card ? (
          <span className="text-foreground">
            Card {game.card.id}: {game.card.text}
          </span>
        ) : null}
        {game.winner ? (
          <span className="font-pixel text-[10px] text-accent">Winner: {game.winner}</span>
        ) : null}
      </div>
    </PixelFrame>
  );
}
