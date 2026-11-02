import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { BrewScreen } from "@/components/brew/BrewScreen";
import { backendFromSearch, getView } from "@/lib/game-api";

afterEach(cleanup);

async function renderMock(mock: string) {
  const view = await getView(backendFromSearch({ mock }), "p1");
  render(<BrewScreen view={view} onAction={() => {}} pending={false} error={null} />);
  return view;
}

describe("own status outside the bag overlay", () => {
  for (const [mock, phase] of [["playtest", "brewing"], ["shop", "shop"], ["round-end", "ruby"]] as const) {
    it(`${mock} (${phase}) shows money, points, rubies, flask and white meter`, async () => {
      const view = await renderMock(mock);
      expect(view.game.phase).toBe(phase);
      expect(screen.queryByTestId("bag-popup")).toBeNull();
      const status = screen.getByTestId("own-status");
      for (const label of ["money", "points", "rubies"]) {
        expect(within(status).getByRole("img", { name: label })).toBeInTheDocument();
      }
      expect(within(status).getByRole("img", { name: /flask (full|empty)/ })).toBeInTheDocument();
      expect(within(status).getByLabelText("White chips")).toBeInTheDocument();
      const own = view.seats.find((s) => s.id === view.you)!;
      expect(status.textContent).toContain(`${own.white_total}/${view.game.explosion_limit}`);
    });
  }
});

describe("own bag overlay", () => {
  it("opens by click/Enter/Space, closes by Escape and second click, focus returns", async () => {
    await renderMock("playtest");
    const [trigger] = screen.getAllByTestId("bag-sack");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("bag-popup")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByTestId("bag-popup")).toBeNull();

    for (const key of ["Enter", " "]) {
      fireEvent.keyDown(trigger, { key });
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      (document.body as HTMLElement).focus();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(document.activeElement).toBe(trigger);
    }
  });
});
