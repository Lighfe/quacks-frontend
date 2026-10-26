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

// Field 0 is the centre. Fields 1 onward sample r = 12 + b * theta
// at equal arc lengths, winding counter-clockwise in screen coordinates.
function spiralPositions(count: number): Point[] {
  const b = SPIRAL_TURN_PITCH / (2 * Math.PI);
  const innerRadius = 12;
  const primitive = (u: number) =>
    (b / 2) * (u * Math.sqrt(1 + u * u) + Math.asinh(u));
  const initialArc = primitive(innerRadius / b);
  const arcLength = (theta: number) => primitive(theta + innerRadius / b) - initialArc;
  const angles = Array.from({ length: count }, (_, field) => {
    if (field <= 1) return 0;
    const target = (field - 1) * SPIRAL_STEP;
    let low = 0;
    let high = Math.sqrt((2 * target) / b) + 1;
    for (let iteration = 0; iteration < 60; iteration++) {
      const mid = (low + high) / 2;
      if (arcLength(mid) < target) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  });
  return angles.map((theta, field) => {
    if (field === 0) return { x: 0, y: 0 };
    if (field === 1) return { x: innerRadius, y: 0 };
    const radius = innerRadius + b * theta;
    return {
      x: radius * Math.cos(theta),
      y: -radius * Math.sin(theta),
    };
  });
}

function buildSpiralLayout(): PotLayout {
  const positions = spiralPositions(FIELD_COUNT);
  const shapes: FieldShape[] = positions.map((center, field) => {
    const h = CELL / 2;
    const previous = positions[field - 1] ?? center;
    const next = positions[field + 1] ?? center;
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      field,
      center,
      outline: [
        { x: -h + 1, y: -h },
        { x: h - 1, y: -h },
        { x: h - 1, y: -h + 1 },
        { x: h, y: -h + 1 },
        { x: h, y: h - 1 },
        { x: h - 1, y: h - 1 },
        { x: h - 1, y: h },
        { x: -h + 1, y: h },
        { x: -h + 1, y: h - 1 },
        { x: -h, y: h - 1 },
        { x: -h, y: -h + 1 },
        { x: -h + 1, y: -h + 1 },
      ].map(({ x, y }) => ({
        x: center.x + x * cos - y * sin,
        y: center.y + x * sin + y * cos,
      })),
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
