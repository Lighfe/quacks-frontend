import { useEffect, useRef, useState } from "react";

import type { DieRollEntry, View } from "@/lib/game-api";
import { GEM, PixelSymbol, STAR, type PixelGrid } from "./pixel-icons";
import { useReducedMotion } from "./Pot";

const ORANGE_CHIP: PixelGrid = [".ooo.", "ooooo", "ookoo", "ooooo", ".ooo."];
const DROPLET: PixelGrid = ["..b..", "..b..", ".bbb.", "bbwbb", "bbbbb", ".bbb."];
const TWO_STARS: PixelGrid = [".v...", "vvv..", ".v...", "...v.", "..vvv", "...v."];

// Face id -> icon. The only place face ids appear in app code.
const FACES: Record<string, { grid: PixelGrid; unit: number }> = {
  orange_1: { grid: ORANGE_CHIP, unit: 4 },
  droplet_1: { grid: DROPLET, unit: 4 },
  ruby_1: { grid: GEM, unit: 5 },
  point_1: { grid: STAR, unit: 3 },
  point_2: { grid: TWO_STARS, unit: 4 },
};

const ROLL_MS = 2600;
const STILL_MS = 2000;
const ROLL_PHASES = new Set(["choice", "shop", "ruby", "game_over"]);

export interface ActiveRoll {
  entry: DieRollEntry;
  key: string;
}

// Plays view.game.last_roll once per round in this page session, one die
// after another. Who rolls and what comes only from the view.
export function useBonusRoll(view: View): ActiveRoll | null {
  const reduced = useReducedMotion();
  const played = useRef(new Set<number>());
  const [state, setState] = useState<{ round: number; rolls: DieRollEntry[]; index: number } | null>(null);
  const last = view.game.last_roll;
  let current = state;
  if (
    last &&
    last.rolls.length > 0 &&
    last.round === view.game.round &&
    ROLL_PHASES.has(view.game.phase) &&
    !played.current.has(last.round)
  ) {
    played.current.add(last.round);
    current = { round: last.round, rolls: last.rolls, index: 0 };
    setState(current);
  }
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => {
      setState((s) => (s && s.index + 1 < s.rolls.length ? { ...s, index: s.index + 1 } : null));
    }, reduced ? STILL_MS : ROLL_MS);
    return () => clearTimeout(t);
  }, [state, reduced]);
  if (!current) return null;
  const entry = current.rolls[current.index];
  return entry ? { entry, key: `${current.round}:${current.index}` } : null;
}

export function DieRoll({ roll, cauldron }: { roll: ActiveRoll; cauldron: "own" | "other" }) {
  const reduced = useReducedMotion();
  const face = FACES[roll.entry.face];
  const big = cauldron === "own";
  return (
    <div
      data-testid="die-roll"
      data-cauldron={cauldron}
      data-seat={roll.entry.seat}
      data-face={roll.entry.face}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className={`${reduced ? "" : "die-tumble "}pixel-border flex items-center justify-center bg-chip-white ${big ? "h-16 w-16" : "h-10 w-10"}`}
          role="img"
          aria-label={roll.entry.face}
        >
          {face ? <PixelSymbol grid={face.grid} unit={big ? face.unit : Math.max(2, face.unit - 2)} label="" /> : null}
        </div>
        <span
          className={`${reduced ? "" : "die-text-late "}pixel-border bg-card px-2 py-1 font-pixel text-foreground ${big ? "text-xs" : "text-[8px]"}`}
        >
          {roll.entry.text}
        </span>
      </div>
    </div>
  );
}
