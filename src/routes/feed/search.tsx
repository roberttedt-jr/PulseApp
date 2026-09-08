import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { FollowButton, PersonRow } from "@/components/pulse/social";
import { SearchInput } from "@/components/pulse/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { personMatchesSearch, rankPersonSearch } from "@/lib/pulse/social";
import { searchPeople } from "@/lib/pulse/social-fns";

export const Route = createFileRoute("/feed/search")({ component: SearchPage });

function SearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 160);
    return () => window.clearTimeout(t);
  }, [q]);
  const result = useQuery({
    queryKey: ["people-search", debounced],
    queryFn: () => searchPeople({ data: { q: debounced } }),
    enabled: debounced.length > 0,
    placeholderData: (prev) => prev,
  });
  const people = useMemo(() => {
    const raw = result.data?.people ?? [];
    if (!debounced) return [];
    return raw
      .filter((p) => personMatchesSearch(debounced, p))
      .sort((a, b) => {
        const ra = rankPersonSearch(debounced, a);
        const rb = rankPersonSearch(debounced, b);
        if (ra.rank !== rb.rank) return ra.rank - rb.rank;
        return (a.name || a.handle).localeCompare(b.name || b.handle, "es");
      });
  }, [result.data?.people, debounced]);
  const showPending = Boolean(debounced && result.isPending && !result.data);

  return (
    <AppPage
      title="Buscar personas"
      action={
        <button type="button" className="text-sm text-primary" onClick={() => void navigate({ to: "/feed" })}>
          Listo
        </button>
      }
    >
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <SearchInput
          id="pulse_search_query_field"
          name="pulse_search_query_field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre o @usuario"
          aria-label="Buscar personas"
          autoFocus
        />
        {!debounced && (
          <EmptyState
            icon={Users}
            title="Encuentra a tus amigos."
            hint="Empieza a escribir. Las sugerencias aparecen desde la primera letra."
            className="py-8"
          />
        )}
        {showPending && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        )}
        {debounced && result.isError && (
          <p className="px-2 text-sm text-destructive">{(result.error as Error).message}</p>
        )}
        {debounced && result.isSuccess && people.length === 0 && (
          <EmptyState
            icon={Search}
            title="Sin resultados."
            hint="Prueba con las primeras letras del nombre o del @usuario."
            className="py-8"
          />
        )}
        {people.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Sugerencias
            </p>
            <ul className="space-y-2">
              {people.map((p) => (
                <li key={p.userId} className="pulse-card px-3 py-3">
                  <PersonRow
                    person={p}
                    query={debounced}
                    action={<FollowButton person={p} onChange={() => void result.refetch()} />}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppPage>
  );
}
