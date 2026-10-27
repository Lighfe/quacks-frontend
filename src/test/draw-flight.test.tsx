import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { BrewScreen } from "@/components/brew/BrewScreen";
import { backendFromSearch, getView, type PotEntry, type View } from "@/lib/game-api";

const loadPlaytest = () => getView(backendFromSearch({ mock: "playtest" }), "p1");

const drawn: PotEntry = { order: 90, chip: "green_1", colour: "green", value: 1, from: 15, landing: 15 };

function withNewEntry(view: View, seatId: string): View {
  return {
    ...view,
    game: { ...view.game, revision: view.game.revision + 1 },
    seats: view.seats.map((s) => (s.id === seatId ? { ...s, pot: [...s.pot, drawn] } : s)),
  };
}

function renderBrew(view: View) {
  return render(<BrewScreen view={view} onAction={vi.fn()} pending={false} error={null} />);
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

afterEach(cleanup);

describe("draw flight", () => {
  it("flies a chip copy from the sack when the own pot gets a new entry", async () => {
    const view = await loadPlaytest();
    const { rerender } = renderBrew(view);
    expect(screen.queryByTestId("draw-flight")).toBeNull();
    rerender(<BrewScreen view={withNewEntry(view, "p1")} onAction={vi.fn()} pending={false} error={null} />);
    const flight = await screen.findByTestId("draw-flight");
    expect(flight.textContent).toBe("1");
  });

  it("does not fly on the first view after mount", async () => {
    renderBrew(withNewEntry(await loadPlaytest(), "p1"));
    await settle();
    expect(screen.queryByTestId("draw-flight")).toBeNull();
  });

  it("does not fly when only an opponent seat gets a new entry", async () => {
    const view = await loadPlaytest();
    const { rerender } = renderBrew(view);
    rerender(<BrewScreen view={withNewEntry(view, "p2")} onAction={vi.fn()} pending={false} error={null} />);
    await settle();
    expect(screen.queryByTestId("draw-flight")).toBeNull();
  });

  it("renders no flight with reduced motion", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      const view = await loadPlaytest();
      const { rerender } = renderBrew(view);
      rerender(<BrewScreen view={withNewEntry(view, "p1")} onAction={vi.fn()} pending={false} error={null} />);
      await settle();
      expect(screen.queryByTestId("draw-flight")).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});
