import type { ChipColour } from "@/lib/game-api";
import { cn } from "@/lib/utils";

export const chipBgClass: Record<ChipColour, string> = {
  white: "bg-chip-white",
  orange: "bg-chip-orange",
  green: "bg-chip-green",
  blue: "bg-chip-blue",
  red: "bg-chip-red",
  black: "bg-chip-black",
  yellow: "bg-chip-yellow",
  purple: "bg-chip-purple",
};

const chipTextClass: Record<ChipColour, string> = {
  white: "text-primary-foreground",
  orange: "text-primary-foreground",
  green: "text-primary-foreground",
  yellow: "text-primary-foreground",
  blue: "text-foreground",
  red: "text-foreground",
  black: "text-foreground",
  purple: "text-foreground",
};

export function ChipToken({
  colour,
  value,
  className,
}: {
  colour: ChipColour;
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center border-2 border-border font-pixel text-[10px]",
        chipBgClass[colour],
        chipTextClass[colour],
        className,
      )}
    >
      {value}
    </span>
  );
}
