import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TabbedGame } from "@/components/brew/TabbedGame";
import { backendFromSearch, getView, type View } from "@/lib/game-api";
import { frameCells, lapMarker, markerTile } from "@/lib/point-board";

afterEach(cleanup);
const board = { fields: 50, laps: 2, rat_tails: [1, 4, 7, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48] };

function openBoard(view: View) {
  const r = render(<TabbedGame view={view} shownSeat="p1" onAction={vi.fn()} pending={false} error={null} />);
  fireEvent.click(screen.getByRole("tab", { name: /point board/i }));
  return r;
}

function tileRect(container: HTMLElement, t: number) {
  const r = container.querySelector(`[data-testid="board-tile"][data-tile="${t}"] rect`)!;
  const x = Number(r.getAttribute("x"));
  const y = Number(r.getAttribute("y"));
  return { x, y, w: Number(r.getAttribute("width")), h: Number(r.getAttribute("height")) };
}
const centreOf = (c: HTMLElement, t: number) => {
  const r = tileRect(c, t);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2, side: r.w };
};

describe("point board helpers", () => {
  it("marker tiles", () => {
    expect([23, 49, 50, 57, 100].map((p) => markerTile(p, board))).toEqual([23, 49, 0, 7, 49]);
  });
  it("lap markers", () => {
    expect([23, 50, 57, 100].map((p) => lapMarker(p, board))).toEqual([0, 50, 50, 50]);
  });
  it("wide closed ring for 50 fields", () => {
    const { w, h, cells } = frameCells(50);
    expect(w).toBeGreaterThanOrEqual(18);
    expect(h).toBeLessThanOrEqual(9);
    expect(cells.length).toBe(50);
    const a = cells[49]!;
    const b = cells[0]!;
    expect(Math.abs(a.col - b.col) + Math.abs(a.row - b.row)).toBe(1);
  });
});

describe("point board tab", () => {
  it("rats, markers, laps and flames from the board mock", async () => {
    const view = await getView(backendFromSearch({ mock: "board" }), "p1");
    const { container } = openBoard(view);
    const rats = [...container.querySelectorAll('[data-testid="rat"]')].map((r) => Number(r.getAttribute("data-after-tile")));
    expect(rats).toEqual(board.rat_tails);
    expect(container.querySelectorAll('[data-testid="board-tile"]').length).toBe(50);
    const tile = (s: string) => container.querySelector(`[data-testid="board-marker"][data-seat="${s}"]`)?.getAttribute("data-tile");
    expect(tile("p1")).toBe("23");
    expect(tile("p2")).toBe("7");
    const lap = (s: string) => container.querySelector(`[data-testid="lap-marker"][data-seat="${s}"]`)?.textContent;
    expect(lap("p1")).toBe("0");
    expect(lap("p2")).toBe("50");
    const flames = [...container.querySelectorAll('[data-testid="flame"]')];
    expect(flames.length).toBe(9);
    expect(flames.filter((f) => f.getAttribute("data-state") === "lit").map((f) => f.getAttribute("data-round"))).toEqual(["5"]);
  });

  it("rat tails sit in the gap between their two tiles, including the wrap at 49", async () => {
    const base = await getView(backendFromSearch({ mock: "board" }), "p1");
    const tails = [...board.rat_tails, 49];
    const { container } = openBoard({ ...base, board: { ...base.board!, rat_tails: tails } });
    const rats = [...container.querySelectorAll('[data-testid="rat"]')];
    expect(rats.map((r) => Number(r.getAttribute("data-after-tile")))).toEqual(tails);
    expect(new Set(rats.map((r) => r.getAttribute("data-side"))).size).toBe(4);
    for (const r of rats) {
      const t = Number(r.getAttribute("data-after-tile"));
      const a = centreOf(container, t);
      const b = centreOf(container, (t + 1) % 50);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const tx = Number(r.getAttribute("data-tail-x"));
      const ty = Number(r.getAttribute("data-tail-y"));
      const dMid = Math.hypot(tx - mid.x, ty - mid.y);
      expect(dMid).toBeLessThan(a.side);
      for (let k = 0; k < 50; k++) {
        const c = centreOf(container, k);
        expect(dMid).toBeLessThan(Math.hypot(tx - c.x, ty - c.y));
      }
    }
  });

  it("markers stand inside their tiles, also two on one tile", async () => {
    const base = await getView(backendFromSearch({ mock: "board" }), "p1");
    for (const pts of [[23, 57], [50, 50], [100, 100]]) {
      const view = { ...base, seats: base.seats.map((s, i) => ({ ...s, points: pts[i] ?? s.points })) };
      const { container } = openBoard(view);
      const markers = [...container.querySelectorAll('[data-testid="board-marker"]')];
      const centres = markers.map((m) => {
        const t = Number(m.getAttribute("data-tile"));
        const cx = Number(m.getAttribute("data-cx"));
        const cy = Number(m.getAttribute("data-cy"));
        const r = tileRect(container, t);
        expect(cx).toBeGreaterThan(r.x);
        expect(cx).toBeLessThan(r.x + r.w);
        expect(cy).toBeGreaterThan(r.y);
        expect(cy).toBeLessThan(r.y + r.h);
        return `${t}:${cx},${cy}`;
      });
      expect(markers.map((m) => m.getAttribute("data-tile"))).toEqual(
        pts[0] === 23 ? ["23", "7"] : pts[0] === 50 ? ["0", "0"] : ["49", "49"],
      );
      expect(new Set(centres).size).toBe(centres.length);
      cleanup();
    }
  });

  it("shows a text without board", async () => {
    openBoard(await getView(backendFromSearch({ mock: "playtest" }), "p1"));
    expect(screen.getByText("No point board in this game view")).toBeTruthy();
  });
});
