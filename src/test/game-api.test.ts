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

describe("static playtest mock", () => {
  const backend = backendFromSearch({ mock: "playtest" });

  it("contains the requested game and p1 counters and markers", async () => {
    const view = await getView(backend, "p1");
    expect(view.you).toBe("p1");
    expect(view.game.phase).toBe("brewing");
    expect(view.to_act).toContain("p1");
    expect(view.legal.map((a) => a.id)).toEqual(["draw", "stop"]);
    expect(view.seats.find((s) => s.id === "p1")).toMatchObject({
      status: "brewing", droplet: 3, rat_tail: 2, start_field: 5,
      points: 12, money: 7, rubies: 2, flask_full: true,
    });
  });

  it("contains the five placed chips in the supplied order", async () => {
    const view = await getView(backend, "p1");
    expect(view.seats.find((s) => s.id === "p1")?.pot).toEqual([
      { order: 1, chip: "white_1", colour: "white", value: 1, from: 6, landing: 6 },
      { order: 2, chip: "orange_1", colour: "orange", value: 1, from: 7, landing: 7 },
      { order: 3, chip: "red_2", colour: "red", value: 2, from: 8, landing: 9 },
      { order: 4, chip: "red_1", colour: "red", value: 1, from: 10, landing: 10 },
      { order: 5, chip: "blue_4", colour: "blue", value: 4, from: 11, landing: 14 },
    ]);
  });

  it("contains eleven annotated fields 15–25, bag kinds and a placed opponent pot", async () => {
    const view = await getView(backend, "p1");
    expect(view.window.map((f) => f.field)).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    expect(view.window.every((f) => Number.isFinite(f.money) && Number.isFinite(f.points))).toBe(true);
    expect(view.window.some((f) => f.ruby)).toBe(true);
    expect(Object.keys(view.seats.find((s) => s.id === "p1")?.bag ?? {}).length).toBeGreaterThanOrEqual(5);
    expect(view.seats.find((s) => s.id === "p2")?.pot.length).toBeGreaterThanOrEqual(2);
  });

  it("returns the same view for every action without advancing the sequence", async () => {
    const sequence = backendFromSearch({ mock: true });
    const beforeSequence = await getView(sequence, "p1");
    const before = await getView(backend, "p1");
    for (const action of ["draw", "stop", "anything"]) {
      expect(await sendAction(backend, "p1", action, before.game.revision)).toBe(before);
    }
    expect(await getView(sequence, "p1")).toEqual(beforeSequence);
    const afterSequence = await sendAction(sequence, "p1", "draw", beforeSequence.game.revision);
    expect(afterSequence.game.revision).toBe(beforeSequence.game.revision + 1);
    expect(afterSequence).not.toEqual(beforeSequence);
  });
});

describe("static playtest-small-bag mock", () => {
  it("has p1 bag white_1:4, orange_1:1 and an empty p2 bag", async () => {
    const view = await getView(backendFromSearch({ mock: "playtest-small-bag" }), "p1");
    expect(view.seats.find((s) => s.id === "p1")?.bag).toEqual({ white_1: 4, orange_1: 1 });
    expect(view.seats.find((s) => s.id === "p2")?.bag).toEqual({});
  });
});
