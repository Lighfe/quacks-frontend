import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  IllegalActionError,
  StaleRevisionError,
  backendFromSearch,
  getView,
  sendAction,
  type View,
} from "@/lib/game-api";
import { decideHotSeat, isLegal, newerView } from "@/lib/brew-view";
import { BrewScreen } from "./BrewScreen";
import { EndScreen } from "./EndScreen";
import { PhaseScreen } from "./PhaseScreen";
import { PixelFrame } from "./PixelFrame";

const KEY_ACTIONS: Record<string, string> = {
  d: "draw",
  s: "stop",
  f: "use_flask",
  u: "use_card_17",
};

export function GameScreen({
  seat,
  game,
  api,
  onNewGame,
}: {
  seat: string;
  game: string;
  api: string;
  onNewGame: () => void;
}) {
  const backend = useMemo(() => backendFromSearch({ game, api }), [game, api]);
  const [hotSeat, setHotSeat] = useState<string | null>(null);
  const shownSeat = seat || hotSeat || "p1";
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["view", backend.kind, backend.game, backend.baseUrl, shownSeat] as const,
    [backend, shownSeat],
  );

  const viewQuery = useQuery({
    queryKey,
    // Revision guard: a GET that resolves late never replaces a newer view.
    queryFn: async () =>
      newerView(queryClient.getQueryData<View>(queryKey), await getView(backend, shownSeat)),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const v = query.state.data as View | undefined;
      if (!v) return 500;
      if (v.game.phase === "game_over") return false;
      return v.to_act.includes(shownSeat) ? false : 500;
    },
  });
  const view = viewQuery.data;

  // Hot seat: newest revision seen across all seats; a cached view of the
  // shown seat that is older is stale (controls off) until refetched.
  const latestRevision = useRef(-1);
  const lastSwitchRevision = useRef(-1);
  if (view && view.game.revision > latestRevision.current) {
    latestRevision.current = view.game.revision;
  }
  const staleView = !seat && !!view && view.game.revision < latestRevision.current;
  useEffect(() => {
    if (seat || !view) return;
    const { seat: target, stale } = decideHotSeat(
      view,
      shownSeat,
      latestRevision.current,
      lastSwitchRevision.current,
    );
    if (stale) {
      void viewQuery.refetch();
      return;
    }
    if (target !== shownSeat) {
      lastSwitchRevision.current = view.game.revision;
      setHotSeat(target);
    }
  }, [seat, view, shownSeat]);

  const [notice, setNotice] = useState<string | null>(null);
  // Synchronous guard: a second click before re-render must not send.
  const pendingRef = useRef(false);
  const actionMutation = useMutation({
    mutationFn: async ({ action, revision }: { action: string; revision: number }) => {
      await queryClient.cancelQueries({ queryKey });
      return sendAction(backend, shownSeat, action, revision);
    },
    onSuccess: (next) => {
      setNotice(null);
      queryClient.setQueryData<View>(queryKey, (old) => newerView(old, next));
    },
    onError: (err) => {
      if (err instanceof StaleRevisionError) {
        setNotice("Out of date: view refreshed. Choose again.");
        void viewQuery.refetch();
        return;
      }
      if (err instanceof IllegalActionError) {
        setNotice("That action is not allowed right now.");
        queryClient.setQueryData<View>(queryKey, (old) =>
          old ? { ...old, legal: err.legal } : old,
        );
        return;
      }
      setNotice("The action could not be sent.");
    },
    onSettled: () => {
      pendingRef.current = false;
    },
  });
  const pending = actionMutation.isPending || staleView;
  const act = (id: string) => {
    if (pendingRef.current || staleView || !view || !isLegal(view.legal, id)) return;
    pendingRef.current = true;
    actionMutation.mutate({ action: id, revision: view.game.revision });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      const action = KEY_ACTIONS[e.key.toLowerCase()];
      if (action && view?.game.phase === "brew") act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (viewQuery.isError && !view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <PixelFrame>
          <p className="text-destructive">The game service is not reachable.</p>
          <p className="mt-2 text-muted-foreground">
            Start the local service or check the api address.
          </p>
        </PixelFrame>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <span className="font-pixel text-xs text-muted-foreground">Loading…</span>
      </main>
    );
  }
  const phase = view.game.phase;
  if (phase === "game_over") return <EndScreen view={view} onNewGame={onNewGame} />;
  if (phase === "brew") {
    return <BrewScreen view={view} onAction={act} pending={pending} error={notice} />;
  }
  return (
    <PhaseScreen
      view={view}
      shownSeat={shownSeat}
      onAction={act}
      pending={pending}
      error={notice}
    />
  );
}
