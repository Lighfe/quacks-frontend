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
export const SPIRAL_STEP = 12;
export const SPIRAL_TURN_PITCH = 19;
export const SPIRAL_MARGIN = 4;

// Equal arc-length samples of r = b * theta. Rotate the first step east;
// increasing theta winds counter-clockwise in screen coordinates.
function spiralPositions(count: number): Point[] {
  const b = SPIRAL_TURN_PITCH / (2 * Math.PI);
  const arcLength = (theta: number) =>
    (b / 2) * (theta * Math.sqrt(1 + theta * theta) + Math.asinh(theta));
  const angles = Array.from({ length: count }, (_, field) => {
    if (field === 0) return 0;
    const target = field * SPIRAL_STEP;
    let low = 0;
    let high = Math.sqrt((2 * target) / b) + 1;
    for (let iteration = 0; iteration < 60; iteration++) {
      const mid = (low + high) / 2;
      if (arcLength(mid) < target) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  });
  const rotation = angles[1] ?? 0;
  return angles.map((theta, field) => {
    if (field === 0) return { x: 0, y: 0 };
    const radius = b * theta;
    return {
      x: radius * Math.cos(theta - rotation),
      y: field === 1 ? 0 : -radius * Math.sin(theta - rotation),
    };
  });
}

function buildSpiralLayout(): PotLayout {
  const positions = spiralPositions(FIELD_COUNT);
  const shapes: FieldShape[] = positions.map((center, field) => {
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
