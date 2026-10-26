import { useState } from "react";

import { createGame, formatCreateGameError, resolveApiBase } from "@/lib/game-api";
import { SEAT_KINDS, buildCreateBody, gameSearchAfterCreate, type GameSearch } from "@/lib/start-game";
import { PixelFrame } from "./PixelFrame";

const field = "pixel-border bg-input px-2 py-1 text-foreground";

export function StartScreen({
  api,
  seed,
  onStarted,
}: {
  api: string;
  seed: number | undefined;
  onStarted: (search: GameSearch) => void;
}) {
  const [p1, setP1] = useState("human");
  const [p2, setP2] = useState("bot:random");
  const [rounds, setRounds] = useState("9");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const body = buildCreateBody(p1, p2, rounds, seed);
    if (!body) {
      setError("Rounds must be a whole number from 1.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const gameId = await createGame(resolveApiBase(api), body);
      onStarted(gameSearchAfterCreate(p1, p2, gameId, api || undefined));
    } catch (err) {
      setError(formatCreateGameError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <PixelFrame className="w-full max-w-sm">
        <h1 className="mb-4 font-pixel text-sm text-accent">Quacks</h1>
        <div className="flex flex-col gap-3">
          {(
            [
              ["p1", p1, setP1],
              ["p2", p2, setP2],
            ] as const
          ).map(([id, value, set]) => (
            <label key={id} className="flex items-center justify-between gap-2">
              <span className="font-pixel text-[10px]">{id}</span>
              <select
                aria-label={id}
                value={value}
                onChange={(e) => set(e.target.value)}
                className={field}
              >
                {SEAT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="flex items-center justify-between gap-2">
            <span className="font-pixel text-[10px]">Rounds</span>
            <input
              aria-label="Rounds"
              type="number"
              min={1}
              step={1}
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              className={`${field} w-20`}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            className="pixel-border bg-primary px-3 py-2 font-pixel text-[10px] text-primary-foreground disabled:opacity-40"
          >
            Start
          </button>
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
      </PixelFrame>
    </main>
  );
}
