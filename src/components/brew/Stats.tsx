import type { Seat } from "@/lib/game-api";
import { PixelFrame } from "./PixelFrame";

export function Stats({ seat }: { seat: Seat }) {
  const items: [string, string][] = [
    ["Points", String(seat.points)],
    ["Money", String(seat.money)],
    ["Rubies", String(seat.rubies)],
    ["Droplet", String(seat.droplet)],
    ["Rat tail", String(seat.rat_tail)],
    ["Flask", seat.flask_full ? "full" : "empty"],
  ];
  return (
    <PixelFrame title={seat.id}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <dt className="whitespace-nowrap text-muted-foreground">{label}</dt>
            <dd className="font-pixel text-[10px] text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </PixelFrame>
  );
}
