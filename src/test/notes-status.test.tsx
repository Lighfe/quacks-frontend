import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { backendFromSearch, getView, type View } from "@/lib/game-api";
import { IngredientsBoard } from "@/components/brew/IngredientsBoard";
import { ShopDialog } from "@/components/brew/ShopDialog";

afterEach(cleanup);
const load = (mock: "shop" | "ruby") => getView(backendFromSearch({ mock }), "p1");

describe("ingredient notes", () => {
  it("renders no effect element for an empty effect", () => {
    render(<IngredientsBoard ingredients={[{ colour: "orange", effect: "", chips: [{ chip: "orange_1", value: 1, price: 3, min_round: 1, available: true }] }]} />);
    const note = screen.getByTestId("note-orange");
    expect(note.querySelector('[data-testid="note-effect"]')).toBeNull();
    expect(note.querySelector("p")).toBeNull();
  });

  it("eight notes have distinct, stable variants", async () => {
    const ings = (await load("shop")).ingredients!;
    expect(ings).toHaveLength(8);
    const { container, rerender } = render(<IngredientsBoard ingredients={ings} />);
    const read = () => Array.from(container.querySelectorAll("[data-variant]")).map((e) => e.getAttribute("data-variant"));
    const first = read();
    expect(new Set(first).size).toBe(8);
    rerender(<IngredientsBoard ingredients={ings.map((i) => ({ ...i }))} />);
    expect(read()).toEqual(first);
  });
});

describe("shop status", () => {
  const check = (m: string, p: string, r: string, full: string) => {
    expect(screen.getByTestId("status-money").textContent).toBe(m);
    expect(screen.getByTestId("status-points").textContent).toBe(p);
    expect(screen.getByTestId("status-rubies").textContent).toBe(r);
    expect(screen.getByTestId("status-flask").dataset["full"]).toBe(full);
  };
  const withMe = (v: View, money: number, points: number, rubies: number, flask_full: boolean): View => ({
    ...v,
    seats: v.seats.map((s) => (s.id === v.you ? { ...s, money, points, rubies, flask_full } : { ...s, money: 99 })),
  });

  for (const phase of ["shop", "ruby"] as const) {
    it(`shows view.you status in ${phase} and updates`, async () => {
      const base = await load(phase);
      const a = withMe(base, 12, 5, 3, true);
      const { rerender } = render(<ShopDialog view={a} onAction={vi.fn()} pending={false} error={null} />);
      expect(screen.getByTestId("shop-status")).toBeTruthy();
      check("12", "5", "3", "true");
      rerender(<ShopDialog view={withMe(base, 4, 5, 1, false)} onAction={vi.fn()} pending={false} error={null} />);
      check("4", "5", "1", "false");
    });
  }
});
