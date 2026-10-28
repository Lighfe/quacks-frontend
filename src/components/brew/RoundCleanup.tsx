import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";

import type { PotEntry, View } from "@/lib/game-api";
import { ChipToken } from "./Chip";

const CLEANUP_MS = 1200;

export interface CleanupMemory {
  shownSeat: string | null;
  views: Map<string, View>;
  rounds: Set<number>;
}

export interface CleanupRound {
  seat: string;
  round: number;
  pot: PotEntry[];
}

// Session memory belongs to GameScreen; standalone tab tests use a local ref.
// Only successive views of the same shown seat can start a return animation.
export function useRoundCleanup(view: View, shownSeat: string, shared?: MutableRefObject<CleanupMemory>) {
  const local = useRef<CleanupMemory>({ shownSeat: null, views: new Map(), rounds: new Set() });
  const memory = shared ?? local;
  const [active, setActive] = useState<CleanupRound | null>(null);
  const previous = memory.current.views.get(shownSeat);
  const advanced = memory.current.shownSeat === shownSeat && !!previous && view.game.round > previous.game.round;
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pot = previous?.seats.find((seat) => seat.id === view.you)?.pot ?? [];
  const fresh = advanced && view.game.phase !== "game_over" && !memory.current.rounds.has(view.game.round);
  const candidate = fresh && !reduced && pot.length > 0
    ? { seat: shownSeat, round: view.game.round, pot }
    : null;
  const current = active?.seat === shownSeat && active.round === view.game.round && view.game.phase !== "game_over" && !reduced
    ? active
    : candidate;

  useLayoutEffect(() => {
    if (fresh) memory.current.rounds.add(view.game.round);
    if (candidate) setActive(candidate);
    else if (active && (active.seat !== shownSeat || active.round !== view.game.round || reduced || view.game.phase === "game_over")) setActive(null);
    const old = memory.current.views.get(shownSeat);
    if (!old || view.game.revision >= old.game.revision) memory.current.views.set(shownSeat, view);
    memory.current.shownSeat = shownSeat;
  }, [view, shownSeat, fresh, reduced, memory]);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(null), CLEANUP_MS);
    return () => clearTimeout(timer);
  }, [active]);

  // Swallow game shortcuts while the old pot is being cleared.
  useEffect(() => {
    if (!current) return;
    const block = (event: KeyboardEvent) => event.stopPropagation();
    window.addEventListener("keydown", block, true);
    return () => window.removeEventListener("keydown", block, true);
  }, [!!current]);

  return { cleanup: current, advanced, finish: () => setActive(null) };
}

interface ReturnFlight {
  entry: PotEntry;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

// Measure actual rendered fields, never reproduce pot geometry here.
export function ReturnFlights({ pot, scope, onDone }: {
  pot: PotEntry[];
  scope: RefObject<HTMLElement | null>;
  onDone: () => void;
}) {
  const [flights, setFlights] = useState<ReturnFlight[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useLayoutEffect(() => {
    const root = scope.current;
    const sack = root?.querySelector('[data-testid="bag-sack"]');
    const surface = root?.querySelector(".pot-surface");
    if (!sack || !surface || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      done.current();
      return;
    }
    const bag = sack.getBoundingClientRect();
    const measured: ReturnFlight[] = [];
    for (const entry of pot) {
      const field = surface.querySelector(`[data-landing="${entry.landing}"]`);
      if (!field) continue;
      const bounds = field.getBoundingClientRect();
      const x = bounds.left + bounds.width / 2;
      const y = bounds.top + bounds.height / 2;
      measured.push({ entry, x: x - 14, y: y - 14, dx: bag.left + bag.width / 2 - x, dy: bag.top + bag.height / 2 - y });
    }
    if (!measured.length) {
      done.current();
      return;
    }
    setFlights(measured);
    surface.classList.add("pot-returning");
    return () => surface.classList.remove("pot-returning");
  }, [pot, scope]);

  useLayoutEffect(() => {
    const animations: Animation[] = [];
    for (const [index, flight] of flights.entries()) {
      const token = rootRef.current?.children[index];
      if (!token || typeof token.animate !== "function") continue;
      animations.push(token.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${flight.dx * 0.45}px, ${flight.dy * 0.45 - 32}px) scale(1.1)`, offset: 0.5, opacity: 1 },
        { transform: `translate(${flight.dx}px, ${flight.dy}px) scale(0.4)`, opacity: 0 },
      ], { duration: 700, delay: index * Math.min(65, 350 / Math.max(1, flights.length - 1)), easing: "steps(12, end)", fill: "both" }));
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [flights]);

  return <div ref={rootRef} aria-hidden="true">
    {flights.map((flight) => <div key={flight.entry.order} data-testid="return-flight" className="pointer-events-none fixed z-50" style={{ left: flight.x, top: flight.y }}>
      <ChipToken colour={flight.entry.colour} value={flight.entry.value} />
    </div>)}
  </div>;
}