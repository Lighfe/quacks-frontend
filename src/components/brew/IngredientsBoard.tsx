import type { ChipColour, Ingredient } from "@/lib/game-api";
import { cn } from "@/lib/utils";
import { ChipToken } from "./Chip";
import { COIN, PixelSymbol } from "./pixel-icons";

// Faded when sold chips exist but none is available now; white (never sold) stays.
export function isNoteFaded(ing: Ingredient): boolean {
  const sold = ing.chips.some((c) => c.price !== null);
  return sold && !ing.chips.some((c) => c.available);
}

// Fixed variant per colour: the note looks the same on every render.
export const NOTE_VARIANT: Record<ChipColour, number> = {
  white: 0, orange: 1, green: 2, blue: 3, red: 4, black: 5, yellow: 6, purple: 7,
};

// Pixel grid of the note: W x H cells, drawn stretched behind the content.
const W = 40;
const H = 32;
const TILTS = [-1.5, 1, -0.5, 2, -2, 0.5, 1.5, -1];
// Seal place: [x cell, y cell, kind]
const SEALS: [number, number, "wax" | "pin"][] = [
  [18, 0, "wax"], [3, 1, "pin"], [33, 0, "wax"], [19, 1, "pin"],
  [4, 0, "wax"], [32, 1, "pin"], [17, 0, "wax"], [30, 0, "wax"],
];

function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

type Cell = [number, number];
function noteShape(v: number) {
  const r = rng(v + 11);
  // Per-column/row tear depth (0..2 cells), stepped.
  const top = Array.from({ length: W }, () => Math.floor(r() * 3));
  const bot = Array.from({ length: W }, () => Math.floor(r() * 3));
  const left = Array.from({ length: H }, () => Math.floor(r() * 2.4));
  const right = Array.from({ length: H }, () => Math.floor(r() * 2.4));
  // One deeper bite on a random edge.
  const bite = Math.floor(r() * (W - 8)) + 4;
  for (let i = -2; i <= 2; i++) bot[bite + i] = Math.max(bot[bite + i] ?? 0, 3 - Math.abs(i) + 1);
  const inside = (x: number, y: number) =>
    y >= (top[x] ?? 0) && y < H - (bot[x] ?? 0) && x >= (left[y] ?? 0) && x < W - (right[y] ?? 0);
  const paper: Cell[] = [];
  const edge: Cell[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      (rim ? edge : paper).push([x, y]);
    }
  // Stains: a few blotchy clusters.
  const stains: Cell[] = [];
  const n = 2 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const cx = 3 + Math.floor(r() * (W - 6));
    const cy = 3 + Math.floor(r() * (H - 6));
    const rad = 1 + r() * 2.5;
    for (let y = -3; y <= 3; y++)
      for (let x = -3; x <= 3; x++)
        if (x * x + y * y <= rad * rad + r() * 2 && inside(cx + x, cy + y)) stains.push([cx + x, cy + y]);
  }
  // Scorch specks.
  const specks: Cell[] = [];
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    if (inside(x, y)) specks.push([x, y]);
  }
  return { paper, edge, stains, specks };
}

const WAX: string[] = [
  "..aaaa..",
  ".abbbba.",
  "abhbbbba",
  "abbcccba",
  "abbcccba",
  "abbbbbda",
  ".adbbda.",
  "..aaaa.a",
];
const PIN: string[] = ["..aa..", ".ahba.", ".abba.", "..aa..", "..kk..", "...k.."];

function Seal({ colour, kind }: { colour: ChipColour; kind: "wax" | "pin" }) {
  const c = `var(--chip-${colour})`;
  const fill: Record<string, string> = {
    a: `color-mix(in oklch, ${c} 55%, var(--background))`,
    b: c,
    c: `color-mix(in oklch, ${c} 75%, var(--background))`,
    d: `color-mix(in oklch, ${c} 70%, var(--background))`,
    h: `color-mix(in oklch, ${c} 45%, var(--foreground))`,
    k: "var(--sack-outline)",
  };
  const grid = kind === "wax" ? WAX : PIN;
  const u = kind === "wax" ? 3 : 3;
  return (
    <svg aria-hidden width={grid[0]!.length * u} height={grid.length * u} shapeRendering="crispEdges" className="block">
      {grid.flatMap((row, j) =>
        Array.from(row).map((ch, i) =>
          fill[ch] ? <rect key={`${i}-${j}`} x={i * u} y={j * u} width={u} height={u} fill={fill[ch]} /> : null,
        ),
      )}
    </svg>
  );
}

function Note({ ing }: { ing: Ingredient }) {
  const v = NOTE_VARIANT[ing.colour];
  const faded = isNoteFaded(ing);
  const shape = noteShape(v);
  const [sx, sy, kind] = SEALS[v]!;
  const rects = (cells: Cell[], fill: string, op = 1) =>
    cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} opacity={op} />);
  return (
    <div
      data-testid={`note-${ing.colour}`}
      data-faded={faded ? "true" : "false"}
      data-variant={`v${v}`}
      className={cn("relative pt-3", faded && "opacity-40 grayscale")}
      style={{ transform: `rotate(${TILTS[v]}deg)` }}
    >
      <div className="relative px-5 pb-6 pt-6 text-parchment-ink">
        <svg
          aria-hidden
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          className="absolute inset-0 h-full w-full"
          style={{ filter: "drop-shadow(3px 3px 0 var(--pixel-shadow))" }}
        >
          {rects(shape.paper, "var(--parchment)")}
          {rects(shape.edge, "var(--parchment-shade)")}
          {rects(shape.stains, "var(--parchment-shade)", 0.55)}
          {rects(shape.specks, "var(--sack-shade)", 0.7)}
        </svg>
        <span
          className="absolute z-10 -translate-x-1/2"
          style={{ left: `${(sx / W) * 100}%`, top: `${sy * 3 - 10}px` }}
        >
          <Seal colour={ing.colour} kind={kind} />
        </span>
        <div className="relative grid grid-cols-3 gap-2">
          {ing.chips.map((c) => (
            <div key={c.chip} className="flex flex-col items-center gap-1">
              <ChipToken colour={ing.colour} value={c.value} className="h-9 w-9" />
              {c.price !== null ? (
                <span className="flex items-center gap-1 font-pixel text-[10px]">
                  <PixelSymbol grid={COIN} unit={2} label="money" />
                  {c.price}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        {ing.effect ? (
          <p data-testid="note-effect" className="relative mt-3 text-sm leading-tight">
            {ing.effect}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function IngredientsBoard({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {ingredients.map((ing) => (
        <Note key={ing.colour} ing={ing} />
      ))}
    </div>
  );
}
