import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quacks" },
      { name: "description", content: "Quacks – brew your potion, one chip at a time." },
      { property: "og:title", content: "Quacks" },
      { property: "og:description", content: "Quacks – brew your potion, one chip at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const chips = ["white", "orange", "green", "blue", "red", "black", "yellow", "purple"] as const;
const chipClass: Record<(typeof chips)[number], string> = {
  white: "bg-chip-white",
  orange: "bg-chip-orange",
  green: "bg-chip-green",
  blue: "bg-chip-blue",
  red: "bg-chip-red",
  black: "bg-chip-black",
  yellow: "bg-chip-yellow",
  purple: "bg-chip-purple",
};

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-4">
      <h1 className="text-5xl text-accent text-pixel-shadow md:text-7xl">Quacks</h1>
      <div className="flex gap-3">
        {chips.map((c) => (
          <span key={c} title={c} className={`h-6 w-6 pixel-border ${chipClass[c]}`} />
        ))}
      </div>
    </main>
  );
}
