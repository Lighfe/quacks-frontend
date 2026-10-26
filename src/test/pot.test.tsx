import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pot } from "@/components/brew/Pot";
import type { PotEntry, WindowField } from "@/lib/game-api";

function dom(markup: string): Document {
  return new DOMParser().parseFromString(markup, "text/html");
}

describe("Pot", () => {
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
