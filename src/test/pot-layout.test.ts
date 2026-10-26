import { describe, expect, it } from "vitest";

import { spiralLayout } from "@/lib/pot-layout";

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
