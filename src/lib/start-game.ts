// Start screen helpers: request body validation and the URL to open after
// POST /games. No game rules.

import type { CreateGameBody } from "./game-api";

export function parseRounds(input: string): number | null {
  const s = input.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 ? n : null;
}

export function buildCreateBody(
  p1: string,
  p2: string,
  roundsInput: string,
  seed: number | undefined,
): CreateGameBody | null {
  const rounds = parseRounds(roundsInput);
  if (rounds === null) return null;
  const body: CreateGameBody = { p1, p2, rounds };
  if (seed !== undefined) body.seed = seed;
  return body;
}

export interface GameSearch {
  game: string;
  seat?: string | undefined;
  api?: string | undefined;
}

export function gameSearchAfterCreate(
  p1: string,
  p2: string,
  gameId: string,
  api: string | undefined,
): GameSearch {
  const out: GameSearch = { game: gameId };
  const h1 = p1 === "human";
  const h2 = p2 === "human";
  if (h1 && !h2) out.seat = "p1";
  else if (h2 && !h1) out.seat = "p2";
  else if (!h1 && !h2) out.seat = "p1";
  if (api) out.api = api;
  return out;
}
