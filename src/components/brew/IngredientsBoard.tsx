import type { Ingredient } from "@/lib/game-api";
import { cn } from "@/lib/utils";
import { chipBgClass, ChipToken } from "./Chip";
import { COIN, PixelSymbol } from "./pixel-icons";

// Faded when sold chips exist but none is available now; white (never sold) stays.
export function isNoteFaded(ing: Ingredient): boolean {
  const sold = ing.chips.some((c) => c.price !== null);
  return sold && !ing.chips.some((c) => c.available);
}

export function IngredientsBoard({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {ingredients.map((ing) => {
        const faded = isNoteFaded(ing);
        return (
          <div
            key={ing.colour}
            data-testid={`note-${ing.colour}`}
            data-faded={faded ? "true" : "false"}
            className={cn("relative pt-2", faded && "opacity-40 grayscale")}
          >
            {/* Seal/pin in the chip colour. */}
            <span
              aria-hidden
              className={cn(
                "absolute left-1/2 top-0 z-10 h-4 w-4 -translate-x-1/2 border-2 border-sack-outline",
                chipBgClass[ing.colour],
              )}
            />
            <div className="torn-edge relative bg-parchment px-3 pb-4 pt-5 text-parchment-ink">
              <span aria-hidden className="absolute right-3 top-6 h-5 w-6 bg-parchment-shade opacity-40" />
              <span aria-hidden className="absolute bottom-4 left-4 h-3 w-4 bg-parchment-shade opacity-30" />
              <div className="relative grid grid-cols-3 gap-2">
                {ing.chips.map((c) => (
                  <div key={c.chip} className="flex flex-col items-center gap-1">
                    <ChipToken colour={ing.colour} value={c.value} className="h-9 w-9" />
                    {c.price !== null ? (
                      <span className="flex items-center gap-1 font-pixel text-[10px]">
                        <PixelSymbol grid={COIN} unit={2} label="money" />
                        {c.price}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="relative mt-3 text-sm leading-tight">{ing.effect}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
