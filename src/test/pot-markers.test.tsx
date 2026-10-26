import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pot } from "@/components/brew/Pot";
import { backendFromSearch, getView } from "@/lib/game-api";

function fields(droplet: number, ratTail: number) {
  const doc = new DOMParser().parseFromString(
    renderToStaticMarkup(<Pot pot={[]} mode="other" droplet={droplet} ratTail={ratTail} />),
    "text/html",
  );
  const of = (kind: string) =>
    Array.from(doc.querySelectorAll(`[data-marker="${kind}"]`)).map((e) => Number(e.getAttribute("data-field")));
  return { big: of("droplet"), small: of("droplet-small"), rat: of("rat"), tail: of("rat-tail") };
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe("Pot markers", () => {
  it("droplet 3, rat tail 2", () => {
    expect(fields(3, 2)).toEqual({ big: [3], small: [0, 1, 2], rat: [5], tail: [4] });
  });
  it("droplet 0, rat tail 0", () => {
    expect(fields(0, 0)).toEqual({ big: [0], small: [], rat: [], tail: [] });
  });
  it("droplet 1, rat tail 1", () => {
    expect(fields(1, 1)).toEqual({ big: [1], small: [0], rat: [2], tail: [] });
  });
  it("droplet 52, rat tail 4 caps at field 53", () => {
    expect(fields(52, 4)).toEqual({ big: [52], small: range(0, 51), rat: [53], tail: [] });
  });
});

describe("playtest-zero mock", () => {
  it("p1 has droplet 0, rat tail 0, start field 0", async () => {
    const view = await getView(backendFromSearch({ mock: "playtest-zero" }), "p1");
    expect(view.seats.find((s) => s.id === "p1")).toMatchObject({ droplet: 0, rat_tail: 0, start_field: 0 });
    const p1 = (await getView(backendFromSearch({ mock: "playtest" }), "p1")).seats.find((s) => s.id === "p1");
    expect(p1).toMatchObject({ droplet: 3, rat_tail: 2, start_field: 5 });
  });
});
