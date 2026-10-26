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
// not by count. Returns at most one order: the highest one not seen before.
export function newPotOrders(pot: PotEntry[], seen: ReadonlySet<number>): number[] {
  const unseen = pot.map((e) => e.order).filter((o) => !seen.has(o));
  return unseen.length ? [Math.max(...unseen)] : [];
}

// Revision guard: an older view never replaces a newer one in the cache.
export function newerView(current: View | undefined, next: View): View {
  if (current && next.game.revision < current.game.revision) return current;
  return next;
}

// Hot seat decision. Never acts on a view older than the newest revision seen
// (any seat), keeps the shown seat while it is to act, and switches at most
// once per revision. Returns the seat to show and whether the view is stale.
export function decideHotSeat(
  view: View,
  current: string,
  latestRevision: number,
  lastSwitchRevision: number,
): { seat: string; stale: boolean } {
  if (view.game.revision < latestRevision) return { seat: current, stale: true };
  if (view.to_act.includes(current)) return { seat: current, stale: false };
  if (view.game.revision <= lastSwitchRevision) return { seat: current, stale: false };
  return { seat: pickShownSeat(view, current), stale: false };
}
