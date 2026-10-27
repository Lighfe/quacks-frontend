// The ONLY module that talks to the game service. The app renders what the
// service sends and posts back the chosen legal action; no game rules live here.

export type ChipColour =
  | "white"
  | "orange"
  | "green"
  | "blue"
  | "red"
  | "black"
  | "yellow"
  | "purple";

export interface ChipType {
  id: string;
  colour: ChipColour;
  value: number;
}

export interface PotEntry {
  order: number;
  chip: string;
  colour: ChipColour;
  value: number;
  from: number;
  landing: number;
}

export interface Seat {
  id: string;
  kind: string;
  status: string;
  points: number;
  money: number;
  rubies: number;
  flask_full: boolean;
  white_total: number;
  droplet: number;
  start_field: number;
  rat_tail: number;
  bag: Record<string, number>;
  pot: PotEntry[];
}

export interface RoundCard {
  id: number;
  effect: string;
  text: string;
}

export interface GameInfo {
  round: number;
  rounds: number;
  phase: string;
  revision: number;
  explosion_limit: number;
  card: RoundCard | null;
  winner: string | null;
}

export interface WindowField {
  field: number;
  money: number;
  points: number;
  ruby: boolean;
}

export interface LegalAction {
  id: string;
  label: string;
}

export interface GameLog {
  lines: string[];
  events: Record<string, unknown>[];
}

export interface IngredientChip {
  chip: string;
  value: number;
  price: number | null;
  min_round: number | null;
  available: boolean;
}

export interface Ingredient {
  colour: ChipColour;
  effect: string;
  chips: IngredientChip[];
}

export interface View {
  ingredients?: Ingredient[];
  game: GameInfo;
  you: string;
  to_act: string[];
  seats: Seat[];
  window: WindowField[];
  chips: ChipType[];
  legal: LegalAction[];
  hand: string[];
  card_draw: string[] | null;
  log: GameLog;
}

export class IllegalActionError extends Error {
  legal: LegalAction[];
  constructor(legal: LegalAction[]) {
    super("illegal_action");
    this.name = "IllegalActionError";
    this.legal = legal;
  }
}

export class StaleRevisionError extends Error {
  revision: number;
  constructor(revision: number) {
    super("stale_revision");
    this.name = "StaleRevisionError";
    this.revision = revision;
  }
}

export interface BackendConfig {
  kind: "mock" | "http";
  game: string;
  baseUrl: string;
  mock?: StaticMock;
}

export const STATIC_MOCKS = ["playtest", "playtest-zero", "playtest-small-bag", "shop", "ruby"] as const;
export type StaticMock = (typeof STATIC_MOCKS)[number];

export const DEFAULT_API_BASE = "http://localhost:8000";

export function resolveApiBase(api?: string): string {
  return api || import.meta.env["VITE_QUACKS_API"] || DEFAULT_API_BASE;
}

export function backendFromSearch(search: { game?: string; api?: string; mock?: boolean | StaticMock | undefined }): BackendConfig {
  const game = search.game ?? "";
  if (game) return { kind: "http", game, baseUrl: resolveApiBase(search.api) };
  if (typeof search.mock === "string" && (STATIC_MOCKS as readonly string[]).includes(search.mock)) {
    return { kind: "mock", game: "", baseUrl: "", mock: search.mock };
  }
  return { kind: "mock", game: "", baseUrl: "" };
}

export interface CreateGameBody {
  p1: string;
  p2: string;
  rounds: number;
  seed?: number;
}

export class CreateGameError extends Error {
  baseUrl: string;
  status: number | undefined;
  detail: string | undefined;
  constructor(baseUrl: string, status?: number, detail?: string) {
    super(status === undefined ? "create failed: not reachable" : `create failed: HTTP ${status}`);
    this.name = "CreateGameError";
    this.baseUrl = baseUrl;
    this.status = status;
    this.detail = detail;
  }
}

export function formatCreateGameError(err: unknown): string {
  if (!(err instanceof CreateGameError)) return "The game could not be started.";
  if (err.status === undefined) return `Service at ${err.baseUrl} is not reachable.`;
  const base = `Service at ${err.baseUrl} answered HTTP ${err.status}`;
  return err.detail ? `${base}: ${err.detail}` : `${base}.`;
}

export async function createGame(baseUrl: string, body: CreateGameBody): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CreateGameError(baseUrl);
  }
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const data = (await res.json()) as { detail?: unknown } | null;
      if (data && typeof data.detail === "string") detail = data.detail;
    } catch {
      detail = undefined;
    }
    throw new CreateGameError(baseUrl, res.status, detail);
  }
  const data = (await res.json()) as { game_id?: unknown };
  if (typeof data.game_id !== "string" && typeof data.game_id !== "number") {
    throw new CreateGameError(baseUrl, res.status, "no game_id");
  }
  return String(data.game_id);
}

export function getView(backend: BackendConfig, seat: string): Promise<View> {
  if (backend.kind === "mock" && backend.mock === "shop") return Promise.resolve(shopView);
  if (backend.kind === "mock" && backend.mock === "ruby") return Promise.resolve(rubyView);
  if (backend.kind === "mock" && backend.mock === "playtest") return Promise.resolve(playtestView);
  if (backend.kind === "mock" && backend.mock === "playtest-zero") return Promise.resolve(playtestZeroView);
  if (backend.kind === "mock" && backend.mock === "playtest-small-bag") return Promise.resolve(playtestSmallBagView);
  if (backend.kind === "mock") return mockGetView(seat);
  return httpGetView(backend, seat);
}

export function sendAction(
  backend: BackendConfig,
  seat: string,
  action: string,
  revision: number,
): Promise<View> {
  if (backend.kind === "mock" && backend.mock === "shop") return Promise.resolve(shopView);
  if (backend.kind === "mock" && backend.mock === "ruby") return Promise.resolve(rubyView);
  if (backend.kind === "mock" && backend.mock === "playtest") return Promise.resolve(playtestView);
  if (backend.kind === "mock" && backend.mock === "playtest-zero") return Promise.resolve(playtestZeroView);
  if (backend.kind === "mock" && backend.mock === "playtest-small-bag") return Promise.resolve(playtestSmallBagView);
  if (backend.kind === "mock") return mockSendAction(seat, action, revision);
  return httpSendAction(backend, seat, action, revision);
}

async function httpGetView(backend: BackendConfig, seat: string): Promise<View> {
  const res = await fetch(
    `${backend.baseUrl}/games/${encodeURIComponent(backend.game)}/view?seat=${encodeURIComponent(seat)}`,
  );
  if (!res.ok) throw new Error(`view failed: HTTP ${res.status}`);
  return (await res.json()) as View;
}

async function httpSendAction(
  backend: BackendConfig,
  seat: string,
  action: string,
  revision: number,
): Promise<View> {
  const res = await fetch(`${backend.baseUrl}/games/${encodeURIComponent(backend.game)}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seat, action, revision }),
  });
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    if (body?.error === "illegal_action") throw new IllegalActionError(body.legal ?? []);
  }
  if (res.status === 409) {
    const body = await res.json().catch(() => null);
    throw new StaleRevisionError(typeof body?.revision === "number" ? body.revision : -1);
  }
  if (!res.ok) throw new Error(`action failed: HTTP ${res.status}`);
  return (await res.json()) as View;
}

// ---------------------------------------------------------------------------
// Mock backend: canned views only. No rules; sendAction steps to the next
// canned view. Scenarios: brewing, after a white chip with the flask offered,
// blue hand, exploded.
// ---------------------------------------------------------------------------

const CHIPS: ChipType[] = [
  { id: "white_1", colour: "white", value: 1 },
  { id: "white_2", colour: "white", value: 2 },
  { id: "white_3", colour: "white", value: 3 },
  { id: "orange_1", colour: "orange", value: 1 },
  { id: "orange_6", colour: "orange", value: 6 },
  { id: "green_1", colour: "green", value: 1 },
  { id: "green_2", colour: "green", value: 2 },
  { id: "green_4", colour: "green", value: 4 },
  { id: "blue_1", colour: "blue", value: 1 },
  { id: "blue_2", colour: "blue", value: 2 },
  { id: "blue_4", colour: "blue", value: 4 },
  { id: "red_1", colour: "red", value: 1 },
  { id: "red_2", colour: "red", value: 2 },
  { id: "red_4", colour: "red", value: 4 },
  { id: "black_1", colour: "black", value: 1 },
  { id: "yellow_1", colour: "yellow", value: 1 },
  { id: "yellow_2", colour: "yellow", value: 2 },
  { id: "yellow_4", colour: "yellow", value: 4 },
  { id: "purple_1", colour: "purple", value: 1 },
];

interface MockState {
  step: number;
  revision: number;
}

const mockState: MockState = { step: 0, revision: 12 };

function mockWindow(scoringField: number): WindowField[] {
  return Array.from({ length: 11 }, (_, i) => ({
    field: scoringField + i,
    money: (i % 3) + 1,
    points: i,
    ruby: i === 4 || i === 8,
  }));
}

function mockP1Pot(step: number): PotEntry[] {
  const pot: PotEntry[] = [
    { order: 1, chip: "orange_1", colour: "orange", value: 1, from: 2, landing: 2 },
    { order: 2, chip: "white_2", colour: "white", value: 2, from: 3, landing: 4 },
    { order: 3, chip: "green_1", colour: "green", value: 1, from: 5, landing: 5 },
  ];
  if (step >= 1)
    pot.push({ order: 4, chip: "white_3", colour: "white", value: 3, from: 6, landing: 8 });
  if (step >= 2)
    pot.push({ order: 5, chip: "blue_2", colour: "blue", value: 2, from: 9, landing: 10 });
  if (step >= 3)
    pot.push({ order: 6, chip: "white_3", colour: "white", value: 3, from: 11, landing: 13 });
  return pot;
}

function mockSeatP1(step: number): Seat {
  return {
    id: "p1",
    kind: "human",
    status: step >= 3 ? "exploded" : "brewing",
    points: 14,
    money: 6,
    rubies: 2,
    flask_full: step < 3,
    white_total: [2, 5, 5, 8][step] ?? 0,
    droplet: 0,
    start_field: 1,
    rat_tail: 1,
    bag: {
      white_1: 3,
      white_2: 2,
      white_3: 1,
      orange_1: 2,
      green_1: 1,
      green_2: 1,
      blue_1: 1,
      red_1: 1,
      yellow_1: 1,
    },
    pot: mockP1Pot(step),
  };
}

function mockSeatP2(): Seat {
  return {
    id: "p2",
    kind: "human",
    status: "brewing",
    points: 11,
    money: 4,
    rubies: 1,
    flask_full: true,
    white_total: 3,
    droplet: 2,
    start_field: 2,
    rat_tail: 0,
    bag: { white_1: 4, white_2: 2, orange_1: 3, blue_1: 1, purple_1: 1 },
    pot: [
      { order: 1, chip: "orange_1", colour: "orange", value: 1, from: 3, landing: 3 },
      { order: 2, chip: "blue_1", colour: "blue", value: 1, from: 4, landing: 4 },
      { order: 3, chip: "white_3", colour: "white", value: 3, from: 5, landing: 7 },
    ],
  };
}

function mockLegal(seat: string, step: number): LegalAction[] {
  if (step >= 3) {
    return seat === "p1"
      ? [
          { id: "take_money", label: "Take money" },
          { id: "take_points", label: "Take points" },
        ]
      : [{ id: "wait", label: "Wait" }];
  }
  if (step === 2 && seat === "p1") {
    return [
      { id: "play:0", label: "Play this chip" },
      { id: "play:1", label: "Play this chip" },
      { id: "play:2", label: "Play this chip" },
      { id: "put_back_draw", label: "Put back and draw" },
      { id: "put_back_stop", label: "Put back and stop" },
    ];
  }
  const legal: LegalAction[] = [
    { id: "draw", label: "Draw" },
    { id: "stop", label: "Stop" },
  ];
  if (step === 1 && seat === "p1") legal.push({ id: "use_flask", label: "Use flask" });
  return legal;
}

function mockLog(step: number): GameLog {
  const lines = [
    "Round 3 begins.",
    "p1 draws orange 1.",
    "p1 draws white 2.",
    "p1 draws green 1.",
  ];
  if (step >= 1) lines.push("p1 draws white 3.");
  if (step >= 2) lines.push("p1 draws blue 2 and looks at 3 chips.");
  if (step >= 3) lines.push("p1's potion explodes.");
  return { lines, events: [] };
}

function mockGetView(seat: string): Promise<View> {
  const step = mockState.step;
  const you = seat === "p2" ? "p2" : "p1";
  const scoringField = you === "p1" ? ([6, 9, 11, 14][step] ?? 6) : 8;
  const view: View = {
    game: {
      round: 3,
      rounds: 9,
      phase: "brew",
      revision: mockState.revision,
      explosion_limit: step === 1 ? 9 : 7,
      card:
        step === 1
          ? {
              id: 4,
              effect: "explosion_limit_plus_2",
              text: "The explosion limit is raised by 2 this round.",
            }
          : null,
      winner: null,
    },
    you,
    to_act: step >= 3 ? ["p1"] : ["p1", "p2"],
    seats: [mockSeatP1(step), mockSeatP2()],
    window: mockWindow(scoringField),
    chips: CHIPS,
    legal: mockLegal(you, step),
    hand: step === 2 && you === "p1" ? ["white_1", "green_2", "red_1"] : [],
    card_draw: null,
    log: mockLog(step),
  };
  return Promise.resolve(view);
}

function mockSendAction(seat: string, _action: string, _revision: number): Promise<View> {
  mockState.step = (mockState.step + 1) % 4;
  mockState.revision += 1;
  return mockGetView(seat);
}

// Static fixture, independent of the four-step sequence and its revision.
const playtestView: View = {
  game: { round: 3, rounds: 9, phase: "brewing", revision: 1, explosion_limit: 7, card: null, winner: null },
  you: "p1",
  to_act: ["p1", "p2"],
  seats: [
    {
      id: "p1", kind: "human", status: "brewing", droplet: 3, rat_tail: 2, start_field: 5,
      points: 12, money: 7, rubies: 2, flask_full: true, white_total: 1,
      bag: { white_1: 3, white_2: 2, orange_1: 2, green_1: 1, blue_2: 1, red_1: 1 },
      pot: [
        { order: 1, chip: "white_1", colour: "white", value: 1, from: 6, landing: 6 },
        { order: 2, chip: "orange_1", colour: "orange", value: 1, from: 7, landing: 7 },
        { order: 3, chip: "red_2", colour: "red", value: 2, from: 8, landing: 9 },
        { order: 4, chip: "red_1", colour: "red", value: 1, from: 10, landing: 10 },
        { order: 5, chip: "blue_4", colour: "blue", value: 4, from: 11, landing: 14 },
      ],
    },
    mockSeatP2(),
  ],
  window: [
    { field: 15, money: 7, points: 2, ruby: false },
    { field: 16, money: 8, points: 2, ruby: false },
    { field: 17, money: 8, points: 3, ruby: true },
    { field: 18, money: 9, points: 3, ruby: false },
    { field: 19, money: 9, points: 3, ruby: false },
    { field: 20, money: 10, points: 4, ruby: false },
    { field: 21, money: 10, points: 4, ruby: false },
    { field: 22, money: 11, points: 4, ruby: true },
    { field: 23, money: 11, points: 5, ruby: false },
    { field: 24, money: 12, points: 5, ruby: false },
    { field: 25, money: 12, points: 5, ruby: false },
  ],
  chips: CHIPS,
  legal: [{ id: "draw", label: "Draw" }, { id: "stop", label: "Stop" }],
  hand: [], card_draw: null, log: { lines: [], events: [] },
};

// Same as playtest, but p1 has no droplet or rat tail advance; its pot starts at field 1.
const playtestZeroView: View = {
  ...playtestView,
  seats: playtestView.seats.map((seat) =>
    seat.id === "p1"
      ? {
          ...seat, droplet: 0, rat_tail: 0, start_field: 0,
          pot: seat.pot.map((entry) => ({ ...entry, from: entry.from - 5, landing: entry.landing - 5 })),
        }
      : seat,
  ),
};

// Same as playtest, but p1 has a two-kind bag and p2's bag is empty.
const playtestSmallBagView: View = {
  ...playtestView,
  seats: playtestView.seats.map((seat) =>
    seat.id === "p1"
      ? { ...seat, bag: { white_1: 4, orange_1: 1 } }
      : seat.id === "p2"
        ? { ...seat, bag: {} }
        : seat,
  ),
};

// Static shop / ruby fixtures (round 1).
function ing(colour: ChipColour, effect: string, chips: [number, number | null, number | null][], round: number): Ingredient {
  return {
    colour, effect,
    chips: chips.map(([value, price, min]) => ({
      chip: `${colour}_${value}`, value, price, min_round: min,
      available: price !== null && min !== null && min <= round,
    })),
  };
}
const ROUND1_INGREDIENTS: Ingredient[] = [
  ing("white", "Too many white chips make the pot explode.", [[1, null, null], [2, null, null], [3, null, null]], 1),
  ing("orange", "No effect.", [[1, 3, 1], [6, 18, 1]], 1),
  ing("green", "1 ruby if among the last two chips.", [[1, 4, 1], [2, 8, 1], [4, 14, 1]], 1),
  ing("blue", "Draw chips equal to its value, place one.", [[1, 5, 1], [2, 10, 1], [4, 19, 1]], 1),
  ing("red", "+1 with 1-2 orange chips, +2 with 3+.", [[1, 6, 1], [2, 10, 1], [4, 16, 1]], 1),
  ing("black", "Compare black chips: rubies or droplet.", [[1, 10, 1]], 1),
  ing("yellow", "Sends the white chip before it back.", [[1, 8, 2], [2, 12, 2], [4, 18, 2]], 1),
  ing("purple", "Points, rubies and droplet by count.", [[1, 9, 3]], 1),
];
const shopView: View = {
  ...playtestView,
  game: { ...playtestView.game, round: 1, phase: "shop" },
  to_act: ["p1"],
  legal: [
    { id: "buy:orange_1", label: "buy orange 1" },
    { id: "buy:green_1", label: "buy green 1" },
    { id: "buy:blue_1", label: "buy blue 1" },
    { id: "done", label: "done" },
  ],
  ingredients: ROUND1_INGREDIENTS,
};
const rubyView: View = {
  ...shopView,
  game: { ...shopView.game, phase: "ruby" },
  legal: [
    { id: "ruby_drop", label: "ruby drop: 2 rubies, droplet +1" },
    { id: "refill_flask", label: "refill flask: 2 rubies" },
    { id: "done", label: "done" },
  ],
};
