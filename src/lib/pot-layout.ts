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
  viewBox: { w: number; h: number };
  field(n: number): FieldShape;
  all(): FieldShape[];
}

const FIELD_COUNT = 54;
const CELL = 10;
const PITCH = 12;
const MARGIN = 8;

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
    const center = { x: g.x * PITCH, y: g.y * PITCH };
    const h = CELL / 2;
    return {
      field,
      center,
      outline: [
        { x: center.x - h, y: center.y - h },
        { x: center.x + h, y: center.y - h },
        { x: center.x + h, y: center.y + h },
        { x: center.x - h, y: center.y + h },
      ],
    };
  });
  const maxAbs =
    Math.max(...shapes.flatMap((s) => s.outline.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]))) +
    MARGIN;
  return {
    id: "spiral",
    fieldCount: FIELD_COUNT,
    viewBox: { w: maxAbs * 2, h: maxAbs * 2 },
    field(n: number): FieldShape {
      const shape = shapes[n];
      if (!shape) throw new RangeError(`no field ${n}`);
      return shape;
    },
    all: () => shapes,
  };
}

export const spiralLayout: PotLayout = buildSpiralLayout();
