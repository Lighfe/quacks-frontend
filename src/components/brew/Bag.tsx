import { useEffect, useId, useRef, useState } from "react";

import type { ChipType } from "@/lib/game-api";
import { ChipToken } from "./Chip";

// Gathered sack neck on a 24x18 pixel grid: flared folds, tied cord band,
// knot with two dangling ends, then the neck widening into the body.
const O = "var(--sack-outline)";
const F = "var(--sack-fill)";
const S = "var(--sack-shade)";
const C = "var(--sack-cord)";
// [row, first column, last column] of cloth; outline is the first/last pixel.
const CLOTH: [number, number, number][] = [
  [1, 1, 22], [2, 2, 21], [3, 3, 20], [4, 5, 18], [5, 6, 17], [6, 7, 16],
  [7, 7, 16], [8, 7, 16], [9, 7, 16],
  [10, 7, 16], [11, 6, 17], [12, 5, 18], [13, 4, 19], [14, 3, 20], [15, 2, 21], [16, 1, 22], [17, 0, 23],
];
const NECK_RECTS: [number, number, number, number, string][] = [
  // ruffled top edge
  ...([1, 6, 11, 16, 20] as const).map((x): [number, number, number, number, string] => [x, 0, 3, 1, O]),
  ...CLOTH.flatMap(([y, x0, x1]): [number, number, number, number, string][] => [
    [x0, y, x1 - x0 + 1, 1, O],
    [x0 + 1, y, x1 - x0 - 1, 1, F],
  ]),
  // fold lines in the flare
  [7, 1, 1, 5, S], [11, 1, 1, 5, S], [15, 1, 1, 5, S], [19, 1, 1, 3, S], [4, 1, 1, 2, S],
  [9, 10, 1, 2, S], [14, 10, 1, 2, S],
  // cord band and knot
  [6, 7, 12, 2, C], [6, 9, 12, 1, O],
  [10, 6, 4, 4, O], [11, 7, 2, 2, C],
  // dangling ends
  [10, 10, 1, 2, C], [9, 12, 1, 2, C], [8, 14, 1, 1, C],
  [13, 10, 1, 2, C], [14, 12, 1, 2, C], [15, 14, 1, 1, C],
];

function SackNeck({ unit }: { unit: number }) {
  return (
    <svg
      width={24 * unit}
      height={18 * unit}
      viewBox="0 0 24 18"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block"
    >
      {NECK_RECTS.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  );
}

function SackContents({
  shown,
  byId,
  small,
}: {
  shown: [string, number][];
  byId: Map<string, ChipType>;
  small: boolean;
}) {
  return (
    <div className="sack-outline flex w-full flex-col items-center px-1 py-1">
      <SackNeck unit={small ? 3 : 4} />
      <div className={`sack-body -mt-1 w-full ${small ? "px-6 pb-6 pt-11" : "px-9 pb-9 pt-14"}`}>
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

// Small always-visible bag; hover, click/tap or Enter/Space opens the big sack.
export function Bag({
  bag,
  chips,
  small = false,
}: {
  bag: Record<string, number>;
  chips: ChipType[];
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hoverOpened = useRef(false);
  const popId = useId();
  const byId = new Map(chips.map((c) => [c.id, c]));
  const shown = Object.entries(bag).filter(([id, n]) => n > 0 && byId.has(id));
  const total = shown.reduce((sum, [, n]) => sum + n, 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    if (open && hoverOpened.current) {
      hoverOpened.current = false; // pin a hover-opened sack
      return;
    }
    hoverOpened.current = false;
    setOpen((o) => !o);
  };

  return (
    <div
      className="relative w-full"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && !open) {
          hoverOpened.current = true;
          setOpen(true);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && hoverOpened.current) {
          hoverOpened.current = false;
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        data-testid="bag-sack"
        aria-label="Bag"
        aria-expanded={open}
        aria-controls={popId}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="sack-outline mx-auto flex flex-col items-center px-1 py-1 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <SackNeck unit={2} />
        <span className="sack-body -mt-0.5 flex w-20 items-end justify-center pb-2 pt-6">
          <span className="font-pixel text-[10px] text-sack-ink">{total}</span>
        </span>
      </button>
      {open ? (
        <div
          id={popId}
          data-testid="bag-popup"
          className="absolute left-0 top-full z-40 mt-2 w-full min-w-0 max-w-[calc(100vw-2rem)]"
        >
          <SackContents shown={shown} byId={byId} small={small} />
        </div>
      ) : null}
    </div>
  );
}
