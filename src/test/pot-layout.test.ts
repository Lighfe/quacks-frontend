import { describe, expect, it } from "vitest";

import { SPIRAL_MARGIN, SPIRAL_PITCH, spiralLayout } from "@/lib/pot-layout";

describe("spiralLayout", () => {
  it("has exactly 54 fields", () => {
    expect(spiralLayout.fieldCount).toBe(54);
    expect(spiralLayout.all()).toHaveLength(54);
  });

  it("puts field 0 in the centre", () => {
    expect(spiralLayout.field(0).center).toEqual({ x: 0, y: 0 });
  });

  it("winds counter-clockwise: field 1 east, field 2 north of centre", () => {
    const f1 = spiralLayout.field(1).center;
    const f2 = spiralLayout.field(2).center;
    expect(f1.x).toBeGreaterThan(0);
    expect(f1.y).toBe(0);
    expect(f2.x).toBeGreaterThan(0);
    expect(f2.y).toBeLessThan(0);
  });

  it("gives every field a unique centre and a 4-point outline", () => {
    const centres = new Set(spiralLayout.all().map((s) => `${s.center.x},${s.center.y}`));
    expect(centres.size).toBe(54);
    for (const shape of spiralLayout.all()) {
      expect(shape.outline).toHaveLength(4);
    }
  });

  it("rejects fields outside 0..53", () => {
    expect(() => spiralLayout.field(54)).toThrow(RangeError);
  });
});

describe("spiralLayout board geometry", () => {
  const cell = (n: number) => {
    const c = spiralLayout.field(n).center;
    return { x: Math.round(c.x / SPIRAL_PITCH), y: Math.round(c.y / SPIRAL_PITCH) };
  };

  it("puts field 0 on the centre cell of the 7x7 block of fields 0-48", () => {
    const block = Array.from({ length: 49 }, (_, n) => cell(n));
    const xs = block.map((c) => c.x);
    const ys = block.map((c) => c.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(6);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(6);
    expect(cell(0)).toEqual({ x: Math.min(...xs) + 3, y: Math.min(...ys) + 3 });
  });

  it("puts field 1 right of field 0 and field 2 above field 1", () => {
    expect(cell(1)).toEqual({ x: cell(0).x + 1, y: cell(0).y });
    expect(cell(2)).toEqual({ x: cell(1).x, y: cell(1).y - 1 });
  });

  it("puts fields 49-53 in one column right of the 7x7 block", () => {
    const right = Math.max(...Array.from({ length: 49 }, (_, n) => cell(n).x)) + 1;
    for (let n = 49; n < 54; n++) expect(cell(n).x).toBe(right);
  });

  it("makes every consecutive pair of fields grid neighbours", () => {
    for (let n = 0; n < 53; n++) {
      const a = cell(n);
      const b = cell(n + 1);
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
    }
  });

  it("crops the viewBox to the field outlines plus the margin on all sides", () => {
    const pts = spiralLayout.all().flatMap((s) => s.outline);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const vb = spiralLayout.viewBox;
    expect(vb.x).toBe(Math.min(...xs) - SPIRAL_MARGIN);
    expect(vb.y).toBe(Math.min(...ys) - SPIRAL_MARGIN);
    expect(vb.x + vb.w).toBe(Math.max(...xs) + SPIRAL_MARGIN);
    expect(vb.y + vb.h).toBe(Math.max(...ys) + SPIRAL_MARGIN);
  });
});
