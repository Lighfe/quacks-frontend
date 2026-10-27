import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { backendFromSearch, getView, type View } from "@/lib/game-api";
import { TabbedGame } from "@/components/brew/TabbedGame";

const load = (mock: "shop" | "ruby" | "playtest") => getView(backendFromSearch({ mock }), "p1");
const selected = () => screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")?.textContent;

function renderGame(view: View, onAction = vi.fn()) {
  const r = render(<TabbedGame view={view} shownSeat="p1" onAction={onAction} pending={false} error={null} />);
  return { ...r, onAction };
}

describe("tabs and shop dialogue", () => {
  it("Cauldron in brew, Ingredients after switching to shop", async () => {
    const brew = await load("playtest");
    const shop = await load("shop");
    const { rerender } = renderGame(brew);
    expect(selected()).toBe("Cauldron");
    rerender(<TabbedGame view={shop} shownSeat="p1" onAction={vi.fn()} pending={false} error={null} />);
    expect(selected()).toBe("Ingredients");
  });

  it("fades yellow and purple in round 1, not white or orange", async () => {
    renderGame(await load("shop"));
    const f = (c: string) => screen.getByTestId(`note-${c}`).dataset["faded"];
    expect(f("yellow")).toBe("true");
    expect(f("purple")).toBe("true");
    expect(f("white")).toBe("false");
    expect(f("orange")).toBe("false");
    expect(screen.queryByText(/from round/i)).toBeNull();
  });

  it("shop question and buy/done ids", async () => {
    const { container, onAction } = renderGame(await load("shop"));
    expect(screen.getByText("What would you like to buy?")).toBeTruthy();
    fireEvent.click(container.querySelector('[data-action="buy:orange_1"]')!);
    fireEvent.click(container.querySelector('[data-action="done"]')!);
    expect(onAction.mock.calls.map((c) => c[0])).toEqual(["buy:orange_1", "done"]);
  });

  it("ruby question, label prices and ruby ids", async () => {
    const { container, onAction } = renderGame(await load("ruby"));
    expect(screen.getByText("What would you like to do with your rubies?")).toBeTruthy();
    const drop = container.querySelector('[data-action="ruby_drop"]')!;
    expect(drop.textContent).toContain("2");
    fireEvent.click(drop);
    fireEvent.click(container.querySelector('[data-action="refill_flask"]')!);
    expect(onAction.mock.calls.map((c) => c[0])).toEqual(["ruby_drop", "refill_flask"]);
  });
});
