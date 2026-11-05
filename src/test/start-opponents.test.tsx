import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";

import { StartScreen } from "@/components/brew/StartScreen";

const BASE = "http://localhost:8000";
const BOT = { spec: "bot:topchip-draw20-pts6", label: "Top chip", kind: "bot" };
const BOT2 = { spec: "bot:other", label: "Other bot", kind: "bot" };
const PPO = { spec: "agent:alpha", label: "alpha (ppo)", kind: "ppo" };

function stub(list: unknown[]) {
  const fn = vi.fn(async (url: string, _init?: RequestInit) =>
    String(url).endsWith("/opponents")
      ? new Response(JSON.stringify(list), { status: 200 })
      : new Response(JSON.stringify({ game_id: "g1" }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

function renderStart() {
  const onStarted = vi.fn();
  const { container } = render(<StartScreen api={BASE} seed={undefined} onStarted={onStarted} />);
  const sel = (id: string) => container.querySelector(`select[aria-label="${id}"]`) as HTMLSelectElement;
  return { container, onStarted, sel, start: container.querySelector("button") as HTMLButtonElement };
}

afterEach(() => vi.unstubAllGlobals());

describe("start screen opponents", () => {
  it("shows Human, Bots and Trained agents groups", async () => {
    const fetchFn = stub([BOT, PPO]);
    const { sel, start } = renderStart();
    await waitFor(() => expect(start.disabled).toBe(false));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    for (const id of ["p1", "p2"]) {
      const s = sel(id);
      expect(s.options[0]!.value).toBe("human");
      expect(s.options[0]!.textContent).toBe("Human");
      const groups = [...s.querySelectorAll("optgroup")];
      expect(groups.map((g) => g.label)).toEqual(["Bots", "Trained agents"]);
      expect([...groups[0]!.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["Top chip"]);
      expect([...groups[1]!.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["alpha (ppo)"]);
    }
  });

  it("hides Trained agents for bot-only lists", async () => {
    stub([BOT, BOT2]);
    const { sel, start } = renderStart();
    await waitFor(() => expect(start.disabled).toBe(false));
    expect([...sel("p2").querySelectorAll("optgroup")].map((g) => g.label)).toEqual(["Bots"]);
  });

  it("defaults p1 to human and p2 to the first entry", async () => {
    stub([PPO, BOT]);
    const { sel, start } = renderStart();
    await waitFor(() => expect(start.disabled).toBe(false));
    expect(sel("p1").value).toBe("human");
    expect(sel("p2").value).toBe(PPO.spec);
  });

  it("posts the chosen specs", async () => {
    const fetchFn = stub([BOT, PPO]);
    const { sel, start, onStarted } = renderStart();
    await waitFor(() => expect(start.disabled).toBe(false));
    fireEvent.change(sel("p1"), { target: { value: PPO.spec } });
    fireEvent.click(start);
    await waitFor(() => expect(onStarted).toHaveBeenCalled());
    const post = fetchFn.mock.calls.find(([u]) => String(u).endsWith("/games"))!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({ p1: PPO.spec, p2: BOT.spec, rounds: 9 });
  });

  it("network failure on the list shows the error and disables Start", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    const { container, start } = renderStart();
    await waitFor(() => expect(container.textContent).toContain("not reachable from this page"));
    expect(container.textContent).toContain(BASE);
    expect(container.textContent).toContain("uv run --group web quack-rl serve");
    expect(start.disabled).toBe(true);
  });

  it("empty list disables Start with an error", async () => {
    stub([]);
    const { container, start } = renderStart();
    await waitFor(() => expect(container.textContent).toContain("no opponents"));
    expect(start.disabled).toBe(true);
  });
});
