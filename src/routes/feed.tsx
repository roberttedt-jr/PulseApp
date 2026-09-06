import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Bell, PenLine, Search, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { CompareCtaCard } from "@/components/pulse/compare";
import { PostCard, TextComposerSheet } from "@/components/pulse/social";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { getBootstrap } from "@/lib/pulse/fns";
import { getActivityFeed, getDiscoverFeed } from "@/lib/pulse/social-fns";

export const Route = createFileRoute("/feed")({ component: FeedLayout });

function FeedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/feed/") && pathname !== "/feed/") {
    return <Outlet />;
  }
  return <ActivityPage />;
}

function ActivityPage() {
  const [tab, setTab] = useState<"following" | "foryou">("following");
  const [composer, setComposer] = useState(false);
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = bootstrap.data?.profile.units ?? "metric";
  const feed = useInfiniteQuery({
    queryKey: ["activity-feed"],
    queryFn: ({ pageParam }) => getActivityFeed({ data: { cursor: pageParam } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const discover = useInfiniteQuery({
    queryKey: ["discover-feed"],
    queryFn: ({ pageParam }) => getDiscoverFeed({ data: { cursor: pageParam } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const discoverItems = discover.data?.pages.flatMap((p) => p.items) ?? [];
  const meta = feed.data?.pages[0];
  const pending = meta?.pendingIncoming ?? 0;
  const active = tab === "foryou" ? discover : feed;
  const activeItems = tab === "foryou" ? discoverItems : items;

  return (
    <AppPage
      title="Actividad"
      action={
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Publicar" onClick={() => setComposer(true)}>
            <PenLine className="size-5" />
          </Button>
          <Button asChild size="icon" variant="ghost" aria-label="Solicitudes">
            <Link to="/feed/requests" className="relative">
              <Bell className="size-5" />
              {pending > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
            </Link>
          </Button>
          <Button asChild size="icon" variant="ghost" aria-label="Buscar personas">
            <Link to="/feed/search">
              <Search className="size-5" />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <Segmented
          ariaLabel="Tipo de feed"
          className="flex w-full"
          value={tab}
          options={[
            { value: "following", label: "Siguiendo" },
            { value: "foryou", label: "Para ti" },
          ]}
          onChange={setTab}
        />

        <button
          type="button"
          onClick={() => setComposer(true)}
          className="flex w-full items-center gap-3 rounded-[22px] bg-card px-4 py-3 text-left hairline pressable"
        >
          <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
            <PenLine className="size-4" />
          </span>
          <span className="text-sm text-muted-foreground">¿Qué quieres compartir?</span>
        </button>

        <CompareCtaCard />

        {meta && !meta.username && (
          <Link to="/settings" hash="perfil-social" className="block rounded-[22px] bg-card p-4 text-sm hairline">
            <p className="font-medium">Elige tu @usuario</p>
            <p className="mt-1 text-muted-foreground">Así tus amigos pueden encontrarte en Pulse.</p>
          </Link>
        )}

        {active.isPending ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando actividad">
            <Skeleton className="h-36 w-full rounded-[22px]" />
            <Skeleton className="h-36 w-full rounded-[22px]" />
          </div>
        ) : active.isError ? (
          <EmptyState
            icon={Users}
            title="No se ha podido cargar la actividad."
            hint={(active.error as Error).message || "Comprueba la conexión e inténtalo de nuevo."}
            action={<Button onClick={() => void active.refetch()}>Reintentar</Button>}
          />
        ) : tab === "foryou" && activeItems.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="La comunidad está empezando."
            hint="Comparte tu primer entrenamiento o descubre a otros atletas."
            action={
              <>
                <Button asChild>
                  <Link to="/feed/search">Buscar personas</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/routines">Compartir entrenamiento</Link>
                </Button>
              </>
            }
          />
        ) : tab === "following" && activeItems.length === 0 ? (
          (meta?.followingCount ?? 0) === 0 ? (
            <EmptyState
              icon={Users}
              title="Aún no sigues a nadie."
              hint="Sigue a tus amigos para ver sus entrenamientos aquí."
              action={
                <Button asChild>
                  <Link to="/feed/search">Buscar personas</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Tus amigos todavía no han compartido entrenamientos."
              hint="Cuando lo hagan, aparecerán aquí. Tú también puedes compartir al terminar una sesión."
            />
          )
        ) : (
          <div className="space-y-3">
            {activeItems.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                units={units}
                onChanged={() => {
                  void feed.refetch();
                  void discover.refetch();
                }}
              />
            ))}
            {active.hasNextPage && (
              <Button
                variant="secondary"
                className="w-full"
                loading={active.isFetchingNextPage}
                onClick={() => void active.fetchNextPage()}
              >
                Ver más
              </Button>
            )}
          </div>
        )}
      </div>
      <TextComposerSheet open={composer} onOpenChange={setComposer} />
    </AppPage>
  );
}
