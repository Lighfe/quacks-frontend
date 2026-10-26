import type { ChipType, Seat } from "@/lib/game-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bag } from "./Bag";
import { PixelFrame } from "./PixelFrame";
import { Pot } from "./Pot";

interface OpponentPanelProps {
  seat: Seat;
  chips: ChipType[];
  newOrders?: ReadonlySet<number> | undefined;
  exploded?: boolean | undefined;
}

export function OpponentPanel({ seat, chips, newOrders, exploded }: OpponentPanelProps) {
  return (
    <PixelFrame title={`${seat.id} — ${seat.status}`}>
      <div className="flex flex-col gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="block w-full" aria-label={`Enlarge pot of ${seat.id}`}>
              <Pot pot={seat.pot} mode="other" newOrders={newOrders} exploded={exploded} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card">
            <DialogHeader>
              <DialogTitle className="font-pixel text-xs">{seat.id}</DialogTitle>
            </DialogHeader>
            {/* Still mode="other": no window, even enlarged. */}
            <Pot pot={seat.pot} mode="other" />
          </DialogContent>
        </Dialog>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">Points</span>
          <span className="font-pixel text-[10px] text-foreground">{seat.points}</span>
        </div>
        <Bag bag={seat.bag} chips={chips} />
      </div>
    </PixelFrame>
  );
}
