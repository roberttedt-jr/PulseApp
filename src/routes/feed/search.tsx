import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { FollowButton, PersonRow } from "@/components/pulse/social";
import { SearchInput } from "@/components/pulse/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { searchPeople } from "@/lib/pulse/social-fns";

export const Route = createFileRoute("/feed/search")({ component: SearchPage });

function SearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 280);
    return () => window.clearTimeout(t);
  }, [q]);
  const result = useQuery({
    queryKey: ["people-search", debounced],
    queryFn: () => searchPeople({ data: { q: debounced } }),
    enabled: debounced.length > 0,
  });
  const people = result.data?.people ?? [];

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
        <div className="relative">
          <SearchInput
            id="pulse_search_query_field"
            name="pulse_search_query_field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o @usuario"
            aria-label="Buscar personas"
          />
        </div>
        {!debounced && (
          <EmptyState
            icon={Users}
            title="Encuentra a tus amigos."
            hint="Busca por nombre visible o @usuario. Nunca por correo."
            className="py-8"
          />
        )}
        {debounced && result.isPending && (
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
            hint="Prueba con otro nombre o @usuario."
            className="py-8"
          />
        )}
        <ul className="space-y-3">
          {people.map((p) => (
            <li key={p.userId} className="pulse-card px-3 py-3">
              <PersonRow person={p} action={<FollowButton person={p} onChange={() => void result.refetch()} />} />
            </li>
          ))}
        </ul>
      </div>
    </AppPage>
  );
}
