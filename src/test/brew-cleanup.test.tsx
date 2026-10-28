import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { Bag } from "@/components/brew/Bag";
import { BrewScreen } from "@/components/brew/BrewScreen";
import { Pot } from "@/components/brew/Pot";
import { backendFromSearch, getView, type ChipType } from "@/lib/game-api";
import { spiralLayout } from "@/lib/pot-layout";

afterEach(cleanup);

const chips: ChipType[] = [{ id: "white_1", colour: "white", value: 1 }];

describe("bag", () => {
  it("opens and closes by click, Enter/Space and Escape", () => {
    render(<Bag bag={{ white_1: 3 }} chips={chips} />);
    const trigger = screen.getByTestId("bag-sack");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("bag-popup").textContent).toContain("×3");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("bag-popup")).toBeNull();

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(trigger, { key: " " });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open when a mouse click follows hover", () => {
    render(<Bag bag={{ white_1: 3 }} chips={chips} />);
    const trigger = screen.getByTestId("bag-sack");
    act(() => {
      fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
      fireEvent.click(trigger);
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("bag-popup").textContent).toContain("×3");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("bag-popup")).toBeNull();
  });
});

describe("own panel", () => {
  it("has no White chips / p1 / p1 — brewing headings", async () => {
    const view = await getView(backendFromSearch({ mock: "playtest" }), "p1");
    const { container } = render(
      <BrewScreen view={view} onAction={vi.fn()} pending={false} error={null} />,
    );
    const own = container.querySelector("section")!;
    const headings = within(own).queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    for (const t of ["White chips", "p1", "p1 — brewing"]) expect(headings).not.toContain(t);
  });
});

describe("pot window numbers", () => {
  it("are at least 4.2 units and centred on the field centre x", () => {
    const markup = renderToStaticMarkup(
      <Pot
        pot={[{ order: 1, chip: "white_1", colour: "white", value: 1, from: 14, landing: 14 }]}
        mode="own"
        window={[
          { field: 14, money: 9, points: 3, ruby: false },
          { field: 15, money: 10, points: 4, ruby: true },
        ]}
      />,
    );
    const doc = new DOMParser().parseFromString(markup, "text/html");
    for (const field of [14, 15]) {
      const texts = doc.querySelectorAll(`[data-window-field="${field}"] text`);
      expect(texts).toHaveLength(2);
      for (const t of texts) {
        expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(4.2);
        expect(t.getAttribute("text-anchor")).toBe("middle");
        expect(Number(t.getAttribute("x"))).toBe(spiralLayout.field(field).center.x);
      }
    }
  });
});
