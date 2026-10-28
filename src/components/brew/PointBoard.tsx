import type { View } from "@/lib/game-api";
import { flameState, frameCells, lapMarker, markerTile } from "@/lib/point-board";
import { PixelIcon, type PixelGrid } from "./pixel-icons";

const RAT: PixelGrid = ["..ww....", ".wggg...", "wggggga.", ".g.g..aa"];
const FLAME_LIT: PixelGrid = ["..y..", ".yoy.", ".yoy.", "yoroy", "yorry", ".ooo.", "ggggg"];
const FLAME_BURNT: PixelGrid = ["..g..", ".....", "..g..", ".g.g.", ".ggg.", ".ggg.", "ggggg"];
const FLAME_UNLIT: PixelGrid = [".....", ".....", "..w..", "..w..", ".www.", ".www.", "ggggg"];
const PAWN: string[] = ["..x..", ".xxx.", "..x..", ".xxx.", "xxxxx"];
const SEAT_COLOURS = ["var(--chip-red)", "var(--chip-blue)", "var(--chip-yellow)", "var(--chip-green)"];

const CELL = 12;
const TILE = 10;

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
  const { n, cells } = frameCells(board.fields);
  const size = n * CELL;
  const centre = (t: number) => {
    const c = cells[((t % board.fields) + board.fields) % board.fields]!;
    return { x: c.col * CELL + CELL / 2, y: c.row * CELL + CELL / 2 };
  };
  const rounds = view.game.rounds;
  const flameW = 5 * 1.6;
  const gap = 2.5;
  const rowW = rounds * flameW + (rounds - 1) * gap;
  const flameUnit = Math.min(1.6, ((size - 2 * CELL - 8) / rounds) / 5 * 0.8);
  const fw = 5 * flameUnit;
  const totalW = rounds * fw + (rounds - 1) * gap;
  void rowW;

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 p-4 lg:flex-row lg:items-start">
      <svg
        viewBox={`-2 -2 ${size + 4} ${size + 4}`}
        className="w-full max-w-[640px]"
        role="img"
        aria-label="Point board"
        shapeRendering="crispEdges"
      >
        <rect x={CELL} y={CELL} width={size - 2 * CELL} height={size - 2 * CELL} fill="var(--card)" />
        {cells.map((c, t) => (
          <g key={t} data-testid="board-tile" data-tile={t}>
            <rect
              x={c.col * CELL + 1}
              y={c.row * CELL + 1}
              width={TILE}
              height={TILE}
              fill="var(--parchment)"
              stroke="var(--parchment-shade)"
              strokeWidth={0.5}
            />
            <text
              x={c.col * CELL + CELL / 2}
              y={c.row * CELL + CELL / 2 + 1.4}
              textAnchor="middle"
              fontSize={3.6}
              fill="var(--parchment-ink)"
              className="font-pixel"
            >
              {t}
            </text>
          </g>
        ))}
        {board.rat_tails.map((t) => {
          const a = centre(t);
          const b = centre(t + 1);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={t} data-testid="rat" data-after-tile={t}>
              <PixelIcon grid={RAT} x={mx - 4 * 0.7} y={my - 2 * 0.7} unit={0.7} />
            </g>
          );
        })}
        {view.seats.map((s, i) => {
          const tile = markerTile(s.points, board);
          const p = centre(tile);
          const unit = 0.9;
          const ox = view.seats.length > 1 ? (i % 2 === 0 ? -2.6 : 2.6) - 2.25 : -2.25;
          return (
            <g key={s.id} data-testid="board-marker" data-seat={s.id} data-tile={tile} aria-label={s.id} role="img">
              <Pawn x={p.x + ox} y={p.y - 2.25 + (i >= 2 ? 2 : 0)} colour={SEAT_COLOURS[i % SEAT_COLOURS.length]!} unit={unit} />
            </g>
          );
        })}
        <g>
          {Array.from({ length: rounds }, (_, k) => {
            const r = k + 1;
            const state = flameState(r, view.game.round);
            const grid = state === "lit" ? FLAME_LIT : state === "burnt" ? FLAME_BURNT : FLAME_UNLIT;
            const x = size / 2 - totalW / 2 + k * (fw + gap);
            return (
              <g key={r} data-testid="flame" data-round={r} data-state={state} opacity={state === "burnt" ? 0.5 : 1}>
                <PixelIcon grid={grid} x={x} y={size / 2 - 3.5 * flameUnit} unit={flameUnit} />
              </g>
            );
          })}
        </g>
      </svg>
      <ul className="pixel-border flex flex-col gap-3 bg-card p-3 font-pixel text-[10px]">
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
