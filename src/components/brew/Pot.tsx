import { useEffect, useState } from "react";
import type { ChipColour, PotEntry, WindowField } from "@/lib/game-api";
import { litWindowFields } from "@/lib/brew-view";
import { spiralLayout, type FieldShape, type PotLayout } from "@/lib/pot-layout";
import { cn } from "@/lib/utils";

const CHIP_FILL: Record<ChipColour, string> = {
  white: "var(--chip-white)",
  orange: "var(--chip-orange)",
  green: "var(--chip-green)",
  blue: "var(--chip-blue)",
  red: "var(--chip-red)",
  black: "var(--chip-black)",
  yellow: "var(--chip-yellow)",
  purple: "var(--chip-purple)",
};

const LIGHT_CHIPS: ReadonlySet<ChipColour> = new Set(["white", "orange", "green", "yellow"]);

const SMOKE_OFFSETS = [
  { x: -14, y: -6 },
  { x: 0, y: -14 },
  { x: 12, y: -5 },
  { x: -8, y: 5 },
  { x: 9, y: 8 },
  { x: 0, y: 0 },
];

interface PotProps {
  pot: PotEntry[];
  // Only used in "own" mode; other seats' pots never show a window.
  window?: WindowField[];
  mode: "own" | "other";
  layout?: PotLayout;
  newOrders?: ReadonlySet<number> | undefined;
  exploded?: boolean | undefined;
  className?: string;
}

function pointsAttr(shape: FieldShape): string {
  return shape.outline.map((p) => `${p.x},${p.y}`).join(" ");
}

export function Pot({
  pot,
  window = [],
  mode,
  layout = spiralLayout,
  newOrders,
  exploded = false,
  className,
}: PotProps) {
  const fills = new Map<number, PotEntry>();
  for (const entry of pot) {
    for (let f = entry.from; f <= entry.landing; f++) fills.set(f, entry);
  }
  const landings = new Map<number, PotEntry>();
  for (const entry of pot) landings.set(entry.landing, entry);
  const lit = new Map<number, WindowField>();
  if (mode === "own") {
    for (const w of litWindowFields(window)) lit.set(w.field, w);
  }

  const { w, h } = layout.viewBox;

  return (
    <svg
      viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`}
      className={cn("h-auto w-full", exploded && "pot-shake")}
      role="img"
      aria-label="Potion pot"
    >
      {layout.all().map((shape) => {
        const entry = fills.get(shape.field);
        const landing = landings.get(shape.field);
        const litField = entry ? undefined : lit.get(shape.field);
        const fill = entry
          ? CHIP_FILL[entry.colour]
          : litField
            ? "var(--muted)"
            : "var(--secondary)";
        const stroke = landing ? "var(--accent)" : litField ? "var(--ring)" : "var(--border)";
        const isNew = landing != null && newOrders?.has(landing.order);
        return (
          <g key={shape.field} className={isNew ? "chip-drop" : undefined}>
            <polygon
              points={pointsAttr(shape)}
              fill={fill}
              stroke={stroke}
              strokeWidth={landing ? 1.6 : 0.6}
              opacity={!entry && !litField ? 0.45 : 1}
            />
            {landing ? (
              <text
                x={shape.center.x}
                y={shape.center.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={5}
                fill={
                  LIGHT_CHIPS.has(landing.colour)
                    ? "var(--primary-foreground)"
                    : "var(--foreground)"
                }
                style={{ fontFamily: "var(--font-body)" }}
              >
                {landing.value}
              </text>
            ) : null}
            {litField ? (
              <>
                <text
                  x={shape.center.x}
                  y={shape.center.y - 1.6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={3.4}
                  fill="var(--accent)"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {litField.money}
                </text>
                <text
                  x={shape.center.x}
                  y={shape.center.y + 2.2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={3.4}
                  fill="var(--foreground)"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {litField.points}
                </text>
                {litField.ruby ? (
                  <rect
                    x={shape.center.x + 2.4}
                    y={shape.center.y - 4.4}
                    width={2}
                    height={2}
                    fill="var(--chip-red)"
                  />
                ) : null}
              </>
            ) : null}
          </g>
        );
      })}
      {exploded
        ? SMOKE_OFFSETS.map((o, i) => (
            <rect
              key={i}
              x={o.x - 3}
              y={o.y - 3}
              width={6}
              height={6}
              fill={i % 2 ? "var(--chip-purple)" : "var(--muted-foreground)"}
              className="smoke-puff"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))
        : null}
    </svg>
  );
}
