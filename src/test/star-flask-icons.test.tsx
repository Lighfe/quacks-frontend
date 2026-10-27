import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Stats } from "@/components/brew/Stats";
import { STAR } from "@/components/brew/pixel-icons";
import type { Seat } from "@/lib/game-api";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));

function cssVar(name: string): string {
  const m = root.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m?.[1]) throw new Error(`missing --${name}`);
  const v = m[1].trim();
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  return ref?.[1] ? cssVar(ref[1]) : v;
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklchToRgb(l: number, c: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h), b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  return [clamp(gamma(r)), clamp(gamma(g)), clamp(gamma(bl))];
}

function toRgb(v: string): [number, number, number] {
  const ok = v.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (ok) return oklchToRgb(Number(ok[1]), Number(ok[2]), Number(ok[3]));
  const hex = v.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  throw new Error(`unsupported colour ${v}`);
}

function hsl(fill: string) {
  const name = fill.match(/^var\(--([\w-]+)\)$/)?.[1];
  if (!name) throw new Error(`unexpected fill ${fill}`);
  const [r, g, b] = toRgb(cssVar(name));
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s: s * 100 };
}

const base = {
  id: "p1", kind: "human", status: "brewing", points: 3, money: 7, rubies: 2,
  flask_full: true, white_total: 0, droplet: 3, start_field: 5, rat_tail: 2, bag: {}, pot: [],
} as unknown as Seat;

function render(full: boolean) {
  return new DOMParser().parseFromString(renderToStaticMarkup(<Stats seat={{ ...base, flask_full: full }} />), "text/html");
}

function fills(svg: Element) {
  return Array.from(svg.querySelectorAll("rect")).map((r) => r.getAttribute("fill") ?? "");
}

function mainFill(list: string[]) {
  const counts = new Map<string, number>();
  for (const f of list) counts.set(f, (counts.get(f) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

const hueDist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

function rotation(el: Element | null): number | null {
  for (let e = el; e && e.tagName !== "BODY"; e = e.parentElement) {
    const src = `${e.getAttribute("style") ?? ""} ${e.getAttribute("transform") ?? ""}`;
    const m = src.match(/rotate\(\s*(-?[\d.]+)/);
    if (m) return Number(m[1]);
  }
  return null;
}

describe("star and flask icons", () => {
  it("star is purple", () => {
    const svg = render(true).querySelector('[aria-label="points"]')!;
    const { h, s } = hsl(mainFill(fills(svg)));
    expect(h).toBeGreaterThanOrEqual(260);
    expect(h).toBeLessThanOrEqual(300);
    expect(s).toBeGreaterThanOrEqual(25);
  });

  it("star grid reads as a five-point star", () => {
    expect([...STAR]).not.toEqual(["..y..", ".yyy.", "yyyyy", ".yyy.", "y...y"]);
    for (const row of STAR) expect(row).toBe([...row].reverse().join(""));
    const filled = STAR.filter((row) => /[^.]/.test(row));
    const runs = (row: string) => row.split(".").filter(Boolean).length;
    expect(runs(filled[0]!)).toBe(1);
    expect(runs(filled[filled.length - 1]!)).toBe(2);
  });

  for (const full of [true, false]) {
    it(`flask ${full ? "full" : "empty"} is green, never blue`, () => {
      const svg = render(full).querySelector(`[aria-label="flask ${full ? "full" : "empty"}"]`)!;
      const list = fills(svg);
      const { h, s } = hsl(mainFill(list));
      expect(h).toBeGreaterThanOrEqual(90);
      expect(h).toBeLessThanOrEqual(160);
      expect(s).toBeGreaterThanOrEqual(25);
      for (const f of list) {
        expect(f).not.toBe("var(--chip-blue)");
        const c = hsl(f);
        expect(c.s >= 25 && hueDist(c.h, 206) <= 60).toBe(false);
      }
      const rot = rotation(svg);
      if (full) expect(rot).toBeNull();
      else {
        expect(rot).toBeGreaterThanOrEqual(5);
        expect(rot).toBeLessThanOrEqual(20);
      }
    });
  }
});
