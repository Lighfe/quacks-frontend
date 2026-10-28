import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TabbedGame } from "@/components/brew/TabbedGame";
import { backendFromSearch, getView, type View } from "@/lib/game-api";
import { lapMarker, markerTile } from "@/lib/point-board";

afterEach(cleanup);
const board = { fields: 50, laps: 2, rat_tails: [1, 4, 7, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48] };

function openBoard(view: View) {
  const r = render(<TabbedGame view={view} shownSeat="p1" onAction={vi.fn()} pending={false} error={null} />);
  fireEvent.click(screen.getByRole("tab", { name: /point board/i }));
  return r;
}

describe("point board helpers", () => {
  it("marker tiles", () => {
    expect([23, 49, 50, 57, 100].map((p) => markerTile(p, board))).toEqual([23, 49, 0, 7, 49]);
  });
  it("lap markers", () => {
    expect([23, 50, 57, 100].map((p) => lapMarker(p, board))).toEqual([0, 50, 50, 50]);
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
    expect(flames[3]!.getAttribute("data-state")).toBe("burnt");
    expect(flames[5]!.getAttribute("data-state")).toBe("unlit");
  });

  it("shows a text without board", async () => {
    openBoard(await getView(backendFromSearch({ mock: "playtest" }), "p1"));
    expect(screen.getByText("No point board in this game view")).toBeTruthy();
  });
});
