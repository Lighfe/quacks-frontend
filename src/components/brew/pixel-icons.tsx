// Shared pixel-art grids: one char per pixel, mapped to palette CSS variables.
export type PixelGrid = readonly string[];

export const PALETTE: Record<string, string> = {
  b: "var(--chip-blue)",
  w: "var(--foreground)",
  g: "var(--muted-foreground)",
  k: "var(--background)",
  a: "var(--accent)",
  r: "var(--chip-red)",
  p: "var(--primary)",
  y: "var(--chip-yellow)",
  v: "var(--pot-points)",
  n: "var(--chip-green)",
  o: "var(--chip-orange)",
};

// Cut gem: narrow flat table, widest girdle row, tapering to a point. 5 x 4 px.
export const GEM: PixelGrid = [".rrr.", "rrwrr", ".rwr.", "..r.."];
// Platformer coin with a shine and a slot. 5 x 5 px.
export const COIN: PixelGrid = [".yyy.", "ywyay", "ywyay", "yyyay", ".yyy."];
// Purple five-point star. 7 x 7 px.
export const STAR: PixelGrid = ["...v...", "...v...", "vvvvvvv", ".vvvvv.", "..vvv..", ".vv.vv.", "vv...vv"];
// Green flasks: liquid-filled and empty glass. 5 x 7 px.
export const FLASK_FULL: PixelGrid = [".nnn.", "..n..", ".nnn.", "nnnnn", "nwnnn", "nnnnn", ".nnn."];
export const FLASK_EMPTY: PixelGrid = [".nnn.", "..n..", ".n.n.", "n...n", "nw..n", "n...n", ".nnn."];

export function PixelIcon({
  grid, x, y, unit, marker, field, label, ...rest
}: {
  grid: PixelGrid; x: number; y: number; unit: number; marker?: string; field?: number;
  label?: string; "data-ruby"?: boolean;
}) {
  return (
    <g
      data-marker={marker}
      data-field={field}
      data-ruby={rest["data-ruby"] ? "" : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      shapeRendering="crispEdges"
    >
      {grid.flatMap((row, j) =>
        Array.from(row).map((c, i) =>
          PALETTE[c] ? (
            <rect key={`${i}-${j}`} x={x + i * unit} y={y + j * unit} width={unit} height={unit} fill={PALETTE[c]} />
          ) : null,
        ),
      )}
    </g>
  );
}

// Standalone inline symbol for panels.
export function PixelSymbol({ grid, unit, label }: { grid: PixelGrid; unit: number; label: string }) {
  const w = (grid[0]?.length ?? 0) * unit;
  const h = grid.length * unit;
  return (
    <svg role="img" aria-label={label} width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" className="inline-block shrink-0">
      {grid.flatMap((row, j) =>
        Array.from(row).map((c, i) =>
          PALETTE[c] ? <rect key={`${i}-${j}`} x={i * unit} y={j * unit} width={unit} height={unit} fill={PALETTE[c]} /> : null,
        ),
      )}
    </svg>
  );
}
