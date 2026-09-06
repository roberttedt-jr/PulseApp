import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Bell, Search, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { PostCard } from "@/components/pulse/social";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { getBootstrap } from "@/lib/pulse/fns";
import { getActivityFeed } from "@/lib/pulse/social-fns";

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
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = bootstrap.data?.profile.units ?? "metric";
  const feed = useInfiniteQuery({
    queryKey: ["activity-feed"],
    queryFn: ({ pageParam }) => getActivityFeed({ data: { cursor: pageParam } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const meta = feed.data?.pages[0];
  const pending = meta?.pendingIncoming ?? 0;

  return (
    <AppPage
      title="Actividad"
      action={
        <div className="flex items-center gap-1">
          <Button asChild size="icon" variant="ghost" aria-label="Solicitudes">
            <Link to="/feed/requests" className="relative">
              <Bell className="size-5" />
              {pending > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
              )}
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

        {meta && !meta.username && (
          <Link
            to="/settings"
            hash="perfil-social"
            className="block rounded-[22px] bg-card p-4 text-sm hairline"
          >
            <p className="font-medium">Elige tu @usuario</p>
            <p className="mt-1 text-muted-foreground">Así tus amigos pueden encontrarte en Pulse.</p>
          </Link>
        )}

        {tab === "foryou" ? (
          <EmptyState
            icon={Sparkles}
            title="Muy pronto podrás descubrir entrenamientos públicos."
            hint="Para ti llegará en una próxima versión. De momento sigue a tus amigos y mira Siguiendo."
          />
        ) : feed.isPending ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando actividad">
            <Skeleton className="h-36 w-full rounded-[22px]" />
            <Skeleton className="h-36 w-full rounded-[22px]" />
          </div>
        ) : feed.isError ? (
          <EmptyState
            icon={Users}
            title="No se ha podido cargar la actividad."
            hint={(feed.error as Error).message || "Comprueba la conexión e inténtalo de nuevo."}
            action={
              <Button onClick={() => void feed.refetch()}>Reintentar</Button>
            }
          />
        ) : items.length === 0 ? (
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
            {items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                units={units}
                onChanged={() => void feed.refetch()}
              />
            ))}
            {feed.hasNextPage && (
              <Button
                variant="secondary"
                className="w-full"
                loading={feed.isFetchingNextPage}
                onClick={() => void feed.fetchNextPage()}
              >
                Ver más
              </Button>
            )}
          </div>
        )}
      </div>
    </AppPage>
  );
}
