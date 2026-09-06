import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MessageCircle, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { HScroll } from "@/components/pulse/h-scroll";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  addFeedComment,
  createFeedPost,
  deleteFeedComment,
  deleteFeedPost,
  getFeed,
  listFeedComments,
  toggleFeedLike,
  toggleFollow,
} from "@/lib/pulse/fns";
import { cn, formatDuration, formatKg } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({ component: FeedPage });

function FeedPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["feed"], queryFn: () => getFeed() });
  const follow = useMutation({
    mutationFn: (userId: string) => toggleFollow({ data: { userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const publish = useMutation({
    mutationFn: () => createFeedPost({ data: { title: draft } }),
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Publicado");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AppPage title="Actividad">
      <div className="mx-auto max-w-xl space-y-5 pt-4">
        <form
          className="rounded-[22px] bg-card p-3 hairline"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) publish.mutate();
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={280}
            placeholder="Comparte un PR, una sesión o una duda…"
            className="min-h-20 border-0 bg-transparent px-1"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">{draft.length}/280</p>
            <Button type="submit" size="sm" disabled={publish.isPending || !draft.trim()}>
              {publish.isPending ? "…" : "Publicar"}
            </Button>
          </div>
        </form>

        <section>
          {(data?.people ?? []).length > 0 && (
            <>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Atletas</h2>
          <HScroll gap="gap-2">
            {(data?.people ?? []).map((p) => (
              <div key={p.userId} className="w-36 rounded-3xl bg-card p-3 hairline">
                <Avatar src={p.image} fallback={p.name} />
                <p className="mt-2 truncate text-sm font-medium">{p.name}</p>
                <Button
                  size="sm"
                  variant={p.following ? "secondary" : "default"}
                  className="mt-2 w-full"
                  onClick={() => follow.mutate(p.userId)}
                >
                  {p.following ? "Siguiendo" : "Seguir"}
                </Button>
              </div>
            ))}
          </HScroll>
            </>
          )}
        </section>
        <section className="space-y-2">
          {(data?.items ?? []).length === 0 && (
            <EmptyState
              icon={Users}
              title="Sigue a atletas o comparte tu primer entrenamiento."
              hint="El feed solo muestra actividad real tuya o de gente a la que sigues. No hay atletas de demostración."
              action={
                <Button asChild>
                  <Link to="/routines">Registrar entrenamiento</Link>
                </Button>
              }
            />
          )}
          {(data?.items ?? []).map((i) => (
            <article key={i.id} className="rounded-3xl bg-card p-4 hairline">
              <div className="flex gap-3">
                <Avatar src={i.image} fallback={i.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-sm">{i.title}</p>
                  {i.detail && <p className="text-xs text-muted-foreground">{i.detail}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(i.createdAt), { addSuffix: true, locale: es })}
                    {i.volume ? ` · ${formatKg(i.volume)}` : ""}
                    {i.durationSeconds ? ` · ${formatDuration(i.durationSeconds)}` : ""}
                  </p>
                </div>
                {i.mine && (
                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center text-muted-foreground"
                    aria-label="Borrar publicación"
                    onClick={async () => {
                      await deleteFeedPost({ data: { id: i.id } });
                      void qc.invalidateQueries({ queryKey: ["feed"] });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm",
                    i.liked ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={async () => {
                    await toggleFeedLike({ data: { feedId: i.id } });
                    void qc.invalidateQueries({ queryKey: ["feed"] });
                  }}
                >
                  <Heart className={cn("size-4", i.liked && "fill-current")} />
                  {i.likeCount}
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm text-muted-foreground"
                  onClick={() => setOpen(i.id)}
                >
                  <MessageCircle className="size-4" />
                  {i.commentCount}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
      <CommentsSheet feedId={open} onClose={() => setOpen(null)} />
    </AppPage>
  );
}

function CommentsSheet({ feedId, onClose }: { feedId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["comments", feedId],
    queryFn: () => listFeedComments({ data: { feedId: feedId! } }),
    enabled: Boolean(feedId),
    refetchInterval: feedId ? 4000 : false,
  });
  const [body, setBody] = useState("");
  const send = useMutation({
    mutationFn: () => addFeedComment({ data: { feedId: feedId!, body } }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["comments", feedId] });
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Sheet open={Boolean(feedId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-[80dvh] flex-col overflow-hidden px-4 pt-4">
        <p className="mb-3 text-lg font-semibold">Comentarios</p>
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar overscroll-contain pb-4">
          {(data ?? []).length === 0 && (
            <p className="pt-8 text-center text-sm text-muted-foreground">Sé el primero en comentar</p>
          )}
          {(data ?? []).map((c) => (
            <li key={c.id} className="flex gap-2">
              <Avatar src={c.image} fallback={c.name} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-sm text-foreground">{c.body}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: es })}
                </p>
              </div>
              {c.mine && (
                <button
                  type="button"
                  className="grid size-11 place-items-center text-muted-foreground"
                  aria-label="Borrar comentario"
                  onClick={async () => {
                    await deleteFeedComment({ data: { id: c.id } });
                    void qc.invalidateQueries({ queryKey: ["comments", feedId] });
                    void qc.invalidateQueries({ queryKey: ["feed"] });
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={280}
            placeholder="Escribe un comentario"
            className="min-h-12"
          />
          <Button type="submit" disabled={send.isPending || !body.trim()}>
            {send.isPending ? "…" : "Enviar"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
