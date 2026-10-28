import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TabbedGame } from "@/components/brew/TabbedGame";
import type { CleanupMemory } from "@/components/brew/RoundCleanup";
import { backendFromSearch, getView, sendAction, STATIC_MOCKS, type View } from "@/lib/game-api";

const originalMedia = window.matchMedia;
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = originalMedia;
});

async function snapshots() {
  const before = await getView(backendFromSearch({ mock: "ruby" }), "p1");
  const card = await getView(backendFromSearch({ mock: "card" }), "p1");
  const after: View = {
    ...card,
    game: { ...card.game, round: before.game.round + 1, revision: before.game.revision + 1 },
  };
  return { before, after };
}

function setup(view: View, memory = { current: { shownSeat: null, views: new Map(), rounds: new Set() } as CleanupMemory }) {
  const onAction = vi.fn();
  const node = (v: View, seat = v.you) => <TabbedGame view={v} shownSeat={seat} onAction={onAction} pending={false} error={null} cleanupMemory={memory} />;
  const result = render(node(view));
  return { ...result, memory, onAction, update: (v: View, seat = v.you) => result.rerender(node(v, seat)) };
}

describe("round pot clean-up", () => {
  it("returns from Ingredients to Cauldron, flies only own chips, and clears within 1.5 seconds", async () => {
    const { before, after } = await snapshots();
    vi.useFakeTimers();
    const { update, container } = setup(before);
    fireEvent.click(screen.getByRole("tab", { name: "Ingredients" }));
    update(after);
    expect(screen.getByRole("tab", { name: "Cauldron" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByTestId("return-flight")).toHaveLength(before.seats.find((s) => s.id === "p1")?.pot.length ?? 0);
    const pots = container.querySelectorAll(".pot-surface");
    expect(pots[1]?.querySelector("[data-landing]")).toBeNull();
    expect(screen.queryByTestId("draw-flight")).toBeNull();
    act(() => vi.advanceTimersByTime(1500));
    expect(container.querySelector("[data-landing]")).toBeNull();
    expect(container.querySelector("[data-trail]")).toBeNull();
    expect(screen.queryByTestId("return-flight")).toBeNull();
  });

  it("opens the new round scroll only after the return flight ends and blocks actions meanwhile", async () => {
    const { before, after } = await snapshots();
    vi.useFakeTimers();
    const { update, onAction } = setup(before);
    update(after);
    expect(screen.queryByTestId("card-scroll")).toBeNull();
    fireEvent.keyDown(window, { key: "d" });
    expect(onAction).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.queryByTestId("card-scroll")).toBeNull();
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByTestId("card-scroll")).toBeInTheDocument();
    expect(screen.queryByTestId("return-flight")).toBeNull();
  });

  it("switches from Point board after a polled jump from any earlier phase", async () => {
    const { before, after } = await snapshots();
    vi.useFakeTimers();
    const { update } = setup({ ...before, game: { ...before.game, phase: "brewing" } });
    fireEvent.click(screen.getByRole("tab", { name: "Point board" }));
    update(after);
    expect(screen.getByRole("tab", { name: "Cauldron" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByTestId("return-flight").length).toBeGreaterThan(0);
  });

  it("skips flights, clears immediately and opens the scroll immediately with reduced motion", async () => {
    const { before, after } = await snapshots();
    window.matchMedia = ((query: string) => ({ ...originalMedia(query), matches: true })) as typeof window.matchMedia;
    const { update, container } = setup(before);
    fireEvent.click(screen.getByRole("tab", { name: "Ingredients" }));
    update(after);
    expect(screen.getByRole("tab", { name: "Cauldron" })).toHaveAttribute("aria-selected", "true");
    expect(container.querySelector("[data-landing]")).toBeNull();
    expect(screen.queryByTestId("return-flight")).toBeNull();
    expect(screen.getByTestId("card-scroll")).toBeInTheDocument();
  });

  it("never starts cleanup on a hot-seat switch, even with a higher-round cached view", async () => {
    const { before, after } = await snapshots();
    const { update } = setup(before);
    update({ ...after, you: "p2" }, "p2");
    expect(screen.queryByTestId("return-flight")).toBeNull();
    expect(screen.getByTestId("card-scroll")).toBeInTheDocument();
  });

  it("does not replay a consumed round after a shared-memory remount", async () => {
    const { before, after } = await snapshots();
    vi.useFakeTimers();
    const first = setup(before);
    first.update(after);
    expect(screen.getAllByTestId("return-flight").length).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(1500));
    first.unmount();
    const second = setup(before, first.memory);
    second.update(after);
    expect(screen.queryByTestId("return-flight")).toBeNull();
  });

  it("does not clean up on initial page load or game over", async () => {
    const { before, after } = await snapshots();
    const first = setup(after);
    expect(screen.queryByTestId("return-flight")).toBeNull();
    expect(screen.getByTestId("card-scroll")).toBeInTheDocument();
    first.unmount();
    const second = setup(before);
    second.update({ ...after, game: { ...after.game, phase: "game_over", winner: "p1" } });
    expect(screen.queryByTestId("return-flight")).toBeNull();
    expect(screen.queryByTestId("card-scroll")).toBeNull();
    expect(screen.getByRole("button", { name: "New game" })).toBeInTheDocument();
  });
});

it("round-end mock advances once on Done and retains the literal round 2 snapshot", async () => {
  expect(STATIC_MOCKS).toContain("round-end");
  const backend = backendFromSearch({ mock: "round-end" });
  const before = await getView(backend, "p1");
  expect(before.game).toMatchObject({ phase: "ruby", round: 1 });
  expect(before.to_act).toEqual(["p1"]);
  expect(before.legal).toEqual([{ id: "done", label: "Done" }]);
  const own = before.seats.find((s) => s.id === "p1");
  expect(own?.pot.length).toBeGreaterThan(0);
  const after = await sendAction(backend, "p1", "done", before.game.revision);
  expect(after.game.round).toBe(2);
  expect(after.game.revision).toBeGreaterThan(before.game.revision);
  expect(after.seats.every((s) => s.pot.length === 0)).toBe(true);
  const bag = after.seats.find((s) => s.id === "p1")?.bag ?? {};
  for (const chip of own?.pot ?? []) {
    const returned = own?.pot.filter((entry) => entry.chip === chip.chip).length ?? 0;
    expect(bag[chip.chip]).toBe((own?.bag[chip.chip] ?? 0) + returned);
  }
  expect(after.game.card).not.toBeNull();
  expect(after.game.phase).toBe("brewing");
  expect(await sendAction(backend, "p1", "done", after.game.revision)).toBe(after);
  expect(await sendAction(backend, "p1", "draw", after.game.revision)).toBe(after);
  expect(await getView(backend, "p1")).toBe(after);
});