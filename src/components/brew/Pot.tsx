import { useEffect, useState } from "react";
import type { ChipColour, PotEntry, WindowField } from "@/lib/game-api";
import { litWindowFields } from "@/lib/brew-view";
import { spiralLayout, type FieldShape, type PotLayout } from "@/lib/pot-layout";
import { cn } from "@/lib/utils";
import { COIN, GEM, PixelIcon, STAR, type PixelGrid } from "./pixel-icons";

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
  // Seat's rat_tail count.
  ratTail?: number | undefined;
  className?: string;
}

const SMALL_DROP: PixelGrid = [".b.", ".b.", "bbb", "wbb", ".b."];
// Leaning drop with a hooked tip, 6 x 9 px.
const BIG_DROP: PixelGrid = ["...b..", "...bb.", "..bbb.", ".bbbbb", "bwbbbb", "bwbbbb", "bbbbbb", ".bbbb.", "..bb.."];
// Rat facing right with a long curved tail: tail, body, ear, eye, nose. 12 x 6 px.
const RAT: PixelGrid = [
  "......g.g...",
  "....ggggg...",
  "aa.ggggkgr..",
  ".aaggggggg..",
  "a.gggggg....",
  "...g..g.....",
];
const SMALL_TAIL: PixelGrid = ["..aa", ".a..", ".a..", "a..."];

// Icon fields from droplet, rat tail count and track length only.
export function markerFields(droplet: number, ratTail: number, fieldCount: number) {
  const last = fieldCount - 1;
  const big = Math.min(Math.max(droplet, 0), last);
  const small: number[] = [];
  for (let f = 0; f < droplet && f <= last; f++) small.push(f);
  const rat = ratTail > 0 ? Math.min(droplet + ratTail, last) : null;
  const tails: number[] = [];
  for (let f = droplet + 1; f < droplet + ratTail && f <= last; f++) if (f !== rat) tails.push(f);
  return { big, small, rat, tails };
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
    const wobble = ((entry.order + entry.from + i) % 2 === 0 ? 1 : -1) * 1.5;
    for (let segment = 1; segment <= 3; segment++) {
      const t = segment / 3;
      const offset = segment === 3 ? 0 : segment === 1 ? wobble : -wobble;
      const x = previous.x + dx * t - (dy / length) * offset;
      const y = previous.y + dy * t + (dx / length) * offset;
      path += ` L ${x} ${y}`;
    }
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
  ratTail = 0,
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
         // With a chip on a lit field, window data moves to corner labels.
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
                {/* Symbol left, number right of it; gem stays in the upper right corner. */}
                 <PixelIcon grid={COIN} x={shape.center.x - 4.7} y={shape.center.y + (corner ? -4.6 : -2.6)} unit={0.3} label="money" />
                <text
                   x={shape.center.x - 2.9}
                  y={corner ? shape.center.y - 3.6 : shape.center.y - 1.6}
                  textAnchor="start"
                  dominantBaseline="central"
                   fontSize={3}
                   fill="var(--pot-money)"
                  stroke={corner ? "var(--background)" : undefined}
                  strokeWidth={corner ? 0.5 : undefined}
                  paintOrder="stroke"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {litField.money}
                </text>
                 <PixelIcon grid={STAR} x={shape.center.x - 4.7} y={shape.center.y + (corner ? 2.85 : 1.2)} unit={0.22} label="points" />
                <text
                   x={shape.center.x - 2.9}
                  y={corner ? shape.center.y + 3.6 : shape.center.y + 2.2}
                  textAnchor="start"
                  dominantBaseline="central"
                   fontSize={3}
                   fill="var(--pot-points)"
                  stroke={corner ? "var(--background)" : undefined}
                  strokeWidth={corner ? 0.5 : undefined}
                  paintOrder="stroke"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {litField.points}
                </text>
                {litField.ruby ? (
                  <PixelIcon data-ruby grid={GEM} x={shape.center.x + 2.4} y={shape.center.y - 4.4} unit={0.5} label="rubies" />
                ) : null}
              </g>
            ) : null}
          </g>
        );
      })}
      {droplet != null ? (() => {
        const m = markerFields(droplet, ratTail, layout.fieldCount);
        const at = (f: number) => layout.field(f).center;
        return (
          <g data-markers>
            {m.small.map((f) => (
              <PixelIcon key={`s${f}`} grid={SMALL_DROP} x={at(f).x - 4.6} y={at(f).y + 0.6} unit={0.8} marker="droplet-small" field={f} />
            ))}
            {m.tails.map((f) => (
              <PixelIcon key={`t${f}`} grid={SMALL_TAIL} x={at(f).x + 1.4} y={at(f).y + 1.2} unit={0.8} marker="rat-tail" field={f} />
            ))}
            <g opacity={0.85}>
              <PixelIcon grid={BIG_DROP} x={at(m.big).x - 3} y={at(m.big).y - 4.5} unit={1} marker="droplet" field={m.big} />
            </g>
            {m.rat != null ? (
              <g opacity={0.85}>
                <PixelIcon grid={RAT} x={at(m.rat).x - 5.4} y={at(m.rat).y - 2.7} unit={0.9} marker="rat" field={m.rat} />
              </g>
            ) : null}
          </g>
        );
      })() : null}
      {/* Chip values repeated above the icons so landings stay readable. */}
      {droplet != null
        ? pot.map((entry) => {
            const c = layout.field(entry.landing).center;
            return (
              <text
                key={`v${entry.order}`}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={5}
                fill={LIGHT_CHIPS.has(entry.colour) ? "var(--primary-foreground)" : "var(--foreground)"}
                stroke={LIGHT_CHIPS.has(entry.colour) ? undefined : "var(--background)"}
                strokeWidth={0.6}
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-body)" }}
                aria-hidden
              >
                {entry.value}
              </text>
            );
          })
        : null}
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
