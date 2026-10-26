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
    expect(f1).toEqual({ x: 12, y: 0 });
    expect(f2.x).toBeGreaterThan(0);
    expect(f2.y).toBeLessThan(0);
  });

  it("gives every field a unique centre and a stepped outline", () => {
    const centres = new Set(spiralLayout.all().map((s) => `${s.center.x},${s.center.y}`));
    expect(centres.size).toBe(54);
    for (const shape of spiralLayout.all()) {
      expect(shape.outline).toHaveLength(12);
      const first = shape.outline[0];
      const second = shape.outline[1];
      if (!first || !second) throw new Error("missing outline point");
      const angle = Math.atan2(second.y - first.y, second.x - first.x);
      const local = shape.outline.map((point) => {
        const x = point.x - shape.center.x;
        const y = point.y - shape.center.y;
        return { x: x * Math.cos(angle) + y * Math.sin(angle), y: -x * Math.sin(angle) + y * Math.cos(angle) };
      });
      const xs = local.map((point) => point.x);
      const ys = local.map((point) => point.y);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(10);
      for (let i = 0; i < shape.outline.length; i++) {
        const a = shape.outline[i];
        const b = shape.outline[(i + 1) % shape.outline.length];
        const c = shape.outline[(i + 2) % shape.outline.length];
        if (!a || !b || !c) throw new Error("missing outline point");
        expect((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)).toBeCloseTo(0, 10);
      }
    }
  });

  it("rejects fields outside 0..53", () => {
    expect(() => spiralLayout.field(54)).toThrow(RangeError);
  });
});

describe("spiralLayout board geometry", () => {
  it("keeps every pair of rotated squares separated", () => {
    // SAT on the enclosing 10x10 squares is stronger than checking the
    // notched outlines themselves, and checks all pairs, not just neighbours.
    const squares = spiralLayout.all().map((shape) => {
      const first = shape.outline[0];
      const second = shape.outline[1];
      if (!first || !second) throw new Error("missing outline point");
      const angle = Math.atan2(second.y - first.y, second.x - first.x);
      const axes = [{ x: Math.cos(angle), y: Math.sin(angle) }, { x: -Math.sin(angle), y: Math.cos(angle) }];
      const corners = [-1, 1].flatMap((x) => [-1, 1].map((y) => ({
        x: shape.center.x + 5 * (x * Math.cos(angle) - y * Math.sin(angle)),
        y: shape.center.y + 5 * (x * Math.sin(angle) + y * Math.cos(angle)),
      })));
      return { axes, corners };
    });
    for (let n = 0; n < squares.length; n++) {
      for (let m = n + 1; m < squares.length; m++) {
        const a = squares[n];
        const b = squares[m];
        if (!a || !b) throw new Error("missing square");
        const separated = [...a.axes, ...b.axes].some((axis) => {
          const ap = a.corners.map((p) => p.x * axis.x + p.y * axis.y);
          const bp = b.corners.map((p) => p.x * axis.x + p.y * axis.y);
          return Math.max(...ap) <= Math.min(...bp) || Math.max(...bp) <= Math.min(...ap);
        });
        expect(separated, `fields ${n} and ${m}`).toBe(true);
      }
    }
  });

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
