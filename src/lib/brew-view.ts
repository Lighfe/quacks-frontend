// Pure helpers for reading the service view. No game rules: these only pick,
// de-duplicate and diff what the service already sent.

import type { LegalAction, PotEntry, View, WindowField } from "./game-api";

export function isLegal(legal: LegalAction[], id: string): boolean {
  return legal.some((a) => a.id === id);
}

// Near the end of the pot the service repeats field 53 in the window;
// light each field once (first occurrence wins).
export function litWindowFields(window: WindowField[]): WindowField[] {
  const seen = new Set<number>();
  const out: WindowField[] = [];
  for (const w of window) {
    if (seen.has(w.field)) continue;
    seen.add(w.field);
    out.push(w);
  }
  return out;
}

// Hot seat: show a human seat that is in to_act. When no human is to act
// (e.g. a bot is acting), keep the current seat.
export function pickShownSeat(view: View, current: string | null): string {
  const humans = view.seats.filter((s) => s.kind === "human");
  const acting = humans.find((s) => view.to_act.includes(s.id));
  if (acting) return acting.id;
  if (current && view.seats.some((s) => s.id === current)) return current;
  return (humans[0] ?? view.seats[0])?.id ?? current ?? "p1";
}

// Chips can leave the pot (flask, card 17, yellow), so diff by order,
// not by count. Returns the orders not seen before.
export function newPotOrders(pot: PotEntry[], seen: ReadonlySet<number>): number[] {
  return pot.map((e) => e.order).filter((o) => !seen.has(o));
}
