import type { Seat } from "@/lib/game-api";
import { COIN, FLASK_EMPTY, FLASK_FULL, GEM, PixelSymbol, STAR } from "./pixel-icons";

export function Stats({ seat }: { seat: Seat }) {
  const items = [
    { grid: COIN, label: "money", value: seat.money },
    { grid: STAR, label: "points", value: seat.points },
    { grid: GEM, label: "rubies", value: seat.rubies },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <PixelSymbol grid={it.grid} unit={4} label={it.label} />
            <span className="font-pixel text-[10px] text-foreground">{it.value}</span>
          </div>
        ))}
        {seat.flask_full ? (
          <PixelSymbol grid={FLASK_FULL} unit={4} label="flask full" />
        ) : (
          <span data-flask-tilt className="inline-block" style={{ transform: "rotate(12deg)" }}>
            <PixelSymbol grid={FLASK_EMPTY} unit={4} label="flask empty" />
          </span>
        )}
      </div>
    </div>
  );
}
