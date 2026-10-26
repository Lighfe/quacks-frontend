import type { GameLog } from "@/lib/game-api";
import { PixelFrame } from "./PixelFrame";

export function LogPanel({ log }: { log: GameLog }) {
  return (
    <PixelFrame title="Log">
      <ol className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {log.lines.map((line, i) => (
          <li key={i} className="text-muted-foreground">
            {line}
          </li>
        ))}
      </ol>
    </PixelFrame>
  );
}
