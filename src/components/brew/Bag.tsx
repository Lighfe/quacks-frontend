import type { ChipType } from "@/lib/game-api";
import { ChipToken } from "./Chip";

// Cinched neck with a cord knot, drawn on a 4px pixel grid.
function SackNeck({ unit }: { unit: number }) {
  const rects: [number, number, number, number, string][] = [
    // flared cloth top
    [3, 0, 2, 1, "var(--sack-outline)"], [7, 0, 2, 1, "var(--sack-outline)"], [11, 0, 2, 1, "var(--sack-outline)"],
    [2, 1, 12, 1, "var(--sack-outline)"], [3, 1, 10, 1, "var(--sack-fill)"],
    [3, 2, 10, 1, "var(--sack-outline)"], [4, 2, 8, 1, "var(--sack-shade)"],
    // pinched neck
    [5, 3, 6, 1, "var(--sack-outline)"], [6, 3, 4, 1, "var(--sack-fill)"],
    // cord + knot
    [4, 4, 8, 1, "var(--sack-cord)"], [7, 5, 2, 1, "var(--sack-cord)"], [6, 6, 1, 1, "var(--sack-cord)"], [9, 6, 1, 1, "var(--sack-cord)"],
    // shoulders opening into body
    [4, 5, 3, 1, "var(--sack-outline)"], [9, 5, 3, 1, "var(--sack-outline)"],
    [3, 6, 3, 1, "var(--sack-outline)"], [10, 6, 3, 1, "var(--sack-outline)"], [7, 6, 2, 1, "var(--sack-fill)"],
  ];
  return (
    <svg
      width={16 * unit}
      height={7 * unit}
      viewBox="0 0 16 7"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block"
    >
      {rects.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  );
}

export function Bag({
  bag,
  chips,
  small = false,
}: {
  bag: Record<string, number>;
  chips: ChipType[];
  small?: boolean;
}) {
  const byId = new Map(chips.map((c) => [c.id, c]));
  const entries = Object.entries(bag).filter(([, n]) => n > 0 && byId.has(n ? "" + "" : "") === false ? byId.has(Object.keys(bag).find(() => false) ?? "") || true : false);
  const shown = entries.filter(([id]) => byId.has(id));
  return (
    <div data-testid="bag-sack" aria-label="Bag" className="flex w-full flex-col items-center">
      <SackNeck unit={small ? 3 : 4} />
      <div
        className={`sack-body -mt-px w-full ${small ? "px-5 py-4" : "min-h-32 px-7 py-6"}`}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {shown.length === 0 ? (
            <span className="text-muted-foreground">empty</span>
          ) : (
            shown.map(([id, n]) => {
              const chip = byId.get(id)!;
              return (
                <span key={id} className="flex items-center gap-1">
                  <ChipToken colour={chip.colour} value={chip.value} />
                  <span className="font-pixel text-[10px] text-sack-ink">×{n}</span>
                </span>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
