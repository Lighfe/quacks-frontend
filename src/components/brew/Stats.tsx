import type { Seat } from "@/lib/game-api";
import { PixelFrame } from "./PixelFrame";
import { COIN, FLASK_EMPTY, FLASK_FULL, GEM, PixelSymbol, STAR } from "./pixel-icons";

export function Stats({ seat }: { seat: Seat }) {
  const items = [
    { grid: COIN, label: "money", value: seat.money },
    { grid: STAR, label: "points", value: seat.points },
    { grid: GEM, label: "rubies", value: seat.rubies },
  ];
  return (
    <PixelFrame title={seat.id}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <PixelSymbol grid={it.grid} unit={4} label={it.label} />
            <span className="font-pixel text-[10px] text-foreground">{it.value}</span>
          </div>
        ))}
        <PixelSymbol
          grid={seat.flask_full ? FLASK_FULL : FLASK_EMPTY}
          unit={4}
          label={seat.flask_full ? "flask full" : "flask empty"}
        />
      </div>
    </PixelFrame>
  );
}
