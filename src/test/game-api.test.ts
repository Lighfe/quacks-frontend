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

  it("offers the flask after a white chip and take money/points when exploded", async () => {
    const mock2 = backendFromSearch({});
    const v0 = await getView(mock2, "p1");
    const v1 = await sendAction(mock2, "p1", "draw", v0.game.revision);
    expect(v1.legal.map((a) => a.id)).toContain("use_flask");
    const v2 = await sendAction(mock2, "p1", "draw", v1.game.revision);
    expect(v2.hand.length).toBeGreaterThan(0);
    expect(v2.legal.map((a) => a.id)).toContain("play:0");
    const v3 = await sendAction(mock2, "p1", "play:0", v2.game.revision);
    expect(v3.seats.find((s) => s.id === "p1")?.status).toBe("exploded");
    expect(v3.legal.map((a) => a.id).sort()).toEqual(["take_money", "take_points"]);
  });
});
