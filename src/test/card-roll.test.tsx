import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { backendFromSearch, getView, type View } from "@/lib/game-api";
import { TabbedGame } from "@/components/brew/TabbedGame";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ui = (view: View) => <TabbedGame view={view} shownSeat="p1" onAction={vi.fn()} pending={false} error={null} />;
const dice = () => screen.queryAllByTestId("die-roll");

describe("card-step bonus die", () => {
  it("plays after the scroll closes, in order and cauldron, and never replays", async () => {
    vi.useFakeTimers();
    const v = await getView(backendFromSearch({ mock: "card-everyone-rolls" }), "p1");
    const { rerender } = render(ui(v));
    expect(screen.getByTestId("card-scroll")).toBeTruthy();
    expect(dice()).toHaveLength(0);
    act(() => vi.advanceTimersByTime(3000));
    expect(dice()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(dice().map((d) => [d.dataset["seat"], d.dataset["cauldron"], d.dataset["face"]])).toEqual([["p1", "own", "point_1"]]);
    act(() => vi.advanceTimersByTime(3000));
    expect(dice().map((d) => [d.dataset["seat"], d.dataset["cauldron"], d.dataset["face"]])).toEqual([["p2", "other", "ruby_1"]]);
    act(() => vi.advanceTimersByTime(3000));
    expect(dice()).toHaveLength(0);
    rerender(ui({ ...v, game: { ...v.game, revision: v.game.revision + 1 } }));
    expect(dice()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Read round card" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dice()).toHaveLength(0);
  });

  it("no card roll for null, empty or other-round card_roll", async () => {
    const v = await getView(backendFromSearch({ mock: "card-everyone-rolls" }), "p1");
    for (const card_roll of [null, { round: v.game.round, rolls: [] }, { round: v.game.round + 1, rolls: v.game.card_roll!.rolls }]) {
      render(ui({ ...v, game: { ...v.game, card_roll } }));
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      expect(dice()).toHaveLength(0);
      cleanup();
    }
  });
});
