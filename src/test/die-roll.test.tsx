import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

import { backendFromSearch, getView, type View } from "@/lib/game-api";
import { TabbedGame } from "@/components/brew/TabbedGame";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const load = (mock: "die" | "die-opponent" | "die-tie" | "shop") => getView(backendFromSearch({ mock }), "p1");
const ui = (view: View) => <TabbedGame view={view} shownSeat="p1" onAction={vi.fn()} pending={false} error={null} />;
const dice = () => screen.queryAllByTestId("die-roll");
const selected = () => screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")?.textContent;

describe("bonus die", () => {
  it("rolls in the own cauldron for you", async () => {
    render(ui(await load("die")));
    expect(dice()).toHaveLength(1);
    expect(dice()[0]!.dataset["cauldron"]).toBe("own");
    expect(dice()[0]!.textContent).toContain("Droplet +1");
  });

  it("rolls in the opponent cauldron for p2, with the cauldrons shown in choice", async () => {
    render(ui(await load("die-opponent")));
    expect(dice()).toHaveLength(1);
    expect(dice()[0]!.dataset["cauldron"]).toBe("other");
    expect(dice()[0]!.dataset["seat"]).toBe("p2");
  });

  it("plays a tie p1 then p2, then no die remains", async () => {
    vi.useFakeTimers();
    render(ui(await load("die-tie")));
    expect(dice().map((d) => d.dataset["seat"])).toEqual(["p1"]);
    act(() => vi.advanceTimersByTime(3000));
    expect(dice().map((d) => d.dataset["seat"])).toEqual(["p2"]);
    act(() => vi.advanceTimersByTime(3000));
    expect(dice()).toHaveLength(0);
  });

  it("no die for empty rolls or null last_roll", async () => {
    const v = await load("die");
    const { unmount } = render(ui({ ...v, game: { ...v.game, last_roll: { round: 1, rolls: [] } } }));
    expect(dice()).toHaveLength(0);
    unmount();
    render(ui({ ...v, game: { ...v.game, last_roll: null } }));
    expect(dice()).toHaveLength(0);
  });

  it("does not replay for a later view with the same round", async () => {
    vi.useFakeTimers();
    const v = await load("die");
    const { rerender } = render(ui(v));
    act(() => vi.advanceTimersByTime(3000));
    expect(dice()).toHaveLength(0);
    rerender(ui({ ...v, game: { ...v.game, revision: v.game.revision + 1 } }));
    expect(dice()).toHaveLength(0);
  });

  it("switches to Ingredients only after the roll", async () => {
    vi.useFakeTimers();
    const shop = await load("die");
    const brew = await getView(backendFromSearch({ mock: "playtest" }), "p1");
    const { rerender } = render(ui(brew));
    rerender(ui(shop));
    expect(selected()).toBe("Cauldron");
    expect(dice()).toHaveLength(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(dice()).toHaveLength(0);
    expect(selected()).toBe("Ingredients");
  });
});
