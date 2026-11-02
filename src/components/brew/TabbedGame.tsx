import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";

import type { View } from "@/lib/game-api";
import { cn } from "@/lib/utils";
import { BrewScreen } from "./BrewScreen";
import { IngredientsBoard } from "./IngredientsBoard";
import { PhaseScreen } from "./PhaseScreen";
import { PixelSymbol, type PixelGrid } from "./pixel-icons";
import { ShopDialog } from "./ShopDialog";
import { RoundCardScroll } from "./RoundCardScroll";
import { useBonusRoll, useCardRoll, type PlayedRounds } from "./DieRoll";
import { EndScreen } from "./EndScreen";
import { PointBoard } from "./PointBoard";
import { useRoundCleanup, type CleanupMemory } from "./RoundCleanup";

const POT_ICON: PixelGrid = ["a.....a", "ggggggg", ".ggggg.", "gkkkkkg", "gkkkkkg", ".gkkkg.", "..g.g.."];
const SCROLL_ICON: PixelGrid = ["kkkkkkk", ".wwwww.", ".wkkkw.", ".wwwww.", ".wkkkw.", ".wwwww.", "kkkkkkk"];
const BOOK_ICON: PixelGrid = [".ppppp.", "pwwwwwp", "pwgggwp", "pwwwwwp", "pwgggwp", "pwwwwwp", ".ppppp."];

const BOARD_ICON: PixelGrid = ["wwwwwww", "w.....w", "w.r.b.w", "w.....w", "w.....w", "w.....w", "wwwwwww"];

const BOARD_DARK_MS = 900;
const BOARD_STEP_MS = 2400;

type Tab = "cauldron" | "ingredients" | "board";

// Two tabs over every phase; the shop phase opens Ingredients by itself.
export function TabbedGame({
  view,
  shownSeat,
  onAction,
  pending,
  error,
  onNewGame = () => {},
  playedRounds,
  playedCardRounds,
  cleanupMemory,
}: {
  view: View;
  shownSeat: string;
  onAction: (id: string) => void;
  pending: boolean;
  error: string | null;
  onNewGame?: () => void;
  playedRounds?: PlayedRounds;
  playedCardRounds?: PlayedRounds;
  cleanupMemory?: MutableRefObject<CleanupMemory>;
}) {
  const phase = view.game.phase;
  const { cleanup, advanced, previousRound, memory, finish } = useRoundCleanup(view, shownSeat, cleanupMemory);
  const resolveRoll = useBonusRoll(view, playedRounds);
  const rolling = resolveRoll !== null;
  // Entering the shop opens Ingredients, but only once the last die is gone.
  const [tab, setTab] = useState<Tab>(phase === "shop" && !rolling ? "ingredients" : "cauldron");
  // Round-end point board step: after the clean-up, once per round change.
  const [step, setStep] = useState<{ round: number; from: number; lit: boolean } | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const liveStep = step && step.round === view.game.round && phase !== "game_over" ? step : null;
  const showingStep = !!liveStep && !cleanup;
  const shownTab = showingStep ? "board" : advanced || cleanup ? "cauldron" : tab;
  useLayoutEffect(() => {
    if (!advanced) return;
    setTab("cauldron");
    const seen = (memory.current.boardRounds ??= new Set());
    if (phase === "game_over" || !view.board || reduced || previousRound === null || seen.has(view.game.round)) return;
    seen.add(view.game.round);
    setStep({ round: view.game.round, from: previousRound, lit: false });
  }, [advanced]);
  useEffect(() => {
    if (!showingStep) return;
    const light = setTimeout(() => setStep((s) => (s ? { ...s, lit: true } : s)), BOARD_DARK_MS);
    const end = setTimeout(() => {
      setStep(null);
      setTab("cauldron");
    }, BOARD_STEP_MS);
    const block = (event: KeyboardEvent) => event.stopPropagation();
    window.addEventListener("keydown", block, true);
    return () => {
      clearTimeout(light);
      clearTimeout(end);
      window.removeEventListener("keydown", block, true);
    };
  }, [showingStep]);
  const prevPhase = useRef(phase);
  const wantShop = useRef(phase === "shop" && rolling);
  useEffect(() => {
    if (phase !== prevPhase.current && phase === "shop") wantShop.current = true;
    if (phase !== "shop") wantShop.current = false;
    prevPhase.current = phase;
    if (wantShop.current && !rolling) {
      wantShop.current = false;
      setTab("ingredients");
    }
  }, [phase, rolling]);

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

  // Card-step rolls play only after this round's scroll has been closed.
  const cardReady = !!card && cardKey === dismissedKey && !choosing && !reading && !cleanup && !liveStep && !rolling;
  const cardRoll = useCardRoll(view, cardReady, playedCardRounds);
  const roll = resolveRoll ?? cardRoll;

  const brewing = phase === "brew" || phase === "brewing";
  const shopLike = phase === "shop" || phase === "ruby";
  if (phase === "game_over" && !rolling) return <EndScreen view={view} onNewGame={onNewGame} />;

  const tabBtn = (id: Tab, label: string, icon: PixelGrid) => (
    <button
      type="button"
      role="tab"
       aria-selected={shownTab === id}
       disabled={!!cleanup}
      onClick={() => {
        setStep(null);
        setTab(id);
      }}
      className={cn(
        "pixel-border flex items-center gap-2 px-4 py-2 font-pixel text-[10px] uppercase",
         shownTab === id ? "bg-card text-accent" : "bg-background text-muted-foreground",
      )}
    >
      <PixelSymbol grid={icon} unit={3} label="" />
      {label}
    </button>
  );

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <div role="tablist" className="mx-auto flex w-full max-w-6xl flex-wrap gap-2 px-4 pt-4">
        {tabBtn("cauldron", "Cauldron", POT_ICON)}
        {tabBtn("ingredients", "Ingredients", BOOK_ICON)}
        {tabBtn("board", "Point board", BOARD_ICON)}
        {card ? (
          <button
            type="button"
            aria-label="Read round card"
            disabled={!!cleanup}
            onClick={() => setReading(true)}
            className="pixel-border ml-auto flex items-center bg-card px-3 py-2"
          >
            <PixelSymbol grid={SCROLL_ICON} unit={3} label="" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 pb-24">
        {shownTab === "board" ? (
          <PointBoard view={view} step={showingStep && liveStep ? { from: liveStep.from, lit: liveStep.lit } : undefined} />
        ) : shownTab === "ingredients" ? (
          <div className="mx-auto max-w-6xl p-4">
            <IngredientsBoard ingredients={view.ingredients ?? []} />
          </div>
        ) : brewing || shopLike || roll || cleanup ? (
          <BrewScreen key={`${view.you}:${view.game.round}`} view={view} onAction={onAction} pending={pending || !!cleanup} error={error} hideActions={!brewing || !!cleanup} roll={roll} cleanupPot={cleanup?.pot} onCleanupDone={finish} />
        ) : (
          <PhaseScreen view={view} shownSeat={shownSeat} onAction={onAction} pending={pending} error={error} />
        )}
      </div>
      {card && scrollMode && !cleanup && !liveStep ? (
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
      {shopLike && !rolling ? (
        <div className="sticky bottom-0 z-20 bg-background mx-auto w-full max-w-6xl px-4 pb-4">
          <ShopDialog view={view} onAction={onAction} pending={pending} error={error} />
        </div>
      ) : null}
    </main>
  );
}
