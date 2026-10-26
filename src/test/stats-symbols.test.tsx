import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Stats } from "@/components/brew/Stats";
import type { Seat } from "@/lib/game-api";

const base = {
  id: "p1", kind: "human", status: "brewing", points: 0, money: 7, rubies: 2,
  flask_full: true, white_total: 0, droplet: 3, start_field: 5, rat_tail: 2, bag: {}, pot: [],
} as unknown as Seat;

function labels(seat: Seat) {
  const doc = new DOMParser().parseFromString(renderToStaticMarkup(<Stats seat={seat} />), "text/html");
  return { doc, names: Array.from(doc.querySelectorAll("[aria-label]")).map((e) => e.getAttribute("aria-label")) };
}

describe("Stats symbols", () => {
  for (const full of [true, false]) {
    it(`shows symbols with flask_full ${full}`, () => {
      const { doc, names } = labels({ ...base, flask_full: full });
      expect(names).toEqual(["money", "points", "rubies", full ? "flask full" : "flask empty"]);
      const text = doc.body.textContent ?? "";
      for (const word of ["Points", "Money", "Rubies", "Droplet", "Rat tail", "Flask"]) {
        expect(text).not.toContain(word);
      }
      expect(text).toContain("0");
    });
  }
});
