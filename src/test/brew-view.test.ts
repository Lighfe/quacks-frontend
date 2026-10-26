import { describe, expect, it } from "vitest";

import { isLegal, litWindowFields, newPotOrders, pickShownSeat } from "@/lib/brew-view";
import type { Seat, View, WindowField } from "@/lib/game-api";

function seat(id: string, kind = "human"): Seat {
  return {
    id,
    kind,
    status: "brewing",
    points: 0,
    money: 0,
    rubies: 0,
    flask_full: true,
    white_total: 0,
    droplet: 0,
    start_field: 0,
    rat_tail: 0,
    bag: {},
    pot: [],
  };
}

function view(overrides: Partial<View>): View {
  return {
    game: {
      round: 1,
      rounds: 9,
      phase: "brew",
      revision: 1,
      explosion_limit: 7,
      card: null,
      winner: null,
    },
    you: "p1",
    to_act: [],
    seats: [seat("p1"), seat("p2")],
    window: [],
    chips: [],
    legal: [],
    hand: [],
    card_draw: null,
    log: { lines: [], events: [] },
    ...overrides,
  };
}

describe("litWindowFields", () => {
  it("lights each field once when the service repeats field 53", () => {
    const window: WindowField[] = [
      { field: 51, money: 2, points: 8, ruby: false },
      { field: 52, money: 3, points: 9, ruby: false },
      { field: 53, money: 3, points: 10, ruby: true },
      { field: 53, money: 3, points: 10, ruby: true },
      { field: 53, money: 3, points: 10, ruby: true },
    ];
    const lit = litWindowFields(window);
    expect(lit).toHaveLength(3);
    expect(lit.map((w) => w.field)).toEqual([51, 52, 53]);
  });
});

describe("pickShownSeat", () => {
  it("shows the human seat that is to act", () => {
    const v = view({ to_act: ["p2"] });
    expect(pickShownSeat(v, "p1")).toBe("p2");
  });

  it("ignores bot seats that are to act and keeps the current seat", () => {
    const v = view({ seats: [seat("p1"), seat("bot", "bot")], to_act: ["bot"] });
    expect(pickShownSeat(v, "p1")).toBe("p1");
  });

  it("falls back to the first human seat when nothing is acting", () => {
    const v = view({ to_act: [] });
    expect(pickShownSeat(v, null)).toBe("p1");
  });
});

describe("newPotOrders", () => {
  const pot = [
    { order: 1, chip: "orange_1", colour: "orange" as const, value: 1, from: 1, landing: 1 },
    { order: 3, chip: "white_2", colour: "white" as const, value: 2, from: 2, landing: 3 },
  ];

  it("returns orders not seen before", () => {
    expect(newPotOrders(pot, new Set([1]))).toEqual([3]);
  });

  it("returns only the highest unseen order when several chips are new", () => {
    const three = [
      { order: 1, chip: "orange_1", colour: "orange" as const, value: 1, from: 1, landing: 1 },
      { order: 2, chip: "orange_1", colour: "orange" as const, value: 1, from: 2, landing: 2 },
      { order: 3, chip: "white_2", colour: "white" as const, value: 2, from: 3, landing: 4 },
    ];
    expect(newPotOrders(three, new Set())).toEqual([3]);
  });

  it("returns nothing when all orders were seen, even if a chip left the pot", () => {
    expect(newPotOrders(pot, new Set([1, 2, 3]))).toEqual([]);
  });
});

describe("isLegal", () => {
  it("matches only action ids present in legal", () => {
    const legal = [{ id: "draw", label: "Draw" }];
    expect(isLegal(legal, "draw")).toBe(true);
    expect(isLegal(legal, "stop")).toBe(false);
  });
});
