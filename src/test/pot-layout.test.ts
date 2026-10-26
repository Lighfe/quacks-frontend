import { describe, expect, it } from "vitest";

import { SPIRAL_MARGIN, SPIRAL_STEP, SPIRAL_TURN_PITCH, spiralLayout } from "@/lib/pot-layout";

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

  it("gives every field a unique centre and a stepped outline", () => {
    const centres = new Set(spiralLayout.all().map((s) => `${s.center.x},${s.center.y}`));
    expect(centres.size).toBe(54);
    for (const shape of spiralLayout.all()) {
      expect(shape.outline).toHaveLength(12);
      const xs = shape.outline.map((point) => point.x);
      const ys = shape.outline.map((point) => point.y);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(10);
      for (let i = 0; i < shape.outline.length; i++) {
        const a = shape.outline[i];
        const b = shape.outline[(i + 1) % shape.outline.length];
        if (!a || !b) throw new Error("missing outline point");
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
    }
  });

  it("rejects fields outside 0..53", () => {
    expect(() => spiralLayout.field(54)).toThrow(RangeError);
  });
});

describe("spiralLayout board geometry", () => {
  it("spaces separate turns at least 1.4 times the largest consecutive step", () => {
    expect(SPIRAL_STEP).toBe(12);
    expect(SPIRAL_TURN_PITCH).toBe(19);
    const distance = (n: number, m: number) => {
      const a = spiralLayout.field(n).center;
      const b = spiralLayout.field(m).center;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const largestStep = Math.max(...Array.from({ length: 53 }, (_, n) => distance(n, n + 1)));
    for (let n = 8; n < 54; n++) {
      const otherDistances = spiralLayout.all()
        .filter((shape) => Math.abs(shape.field - n) >= 4)
        .map((shape) => distance(n, shape.field));
      expect(Math.min(...otherDistances)).toBeGreaterThanOrEqual(1.4 * largestStep);
    }
  });

  it("crops the viewBox to the field outlines plus the margin on all sides", () => {
    const pts = spiralLayout.all().flatMap((s) => s.outline);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const vb = spiralLayout.viewBox;
    expect(vb.x).toBe(Math.min(...xs) - SPIRAL_MARGIN);
    expect(vb.y).toBe(Math.min(...ys) - SPIRAL_MARGIN);
    expect(vb.x + vb.w).toBeCloseTo(Math.max(...xs) + SPIRAL_MARGIN, 12);
    expect(vb.y + vb.h).toBeCloseTo(Math.max(...ys) + SPIRAL_MARGIN, 12);
  });
});
