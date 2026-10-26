import { afterEach, describe, expect, it, vi } from "vitest";

import { createGame, formatCreateGameError } from "@/lib/game-api";

const BASE = "http://localhost:8000";
const body = { p1: "nosuchseat", p2: "human", rounds: 9 };

async function failMessage(): Promise<string> {
  try {
    await createGame(BASE, body);
  } catch (err) {
    return formatCreateGameError(err);
  }
  throw new Error("expected createGame to fail");
}

afterEach(() => vi.unstubAllGlobals());

describe("createGame failure messages", () => {
  it("400 with string detail shows status and detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ detail: "unknown seat 'nosuchseat' (known: bot:random, human)" }), { status: 400 }),
    ));
    const msg = await failMessage();
    expect(msg).toContain(BASE);
    expect(msg).toContain("400");
    expect(msg).toContain("unknown seat 'nosuchseat'");
  });

  it("422 with list detail shows status code only", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ detail: [{ loc: ["body", "rounds"], msg: "bad" }] }), { status: 422 }),
    ));
    const msg = await failMessage();
    expect(msg).toContain(BASE);
    expect(msg).toContain("422");
    expect(msg).not.toContain("rounds");
    expect(msg).not.toContain("{");
  });

  it("non-JSON body shows status code only", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops</html>", { status: 500 })));
    const msg = await failMessage();
    expect(msg).toContain("500");
    expect(msg).not.toContain("oops");
  });

  it("fetch throwing says not reachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    const msg = await failMessage();
    expect(msg).toContain(BASE);
    expect(msg).toContain("not reachable");
  });
});
