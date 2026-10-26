import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  IllegalActionError,
  StaleRevisionError,
  backendFromSearch,
  getView,
  sendAction,
  type View,
} from "@/lib/game-api";
import { isLegal, newPotOrders, pickShownSeat } from "@/lib/brew-view";
import { ActionBar } from "./ActionBar";
import { Bag } from "./Bag";
import { HandPicker } from "./HandPicker";
import { LogPanel } from "./LogPanel";
import { OpponentPanel } from "./OpponentPanel";
import { PixelFrame } from "./PixelFrame";
import { Pot } from "./Pot";
import { RoundHeader } from "./RoundHeader";
import { Stats } from "./Stats";
import { WhiteMeter } from "./WhiteMeter";

const KEY_ACTIONS: Record<string, string> = {
  d: "draw",
  s: "stop",
  f: "use_flask",
  u: "use_card_17",
};

export function BrewScreen({ seat, game, api }: { seat: string; game: string; api: string }) {
  const backend = useMemo(() => backendFromSearch({ game, api }), [game, api]);
  const [hotSeat, setHotSeat] = useState<string | null>(null);
  const shownSeat = seat || hotSeat || "p1";
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["view", backend.kind, backend.game, backend.baseUrl, shownSeat] as const,
    [backend, shownSeat],
  );

  const viewQuery = useQuery({
    queryKey,
    queryFn: () => getView(backend, shownSeat),
    refetchInterval: (query) => {
      const v = query.state.data as View | undefined;
      if (!v) return 500;
      if (v.game.phase === "game_over") return false;
      return v.to_act.includes(shownSeat) ? false : 500;
    },
  });
  const view = viewQuery.data;

  // Hot seat: follow the human seat that is to act. The view is refetched for
  // that seat, so one seat's hand or pending choice never shows to another.
  useEffect(() => {
    if (seat || !view) return;
    const target = pickShownSeat(view, shownSeat);
    if (target !== shownSeat) setHotSeat(target);
  }, [seat, view, shownSeat]);

  const [actionError, setActionError] = useState<string | null>(null);
  const actionMutation = useMutation({
    mutationFn: (action: string) => {
      if (!view) throw new Error("no view");
      return sendAction(backend, shownSeat, action, view.game.revision);
    },
    onSuccess: (next) => {
      setActionError(null);
      queryClient.setQueryData(queryKey, next);
    },
    onError: (err) => {
      if (err instanceof StaleRevisionError) {
        void viewQuery.refetch();
        return;
      }
      if (err instanceof IllegalActionError) {
        setActionError("That action is not allowed right now.");
        queryClient.setQueryData(queryKey, (old: View | undefined) =>
          old ? { ...old, legal: err.legal } : old,
        );
        return;
      }
      setActionError("The action could not be sent.");
    },
  });
  const act = (id: string) => {
    if (view && isLegal(view.legal, id)) actionMutation.mutate(id);
  };

  // Keyboard shortcuts d/s/f/u. No dep array: re-register each render so the
  // handler always closes over the latest view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const action = KEY_ACTIONS[e.key.toLowerCase()];
      if (action) act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Animation tracking: chips with an order not seen before drop in; a seat
  // whose status just changed to exploded gets smoke. Diffed by order because
  // chips can also leave the pot.
  const seenOrders = useRef(new Map<string, Set<number>>());
  const prevStatus = useRef(new Map<string, string>());
  const freshOrders = new Map<string, Set<number>>();
  const freshExplosions = new Set<string>();
  if (view) {
    for (const s of view.seats) {
      const seen = seenOrders.current.get(s.id) ?? new Set<number>();
      freshOrders.set(s.id, new Set(newPotOrders(s.pot, seen)));
      const prev = prevStatus.current.get(s.id);
      if (s.status === "exploded" && prev !== "exploded") freshExplosions.add(s.id);
    }
  }
  useEffect(() => {
    if (!view) return;
    for (const s of view.seats) {
      seenOrders.current.set(s.id, new Set(s.pot.map((e) => e.order)));
      prevStatus.current.set(s.id, s.status);
    }
  }, [view]);

  if (viewQuery.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <PixelFrame>
          <p className="text-destructive">The game service is not reachable.</p>
          <p className="mt-2 text-muted-foreground">
            Start the local service or check the api address.
          </p>
        </PixelFrame>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <span className="font-pixel text-xs text-muted-foreground">Loading…</span>
      </main>
    );
  }
  const youSeat = view.seats.find((s) => s.id === view.you);
  if (!youSeat) return null;
  const others = view.seats.filter((s) => s.id !== view.you);

  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <RoundHeader game={view.game} />
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4">
            <PixelFrame title={`${youSeat.id} — ${youSeat.status}`}>
              <div className="flex flex-col gap-4 md:flex-row">
                <Pot
                  pot={youSeat.pot}
                  window={view.window}
                  mode="own"
                  droplet={youSeat.droplet}
                  ratTailField={youSeat.rat_tail > 0 ? youSeat.start_field : null}
                  newOrders={freshOrders.get(youSeat.id)}
                  exploded={freshExplosions.has(youSeat.id)}
                  className="w-full max-w-[420px] shrink-0"
                />
                <div className="flex min-w-52 flex-1 flex-col gap-3">
                  <WhiteMeter
                    whiteTotal={youSeat.white_total}
                    limit={view.game.explosion_limit}
                  />
                  <Stats seat={youSeat} />
                  <Bag bag={youSeat.bag} chips={view.chips} />
                </div>
              </div>
            </PixelFrame>
            <HandPicker
              hand={view.hand}
              cardDraw={view.card_draw}
              chips={view.chips}
              legal={view.legal}
              onAction={act}
            />
            <ActionBar legal={view.legal} error={actionError} onAction={act} />
          </div>
          <div className="flex w-full flex-col gap-4 lg:w-80">
            {others.map((s) => (
              <OpponentPanel
                key={s.id}
                seat={s}
                chips={view.chips}
                newOrders={freshOrders.get(s.id)}
                exploded={freshExplosions.has(s.id)}
              />
            ))}
            <LogPanel log={view.log} />
          </div>
        </div>
      </div>
    </main>
  );
}
