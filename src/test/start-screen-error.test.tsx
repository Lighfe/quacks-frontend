import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";

import { StartScreen } from "@/components/brew/StartScreen";

const BASE = "http://localhost:8000";
const COMMAND = "uv run --group web quack-rl serve";
const OPPONENTS = [{ spec: "bot:x", label: "X", kind: "bot" }];

// Answers GET /opponents with a list; every other request goes to postImpl.
function stubFetch(postImpl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    String(url).endsWith("/opponents")
      ? new Response(JSON.stringify(OPPONENTS), { status: 200 })
      : postImpl(),
  ));
}

async function clickStart(start: HTMLButtonElement | null) {
  await waitFor(() => expect(start!.disabled).toBe(false));
  fireEvent.click(start!);
}

function renderStart() {
  const onStarted = vi.fn();
  const { container } = render(
    <StartScreen api={BASE} seed={undefined} onStarted={onStarted} />,
  );
  return { container, onStarted, start: container.querySelector("button") };
}

afterEach(() => vi.unstubAllGlobals());

describe("StartScreen failure text", () => {
  it("network failure names the URL, says not reachable from this page and shows the serve command", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    const { container, onStarted, start } = renderStart();

    await clickStart(start);

    await waitFor(() => expect(container.textContent).toContain("not reachable from this page"));
    expect(container.textContent).toContain(BASE);
    expect(container.textContent).toContain(COMMAND);
    expect(onStarted).not.toHaveBeenCalled();
  });

  it("HTTP 400 keeps the status and detail and shows no serve command", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ detail: "unknown seat 'nosuchseat'" }), { status: 400 }),
    );
    const { container, start } = renderStart();

    await clickStart(start);

    await waitFor(() => expect(container.textContent).toContain("400"));
    expect(container.textContent).toContain(BASE);
    expect(container.textContent).toContain("unknown seat 'nosuchseat'");
    expect(container.textContent).not.toContain(COMMAND);
  });
});
