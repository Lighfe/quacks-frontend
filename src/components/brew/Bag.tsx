import type { ChipType } from "@/lib/game-api";
import { ChipToken } from "./Chip";
import { PixelFrame } from "./PixelFrame";

export function Bag({ bag, chips }: { bag: Record<string, number>; chips: ChipType[] }) {
  const byId = new Map(chips.map((c) => [c.id, c]));
  const entries = Object.entries(bag).filter(([, n]) => n > 0);
  return (
    <PixelFrame title="Bag">
      <div className="flex flex-wrap gap-2">
        {entries.length === 0 ? (
          <span className="text-muted-foreground">empty</span>
        ) : (
          entries.map(([id, n]) => {
            const chip = byId.get(id);
            if (!chip) return null;
            return (
              <span key={id} className="flex items-center gap-1">
                <ChipToken colour={chip.colour} value={chip.value} />
                <span className="font-pixel text-[10px] text-muted-foreground">×{n}</span>
              </span>
            );
          })
        )}
      </div>
    </PixelFrame>
  );
}
