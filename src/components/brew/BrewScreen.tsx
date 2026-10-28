import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { PotEntry, View } from "@/lib/game-api";
import { newPotOrders } from "@/lib/brew-view";
import { ActionBar } from "./ActionBar";
import { DrawFlight } from "./DrawFlight";
import { DieRoll, type ActiveRoll } from "./DieRoll";
import { Bag } from "./Bag";
import { HandPicker } from "./HandPicker";
import { LogPanel } from "./LogPanel";
import { OpponentPanel } from "./OpponentPanel";
import { PixelFrame } from "./PixelFrame";
import { Pot } from "./Pot";
import { RoundHeader } from "./RoundHeader";
import { Stats } from "./Stats";
import { WhiteMeter } from "./WhiteMeter";
import { ReturnFlights } from "./RoundCleanup";

export function BrewScreen({
  view,
  onAction,
  pending,
  error,
  hideActions = false,
  roll = null,
  cleanupPot,
  onCleanupDone = () => {},
}: {
  view: View;
  onAction: (id: string) => void;
  pending: boolean;
  error: string | null;
  hideActions?: boolean;
  roll?: ActiveRoll | null;
  cleanupPot?: PotEntry[] | undefined;
  onCleanupDone?: () => void;
}) {
  // Animation tracking: chips with an order not seen before drop in; a seat
  // whose status just changed to exploded gets smoke. Diffed by order because
  // chips can also leave the pot.
  const seenOrders = useRef(new Map<string, Set<number>>());
  const ownPanelRef = useRef<HTMLDivElement>(null);
  const [panelReady, setPanelReady] = useState(false);
  useLayoutEffect(() => setPanelReady(true), []);
  const startedFlight = useRef<View | null>(null);
  const [flightEntry, setFlightEntry] = useState<PotEntry | null>(null);
  const prevStatus = useRef(new Map<string, string>());
  const freshOrders = new Map<string, Set<number>>();
  const freshExplosions = new Set<string>();
  for (const s of view.seats) {
    const seen = seenOrders.current.get(s.id) ?? new Set<number>();
    freshOrders.set(s.id, new Set(newPotOrders(s.pot, seen)));
    const prev = prevStatus.current.get(s.id);
    if (s.status === "exploded" && prev !== "exploded") freshExplosions.add(s.id);
  }
  useEffect(() => {
    for (const s of view.seats) {
      seenOrders.current.set(s.id, new Set(s.pot.map((e) => e.order)));
      prevStatus.current.set(s.id, s.status);
    }
  }, [view]);

  const youSeat = view.seats.find((s) => s.id === view.you);

  // Draw flight: only for the own seat, and only when its orders were seen
  // before — on the first view after mount nothing flies. Started during
  // render so the flight element is in the same commit as the pot update.
  // The guard is the view object, not the order: orders restart each round.
  const ownOrder =
    youSeat && seenOrders.current.has(youSeat.id)
      ? (freshOrders.get(youSeat.id)?.values().next().value ?? null)
      : null;
  if (youSeat && ownOrder != null && view !== startedFlight.current) {
    const entry = youSeat.pot.find((e) => e.order === ownOrder);
    if (entry) {
      startedFlight.current = view;
      setFlightEntry(entry);
    }
  }

  if (!youSeat) return null;
  const others = view.seats.filter((s) => s.id !== view.you);

  return (
    <div className="bg-background p-4 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <RoundHeader game={view.game} />
        <div className="flex flex-col gap-4 lg:flex-row">
          <div ref={ownPanelRef} className="flex flex-1 flex-col gap-4">
            <PixelFrame>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative w-full min-w-0 md:flex-1">
                <Pot
                  pot={cleanupPot ?? youSeat.pot}
                  window={view.window}
                  mode="own"
                  droplet={youSeat.droplet}
                  ratTail={youSeat.rat_tail}
                  newOrders={cleanupPot ? undefined : freshOrders.get(youSeat.id)}
                  exploded={freshExplosions.has(youSeat.id)}
                  className="w-full"
                />
                {roll && roll.entry.seat === view.you ? <DieRoll key={roll.key} roll={roll} cauldron="own" /> : null}
                </div>
                <div className="flex w-full shrink-0 flex-col gap-3 md:w-56">
                  <WhiteMeter
                    whiteTotal={youSeat.white_total}
                    limit={view.game.explosion_limit}
                  />
                  <Stats seat={youSeat} />
                  <Bag bag={youSeat.bag} chips={view.chips} />
                </div>
              </div>
            </PixelFrame>
            {hideActions ? null : (<>
            <HandPicker
              hand={view.hand}
              cardDraw={view.card_draw}
              chips={view.chips}
              legal={view.legal}
              onAction={onAction}
              disabled={pending}
            />
            <ActionBar legal={view.legal} error={error} onAction={onAction} disabled={pending} />
            </>)}
            {cleanupPot && panelReady ? <ReturnFlights pot={cleanupPot} scope={ownPanelRef} onDone={onCleanupDone} /> : null}
            {flightEntry && !cleanupPot ? (
              <DrawFlight
                key={flightEntry.order}
                entry={flightEntry}
                scope={ownPanelRef}
                onDone={() => setFlightEntry(null)}
              />
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-4 lg:w-64">
            {others.map((s) => (
              <OpponentPanel
                key={s.id}
                seat={s}
                chips={view.chips}
                newOrders={freshOrders.get(s.id)}
                exploded={freshExplosions.has(s.id)}
                roll={roll && roll.entry.seat === s.id ? roll : null}
              />
            ))}
            <LogPanel log={view.log} />
          </div>
        </div>
      </div>
    </div>
  );
}
