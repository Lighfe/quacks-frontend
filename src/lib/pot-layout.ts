// Pot geometry ONLY. Maps field number -> centre and outline. No landing
// logic, no scores, no ruby values: those come from the service view.
// Swap spiralLayout for another PotLayout (e.g. Voronoi) to change the shape.

export interface Point {
  x: number;
  y: number;
}

export interface FieldShape {
  field: number;
  center: Point;
  outline: Point[];
}

export interface PotLayout {
  id: string;
  fieldCount: number;
  // Tight bounding box of all field outlines plus a uniform margin.
  viewBox: { x: number; y: number; w: number; h: number };
  field(n: number): FieldShape;
  all(): FieldShape[];
}

const FIELD_COUNT = 54;
const CELL = 10;
const STEP = 12;
export const SPIRAL_MARGIN = 4;

// Axis-aligned square gaps; geometry only, independent of game state.
function fits(candidate: Point, previous: Point, consecutive: boolean): boolean {
  const dx = Math.abs(candidate.x - previous.x);
  const dy = Math.abs(candidate.y - previous.y);
  const faces = dx < CELL || dy < CELL;
  const gap = dx < CELL ? dy - CELL : dx - CELL;
  if (consecutive) return faces && gap === 2;
  if (faces) return (gap >= 3 && gap <= 4) || gap >= 10;
  return dx - CELL >= 2 || dy - CELL >= 2;
}

function spiralPositions(count: number): Point[] {
  const positions: Point[] = [{ x: 0, y: 0 }];
  const directions: Point[] = [
    { x: 1, y: 0 }, { x: 0, y: -1 },
    { x: -1, y: 0 }, { x: 0, y: 1 },
  ];
  for (let turn = 0; positions.length < count; turn++) {
    const direction = directions[turn % directions.length];
    if (!direction) throw new Error("missing spiral direction");
    const runLength = Math.floor(turn / 2) + 1;
    for (let step = 0; step < runLength && positions.length < count; step++) {
      const previous = positions[positions.length - 1];
      if (!previous) throw new Error("missing previous field");
      let next: Point | undefined;
      for (let shift = 0; shift <= 9.5; shift += 0.5) {
        const candidate = {
          x: previous.x + STEP * direction.x - shift * direction.y,
          y: previous.y + STEP * direction.y + shift * direction.x,
        };
        if (positions.every((point, index) => fits(candidate, point, index === positions.length - 1))) {
          next = candidate;
          break;
        }
      }
      if (!next) throw new Error("no valid spiral field position");
      positions.push(next);
    }
  }
  return positions;
}

function buildSpiralLayout(): PotLayout {
  const shapes: FieldShape[] = spiralPositions(FIELD_COUNT).map((center, field) => ({
    field,
    center,
    outline: [
      { x: center.x - CELL / 2, y: center.y - CELL / 2 },
      { x: center.x + CELL / 2, y: center.y - CELL / 2 },
      { x: center.x + CELL / 2, y: center.y + CELL / 2 },
      { x: center.x - CELL / 2, y: center.y + CELL / 2 },
    ],
  }));
  const xs = shapes.flatMap((s) => s.outline.map((p) => p.x));
  const ys = shapes.flatMap((s) => s.outline.map((p) => p.y));
  const minX = Math.min(...xs) - SPIRAL_MARGIN;
  const minY = Math.min(...ys) - SPIRAL_MARGIN;
  const maxX = Math.max(...xs) + SPIRAL_MARGIN;
  const maxY = Math.max(...ys) + SPIRAL_MARGIN;
  return {
    id: "spiral",
    fieldCount: FIELD_COUNT,
    viewBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    field(n: number): FieldShape {
      const shape = shapes[n];
      if (!shape) throw new RangeError(`no field ${n}`);
      return shape;
    },
    all: () => shapes,
  };
}

export const spiralLayout: PotLayout = buildSpiralLayout();
