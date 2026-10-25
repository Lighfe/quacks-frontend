# Brew screen plan (revised)

The app only shows the view the service sends and posts back the chosen `legal` action. It holds no game logic, no Lovable Cloud and no game state of its own.

## Components

```text
BrewScreen (route "/", polls/loads view for `seat`)
├─ RoundHeader        round/rounds, phase, round card (title + number), explosion_limit
├─ PlayerPanel (you)
│   ├─ Pot  mode="own"   (window lit, rest dark)
│   ├─ WhiteMeter        white_total vs game.explosion_limit
│   ├─ Stats             points, money, rubies, droplet, rat_tail, flask_full
│   └─ Bag               coloured dots with values, from bag counts
├─ HandPicker          blue hand as selectable Chip buttons (only when `hand` is present)
├─ ActionBar           Draw / Stop / Use flask / Card 17 + keys d/s/f/u,
│                      plus a plain labelled button for every other `legal` action
├─ OpponentPanel[]     one per other seat in `seats` (list, any length): small Pot mode="other"
│                      + status/points; click opens EnlargedPot dialog (still no window)
└─ LogPanel            text log
```

Shared pieces: `Chip` (colour token + value, pixel glow), `PixelFrame` (pixel border box).
A button is enabled only if its action id is in `legal`; labels come from `legal`.

## Pot layout module (geometry only)

```ts
type Point = { x: number; y: number };
type FieldShape = { field: number; center: Point; outline: Point[] }; // polygon in layout units
interface PotLayout {
  id: string;                    // "spiral" now, "voronoi" later
  fieldCount: number;            // 54
  viewBox: { w: number; h: number };
  field(n: number): FieldShape;
  all(): FieldShape[];
}
export const spiralLayout: PotLayout;
```

- Square snake spiral, field 0 in the centre, counter-clockwise outward, on a pixel grid.
- No landing logic, no money/points/ruby values. Those come from `pot[].from/landing` and `window`.
- `Pot` renders an SVG: it draws every outline, fills `from..landing` in the chip colour, outlines the landing field and prints the value there. In "own" mode it lights the `window` fields and labels them with money/points/ruby, and greys out the rest. Changing the layout means swapping the `layout` prop.

## Data module (single file, `src/lib/game-api.ts`)

```ts
getView(seat: string): Promise<View>
sendAction(seat: string, action: string, revision: number): Promise<View>
```

- `View` types mirror the service fields: game, you, to_act, seats[], window, chips, legal, hand, log.
- Backend picked by config: `mock` (built-in sample views by scenario: brewing, blue hand, after white with flask, exploded, other phase) or `http` (base URL, default http://localhost:8000).
- The mock does not run any rules. It returns canned views, and `sendAction` just steps to the next canned view.
- Wrapped in TanStack Query. A stale revision error triggers a refetch.

## Other seats

`OpponentPanel` uses the same `Pot` with `mode="other"`. That mode skips the window entirely: all empty fields are dark and only the placed chips are drawn. The enlarged dialog renders the same component bigger, still in "other" mode.

## Animations (pixel style)

- Chip drop: when a new pot entry appears (diffed against the previous view by index), the chip sprite falls in stepped frames (CSS `steps()`, about 6 frames) onto the landing field. The `from..landing` fills then light up one field per frame. A short 2-frame squash marks the landing.
- Explosion: when a seat's status changes to exploded, 8x8 pixel smoke puffs (dark/purple tokens) rise from the pot centre on stepped keyframes, the pot shakes in a 2px stepped jitter and then dims.
- Everything uses tokens from styles.css. Animations are off when the user has reduced motion turned on.

## Open questions (blocking)

1. Seat ids: are they strings or indices, and how does the browser know its own seat (URL param `?seat=`)?
2. Exact JSON shapes and an example payload. Specifically: `window` per field (field, money, points, ruby?); bag counts (per colour+value or per chip id?); `chips` contents; `hand` entries and the action ids for picking a hand chip / putting all back; the round card fields.
3. Fixed action ids for Draw, Stop, Use flask, Card 17, so they can map to keys d/s/f/u?
4. Updates: should the app poll `getView` (and at what interval), or will the service push changes (websocket/SSE)? The other player acts at the same time.
5. Error format for a stale revision or an illegal action.
6. Does a `pot` entry have a stable id or order, so a newly drawn chip can be spotted for the animation?
