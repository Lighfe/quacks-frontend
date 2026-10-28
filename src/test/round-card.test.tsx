import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { TabbedGame } from "@/components/brew/TabbedGame";
import { backendFromSearch, getView, type View } from "@/lib/game-api";

afterEach(cleanup);

const load = (mock: "card" | "card-choice" | "playtest") =>
  getView(backendFromSearch({ mock }), "p1");

function setup(view: View, onAction = vi.fn(), error: string | null = null) {
  const r = render(<TabbedGame view={view} shownSeat="p1" onAction={onAction} pending={false} error={error} />);
  const rerender = (v: View, err: string | null = null) =>
    r.rerender(<TabbedGame view={v} shownSeat="p1" onAction={onAction} pending={false} error={err} />);
  return { onAction, rerender };
}

describe("round card scroll", () => {
  it("opens with the card text and waits for Continue; brew keys blocked", async () => {
    const v = await load("card");
    const { onAction } = setup(v);
    expect(screen.getByTestId("card-text").textContent).toBe(v.game.card!.text);
    fireEvent.keyDown(window, { key: "d" });
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByTestId("card-scroll")).toBeNull();
  });

  it("closes on Enter and reopens on a new round", async () => {
    const v = await load("card");
    const { rerender } = setup(v);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("card-scroll")).toBeNull();
    rerender({ ...v, game: { ...v.game, round: 3, revision: 9 } });
    expect(screen.getByTestId("card-scroll")).toBeTruthy();
  });

  it("choice buttons send ids, cannot be escaped, and stay after a failed send", async () => {
    const v = await load("card-choice");
    const { onAction, rerender } = setup(v);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    fireEvent.click(within(screen.getByTestId("card-scroll")).getByRole("button", { name: "Upgrade green 1 to green 2" }));
    expect(onAction).toHaveBeenCalledWith("card_upgrade:green_1");
    rerender(v, "The action could not be sent.");
    const again = within(screen.getByTestId("card-scroll")).getByRole("button", { name: "Upgrade orange 1 to orange 6" });
    expect(again).not.toBeDisabled();
    fireEvent.click(again);
    expect(onAction).toHaveBeenLastCalledWith("card_upgrade:orange_1");
    rerender({ ...v, game: { ...v.game, phase: "brewing", revision: 5 }, legal: [] });
    expect(screen.queryByTestId("card-scroll")).toBeNull();
  });

  it("reopen control shows the text read-only", async () => {
    const v = await load("card");
    setup(v);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Read round card" }));
    expect(screen.getByTestId("card-scroll").dataset["mode"]).toBe("read");
    expect(screen.queryByRole("button", { name: /Upgrade/ })).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("card-scroll")).toBeNull();
  });

  it("no scroll or control without a card, none when there is a winner", async () => {
    setup(await load("playtest"));
    expect(screen.queryByTestId("card-scroll")).toBeNull();
    expect(screen.queryByRole("button", { name: "Read round card" })).toBeNull();
    cleanup();
    const v = await load("card");
    setup({ ...v, game: { ...v.game, winner: "p1" } });
    expect(screen.queryByTestId("card-scroll")).toBeNull();
  });
});
