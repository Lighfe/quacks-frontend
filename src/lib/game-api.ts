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

export interface View {
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
}

export const DEFAULT_API_BASE = "http://localhost:8000";

export function backendFromSearch(search: { game?: string; api?: string }): BackendConfig {
  const game = search.game ?? "";
  if (game) {
    const baseUrl = search.api || import.meta.env["VITE_QUACKS_API"] || DEFAULT_API_BASE;
    return { kind: "http", game, baseUrl };
  }
  return { kind: "mock", game: "", baseUrl: "" };
}

export function getView(backend: BackendConfig, seat: string): Promise<View> {
  if (backend.kind === "mock") return mockGetView(seat);
  return httpGetView(backend, seat);
}

export function sendAction(
  backend: BackendConfig,
  seat: string,
  action: string,
  revision: number,
): Promise<View> {
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
    { order: 1, chip: "orange_1", colour: "orange", value: 1, from: 6, landing: 6 },
    { order: 2, chip: "white_2", colour: "white", value: 2, from: 7, landing: 8 },
    { order: 3, chip: "green_1", colour: "green", value: 1, from: 9, landing: 9 },
  ];
  if (step >= 1)
    pot.push({ order: 4, chip: "white_3", colour: "white", value: 3, from: 10, landing: 12 });
  if (step >= 2)
    pot.push({ order: 5, chip: "blue_2", colour: "blue", value: 2, from: 13, landing: 14 });
  if (step >= 3)
    pot.push({ order: 6, chip: "white_3", colour: "white", value: 3, from: 15, landing: 17 });
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
    start_field: 5,
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
    droplet: 1,
    start_field: 3,
    rat_tail: 0,
    bag: { white_1: 4, white_2: 2, orange_1: 3, blue_1: 1, purple_1: 1 },
    pot: [
      { order: 1, chip: "orange_1", colour: "orange", value: 1, from: 4, landing: 4 },
      { order: 2, chip: "blue_1", colour: "blue", value: 1, from: 5, landing: 5 },
      { order: 3, chip: "white_3", colour: "white", value: 3, from: 6, landing: 8 },
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
  const scoringField = you === "p1" ? ([10, 13, 15, 18][step] ?? 10) : 9;
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
