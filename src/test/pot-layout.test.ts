import { describe, expect, it } from "vitest";
import { SPIRAL_MARGIN, spiralLayout } from "@/lib/pot-layout";

describe("square snake spiral", () => {
  it("has 54 fields with field 0 at the origin and the initial east/north directions", () => {
    expect(spiralLayout.fieldCount).toBe(54);
    expect(spiralLayout.all()).toHaveLength(54);
    expect(spiralLayout.field(0).center).toEqual({ x: 0, y: 0 });
    expect(spiralLayout.field(1).center).toEqual({ x: 12, y: 0 });
    expect(spiralLayout.field(2).center).toEqual({ x: 13, y: -12 });
    expect(() => spiralLayout.field(54)).toThrow(RangeError);
  });

  it("follows east, north, west, south runs of 1,1,2,2,3,3 with the smallest valid outward shift", () => {
    const directions = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }];
    let field = 1;
    for (let turn = 0; field < 54; turn++) {
      const direction = directions[turn % 4];
      if (!direction) throw new Error("missing direction");
      for (let step = 0; step < Math.floor(turn / 2) + 1 && field < 54; step++, field++) {
        const a = spiralLayout.field(field - 1).center;
        const b = spiralLayout.field(field).center;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        expect(dx * direction.x + dy * direction.y).toBe(12);
        const shift = -dx * direction.y + dy * direction.x;
        expect(shift).toBeGreaterThanOrEqual(0);
        expect(shift).toBeLessThanOrEqual(2);
        expect(shift * 2).toBe(Math.round(shift * 2));
        for (let s = 0; s < shift; s += 0.5) {
          const candidate = { x: a.x + 12 * direction.x - s * direction.y, y: a.y + 12 * direction.y + s * direction.x };
          const valid = spiralLayout.all().slice(0, field).every(({ center }, index) => {
            const x = Math.abs(candidate.x - center.x) - 10;
            const y = Math.abs(candidate.y - center.y) - 10;
            const facing = x < 0 || y < 0;
            const gap = x < 0 ? y : x;
            return index === field - 1 ? facing && gap === 2
              : facing ? (gap >= 3 && gap <= 4) || gap >= 10 : x >= 2 || y >= 2;
          });
          expect(valid, `field ${field}, smaller shift ${s}`).toBe(false);
        }
      }
    }
  });

  it("gives every field four axis-aligned corners with side 10", () => {
    for (const { center, outline } of spiralLayout.all()) {
      expect(outline).toEqual([
        { x: center.x - 5, y: center.y - 5 },
        { x: center.x + 5, y: center.y - 5 },
        { x: center.x + 5, y: center.y + 5 },
        { x: center.x - 5, y: center.y + 5 },
      ]);
    }
  });

  it("satisfies the consecutive, facing and diagonal gap rules for every pair", () => {
    for (let n = 0; n < 54; n++) {
      for (let m = n + 1; m < 54; m++) {
        const a = spiralLayout.field(n).center;
        const b = spiralLayout.field(m).center;
        const xGap = Math.abs(a.x - b.x) - 10;
        const yGap = Math.abs(a.y - b.y) - 10;
        const facing = xGap < 0 || yGap < 0;
        const gap = xGap < 0 ? yGap : xGap;
        if (m === n + 1) {
          expect(facing, `${n},${m} face`).toBe(true);
          expect(gap, `${n},${m} consecutive gap`).toBe(2);
        } else if (facing) {
          expect((gap >= 3 && gap <= 4) || gap >= 10, `${n},${m} facing gap ${gap}`).toBe(true);
        } else {
          expect(xGap >= 2 || yGap >= 2, `${n},${m} diagonal gaps`).toBe(true);
        }
      }
    }
  });

  it("crops to outline bounds plus a uniform margin of at most 4", () => {
    const points = spiralLayout.all().flatMap(({ outline }) => outline);
    const xs = points.map(({ x }) => x);
    const ys = points.map(({ y }) => y);
    const vb = spiralLayout.viewBox;
    expect(SPIRAL_MARGIN).toBeGreaterThan(0);
    expect(SPIRAL_MARGIN).toBeLessThanOrEqual(4);
    expect(vb).toEqual({
      x: Math.min(...xs) - SPIRAL_MARGIN,
      y: Math.min(...ys) - SPIRAL_MARGIN,
      w: Math.max(...xs) - Math.min(...xs) + 2 * SPIRAL_MARGIN,
      h: Math.max(...ys) - Math.min(...ys) + 2 * SPIRAL_MARGIN,
    });
    expect(vb.w - 2 * SPIRAL_MARGIN).toBe(100);
    expect(vb.h - 2 * SPIRAL_MARGIN).toBe(88);
  });
});
