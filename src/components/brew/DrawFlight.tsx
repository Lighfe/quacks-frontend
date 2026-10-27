import { useLayoutEffect, useRef, useState, type RefObject } from "react";

import type { PotEntry } from "@/lib/game-api";
import { ChipToken } from "./Chip";

const FLIGHT_MS = 700;
const CLEANUP_MS = 1000;

interface Flight {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

// A copy of a freshly drawn chip flying from the own bag sack to its landing
// field. Purely presentational: chip and landing field come from the view.
// Renders nothing (and reports done) when reduced motion is on or when the
// sack or landing field cannot be found — it never throws.
export function DrawFlight({
  entry,
  scope,
  onDone,
}: {
  entry: PotEntry;
  scope: RefObject<HTMLElement | null>;
  onDone: () => void;
}) {
  const [flight, setFlight] = useState<Flight | null>(null);
  const tokenRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Measure start (own sack) and end (landing field) once on mount, in a
  // layout effect so the token is attached before the paint.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current();
      return;
    }
    const root = scope.current;
    const sack = root?.querySelector('[data-testid="bag-sack"]');
    const landing = root?.querySelector(`[data-landing="${entry.landing}"]`);
    if (!sack || !landing) {
      doneRef.current();
      return;
    }
    const a = sack.getBoundingClientRect();
    const b = landing.getBoundingClientRect();
    const x = a.left + a.width / 2;
    const y = a.top + a.height / 2;
    setFlight({
      x: x - 14,
      y: y - 14,
      dx: b.left + b.width / 2 - x,
      dy: b.top + b.height / 2 - y,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly along a small arc; remove on finish with a hard fallback timer.
  useLayoutEffect(() => {
    if (!flight) return;
    const el = tokenRef.current;
    const fallback = setTimeout(() => doneRef.current(), CLEANUP_MS);
    if (el && typeof el.animate === "function") {
      const arc = Math.min(48, Math.max(16, Math.abs(flight.dx) / 4));
      const animation = el.animate(
        [
          { transform: "translate(0, 0) scale(1)" },
          {
            transform: `translate(${flight.dx / 2}px, ${flight.dy / 2 - arc}px) scale(1.15)`,
            offset: 0.55,
          },
          { transform: `translate(${flight.dx}px, ${flight.dy}px) scale(1)` },
        ],
        { duration: FLIGHT_MS, easing: "ease-in", fill: "forwards" },
      );
      animation.onfinish = () => doneRef.current();
      return () => {
        animation.cancel();
        clearTimeout(fallback);
      };
    }
    return () => clearTimeout(fallback);
  }, [flight]);

  if (!flight) return null;
  return (
    <div
      ref={tokenRef}
      data-testid="draw-flight"
      aria-hidden="true"
      className="pointer-events-none fixed z-50"
      style={{ left: flight.x, top: flight.y }}
    >
      <ChipToken colour={entry.colour} value={entry.value} />
    </div>
  );
}
