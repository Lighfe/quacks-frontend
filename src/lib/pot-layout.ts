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
export const SPIRAL_PITCH = 12;
export const SPIRAL_MARGIN = 4;

// Square snake spiral: field 0 in the centre, then counter-clockwise outwards
// (east, north, west, south in screen coordinates) with segment lengths
// 1, 1, 2, 2, 3, 3, ...
function spiralGridPositions(count: number): Point[] {
  const positions: Point[] = [{ x: 0, y: 0 }];
  const dirs: Point[] = [
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
  ];
  let x = 0;
  let y = 0;
  let dirIndex = 0;
  let segment = 1;
  while (positions.length < count) {
    for (let rep = 0; rep < 2 && positions.length < count; rep++) {
      const dir = dirs[dirIndex % 4] ?? { x: 1, y: 0 };
      for (let i = 0; i < segment && positions.length < count; i++) {
        x += dir.x;
        y += dir.y;
        positions.push({ x, y });
      }
      dirIndex++;
    }
    segment++;
  }
  return positions;
}

function buildSpiralLayout(): PotLayout {
  const grid = spiralGridPositions(FIELD_COUNT);
  const shapes: FieldShape[] = grid.map((g, field) => {
    const center = { x: g.x * SPIRAL_PITCH, y: g.y * SPIRAL_PITCH };
    const h = CELL / 2;
    return {
      field,
      center,
      outline: [
        { x: center.x - h + 1, y: center.y - h },
        { x: center.x + h - 1, y: center.y - h },
        { x: center.x + h - 1, y: center.y - h + 1 },
        { x: center.x + h, y: center.y - h + 1 },
        { x: center.x + h, y: center.y + h - 1 },
        { x: center.x + h - 1, y: center.y + h - 1 },
        { x: center.x + h - 1, y: center.y + h },
        { x: center.x - h + 1, y: center.y + h },
        { x: center.x - h + 1, y: center.y + h - 1 },
        { x: center.x - h, y: center.y + h - 1 },
        { x: center.x - h, y: center.y - h + 1 },
        { x: center.x - h + 1, y: center.y - h + 1 },
      ],
    };
  });
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
