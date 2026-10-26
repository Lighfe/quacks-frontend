import { createFileRoute } from "@tanstack/react-router";

import { BrewScreen } from "@/components/brew/BrewScreen";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    seat: typeof search.seat === "string" ? search.seat : "",
    game: typeof search.game === "string" ? search.game : "",
    api: typeof search.api === "string" ? search.api : "",
  }),
  head: () => ({
    meta: [
      { title: "Quacks" },
      { name: "description", content: "Quacks brew screen: pot, bag, hand and actions." },
      { property: "og:title", content: "Quacks" },
      { property: "og:description", content: "Quacks brew screen: pot, bag, hand and actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { seat, game, api } = Route.useSearch();
  return <BrewScreen seat={seat} game={game} api={api} />;
}
