import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SearchInput } from "@/components/pulse/search-input";
import { FollowButton, FollowingToggle } from "@/components/pulse/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  listFollowers,
  listFollowing,
  removeFollower,
  unfollowUser,
  type PersonCard,
} from "@/lib/pulse/social-fns";
import { toast } from "sonner";

type Tab = "followers" | "following";

export function FollowListModal({
  open,
  onOpenChange,
  username,
  mine,
  initialTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string | null;
  mine: boolean;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setQ("");
      setHidden(new Set());
    }
  }, [open, initialTab]);

  const payload = username ? { username } : {};
  const followers = useQuery({
    queryKey: ["follow-list", "followers", username ?? "me"],
    queryFn: () => listFollowers({ data: payload }),
    enabled: open,
  });
  const following = useQuery({
    queryKey: ["follow-list", "following", username ?? "me"],
    queryFn: () => listFollowing({ data: payload }),
    enabled: open,
  });

  const active = tab === "followers" ? followers : following;
  const people = useMemo(() => {
    const list = (active.data?.people ?? []).filter((p) => !hidden.has(p.userId));
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    if (!needle) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.username ?? "").toLowerCase().includes(needle) ||
        p.handle.toLowerCase().includes(needle),
    );
  }, [active.data?.people, hidden, q]);

  function refreshProfile() {
    void qc.invalidateQueries({ queryKey: ["social-profile"] });
    void qc.invalidateQueries({ queryKey: ["follow-list"] });
  }

  const title = tab === "followers" ? "Seguidores" : "Siguiendo";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent fullScreen className="flex flex-col overflow-hidden px-4 pt-2">
        <header className="shrink-0 pr-12">
          <SheetTitle>{title}</SheetTitle>
          <Segmented
            ariaLabel="Listas sociales"
            className="mt-3 flex w-full"
            value={tab}
            options={[
              { value: "followers", label: "Seguidores" },
              { value: "following", label: "Siguiendo" },
            ]}
            onChange={setTab}
          />
        </header>
        <div className="mt-3 shrink-0">
          <SearchInput
            id="filter_social_list"
            name="filter_social_list"
            type="search"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o @usuario"
            aria-label="Filtrar lista"
          />
        </div>
        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pb-8" data-follow-list={tab}>
          {active.isPending && <li className="py-8 text-center text-sm text-muted-foreground">Cargando…</li>}
          {active.isError && (
            <li className="py-8 text-center text-sm text-destructive">{(active.error as Error).message}</li>
          )}
          {active.isSuccess && people.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              {q.trim() ? "Sin resultados." : tab === "followers" ? "Aún no hay seguidores." : "Aún no sigue a nadie."}
            </li>
          )}
          {people.map((person) => (
            <UserRowItem
              key={person.userId}
              person={person}
              mine={mine}
              tab={tab}
              onNavigate={() => onOpenChange(false)}
              onRemoved={() => {
                setHidden((prev) => new Set(prev).add(person.userId));
                refreshProfile();
              }}
              onRestore={() => {
                setHidden((prev) => {
                  const next = new Set(prev);
                  next.delete(person.userId);
                  return next;
                });
              }}
              onFollowChange={refreshProfile}
            />
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

function UserRowItem({
  person,
  mine,
  tab,
  onNavigate,
  onRemoved,
  onRestore,
  onFollowChange,
}: {
  person: PersonCard;
  mine: boolean;
  tab: Tab;
  onNavigate: () => void;
  onRemoved: () => void;
  onRestore: () => void;
  onFollowChange: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function unfollow() {
    if (busy) return;
    setBusy(true);
    onRemoved();
    try {
      await unfollowUser({ data: { userId: person.userId } });
    } catch (e) {
      onRestore();
      toast.error(e instanceof Error ? e.message : "No se pudo dejar de seguir.");
    } finally {
      setBusy(false);
    }
  }

  const remove = useMutation({
    mutationFn: () => removeFollower({ data: { userId: person.userId } }),
    onMutate: () => onRemoved(),
    onError: (e) => {
      onRestore();
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
    },
  });

  const action = mine ? (
    tab === "followers" ? (
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0"
        disabled={remove.isPending}
        onClick={() => remove.mutate()}
      >
        Eliminar
      </Button>
    ) : (
      <FollowingToggle disabled={busy} onClick={() => void unfollow()} />
    )
  ) : (
    <FollowButton person={person} onChange={onFollowChange} />
  );

  return (
    <li className="flex items-center gap-3 rounded-2xl px-1 py-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left pressable-feedback"
        onClick={() => {
          if (!person.username) return;
          onNavigate();
          void navigate({ to: "/u/$username", params: { username: person.username } });
        }}
      >
        <Avatar src={person.image} fallback={person.name} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="block truncate text-sm font-medium">{person.name}</span>
            {person.profileVisibility === "private" ? (
              <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Perfil privado" />
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{person.handle || "Sin @usuario"}</span>
        </span>
      </button>
      {action}
    </li>
  );
}
