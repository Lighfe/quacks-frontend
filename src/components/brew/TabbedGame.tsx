import { useCallback, useEffect, useRef, useState } from "react";

import type { View } from "@/lib/game-api";
import { cn } from "@/lib/utils";
import { BrewScreen } from "./BrewScreen";
import { IngredientsBoard } from "./IngredientsBoard";
import { PhaseScreen } from "./PhaseScreen";
import { PixelSymbol, type PixelGrid } from "./pixel-icons";
import { ShopDialog } from "./ShopDialog";
import { RoundCardScroll } from "./RoundCardScroll";

const POT_ICON: PixelGrid = ["a.....a", "ggggggg", ".ggggg.", "gkkkkkg", "gkkkkkg", ".gkkkg.", "..g.g.."];
const SCROLL_ICON: PixelGrid = ["kkkkkkk", ".wwwww.", ".wkkkw.", ".wwwww.", ".wkkkw.", ".wwwww.", "kkkkkkk"];
const BOOK_ICON: PixelGrid = [".ppppp.", "pwwwwwp", "pwgggwp", "pwwwwwp", "pwgggwp", "pwwwwwp", ".ppppp."];

type Tab = "cauldron" | "ingredients";

// Two tabs over every phase; the shop phase opens Ingredients by itself.
export function TabbedGame({
  view,
  shownSeat,
  onAction,
  pending,
  error,
}: {
  view: View;
  shownSeat: string;
  onAction: (id: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const phase = view.game.phase;
  const [tab, setTab] = useState<Tab>(phase === "shop" ? "ingredients" : "cauldron");
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (phase !== prevPhase.current && phase === "shop") setTab("ingredients");
    prevPhase.current = phase;
  }, [phase]);

  // Round card scroll: opens once per (round, card id); a choice keeps it open
  // until the next view; all text and labels come from the view.
  const card = view.game.winner ? null : view.game.card;
  const cardKey = card ? `${view.game.round}:${card.id}` : null;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const choosing = !!card && phase === "card_choice" && view.legal.length > 0;
  const scrollMode = !card
    ? null
    : choosing
      ? "choice"
      : cardKey !== dismissedKey
        ? "notice"
        : reading
          ? "read"
          : null;
  const closeScroll = useCallback(() => {
    setDismissedKey(cardKey);
    setReading(false);
  }, [cardKey]);
  const choose = (id: string) => {
    setDismissedKey(cardKey);
    onAction(id);
  };

  const brewing = phase === "brew" || phase === "brewing";
  const shopLike = phase === "shop" || phase === "ruby";

  const tabBtn = (id: Tab, label: string, icon: PixelGrid) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={cn(
        "pixel-border flex items-center gap-2 px-4 py-2 font-pixel text-[10px] uppercase",
        tab === id ? "bg-card text-accent" : "bg-background text-muted-foreground",
      )}
    >
      <PixelSymbol grid={icon} unit={3} label="" />
      {label}
    </button>
  );

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <div role="tablist" className="mx-auto flex max-w-6xl gap-2 px-4 pt-4">
        {tabBtn("cauldron", "Cauldron", POT_ICON)}
        {tabBtn("ingredients", "Ingredients", BOOK_ICON)}
        {card ? (
          <button
            type="button"
            aria-label="Read round card"
            onClick={() => setReading(true)}
            className="pixel-border ml-auto flex items-center bg-parchment px-3 py-2 text-parchment-ink"
          >
            <PixelSymbol grid={SCROLL_ICON} unit={3} label="" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 pb-24">
        {tab === "ingredients" ? (
          <div className="mx-auto max-w-6xl p-4">
            <IngredientsBoard ingredients={view.ingredients ?? []} />
          </div>
        ) : brewing || shopLike ? (
          <BrewScreen view={view} onAction={onAction} pending={pending} error={error} hideActions={shopLike} />
        ) : (
          <PhaseScreen view={view} shownSeat={shownSeat} onAction={onAction} pending={pending} error={error} />
        )}
      </div>
      {card && scrollMode ? (
        <RoundCardScroll
          text={card.text}
          mode={scrollMode}
          choices={scrollMode === "choice" ? view.legal : []}
          pending={pending}
          error={error}
          onChoose={choose}
          onClose={closeScroll}
        />
      ) : null}
      {shopLike ? (
        <div className="sticky bottom-0 z-20 bg-background mx-auto w-full max-w-6xl px-4 pb-4">
          <ShopDialog view={view} onAction={onAction} pending={pending} error={error} />
        </div>
      ) : null}
    </main>
  );
}
