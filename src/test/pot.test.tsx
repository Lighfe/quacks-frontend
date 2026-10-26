import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pot } from "@/components/brew/Pot";
import type { PotEntry, WindowField } from "@/lib/game-api";

function dom(markup: string): Document {
  return new DOMParser().parseFromString(markup, "text/html");
}

describe("Pot", () => {
  const playtestPot: PotEntry[] = [
    { order: 1, chip: "white_1", colour: "white", value: 1, from: 6, landing: 6 },
    { order: 2, chip: "orange_1", colour: "orange", value: 1, from: 7, landing: 7 },
    { order: 3, chip: "red_2", colour: "red", value: 2, from: 8, landing: 9 },
    { order: 4, chip: "red_1", colour: "red", value: 1, from: 10, landing: 10 },
    { order: 5, chip: "blue_4", colour: "blue", value: 4, from: 11, landing: 14 },
  ];

  it("joins only multi-field moves into deterministic trails and preserves every landing", () => {
    const markup = renderToStaticMarkup(<Pot pot={playtestPot} mode="own" />);
    const doc = dom(markup);
    expect(Array.from(doc.querySelectorAll("[data-trail]")).map((trail) => trail.getAttribute("data-trail")))
      .toEqual(["3", "5"]);
    expect(renderToStaticMarkup(<Pot pot={playtestPot} mode="own" />)).toBe(markup);
    for (const entry of playtestPot) {
      const tile = doc.querySelector(`[data-landing="${entry.landing}"]`);
      expect(tile?.querySelector("text")?.textContent).toBe(String(entry.value));
      expect(tile?.querySelector("polygon")?.getAttribute("stroke")).toBe("var(--accent)");
    }
    // 54 fields minus the four trail-only fields (8, 11, 12, 13).
    expect(doc.querySelectorAll("polygon")).toHaveLength(50);
    expect(doc.querySelector("[data-pot-path]")).not.toBeNull();
  });

  it("wobbles each trail step at alternating 1.5-unit offsets while keeping text upright", () => {
    const doc = dom(renderToStaticMarkup(<Pot pot={playtestPot} mode="own" />));
    const trail = doc.querySelector('[data-trail="3"]')?.getAttribute("d") ?? "";
    const numbers = trail.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
    expect(numbers).toHaveLength(8); // start and three interpolated points
    const [x0 = 0, y0 = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0] = numbers;
    const dx = x3 - x0;
    const dy = y3 - y0;
    const length = Math.hypot(dx, dy);
    const offset1 = ((x1 - x0) * -dy + (y1 - y0) * dx) / length;
    const offset2 = ((x2 - x0) * -dy + (y2 - y0) * dx) / length;
    expect(Math.abs(offset1)).toBeCloseTo(1.5, 10);
    expect(offset2).toBeCloseTo(-offset1, 10);
    expect(doc.querySelectorAll("text[transform], g[transform]")).toHaveLength(0);
  });

  it("shows money, points and ruby on field 53 when a chip landed there and the window repeats 53", () => {
    const pot: PotEntry[] = [
      { order: 1, chip: "orange_6", colour: "orange", value: 6, from: 48, landing: 53 },
    ];
    const window: WindowField[] = [
      { field: 53, money: 7, points: 15, ruby: true },
      { field: 53, money: 7, points: 15, ruby: true },
    ];
    const doc = dom(renderToStaticMarkup(<Pot pot={pot} window={window} mode="own" />));
    const groups = doc.querySelectorAll('[data-window-field="53"]');
    expect(groups).toHaveLength(1);
    const texts = Array.from(groups[0]!.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toEqual(["7", "15"]);
    expect(groups[0]!.querySelector("[data-ruby]")).not.toBeNull();
  });

  it("draws the droplet marker when a droplet field is given", () => {
    const doc = dom(renderToStaticMarkup(<Pot pot={[]} mode="other" droplet={0} />));
    expect(doc.querySelectorAll('[data-marker="droplet"]')).toHaveLength(1);
  });

  it("draws the rat tail marker only when a rat tail field is given", () => {
    const withTail = dom(renderToStaticMarkup(<Pot pot={[]} mode="other" ratTailField={2} />));
    expect(withTail.querySelectorAll('[data-marker="rat-tail"]')).toHaveLength(1);
    const without = dom(renderToStaticMarkup(<Pot pot={[]} mode="other" ratTailField={null} />));
    expect(without.querySelectorAll('[data-marker="rat-tail"]')).toHaveLength(0);
  });
});
