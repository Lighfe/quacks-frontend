<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Theme tokens (palette, chip colors, pixel-border utilities, fonts) live only in src/styles.css; components use semantic classes like bg-chip-red, never raw colors — keeps the pixel look consistent.
- All access to the game service goes through src/lib/game-api.ts (getView/sendAction); components never fetch game data directly — the service is the only source of game state.
- Pot geometry lives only in src/lib/pot-layout.ts behind the PotLayout interface (spiralLayout now, Voronoi later); no other module computes field positions — the layout must stay swappable.
- The app contains no game rules: landings, scores, limits and legal actions always come from the service view; the UI only renders them.
- View fetching and action sending live only in src/components/brew/GameScreen.tsx (revision guard via newerView, one action in flight, controls disabled while pending); phase screens are presentational — keeps the stale-view/409 fixes in one place.
