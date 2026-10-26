import type { LegalAction } from "@/lib/game-api";
import { PixelFrame } from "./PixelFrame";
import { cn } from "@/lib/utils";

const DEDICATED: { id: string; key: string }[] = [
  { id: "draw", key: "d" },
  { id: "stop", key: "s" },
  { id: "use_flask", key: "f" },
  { id: "use_card_17", key: "u" },
];

// These have their own controls in the HandPicker.
const HANDLED_ELSEWHERE = new Set(["put_back_draw", "put_back_stop"]);

export function ActionBar({
  legal,
  error,
  onAction,
}: {
  legal: LegalAction[];
  error: string | null;
  onAction: (id: string) => void;
}) {
  const dedicatedIds = new Set(DEDICATED.map((d) => d.id));
  const others = legal.filter(
    (a) => !dedicatedIds.has(a.id) && !HANDLED_ELSEWHERE.has(a.id) && !a.id.startsWith("play:"),
  );
  return (
    <PixelFrame title="Actions">
      <div className="flex flex-wrap gap-2">
        {DEDICATED.map(({ id, key }) => {
          const action = legal.find((a) => a.id === id);
          return (
            <button
              key={id}
              type="button"
              disabled={!action}
              onClick={() => onAction(id)}
              className={cn(
                "pixel-border px-3 py-2 font-pixel text-[10px]",
                action
                  ? "bg-primary text-primary-foreground"
                  : "cursor-not-allowed bg-muted text-muted-foreground opacity-40",
              )}
            >
              {action?.label ?? id} [{key}]
            </button>
          );
        })}
        {others.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAction(a.id)}
            className="pixel-border bg-secondary px-3 py-2 font-pixel text-[10px] text-secondary-foreground"
          >
            {a.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
    </PixelFrame>
  );
}
