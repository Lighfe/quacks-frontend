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
