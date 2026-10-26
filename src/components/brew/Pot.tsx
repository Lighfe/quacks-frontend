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

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

interface PotProps {
  pot: PotEntry[];
  // Only used in "own" mode; other seats' pots never show a window.
  window?: WindowField[];
  mode: "own" | "other";
  layout?: PotLayout;
  newOrders?: ReadonlySet<number> | undefined;
  exploded?: boolean | undefined;
  // Field of the seat's droplet, as sent by the service.
  droplet?: number | undefined;
  // Seat's start_field when rat_tail > 0, else null (no marker).
  ratTailField?: number | null | undefined;
  className?: string;
}

// Pixel-art markers in layout units, drawn in field corners so they stay
// visible over chips.
function DropletMarker({ shape }: { shape: FieldShape }) {
  const x = shape.center.x - 5;
  const y = shape.center.y + 0.6;
  return (
    <g data-marker="droplet" shapeRendering="crispEdges">
      <rect x={x + 1.4} y={y} width={0.9} height={0.9} fill="var(--chip-blue)" />
      <rect x={x + 0.9} y={y + 0.9} width={1.9} height={0.9} fill="var(--chip-blue)" />
      <rect x={x + 0.4} y={y + 1.8} width={2.9} height={1.8} fill="var(--chip-blue)" />
      <rect x={x + 0.9} y={y + 3.6} width={1.9} height={0.8} fill="var(--chip-blue)" />
      <rect x={x + 0.9} y={y + 1.8} width={0.7} height={0.9} fill="var(--foreground)" />
    </g>
  );
}

function RatTailMarker({ shape }: { shape: FieldShape }) {
  const x = shape.center.x + 1;
  const y = shape.center.y + 1;
  return (
    <g data-marker="rat-tail" shapeRendering="crispEdges" fill="var(--chip-red)">
      <rect x={x} y={y + 3} width={1} height={1} />
      <rect x={x + 1} y={y + 2} width={1} height={1} />
      <rect x={x + 2} y={y + 3} width={1} height={1} />
      <rect x={x + 3} y={y + 2} width={1} height={1} />
      <rect x={x + 3} y={y + 1} width={1} height={1} />
    </g>
  );
}

function pointsAttr(shape: FieldShape): string {
  return shape.outline.map((p) => `${p.x},${p.y}`).join(" ");
}

// Only interpolates the supplied layout centres; field geometry stays in the layout.
function trailPath(entry: PotEntry, layout: PotLayout): string {
  const centers = layout.all()
    .filter((shape) => shape.field >= entry.from && shape.field <= entry.landing)
    .map((shape) => shape.center);
  const first = centers[0];
  if (!first) return "";
  let path = `M ${first.x} ${first.y}`;
  for (let i = 1; i < centers.length; i++) {
    const previous = centers[i - 1];
    const next = centers[i];
    if (!previous || !next) continue;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const wobble = ((entry.order + entry.from + i) % 2 === 0 ? 1 : -1) * 1.2;
    const cx = (previous.x + next.x) / 2 - (dy / length) * wobble;
    const cy = (previous.y + next.y) / 2 + (dx / length) * wobble;
    path += ` Q ${cx} ${cy} ${next.x} ${next.y}`;
  }
  return path;
}

export function Pot({
  pot,
  window = [],
  mode,
  layout = spiralLayout,
  newOrders,
  exploded = false,
  droplet,
  ratTailField = null,
  className,
}: PotProps) {
  const reducedMotion = useReducedMotion();
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

  const { x: vx, y: vy, w, h } = layout.viewBox;

  return (
    <svg
      viewBox={`${vx} ${vy} ${w} ${h}`}
      className={cn("pot-surface h-auto w-full", className, exploded && !reducedMotion && "pot-shake")}
      role="img"
      aria-label="Potion pot"
    >
      <polyline
        data-pot-path
        points={layout.all().map(({ center }) => `${center.x},${center.y}`).join(" ")}
        fill="none"
        stroke="var(--border)"
        strokeWidth={11}
        strokeLinejoin="bevel"
      />
      {pot.filter((entry) => entry.from < entry.landing).map((entry) => (
        <path
          key={`trail-${entry.order}`}
          data-trail={entry.order}
          d={trailPath(entry, layout)}
          fill="none"
          stroke={CHIP_FILL[entry.colour]}
          strokeWidth={7.5}
          strokeLinejoin="bevel"
          opacity={0.65}
          className={newOrders?.has(entry.order) && !reducedMotion ? "chip-drop" : undefined}
        />
      ))}
      {layout.all().map((shape) => {
        const entry = fills.get(shape.field);
        const landing = landings.get(shape.field);
        const litField = lit.get(shape.field);
        const fill = entry
          ? CHIP_FILL[entry.colour]
          : litField
             ? "var(--pot-lit)"
             : "var(--pot-dark)";
        // With a chip on a lit field, window data moves to small corner labels.
        const corner = entry != null;
        const stroke = landing ? "var(--accent)" : litField ? "var(--ring)" : "var(--border)";
        const isNew = landing != null && newOrders?.has(landing.order);
        return (
          <g
            key={landing ? `${shape.field}-${landing.order}-${landing.chip}` : shape.field}
            data-landing={landing ? shape.field : undefined}
            className={isNew && !reducedMotion ? "chip-drop" : undefined}
          >
            {!entry || landing ? <polygon
              points={pointsAttr(shape)}
              fill={fill}
              stroke={stroke}
              strokeWidth={landing ? 1.6 : 0.6}
               strokeLinejoin="miter"
              opacity={!entry && !litField ? 0.45 : 1}
            /> : null}
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
              <g data-window-field={shape.field}>
                <text
                  x={corner ? shape.center.x - 4.4 : shape.center.x}
                  y={corner ? shape.center.y - 3.6 : shape.center.y - 1.6}
                  textAnchor={corner ? "start" : "middle"}
                  dominantBaseline="central"
                  fontSize={corner ? 2.4 : 3.4}
                  fill="var(--accent)"
                  stroke={corner ? "var(--background)" : undefined}
                  strokeWidth={corner ? 0.5 : undefined}
                  paintOrder="stroke"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {litField.money}
                </text>
                <text
                  x={corner ? shape.center.x + 4.4 : shape.center.x}
                  y={corner ? shape.center.y + 3.6 : shape.center.y + 2.2}
                  textAnchor={corner ? "end" : "middle"}
                  dominantBaseline="central"
                  fontSize={corner ? 2.4 : 3.4}
                  fill="var(--foreground)"
                  stroke={corner ? "var(--background)" : undefined}
                  strokeWidth={corner ? 0.5 : undefined}
                  paintOrder="stroke"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {litField.points}
                </text>
                {litField.ruby ? (
                  <rect
                    data-ruby
                    x={shape.center.x + 2.4}
                    y={shape.center.y - 4.4}
                    width={2}
                    height={2}
                    fill="var(--chip-red)"
                    stroke={corner ? "var(--background)" : undefined}
                    strokeWidth={corner ? 0.4 : undefined}
                  />
                ) : null}
              </g>
            ) : null}
          </g>
        );
      })}
      {droplet != null && droplet >= 0 && droplet < layout.fieldCount ? (
        <DropletMarker shape={layout.field(droplet)} />
      ) : null}
      {ratTailField != null && ratTailField >= 0 && ratTailField < layout.fieldCount ? (
        <RatTailMarker shape={layout.field(ratTailField)} />
      ) : null}
      {exploded && !reducedMotion
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
