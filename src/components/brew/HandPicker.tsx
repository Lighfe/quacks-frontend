import type { ChipType, LegalAction } from "@/lib/game-api";
import { isLegal } from "@/lib/brew-view";
import { ChipToken } from "./Chip";
import { PixelFrame } from "./PixelFrame";
import { cn } from "@/lib/utils";

interface HandPickerProps {
  hand: string[];
  cardDraw: string[] | null;
  chips: ChipType[];
  legal: LegalAction[];
  onAction: (id: string) => void;
  disabled?: boolean;
}

export function HandPicker({ hand, cardDraw, chips, legal, onAction, disabled = false }: HandPickerProps) {
  if (hand.length === 0 && !(cardDraw && cardDraw.length > 0)) return null;
  const byId = new Map(chips.map((c) => [c.id, c]));
  const putBacks = legal.filter((a) => a.id === "put_back_draw" || a.id === "put_back_stop");
  return (
    <PixelFrame title="Hand">
      <div className="flex flex-wrap items-center gap-2">
        {hand.map((id, i) => {
          const chip = byId.get(id);
          if (!chip) return null;
          const action = `play:${i}`;
          const enabled = !disabled && isLegal(legal, action);
          return (
            <button
              key={`${id}-${i}`}
              type="button"
              disabled={!enabled}
              onClick={() => onAction(action)}
              aria-label={`Play slot ${i}`}
              className={cn(
                "pixel-border p-1",
                enabled ? "bg-secondary" : "cursor-not-allowed opacity-40",
              )}
            >
              <ChipToken colour={chip.colour} value={chip.value} />
            </button>
          );
        })}
        {putBacks.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={disabled}
            onClick={() => onAction(a.id)}
            className="pixel-border bg-secondary px-3 disabled:cursor-not-allowed disabled:opacity-40 py-2 font-pixel text-[10px] text-secondary-foreground"
          >
            {a.label}
          </button>
        ))}
      </div>
      {cardDraw && cardDraw.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Card draw</span>
          {cardDraw.map((id, i) => {
            const chip = byId.get(id);
            return chip ? <ChipToken key={`${id}-${i}`} colour={chip.colour} value={chip.value} /> : null;
          })}
        </div>
      ) : null}
    </PixelFrame>
  );
}
