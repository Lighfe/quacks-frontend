import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
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
    const group = groups[0];
    if (!group) throw new Error("missing window field");
    const texts = Array.from(group.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toEqual(["7", "15"]);
    expect(group.querySelector("[data-ruby]")).not.toBeNull();
  });

  it("keeps all window numbers at least 3 units with dark outlines on occupied fields", () => {
    const doc = dom(renderToStaticMarkup(<Pot pot={playtestPot} mode="own" window={[
      { field: 14, money: 25, points: 12, ruby: true },
      { field: 15, money: 26, points: 13, ruby: true },
    ]} />));
    for (const field of [14, 15]) {
      const numbers = doc.querySelectorAll(`[data-window-field="${field}"] text`);
      expect(numbers).toHaveLength(2);
      expect(Array.from(numbers).map((text) => text.getAttribute("fill")))
        .toEqual(["var(--pot-money)", "var(--pot-points)"]);
      for (const text of numbers) {
        expect(Number(text.getAttribute("font-size"))).toBeGreaterThanOrEqual(3);
        if (field === 14) {
          expect(text.getAttribute("stroke")).toBe("var(--background)");
          expect(text.getAttribute("paint-order")).toBe("stroke");
        }
      }
    }
  });

  it.each(["pot-money", "pot-points"])("%s has at least 4.5:1 contrast against the lit field", (token) => {
    const css = readFileSync("src/styles.css", "utf8");
    const hex = css.match(new RegExp(`--${token}:\\s*#([0-9a-f]{6})`, "i"))?.[1];
    const lit = css.match(/--pot-lit:\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/);
    if (!hex || !lit) throw new Error("missing pot colour tokens");
    const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const foreground = [0, 2, 4].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
    const l = Number(lit[1]);
    const c = Number(lit[2]);
    const angle = Number(lit[3]) * Math.PI / 180;
    const a = c * Math.cos(angle);
    const b = c * Math.sin(angle);
    const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const background = [
      4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
      -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
      -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    ];
    const luminance = (channels: number[]) => channels.reduce((sum, value, i) => sum + value * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);
    expect((luminance(foreground) + 0.05) / (luminance(background) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it("draws the droplet marker when a droplet field is given", () => {
    const doc = dom(renderToStaticMarkup(<Pot pot={[]} mode="other" droplet={0} />));
    expect(doc.querySelectorAll('[data-marker="droplet"]')).toHaveLength(1);
  });

});
