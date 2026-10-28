import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  // Fixed-position popup in a portal: never clipped by panel frames, always on top.
  // Below the bag when it fits, else above, else clamped into the viewport.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const m = 8;
      const width = Math.min(Math.max(r.width, 260), vw - 2 * m);
      const left = Math.min(Math.max(r.left, m), vw - width - m);
      const h = popRef.current?.getBoundingClientRect().height ?? 0;
      let top = r.bottom + 8;
      if (top + h > vh - m) {
        const above = r.top - 8 - h;
        top = above >= m ? above : Math.max(m, vh - m - h);
      }
      setPos({ left, top, width });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    cancelClose();
    if (!open) {
      hoverOpened.current = true;
      setOpen(true);
    }
  };
  // Short grace period so the pointer can cross from the bag onto the popup.
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !hoverOpened.current) return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      if (hoverOpened.current) {
        hoverOpened.current = false;
        setOpen(false);
      }
    }, 150);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Decide from the ref alone: the click handler's `open` closure can be stale
  // when a pointerenter-driven open has not re-rendered yet.
  const toggle = () => {
    if (hoverOpened.current) {
      hoverOpened.current = false; // pin a hover-opened sack
      setOpen(true);
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
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
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popRef}
              id={popId}
              data-testid="bag-popup"
              onPointerEnter={onEnter}
              onPointerLeave={onLeave}
              style={{
                position: "fixed",
                left: pos?.left ?? 0,
                top: pos?.top ?? 0,
                width: pos?.width,
                visibility: pos ? "visible" : "hidden",
              }}
              className="z-[100] max-w-[calc(100vw-1rem)]"
            >
              <SackContents shown={shown} byId={byId} small={small} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
