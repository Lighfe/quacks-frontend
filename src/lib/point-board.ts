// Pure display helpers for the point board; all board values come from the view.
export interface Board {
  fields: number;
  laps: number;
  rat_tails: number[];
}

export function markerTile(points: number, board: Board): number {
  if (points >= board.fields * board.laps) return board.fields - 1;
  return ((points % board.fields) + board.fields) % board.fields;
}

export function lapMarker(points: number, board: Board): number {
  const lap = board.fields * Math.floor(Math.max(0, points) / board.fields);
  return Math.min(lap, board.fields * (board.laps - 1));
}

export function flameState(i: number, round: number): "lit" | "burnt" | "unlit" {
  return i === round ? "lit" : i < round ? "burnt" : "unlit";
}

// Tiles run clockwise around the edge of an n x n grid, starting top-left.
export function frameCells(fields: number): { n: number; cells: { col: number; row: number }[] } {
  const n = Math.max(3, Math.ceil(fields / 4) + 1);
  const ring: { col: number; row: number }[] = [];
  for (let c = 0; c < n - 1; c++) ring.push({ col: c, row: 0 });
  for (let r = 0; r < n - 1; r++) ring.push({ col: n - 1, row: r });
  for (let c = n - 1; c > 0; c--) ring.push({ col: c, row: n - 1 });
  for (let r = n - 1; r > 0; r--) ring.push({ col: 0, row: r });
  return { n, cells: ring.slice(0, fields) };
}
