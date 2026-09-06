import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Dumbbell, Flag, Heart, MoreHorizontal, Trash2, UserMinus, UserX } from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ChoiceButton } from "@/components/pulse/flow-shell";
import {
  blockUser,
  cancelFollowRequest,
  deleteSocialPost,
  followUser,
  hidePost,
  reportContent,
  togglePostLike,
  unfollowUser,
  updatePostVisibility,
  type FeedPost,
  type PersonCard,
} from "@/lib/pulse/social-fns";
import { REPORT_LABELS, type ReportReason, type WorkoutVisibility } from "@/lib/pulse/social";
import { cn, formatDuration, formatKg } from "@/lib/utils";
import { toast } from "sonner";

export function FollowButton({
  person,
  onChange,
  size = "sm",
}: {
  person: Pick<PersonCard, "userId" | "profileVisibility" | "followStatus">;
  onChange?: () => void;
  size?: "sm" | "default";
}) {
  const [pending, setPending] = useState(false);
  async function run(fn: () => Promise<unknown>, ok?: string) {
    if (pending) return;
    setPending(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar.");
    } finally {
      setPending(false);
    }
  }
  if (person.followStatus === "accepted") {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled={pending}
        onClick={() => void run(() => unfollowUser({ data: { userId: person.userId } }), "Has dejado de seguir")}
      >
        Siguiendo
      </Button>
    );
  }
  if (person.followStatus === "pending") {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled={pending}
        onClick={() => void run(() => cancelFollowRequest({ data: { userId: person.userId } }), "Solicitud cancelada")}
      >
        Solicitud enviada
      </Button>
    );
  }
  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() =>
        void run(
          () => followUser({ data: { userId: person.userId } }),
          person.profileVisibility === "private" ? "Solicitud enviada" : "Ahora sigues a esta persona",
        )
      }
    >
      Seguir
    </Button>
  );
}

export function PersonRow({
  person,
  action,
  onOpen,
}: {
  person: PersonCard;
  action?: ReactNode;
  onOpen?: () => void;
}) {
  const inner = (
    <>
      <Avatar src={person.image} fallback={person.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{person.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{person.handle || "Sin @usuario"}</span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-3">
      {person.username ? (
        <Link to="/u/$username" params={{ username: person.username }} className="flex min-w-0 flex-1 items-center gap-3" onClick={onOpen}>
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
      )}
      {action}
    </div>
  );
}

export function ShareSheet({
  open,
  onOpenChange,
  defaultVisibility = "me",
  onShare,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVisibility?: WorkoutVisibility;
  onShare: (visibility: WorkoutVisibility) => Promise<void> | void;
  busy?: boolean;
}) {
  const [visibility, setVisibility] = useState<WorkoutVisibility>(defaultVisibility);
  useEffect(() => {
    if (open) setVisibility(defaultVisibility);
  }, [open, defaultVisibility]);
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onOpenChange(false);
      }}
    >
      <SheetContent className="px-5 pt-3 pb-2">
        <SheetTitle>¿Compartir este entrenamiento?</SheetTitle>
        <SheetDescription>El entrenamiento ya está guardado en tu historial. Tú decides quién lo ve.</SheetDescription>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Visibilidad">
          <ChoiceButton
            selected={visibility === "me"}
            title="Solo yo"
            hint="Se guarda en tu historial privado."
            onClick={() => setVisibility("me")}
          />
          <ChoiceButton
            selected={visibility === "followers"}
            title="Seguidores"
            hint="Lo ven tus seguidores autorizados."
            onClick={() => setVisibility("followers")}
          />
          <ChoiceButton
            selected={visibility === "public"}
            title="Público"
            hint="Puede aparecer en tu perfil y, más adelante, en Para ti."
            onClick={() => setVisibility("public")}
          />
        </div>
        <div className="mt-5 flex min-w-0 flex-col gap-2">
          <Button
            className="w-full"
            disabled={busy}
            loading={busy}
            loadingText="Guardando…"
            onClick={() => void onShare(visibility)}
          >
            {visibility === "me" ? "Guardar solo para mí" : "Compartir entrenamiento"}
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PostCard({
  post,
  units = "metric",
  onChanged,
}: {
  post: FeedPost;
  units?: "metric" | "imperial";
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState<"post" | "user" | null>(null);
  const [visOpen, setVisOpen] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  async function like() {
    if (likeBusy) return;
    setLikeBusy(true);
    const prev = liked;
    const prevCount = likeCount;
    setLiked(!prev);
    setLikeCount(Math.max(0, prevCount + (prev ? -1 : 1)));
    try {
      const res = await togglePostLike({ data: { postId: post.id } });
      setLiked(res.liked);
      setLikeCount(Math.max(0, prevCount + (res.liked === prev ? 0 : res.liked ? 1 : -1)));
      onChanged?.();
    } catch (e) {
      setLiked(prev);
      setLikeCount(prevCount);
      toast.error(e instanceof Error ? e.message : "No se pudo dar Me gusta.");
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <article className="rounded-[22px] bg-card p-4 hairline">
      <div className="flex gap-3">
        {post.username ? (
          <Link to="/u/$username" params={{ username: post.username }} className="shrink-0">
            <Avatar src={post.image} fallback={post.name} />
          </Link>
        ) : (
          <Avatar src={post.image} fallback={post.name} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {post.username ? (
                <Link to="/u/$username" params={{ username: post.username }} className="block min-w-0">
                  <p className="truncate text-sm font-semibold">{post.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{post.handle}</p>
                </Link>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold">{post.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{post.handle}</p>
                </>
              )}
            </div>
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-2xl text-muted-foreground"
              aria-label="Más opciones"
              onClick={() => setMenu(true)}
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
          <p className="mt-2 text-[15px] font-semibold tracking-tight">{post.title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {post.durationSeconds != null && (
              <Chip icon={<Clock className="size-3.5" />}>{formatDuration(post.durationSeconds)}</Chip>
            )}
            {post.exerciseCount != null && (
              <Chip icon={<Dumbbell className="size-3.5" />}>
                {post.exerciseCount} {post.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
              </Chip>
            )}
            {post.setCount != null && <Chip>{post.setCount} {post.setCount === 1 ? "serie" : "series"}</Chip>}
            {post.volume != null && post.volume > 0 && <Chip>{formatKg(post.volume, units)}</Chip>}
          </ul>
          {post.muscles.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{post.muscles.join(" · ")}</p>
          )}
          {post.prLabel && <p className="mt-2 text-xs font-medium text-warning">{post.prLabel}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center">
        <button
          type="button"
          disabled={likeBusy}
          className={cn(
            "inline-flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm",
            liked ? "text-primary" : "text-muted-foreground",
          )}
          aria-pressed={liked}
          aria-label={liked ? "Quitar Me gusta" : "Me gusta"}
          onClick={() => void like()}
        >
          <Heart className={cn("size-4", liked && "fill-current")} />
          {likeCount > 0 ? likeCount : "Me gusta"}
        </button>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent className="px-5 pt-3 pb-2">
          <SheetTitle>Publicación</SheetTitle>
          <div className="mt-4 flex flex-col">
            {post.mine ? (
              <>
                <MenuRow
                  icon={Clock}
                  label="Cambiar visibilidad"
                  onClick={() => {
                    setMenu(false);
                    setVisOpen(true);
                  }}
                />
                <MenuRow
                  icon={Trash2}
                  label="Eliminar publicación"
                  danger
                  onClick={async () => {
                    try {
                      await deleteSocialPost({ data: { postId: post.id } });
                      setMenu(false);
                      toast.success("Publicación eliminada");
                      void qc.invalidateQueries({ queryKey: ["activity-feed"] });
                      void qc.invalidateQueries({ queryKey: ["social-profile"] });
                      onChanged?.();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
                    }
                  }}
                />
              </>
            ) : (
              <>
                <MenuRow
                  icon={UserMinus}
                  label="Ocultar publicación"
                  onClick={async () => {
                    try {
                      await hidePost({ data: { postId: post.id } });
                      setMenu(false);
                      toast.success("Publicación ocultada");
                      onChanged?.();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "No se pudo ocultar.");
                    }
                  }}
                />
                <MenuRow
                  icon={Flag}
                  label="Reportar publicación"
                  onClick={() => {
                    setMenu(false);
                    setReport("post");
                  }}
                />
                <MenuRow
                  icon={Flag}
                  label="Reportar usuario"
                  onClick={() => {
                    setMenu(false);
                    setReport("user");
                  }}
                />
                <MenuRow
                  icon={UserMinus}
                  label="Dejar de seguir"
                  onClick={async () => {
                    try {
                      await unfollowUser({ data: { userId: post.authorId } });
                      setMenu(false);
                      toast.success("Has dejado de seguir");
                      onChanged?.();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "No se pudo dejar de seguir.");
                    }
                  }}
                />
                <MenuRow
                  icon={UserX}
                  label="Bloquear usuario"
                  danger
                  onClick={async () => {
                    try {
                      await blockUser({ data: { userId: post.authorId } });
                      setMenu(false);
                      toast.success("Usuario bloqueado");
                      void qc.invalidateQueries({ queryKey: ["activity-feed"] });
                      onChanged?.();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "No se pudo bloquear.");
                    }
                  }}
                />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ShareSheet
        open={visOpen}
        onOpenChange={setVisOpen}
        defaultVisibility={post.visibility}
        onShare={async (visibility) => {
          try {
            await updatePostVisibility({ data: { postId: post.id, visibility } });
            setVisOpen(false);
            toast.success(visibility === "me" ? "Publicación ocultada" : "Visibilidad actualizada");
            onChanged?.();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
          }
        }}
      />

      <ReportSheet
        open={report != null}
        onOpenChange={(o) => !o && setReport(null)}
        targetType={report ?? "post"}
        targetId={report === "user" ? post.authorId : post.id}
      />
    </article>
  );
}

function Chip({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {icon}
      {children}
    </li>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-2xl px-2 text-left text-sm font-medium",
        danger ? "text-destructive" : "text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

export function ReportSheet({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "post" | "user";
  targetId: string;
}) {
  const report = useMutation({
    mutationFn: (reason: ReportReason) => reportContent({ data: { targetType, targetId, reason } }),
    onSuccess: () => {
      toast.success("Gracias. Revisaremos el reporte.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="px-5 pt-3 pb-2">
        <SheetTitle>{targetType === "user" ? "Reportar usuario" : "Reportar publicación"}</SheetTitle>
        <SheetDescription>Elige un motivo. La otra persona no sabrá quién lo ha enviado.</SheetDescription>
        <div className="mt-4 flex flex-col gap-2">
          {(Object.keys(REPORT_LABELS) as ReportReason[]).map((reason) => (
            <Button
              key={reason}
              variant="secondary"
              className="w-full justify-start"
              disabled={report.isPending}
              onClick={() => report.mutate(reason)}
            >
              {REPORT_LABELS[reason]}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
