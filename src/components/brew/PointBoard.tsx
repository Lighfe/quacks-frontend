import type { View } from "@/lib/game-api";
import { flameState, frameCells, lapMarker, markerTile } from "@/lib/point-board";
import { PixelIcon, type PixelGrid } from "./pixel-icons";

// Rat facing left, tail running right; tail end is at local (RAT_TAIL_X, RAT_TAIL_Y).
const RAT_ROWS = [".ee...........", "eke.bbb.......", "bbbbbbbb......", ".bbbbbbbtttttt", "..b..b........"];
const RAT_TAIL_X = 14;
const RAT_TAIL_Y = 3.5;
const RAT_FILL: Record<string, string> = {
  b: "var(--muted-foreground)",
  e: "var(--parchment-shade)",
  k: "var(--background)",
  t: "var(--chip-yellow)",
};
const FLAME_LIT: PixelGrid = ["..y..", ".yoy.", ".yoy.", "yoroy", "yorry", ".ooo.", "ggggg"];
const FLAME_BURNT: PixelGrid = ["..g..", ".....", "..g..", ".g.g.", ".ggg.", ".ggg.", "ggggg"];
const FLAME_UNLIT: PixelGrid = [".....", ".....", "..w..", "..w..", ".www.", ".www.", "ggggg"];
const PAWN: string[] = ["..x..", ".xxx.", "..x..", ".xxx.", "xxxxx"];
const SEAT_COLOURS = ["var(--chip-red)", "var(--chip-blue)", "var(--chip-yellow)", "var(--chip-green)"];

const CELL = 12;
const TILE = 10;
const M = 16;

function Pawn({ x, y, colour, unit }: { x: number; y: number; colour: string; unit: number }) {
  return (
    <g shapeRendering="crispEdges">
      {PAWN.flatMap((row, j) =>
        Array.from(row).map((c, i) =>
          c === "x" ? (
            <rect key={`${i}-${j}`} x={x + i * unit} y={y + j * unit} width={unit} height={unit} fill={colour} stroke="var(--background)" strokeWidth={0.15} />
          ) : null,
        ),
      )}
    </g>
  );
}

export function PointBoard({ view }: { view: View }) {
  const board = view.board;
  if (!board || board.fields <= 0) {
    return <p className="p-6 text-center font-pixel text-xs text-muted-foreground">No point board in this game view</p>;
  }
  const { w, h, cells } = frameCells(board.fields);
  const width = w * CELL;
  const height = h * CELL;
  const centre = (t: number) => {
    const c = cells[((t % board.fields) + board.fields) % board.fields]!;
    return { x: c.col * CELL + CELL / 2, y: c.row * CELL + CELL / 2, col: c.col, row: c.row };
  };
  const rounds = view.game.rounds;
  const gap = 3;
  const flameUnit = Math.min(0.17 * (height + 2 * M) / 7, (width - 2 * CELL - 8 - (rounds - 1) * gap) / rounds / 5);
  const fw = 5 * flameUnit;
  const totalW = rounds * fw + (rounds - 1) * gap;

  const tiles = view.seats.map((s) => markerTile(s.points, board));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 p-3">
      <svg
        viewBox={`${-M} ${-M} ${width + 2 * M} ${height + 2 * M}`}
        className="w-full max-h-[calc(100vh-200px)]"
        role="img"
        aria-label="Point board"
        shapeRendering="crispEdges"
      >
        <rect x={-6} y={-6} width={width + 12} height={height + 12} fill="color-mix(in oklab, var(--chip-purple) 55%, var(--background))" stroke="var(--chip-purple)" strokeWidth={2} />
        <rect x={CELL} y={CELL} width={width - 2 * CELL} height={height - 2 * CELL} fill="color-mix(in oklab, var(--chip-purple) 30%, var(--background))" stroke="var(--chip-purple)" strokeWidth={1} />
        {cells.map((c, t) => (
          <g key={t} data-testid="board-tile" data-tile={t}>
            <rect x={c.col * CELL + 1} y={c.row * CELL + 1} width={TILE} height={TILE} fill="var(--parchment)" stroke="var(--parchment-shade)" strokeWidth={0.5} />
            <text x={c.col * CELL + CELL / 2} y={c.row * CELL + 4.6} textAnchor="middle" fontSize={3.4} fill="var(--parchment-ink)" className="font-pixel">
              {t}
            </text>
          </g>
        ))}
        {board.rat_tails.map((t) => {
          const a = centre(t);
          const b = centre(t + 1);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          // Side of the board for this gap; rat lies outside, tail pointing at the track.
          let side: "top" | "right" | "bottom" | "left";
          if (a.row === b.row) side = a.row === 0 ? "top" : "bottom";
          else if (a.col === b.col) side = a.col === 0 ? "left" : "right";
          else side = a.row === 0 || b.row === 0 ? "top" : "bottom";
          const out = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
          // Local tail points +x; rotate so it points inward (opposite of `out`).
          const rot = { top: 90, right: 180, bottom: -90, left: 0 }[side];
          const tx = mx + out[0]! * 3;
          const ty = my + out[1]! * 3;
          return (
            <g key={t} data-testid="rat" data-after-tile={t} data-side={side} data-tail-x={tx} data-tail-y={ty}>
              <g transform={`translate(${tx} ${ty}) rotate(${rot}) translate(${-RAT_TAIL_X} ${-RAT_TAIL_Y})`}>
                {RAT_ROWS.flatMap((row, j) =>
                  Array.from(row).map((ch, i) =>
                    ch === "." ? null : <rect key={`${i}-${j}`} x={i} y={j} width={1} height={1} fill={RAT_FILL[ch]} />,
                  ),
                )}
              </g>
            </g>
          );
        })}
        {view.seats.map((s, i) => {
          const tile = tiles[i]!;
          const same = tiles.map((tt, j) => (tt === tile ? j : -1)).filter((j) => j >= 0);
          const k = same.indexOf(i);
          const p = centre(tile);
          const off = same.length > 1 ? (k - (same.length - 1) / 2) * 3 : 0;
          const cx = p.x + off;
          const cy = p.y + 1.5;
          const unit = 1;
          return (
            <g key={s.id} data-testid="board-marker" data-seat={s.id} data-tile={tile} data-cx={cx} data-cy={cy} aria-label={s.id} role="img">
              <Pawn x={cx - 2.5 * unit} y={cy - 2.5 * unit} colour={SEAT_COLOURS[i % SEAT_COLOURS.length]!} unit={unit} />
            </g>
          );
        })}
        <g>
          {Array.from({ length: rounds }, (_, k) => {
            const r = k + 1;
            const state = flameState(r, view.game.round);
            const grid = state === "lit" ? FLAME_LIT : state === "burnt" ? FLAME_BURNT : FLAME_UNLIT;
            const x = width / 2 - totalW / 2 + k * (fw + gap);
            return (
              <g key={r} data-testid="flame" data-round={r} data-state={state} data-height={7 * flameUnit} opacity={state === "burnt" ? 0.5 : 1}>
                <PixelIcon grid={grid} x={x} y={height / 2 - 3.5 * flameUnit} unit={flameUnit} />
              </g>
            );
          })}
        </g>
      </svg>
      <ul className="pixel-border flex flex-wrap justify-center gap-4 bg-card p-2 font-pixel text-[10px]">
        {view.seats.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <svg width={20} height={20} viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden>
              <Pawn x={0} y={0} colour={SEAT_COLOURS[i % SEAT_COLOURS.length]!} unit={1} />
            </svg>
            <span>{s.id}</span>
            <span data-testid="lap-marker" data-seat={s.id} className="pixel-border bg-parchment px-2 py-1 text-parchment-ink">
              {lapMarker(s.points, board)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
