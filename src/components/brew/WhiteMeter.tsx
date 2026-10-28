import { cn } from "@/lib/utils";

export function WhiteMeter({ whiteTotal, limit }: { whiteTotal: number; limit: number }) {
  const over = whiteTotal > limit;
  const pips = Math.max(limit, whiteTotal);
  return (
    <div aria-label="White chips">
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: pips }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-4 w-4 border-2 border-border",
                i < whiteTotal ? (over ? "bg-destructive" : "bg-chip-white") : "bg-secondary",
              )}
            />
          ))}
        </div>
        <span className={cn("font-pixel text-xs", over ? "text-destructive" : "text-foreground")}>
          {whiteTotal}/{limit}
        </span>
      </div>
    </div>
  );
}
