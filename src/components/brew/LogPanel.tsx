import { useEffect, useRef } from "react";

import type { GameLog } from "@/lib/game-api";
import { PixelFrame } from "./PixelFrame";

export function LogPanel({ log }: { log: GameLog }) {
  const ref = useRef<HTMLOListElement>(null);
  const count = log.lines.length;
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, log.lines]);
  return (
    <PixelFrame title="Log">
      <ol ref={ref} data-testid="log" className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {log.lines.map((line, i) => (
          <li key={i} className="text-muted-foreground">
            {line}
          </li>
        ))}
      </ol>
    </PixelFrame>
  );
}
