import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Shield } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import {
  CompareBanner,
  ComparePersonHeader,
  ExerciseList,
  MetricPair,
  PrList,
} from "@/components/pulse/compare";
import { EmptyState } from "@/components/pulse/empty-state";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { COMPARE_COPY, type ComparePeriod } from "@/lib/pulse/compare";
import { getCompare } from "@/lib/pulse/compare-fns";
import { formatKg } from "@/lib/utils";

type Search = { period?: ComparePeriod };

export const Route = createFileRoute("/compare/$username")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    period: s.period === "month" ? "month" : "week",
  }),
  component: CompareWithFriendPage,
});

const NUMERIC = ["workouts", "days", "streak", "sets", "volume"] as const;

function CompareWithFriendPage() {
  const { username } = Route.useParams();
  const navigate = Route.useNavigate();
  const { period } = Route.useSearch();
  const active: ComparePeriod = period === "month" ? "month" : "week";
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["compare", username, active],
    queryFn: () => getCompare({ data: { username, period: active } }),
    retry: false,
  });

  const message = error instanceof Error ? error.message : COMPARE_COPY.unavailable;
  const viewerOff = /activa las comparativas/i.test(message);
  const youLabel = COMPARE_COPY.you;
  const themLabel = COMPARE_COPY.them(data?.friend.handle ?? `@${username}`);
  const units = data?.you.units ?? "metric";

  function fmtVolume(n: number) {
    return formatKg(n, units);
  }
  function fmtStreak(n: number) {
    const d = Math.round(n);
    return `${d} ${d === 1 ? "día" : "días"}`;
  }

  return (
    <AppPage
      title={COMPARE_COPY.title}
      action={
        <Link to="/compare" className="text-sm text-accent">
          Amigos
        </Link>
      }
    >
      <div className="mx-auto max-w-xl space-y-4 pt-4" data-compare-root="detail">
        <Segmented
          ariaLabel="Periodo"
          className="flex w-full"
          value={active}
          options={[
            { value: "week", label: COMPARE_COPY.week },
            { value: "month", label: COMPARE_COPY.month },
          ]}
          onChange={(v) => {
            void navigate({
              to: "/compare/$username",
              params: { username },
              search: { period: v },
            });
          }}
        />

        {isPending && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full rounded-[22px]" />
            <Skeleton className="h-32 w-full rounded-[22px]" />
            <Skeleton className="h-32 w-full rounded-[22px]" />
          </div>
        )}

        {isError && (
          <EmptyState
            icon={viewerOff ? Shield : ArrowLeftRight}
            title={viewerOff ? COMPARE_COPY.viewerOff : COMPARE_COPY.unavailable}
            hint={COMPARE_COPY.subtitle}
            action={
              viewerOff ? (
                <Button asChild>
                  <Link to="/account" hash="comparativas">
                    Ir a Privacidad
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link to="/compare">Volver</Link>
                </Button>
              )
            }
          />
        )}

        {data && (
          <>
            <section className="rounded-[22px] bg-card p-4 hairline">
              <ComparePersonHeader
                youName={data.you.name}
                youImage={data.you.image}
                themName={data.friend.name}
                themHandle={data.friend.handle}
                themImage={data.friend.image}
              />
              <div className="mt-3 text-center">
                <CompareBanner />
              </div>
            </section>

            {data.visible.length === 0 && (
              <EmptyState
                icon={Shield}
                title={COMPARE_COPY.emptyMetrics}
                hint="Elige en Privacidad qué métricas quieres compartir."
                action={
                  <Button asChild>
                    <Link to="/account" hash="comparativas">
                      Ajustar permisos
                    </Link>
                  </Button>
                }
              />
            )}

            {NUMERIC.filter((id) => data.visible.includes(id)).map((id) => (
              <MetricPair
                key={id}
                metric={id}
                youLabel={youLabel}
                themLabel={themLabel}
                you={Number(data.you[id] ?? 0)}
                them={Number(data.friend[id] ?? 0)}
                format={id === "volume" ? fmtVolume : id === "streak" ? fmtStreak : undefined}
              />
            ))}

            {data.visible.includes("exercises") && (
              <ExerciseList items={data.exercises} youLabel={youLabel} themLabel={themLabel} units={units} />
            )}
            {data.visible.includes("prs") && (
              <PrList items={data.prs} youLabel={youLabel} themLabel={themLabel} units={units} />
            )}
          </>
        )}
      </div>
    </AppPage>
  );
}
