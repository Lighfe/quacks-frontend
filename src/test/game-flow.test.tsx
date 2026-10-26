import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { createGame, getView, backendFromSearch, type View } from "@/lib/game-api";
import { newerView } from "@/lib/brew-view";
import { buildCreateBody, gameSearchAfterCreate, parseRounds } from "@/lib/start-game";
import { PhaseScreen } from "@/components/brew/PhaseScreen";
import { EndScreen } from "@/components/brew/EndScreen";
import { LogPanel } from "@/components/brew/LogPanel";
import { ActionBar } from "@/components/brew/ActionBar";
import { HandPicker } from "@/components/brew/HandPicker";

async function baseView(): Promise<View> {
  return getView(backendFromSearch({}), "p1");
}

afterEach(() => vi.unstubAllGlobals());

describe("start screen logic", () => {
  it("rejects 0, negatives and decimals for rounds", () => {
    expect(parseRounds("0")).toBeNull();
    expect(parseRounds("-3")).toBeNull();
    expect(parseRounds("2.5")).toBeNull();
    expect(parseRounds("9")).toBe(9);
    expect(parseRounds("1")).toBe(1);
  });

  it("builds the body with seed only when given", () => {
    expect(buildCreateBody("human", "bot:random", "9", undefined)).toEqual({
      p1: "human",
      p2: "bot:random",
      rounds: 9,
    });
    expect(buildCreateBody("human", "human", "3", 1)).toEqual({
      p1: "human",
      p2: "human",
      rounds: 3,
      seed: 1,
    });
    expect(buildCreateBody("human", "human", "0", 1)).toBeNull();
  });

  it("picks the seat parameter from the seat kinds", () => {
    expect(gameSearchAfterCreate("human", "bot:random", "g1", undefined)).toEqual({
      game: "g1",
      seat: "p1",
    });
    expect(gameSearchAfterCreate("bot:random", "human", "g1", undefined).seat).toBe("p2");
    expect(gameSearchAfterCreate("human", "human", "g1", undefined).seat).toBeUndefined();
    expect(gameSearchAfterCreate("bot:random", "bot:random", "g1", "http://x").seat).toBe("p1");
    expect(gameSearchAfterCreate("human", "human", "g1", "http://x").api).toBe("http://x");
  });

  it("createGame posts JSON to {base}/games and returns game_id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ game_id: "abc" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const id = await createGame("http://h:1", { p1: "human", p2: "bot:random", rounds: 9, seed: 1 });
    expect(id).toBe("abc");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://h:1/games");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ p1: "human", p2: "bot:random", rounds: 9, seed: 1 });
  });

  it("createGame throws when the POST fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    await expect(createGame("http://h", { p1: "human", p2: "human", rounds: 9 })).rejects.toThrow();
  });
});

describe("plain phase screen", () => {
  it("renders one button per legal entry and sends its id", async () => {
    const v = await baseView();
    const view: View = {
      ...v,
      game: { ...v.game, phase: "shop" },
      to_act: ["p1"],
      legal: [
        { id: "buy:orange_6", label: "Buy orange 6" },
        { id: "something_new", label: "Anything" },
        { id: "done", label: "Done" },
      ],
    };
    const onAction = vi.fn();
    render(<PhaseScreen view={view} shownSeat="p1" onAction={onAction} pending={false} error={null} />);
    const actions = screen.getByText("Actions").parentElement!;
    expect(actions.querySelectorAll("button")).toHaveLength(3);
    fireEvent.click(screen.getByText("Anything"));
    expect(onAction).toHaveBeenCalledWith("something_new");
  });

  it("shows a waiting line when the shown seat is not to act", async () => {
    const v = await baseView();
    const view: View = { ...v, game: { ...v.game, phase: "shop" }, to_act: ["p2"], legal: [] };
    render(<PhaseScreen view={view} shownSeat="p1" onAction={() => {}} pending={false} error={null} />);
    expect(screen.getByText("Waiting for p2")).toBeTruthy();
  });

  it("disables buttons while an action is pending", async () => {
    const v = await baseView();
    const view: View = { ...v, game: { ...v.game, phase: "shop" }, legal: [{ id: "done", label: "Done" }] };
    render(<PhaseScreen view={view} shownSeat="p1" onAction={() => {}} pending error={null} />);
    expect((screen.getByText("Done") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("log panel", () => {
  it("shows all lines, newest last", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i}`);
    render(<LogPanel log={{ lines, events: [] }} />);
    const items = screen.getByTestId("log").querySelectorAll("li");
    expect(items).toHaveLength(40);
    expect(items[39]!.textContent).toBe("line 39");
  });
});

describe("end screen", () => {
  it("shows final points, winner and New game", async () => {
    const v = await baseView();
    const view: View = { ...v, game: { ...v.game, phase: "game_over", winner: "p2" } };
    const onNewGame = vi.fn();
    render(<EndScreen view={view} onNewGame={onNewGame} />);
    expect(screen.getByTestId("final-p1").textContent).toContain("14");
    expect(screen.getByTestId("final-p2").textContent).toContain("11");
    expect(screen.getByText("Winner: p2")).toBeTruthy();
    fireEvent.click(screen.getByText("New game"));
    expect(onNewGame).toHaveBeenCalled();
  });
});

describe("revision guard", () => {
  it("an older view never overwrites a newer one", async () => {
    const v = await baseView();
    const newer = { ...v, game: { ...v.game, revision: 20 } };
    const older = { ...v, game: { ...v.game, revision: 19 } };
    expect(newerView(newer, older)).toBe(newer);
    const newest = { ...v, game: { ...v.game, revision: 21 } };
    expect(newerView(newer, newest)).toBe(newest);
    expect(newerView(undefined, older)).toBe(older);
  });
});

describe("brew controls while pending", () => {
  it("disables action buttons, hand slots and put-back buttons", async () => {
    const v = await baseView();
    render(
      <>
        <ActionBar
          legal={[{ id: "draw", label: "Draw" }, { id: "use_flask", label: "Use flask" }]}
          error={null}
          onAction={() => {}}
          disabled
        />
        <HandPicker
          hand={["white_1"]}
          cardDraw={null}
          chips={v.chips}
          legal={[
            { id: "play:0", label: "Play" },
            { id: "put_back_draw", label: "Put back and draw" },
          ]}
          onAction={() => {}}
          disabled
        />
      </>,
    );
    for (const b of screen.getAllByRole("button")) expect((b as HTMLButtonElement).disabled).toBe(true);
  });
});
