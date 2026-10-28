import type { View } from "@/lib/game-api";
import { ChipToken } from "./Chip";
import { COIN, FLASK_EMPTY, FLASK_FULL, GEM, PixelSymbol, STAR } from "./pixel-icons";

export const SHOP_QUESTION = "What would you like to buy?";
export const RUBY_QUESTION = "What would you like to do with your rubies?";

// Ruby price comes only from the service label, e.g. "refill flask: 2 rubies".
export function rubyPriceFromLabel(label: string): number | null {
  const m = /(\d+)\s*rub/i.exec(label);
  return m ? Number(m[1]) : null;
}

// Ruby button text: the label's effect part without the price, else its name.
export function rubyActionText(label: string): string {
  const [name = "", rest = ""] = label.split(/:(.*)/s);
  const effects = rest.split(",").map((p) => p.trim()).filter((p) => p && !/\d+\s*rub/i.test(p));
  return effects.length ? effects.join(", ") : name.trim();
}

const btn =
  "pixel-border flex items-center gap-2 bg-parchment-shade px-3 py-2 font-pixel text-[10px] text-parchment-ink disabled:cursor-not-allowed disabled:opacity-40";

export function ShopDialog({
  view,
  onAction,
  pending,
  error,
}: {
  view: View;
  onAction: (id: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const phase = view.game.phase;
  const chips = new Map(
    (view.ingredients ?? []).flatMap((i) => i.chips.map((c) => [c.chip, { ...c, colour: i.colour }] as const)),
  );
  const me = view.seats.find((s) => s.id === view.you);
  return (
    <section className="torn-edge bg-parchment px-6 py-5 text-parchment-ink" aria-label="dialogue">
      {me ? (
        <div data-testid="shop-status" className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-pixel text-[10px]">
          <span data-testid="status-money" className="flex items-center gap-1">
            <PixelSymbol grid={COIN} unit={3} label="money" />
            {me.money}
          </span>
          <span data-testid="status-points" className="flex items-center gap-1">
            <PixelSymbol grid={STAR} unit={2} label="points" />
            {me.points}
          </span>
          <span data-testid="status-rubies" className="flex items-center gap-1">
            <PixelSymbol grid={GEM} unit={3} label="rubies" />
            {me.rubies}
          </span>
          <span data-testid="status-flask" data-full={me.flask_full ? "true" : "false"} className="flex items-center">
            <PixelSymbol grid={me.flask_full ? FLASK_FULL : FLASK_EMPTY} unit={3} label={me.flask_full ? "flask full" : "flask empty"} />
          </span>
        </div>
      ) : null}
      <p className="mb-3 font-pixel text-xs">{phase === "ruby" ? RUBY_QUESTION : SHOP_QUESTION}</p>
      {view.legal.length === 0 && view.to_act.length > 0 ? (
        <p className="text-sm">Waiting for {view.to_act.join(", ")}</p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        {view.legal.map((a) => {
          if (a.id.startsWith("buy:")) {
            const c = chips.get(a.id.slice(4));
            if (c) {
              return (
                <button key={a.id} type="button" data-action={a.id} aria-label={a.label} disabled={pending} onClick={() => onAction(a.id)} className={`${btn} flex-col`}>
                  <ChipToken colour={c.colour} value={c.value} className="h-9 w-9" />
                  {c.price !== null ? (
                    <span className="flex items-center gap-1">
                      <PixelSymbol grid={COIN} unit={2} label="money" />
                      {c.price}
                    </span>
                  ) : null}
                </button>
              );
            }
          }
          const ruby = a.id === "ruby_drop" || a.id === "refill_flask" ? rubyPriceFromLabel(a.label) : null;
          return (
            <button key={a.id} type="button" data-action={a.id} disabled={pending} onClick={() => onAction(a.id)} className={btn}>
              {ruby !== null ? rubyActionText(a.label) : a.label}
              {ruby !== null ? (
                <span className="flex items-center gap-1">
                  <PixelSymbol grid={GEM} unit={3} label="rubies" />
                  {ruby}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
    </section>
  );
}
