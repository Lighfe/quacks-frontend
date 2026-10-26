import { describe, expect, it } from "vitest";

import {
  DEFAULT_API_BASE,
  backendFromSearch,
  getView,
  sendAction,
} from "@/lib/game-api";

describe("backendFromSearch", () => {
  it("uses mock when no game is given", () => {
    expect(backendFromSearch({}).kind).toBe("mock");
  });

  it("uses http with the default base URL when a game is given", () => {
    const backend = backendFromSearch({ game: "abc" });
    expect(backend.kind).toBe("http");
    expect(backend.baseUrl).toBe(DEFAULT_API_BASE);
    expect(backend.game).toBe("abc");
  });

  it("honours an api override", () => {
    const backend = backendFromSearch({ game: "abc", api: "http://localhost:9000" });
    expect(backend.baseUrl).toBe("http://localhost:9000");
  });
});

describe("mock backend", () => {
  const mock = backendFromSearch({});

  it("returns a view for the requested seat", async () => {
    const view = await getView(mock, "p1");
    expect(view.you).toBe("p1");
    expect(view.seats.length).toBeGreaterThanOrEqual(2);
    expect(view.window).toHaveLength(11);
    expect(Array.isArray(view.log.lines)).toBe(true);
  });

  it("steps to the next canned view and bumps the revision on sendAction", async () => {
    const before = await getView(mock, "p1");
    const after = await sendAction(mock, "p1", "draw", before.game.revision);
    expect(after.game.revision).toBe(before.game.revision + 1);
  });

  it("cycles through flask, blue hand and exploded scenarios", async () => {
    // The mock is module-level state shared across tests, so walk a full
    // 4-step cycle from wherever it currently stands.
    const mock2 = backendFromSearch({});
    let v = await getView(mock2, "p1");
    const seenLegal: string[][] = [];
    let sawHand = false;
    let sawExploded = false;
    for (let i = 0; i < 4; i++) {
      v = await sendAction(mock2, "p1", "draw", v.game.revision);
      seenLegal.push(v.legal.map((a) => a.id));
      if (v.hand.length > 0) sawHand = true;
      if (v.seats.find((s) => s.id === "p1")?.status === "exploded") sawExploded = true;
    }
    expect(seenLegal.some((ids) => ids.includes("use_flask"))).toBe(true);
    expect(seenLegal.some((ids) => ids.includes("play:0"))).toBe(true);
    expect(seenLegal.some((ids) => ids.includes("take_money") && ids.includes("take_points"))).toBe(
      true,
    );
    expect(sawHand).toBe(true);
    expect(sawExploded).toBe(true);
  });
});

describe("mock seat markers", () => {
  it("p1 has droplet 0, rat tail 1, start field 1 and its pot starts at field 2", async () => {
    const v = await getView(backendFromSearch({}), "p1");
    const p1 = v.seats.find((s) => s.id === "p1")!;
    expect([p1.droplet, p1.rat_tail, p1.start_field]).toEqual([0, 1, 1]);
    expect(p1.pot[0]?.from).toBe(2);
  });

  it("p2 has droplet 2, rat tail 0, start field 2 and its pot starts at field 3", async () => {
    const v = await getView(backendFromSearch({}), "p2");
    const p2 = v.seats.find((s) => s.id === "p2")!;
    expect([p2.droplet, p2.rat_tail, p2.start_field]).toEqual([2, 0, 2]);
    expect(p2.pot[0]?.from).toBe(3);
  });
});
