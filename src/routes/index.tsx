import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { GameScreen } from "@/components/brew/GameScreen";
import { StartScreen } from "@/components/brew/StartScreen";

function str(v: unknown): string | undefined {
  const s = typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
  return s || undefined;
}

interface IndexSearch {
  seat?: string | undefined;
  game?: string | undefined;
  api?: string | undefined;
  mock?: boolean | "playtest" | undefined;
  seed?: number | undefined;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    const seedRaw = search["seed"];
    const seedNum = typeof seedRaw === "number" ? seedRaw : Number(seedRaw);
    return {
      seat: str(search["seat"]),
      game: str(search["game"]),
      api: str(search["api"]),
      mock: search["mock"] === "playtest" ? "playtest" : str(search["mock"]) === "1" || search["mock"] === true ? true : undefined,
      seed:
        seedRaw !== undefined && seedRaw !== "" && Number.isFinite(seedNum) ? seedNum : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Quacks" },
      { name: "description", content: "Quacks: pot, ingredients, rounds and points." },
      { property: "og:title", content: "Quacks" },
      { property: "og:description", content: "Quacks: pot, ingredients, rounds and points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { seat = "", game = "", api = "", mock, seed } = Route.useSearch();
  const navigate = useNavigate();
  const toStart = () => void navigate({ to: "/", search: api ? { api } : {} });
  if (game || mock) {
    return <GameScreen key={`${game}-${mock}`} seat={seat} game={game} api={api} mock={mock} onNewGame={toStart} />;
  }
  return (
    <StartScreen
      api={api}
      seed={seed}
      onStarted={(search) => void navigate({ to: "/", search })}
    />
  );
}
