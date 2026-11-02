import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TabbedGame } from "@/components/brew/TabbedGame";
import type { CleanupMemory } from "@/components/brew/RoundCleanup";
import { backendFromSearch, getView, sendAction, type View } from "@/lib/game-api";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

let cached: { before: View; after: View } | null = null;
// The round-end mock keeps its round for the page session, so read it once.
async function roundEnd() {
  if (cached) return cached;
  const backend = backendFromSearch({ mock: "round-end" });
  const before = await getView(backend, "p1");
  const after = await sendAction(backend, "p1", "done", before.game.revision);
  cached = { before, after };
  return cached;
}

function setup(view: View) {
  const memory = { current: { shownSeat: null, views: new Map(), rounds: new Set() } as CleanupMemory };
  const node = (v: View) => <TabbedGame view={v} shownSeat={v.you} onAction={vi.fn()} pending={false} error={null} cleanupMemory={memory} />;
  const result = render(node(view));
  return { ...result, update: (v: View) => result.rerender(node(v)) };
}

const tab = (name: string) => screen.getByRole("tab", { name });
const flame = (r: number) => document.querySelector(`[data-testid="flame"][data-round="${r}"]`);
const scroll = () => screen.queryByRole("button", { name: /continue/i });

describe("round-end point board step", () => {
  it("runs after the clean-up, changes flames, returns to Cauldron, then shows the scroll", async () => {
    const { before, after } = await roundEnd();
    expect(before.board).toBeDefined();
    expect(after.board).toEqual(before.board);
    vi.useFakeTimers();
    const { update } = setup(before);
    update(after);
    expect(tab("Cauldron")).toHaveAttribute("aria-selected", "true");
    expect(screen.queryAllByTestId("return-flight").length).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(1300));
    expect(tab("Point board")).toHaveAttribute("aria-selected", "true");
    expect(flame(1)).toHaveAttribute("data-state", "lit");
    expect(flame(2)).toHaveAttribute("data-state", "unlit");
    expect(scroll()).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(flame(1)).toHaveAttribute("data-state", "burnt");
    expect(flame(2)).toHaveAttribute("data-state", "lit");
    expect(scroll()).toBeNull();
    act(() => vi.advanceTimersByTime(1600));
    expect(tab("Cauldron")).toHaveAttribute("aria-selected", "true");
    expect(scroll()).not.toBeNull();
  });

  it("does not run on the first view", async () => {
    const { after } = await roundEnd();
    vi.useFakeTimers();
    setup(after);
    act(() => vi.advanceTimersByTime(3000));
    expect(tab("Cauldron")).toHaveAttribute("aria-selected", "true");
  });

  it("a tab click ends the step and is not overridden", async () => {
    const { before, after } = await roundEnd();
    vi.useFakeTimers();
    const { update } = setup(before);
    update(after);
    act(() => vi.advanceTimersByTime(1300));
    expect(tab("Point board")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(tab("Ingredients"));
    expect(tab("Ingredients")).toHaveAttribute("aria-selected", "true");
    act(() => vi.advanceTimersByTime(3000));
    expect(tab("Ingredients")).toHaveAttribute("aria-selected", "true");
  });

  it("shows the point board on the end screen", async () => {
    const view = await getView(backendFromSearch({ mock: "game-over" }), "p1");
    expect(view.game.phase).toBe("game_over");
    expect(view.game.winner).not.toBeNull();
    setup(view);
    expect(screen.getByTestId("end-board")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-testid="flame"]')).toHaveLength(view.game.rounds);
    expect(screen.getByTestId("final-p1")).toBeInTheDocument();
    expect(screen.getByText(/Winner:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New game" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });
});
