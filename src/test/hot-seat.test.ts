import { describe, expect, it } from "vitest";

import { backendFromSearch, getView, type View } from "@/lib/game-api";
import { decideHotSeat } from "@/lib/brew-view";

function withSeats(v: View, you: string, toAct: string[], revision: number): View {
  return { ...v, you, to_act: toAct, game: { ...v.game, revision } };
}

describe("hot seat", () => {
  it("settles on one seat with a stale p1 view (rev n) and a fresh p2 view (rev n+1)", async () => {
    const base = await getView(backendFromSearch({}), "p1");
    const n = 40;
    const cache: Record<string, View> = {
      p1: withSeats(base, "p1", ["p2"], n),
      p2: withSeats(base, "p2", ["p1", "p2"], n + 1),
    };
    const fresh: Record<string, View> = { p1: withSeats(base, "p1", ["p1", "p2"], n + 1) };

    let shown = "p2";
    let latest = -1;
    let lastSwitch = -1;
    const shownViews: View[] = [];
    let switches = 0;
    for (let i = 0; i < 20; i++) {
      const view = cache[shown]!;
      latest = Math.max(latest, view.game.revision);
      const d = decideHotSeat(view, shown, latest, lastSwitch);
      if (d.stale) {
        cache[shown] = fresh[shown]!; // refetch
        continue;
      }
      shownViews.push(view);
      if (d.seat === shown) break;
      lastSwitch = view.game.revision;
      shown = d.seat;
      switches++;
    }
    expect(switches).toBeLessThanOrEqual(1);
    const final = shownViews.at(-1)!;
    expect(final.game.revision).toBe(n + 1);
    expect(final.to_act).toContain(shown);
    expect(final.you).toBe(shown);
  });

  it("keeps the shown seat while it is to act and never acts on a stale view", async () => {
    const base = await getView(backendFromSearch({}), "p1");
    const p2 = withSeats(base, "p2", ["p1", "p2"], 41);
    expect(decideHotSeat(p2, "p2", 41, -1)).toEqual({ seat: "p2", stale: false });
    const staleP1 = withSeats(base, "p1", ["p2"], 40);
    expect(decideHotSeat(staleP1, "p1", 41, -1)).toEqual({ seat: "p1", stale: true });
  });

  it("switches at most once per revision", async () => {
    const base = await getView(backendFromSearch({}), "p1");
    const v = withSeats(base, "p1", ["p2"], 50);
    expect(decideHotSeat(v, "p1", 50, -1).seat).toBe("p2");
    expect(decideHotSeat(v, "p1", 50, 50).seat).toBe("p1");
  });
});
