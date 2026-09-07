import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Camera,
  ChevronDown,
  Clock,
  Copy,
  Dumbbell,
  Flag,
  Heart,
  ImagePlus,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  UserMinus,
  UserX,
  X,
} from "lucide-react";
import { useState, type ReactNode, useEffect, useRef, memo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceButton } from "@/components/pulse/flow-shell";
import {
  addPostComment,
  blockUser,
  cancelFollowRequest,
  copySharedRoutine,
  deletePostComment,
  deleteSocialPost,
  followUser,
  hidePost,
  listPostComments,
  reportContent,
  togglePostLike,
  unfollowUser,
  updatePostComment,
  updatePostVisibility,
  type FeedComment,
  type FeedPost,
  type PersonCard,
} from "@/lib/pulse/social-fns";
import { CAPTION_MAX, COMMENT_MAX, PHOTO_MAX, REPORT_LABELS, TITLE_MAX, type ReportReason, type ReportTarget, type WorkoutVisibility } from "@/lib/pulse/social";
import { prepareWorkoutPhoto } from "@/lib/pulse/image";
import { cn, formatDuration, formatKg } from "@/lib/utils";
import { toast } from "sonner";

function relativeDate(isoDate: string) {
  try {
    return formatDistanceToNow(new Date(isoDate), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
}

function bustSocial(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["activity-feed"] });
  void qc.invalidateQueries({ queryKey: ["discover-feed"] });
  void qc.invalidateQueries({ queryKey: ["social-profile"] });
  void qc.invalidateQueries({ queryKey: ["routines"] });
  void qc.invalidateQueries({ queryKey: ["post-comments"] });
  void qc.invalidateQueries({ queryKey: ["notifications"] });
  void qc.invalidateQueries({ queryKey: ["feed-post"] });
}

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
  title = "¿Compartir este entrenamiento?",
  description = "El entrenamiento ya está guardado en tu historial. Tú decides quién lo ve.",
  confirmMe = "Guardar solo para mí",
  confirmShare = "Compartir entrenamiento",
  publicHint = "Puede aparecer en tu perfil y en Para ti.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVisibility?: WorkoutVisibility;
  onShare: (visibility: WorkoutVisibility) => Promise<void> | void;
  busy?: boolean;
  title?: string;
  description?: string;
  confirmMe?: string;
  confirmShare?: string;
  publicHint?: string;
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
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Visibilidad">
          <ChoiceButton
            selected={visibility === "me"}
            title="Solo yo"
            hint="Solo tú lo ves. No aparece en los feeds."
            onClick={() => setVisibility("me")}
          />
          <ChoiceButton
            selected={visibility === "followers"}
            title="Seguidores"
            hint="Lo ven tus seguidores autorizados."
            onClick={() => setVisibility("followers")}
          />
          <ChoiceButton selected={visibility === "public"} title="Público" hint={publicHint} onClick={() => setVisibility("public")} />
        </div>
        <div className="mt-5 flex min-w-0 flex-col gap-2">
          <Button
            className="w-full"
            disabled={busy}
            loading={busy}
            loadingText="Guardando…"
            onClick={() => void onShare(visibility)}
          >
            {visibility === "me" ? confirmMe : confirmShare}
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function WorkoutPublishForm({
  routineName,
  durationSeconds,
  volume,
  setCount,
  exerciseCount,
  prs,
  units = "metric",
  busy,
  onSubmit,
  onCancel,
}: {
  routineName: string;
  durationSeconds: number;
  volume: number;
  setCount: number;
  exerciseCount?: number;
  prs: string[];
  units?: "metric" | "imperial";
  busy?: boolean;
  onSubmit: (data: { visibility: WorkoutVisibility; title: string; caption: string; photos: string[] }) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(routineName);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<WorkoutVisibility>("me");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addPhotos(files: FileList | null) {
    if (!files || photoBusy) return;
    const room = PHOTO_MAX - photos.length;
    if (room <= 0) return;
    setPhotoBusy(true);
    try {
      const next = [...photos];
      for (const file of Array.from(files).slice(0, room)) {
        const prepared = await prepareWorkoutPhoto(file);
        next.push(prepared.dataUrl);
      }
      setPhotos(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo añadir la foto.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5" data-publish-form="1">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Duración" value={formatDuration(durationSeconds)} />
        <MiniStat label="Volumen" value={formatKg(volume, units)} />
        <MiniStat label="Series" value={String(setCount)} />
        <MiniStat
          label="Ejercicios"
          value={exerciseCount != null ? String(exerciseCount) : "—"}
        />
      </div>
      {prs.length > 0 && (
        <p className="rounded-2xl bg-warning/15 px-3 py-2 text-sm font-medium text-warning" data-publish-prs="1">
          PRs: {prs.join(", ")}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="publish-title">Título</Label>
        <Input
          id="publish-title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={routineName}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="publish-notes">Notas (opcional)</Label>
        <Textarea
          id="publish-notes"
          value={caption}
          maxLength={CAPTION_MAX}
          className="min-h-24"
          placeholder="Cómo te has sentido, el foco del día…"
          onChange={(e) => setCaption(e.target.value)}
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {caption.length}/{CAPTION_MAX}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Fotos de la sesión</Label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={`${src.slice(0, 24)}-${i}`} className="relative overflow-hidden rounded-2xl bg-muted">
              <img src={src} alt="" className="aspect-square h-full w-full object-cover" />
              <button
                type="button"
                className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-black/55 text-white"
                aria-label="Quitar foto"
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length < PHOTO_MAX && (
            <button
              type="button"
              disabled={photoBusy || busy}
              onClick={() => fileRef.current?.click()}
              className="grid aspect-square place-items-center rounded-2xl bg-muted text-muted-foreground pressable"
              aria-label="Añadir foto"
            >
              {photoBusy ? <Camera className="size-5 animate-pulse" /> : <ImagePlus className="size-5" />}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => void addPhotos(e.target.files)}
        />
        <p className="text-[11px] text-muted-foreground">Hasta {PHOTO_MAX} fotos. Opcional.</p>
      </div>
      <div className="space-y-2">
        <Label>Quién puede verlo</Label>
        <Segmented
          ariaLabel="Visibilidad del entrenamiento"
          className="flex w-full"
          value={visibility}
          options={[
            { value: "me", label: "Solo yo" },
            { value: "followers", label: "Seguidores" },
            { value: "public", label: "Público" },
          ]}
          onChange={setVisibility}
        />
        <p className="text-xs text-muted-foreground">
          {visibility === "me"
            ? "Se guarda en tu historial. No aparece en el feed."
            : visibility === "followers"
              ? "Lo ven las personas que te siguen."
              : "Visible en Para ti y en tu perfil."}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button
          className="w-full"
          disabled={busy || photoBusy}
          loading={busy}
          loadingText="Guardando…"
          data-save-publish="1"
          onClick={() => void onSubmit({ visibility, title: title.trim() || routineName, caption, photos })}
        >
          {visibility === "me" ? "Guardar en historial" : "Guardar y compartir"}
        </Button>
        <Button variant="ghost" className="w-full" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/80 px-3 py-2.5 text-center">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular">{value}</p>
    </div>
  );
}

export const PostCard = memo(function PostCard({
  post,
  units = "metric",
  onChanged,
  openComments = false,
}: {
  post: FeedPost;
  units?: "metric" | "imperial";
  onChanged?: () => void;
  openComments?: boolean;
}) {
  const qc = useQueryClient();
  const commentsStartOpen = openComments;
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState<"post" | "user" | null>(null);
  const [visOpen, setVisOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(commentsStartOpen);
  const [likeBusy, setLikeBusy] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [exercisesOpen, setExercisesOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
  }, [post.liked, post.likeCount, post.commentCount, post.id]);

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

  async function copyRoutine() {
    if (copyBusy || post.mine || !post.routine) return;
    setCopyBusy(true);
    try {
      await copySharedRoutine({ data: { postId: post.id, routineId: post.routine.id ?? undefined } });
      toast.success("Rutina añadida a Mis rutinas");
      bustSocial(qc);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo copiar la rutina.");
    } finally {
      setCopyBusy(false);
    }
  }

  const visTitle =
    post.kind === "routine"
      ? "¿Quién puede ver esta rutina?"
      : post.kind === "text"
        ? "¿Quién puede ver esta publicación?"
        : "¿Compartir este entrenamiento?";

  return (
    <article className="rounded-[22px] bg-card p-4 hairline" data-post-kind={post.kind} data-post-id={post.id}>
      <div className="flex items-start gap-3">
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
                  <p className="truncate text-xs text-muted-foreground">
                    {post.handle}
                    <span className="text-muted-foreground"> · {relativeDate(post.createdAt)}</span>
                  </p>
                </Link>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold">{post.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {post.handle} · {relativeDate(post.createdAt)}
                  </p>
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
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[15px] font-semibold tracking-tight">{post.title}</p>
        {post.caption || post.body ? (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-pretty">{post.caption || post.body}</p>
        ) : null}
        {post.visibility === "me" ? (
          <p className="mt-1 text-[11px] text-muted-foreground">Solo yo</p>
        ) : post.visibility === "followers" ? (
          <p className="mt-1 text-[11px] text-muted-foreground">Seguidores</p>
        ) : null}
      </div>

      {post.photos.length > 0 && (
        <div
          className={cn("mt-3 grid gap-1 overflow-hidden rounded-2xl", post.photos.length === 1 ? "grid-cols-1" : "grid-cols-2")}
          data-post-photos="1"
        >
          {post.photos.map((src, i) => (
            <button
              key={`${post.id}-ph-${i}`}
              type="button"
              className={cn("overflow-hidden bg-muted", post.photos.length === 1 ? "aspect-[4/3]" : "aspect-square")}
              onClick={() => setPhoto(src)}
              aria-label="Ver foto"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {post.kind === "workout" && (
        <div className="mt-3 rounded-2xl bg-muted/70 p-3" data-workout-stats="1">
          <ul className="flex flex-wrap gap-1.5">
            {post.durationSeconds != null && (
              <Chip icon={<Clock className="size-3.5" />}>{formatDuration(post.durationSeconds)}</Chip>
            )}
            {post.volume != null && post.volume > 0 && <Chip>{formatKg(post.volume, units)}</Chip>}
            {post.setCount != null && (
              <Chip>
                {post.setCount} {post.setCount === 1 ? "serie" : "series"}
              </Chip>
            )}
            {post.exerciseCount != null && (
              <Chip icon={<Dumbbell className="size-3.5" />}>
                {post.exerciseCount} {post.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
              </Chip>
            )}
          </ul>
          {post.prLabel && <p className="mt-2 text-xs font-medium text-warning">{post.prLabel}</p>}
          {post.exercises.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1 text-xs font-medium text-muted-foreground"
                aria-expanded={exercisesOpen}
                onClick={() => setExercisesOpen((v) => !v)}
              >
                {exercisesOpen ? "Ocultar ejercicios" : "Ver ejercicios"}
                <ChevronDown className={cn("size-3.5 transition-transform", exercisesOpen && "rotate-180")} />
              </button>
              {exercisesOpen && (
                <ul className="mt-1 space-y-1">
                  {post.exercises.map((ex, i) => (
                    <li key={`${ex.name}-${i}`} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{ex.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular">
                        {ex.sets ? `${ex.sets} ${ex.sets === 1 ? "serie" : "series"}` : ex.reps}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {post.kind === "routine" && post.routine && (
        <div className="mt-3 rounded-2xl bg-muted/70 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {post.routine.exerciseCount} {post.routine.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
          </p>
          <ul className="mt-2 space-y-1">
            {post.routine.exercises.slice(0, 6).map((ex, i) => (
              <li key={`${ex.name}-${i}`} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{ex.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  {ex.sets ? `${ex.sets} × ${ex.reps || "—"}` : ex.reps}
                </span>
              </li>
            ))}
          </ul>
          {!post.mine && (
            <Button size="sm" className="mt-3 w-full" disabled={copyBusy} loading={copyBusy} loadingText="Copiando…" onClick={() => void copyRoutine()}>
              <Copy className="size-4" /> Copiar a mis rutinas
            </Button>
          )}
        </div>
      )}
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
        <button
          type="button"
          className="inline-flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm text-muted-foreground"
          aria-label="Comentarios"
          onClick={() => setCommentsOpen(true)}
        >
          <MessageCircle className="size-4" />
          {commentCount > 0 ? commentCount : "Comentar"}
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
                      bustSocial(qc);
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
                      bustSocial(qc);
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
        title={visTitle}
        description="Tú decides quién ve esta publicación."
        confirmMe="Solo yo"
        confirmShare="Guardar visibilidad"
        onShare={async (visibility) => {
          try {
            await updatePostVisibility({ data: { postId: post.id, visibility } });
            setVisOpen(false);
            toast.success(visibility === "me" ? "Ahora es solo tuya" : "Visibilidad actualizada");
            bustSocial(qc);
            onChanged?.();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
          }
        }}
      />

      <CommentsSheet
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        post={post}
        onCount={(n) => {
          setCommentCount(n);
          onChanged?.();
        }}
      />

      <ReportSheet
        open={report != null}
        onOpenChange={(o) => !o && setReport(null)}
        targetType={report ?? "post"}
        targetId={report === "user" ? post.authorId : post.id}
      />

      <Dialog open={Boolean(photo)} onOpenChange={(o) => !o && setPhoto(null)}>
        <DialogContent className="max-w-lg p-0">
          <DialogTitle className="sr-only">Foto del entrenamiento</DialogTitle>
          {photo ? <img src={photo} alt="" className="max-h-[80dvh] w-full object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </article>
  );
});

function CommentsSheet({
  open,
  onOpenChange,
  post,
  onCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: FeedPost;
  onCount?: (n: number) => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const comments = useQuery({
    queryKey: ["post-comments", post.id],
    queryFn: () => listPostComments({ data: { postId: post.id } }),
    enabled: open,
  });

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      await addPostComment({ data: { postId: post.id, body: draft } });
      setDraft("");
      const next = await comments.refetch();
      onCount?.(next.data?.comments.length ?? 0);
      bustSocial(qc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo comentar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await updatePostComment({ data: { commentId: id, body: editBody } });
      setEditingId(null);
      await comments.refetch();
      toast.success("Comentario actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo editar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(comment: FeedComment) {
    if (busy) return;
    setBusy(true);
    try {
      await deletePostComment({ data: { commentId: comment.id } });
      const next = await comments.refetch();
      onCount?.(next.data?.comments.length ?? 0);
      bustSocial(qc);
      toast.success("Comentario eliminado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex max-h-[92dvh] flex-col px-5 pt-3 pb-3">
          <SheetTitle>Comentarios</SheetTitle>
          <SheetDescription>Texto breve. Sé respetuoso.</SheetDescription>
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
            {comments.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
            {comments.isError && (
              <p className="text-sm text-destructive">{(comments.error as Error).message || "No se han podido cargar."}</p>
            )}
            {!comments.isPending && (comments.data?.comments.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Sé el primero en comentar.</p>
            )}
            {(comments.data?.comments ?? []).map((c) => (
              <div key={c.id} className="flex gap-3" data-comment-id={c.id}>
                {c.username ? (
                  <Link to="/u/$username" params={{ username: c.username }} className="shrink-0">
                    <Avatar src={c.image} fallback={c.name} className="size-9 text-xs" />
                  </Link>
                ) : (
                  <Avatar src={c.image} fallback={c.name} className="size-9 text-xs" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.name} <span className="font-normal text-muted-foreground">{c.handle}</span>
                  </p>
                  {editingId === c.id ? (
                    <div className="mt-1 space-y-2">
                      <Textarea
                        aria-label="Editar comentario"
                        value={editBody}
                        maxLength={COMMENT_MAX}
                        className="min-h-20"
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy} onClick={() => void saveEdit(c.id)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{c.body}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: es })}
                    {c.edited ? " · editado" : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs font-medium">
                    {c.mine && (
                      <button
                        type="button"
                        className="text-muted-foreground"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditBody(c.body);
                        }}
                      >
                        Editar
                      </button>
                    )}
                    {c.canDelete && (
                      <button type="button" className="text-destructive" onClick={() => void remove(c)}>
                        Borrar
                      </button>
                    )}
                    {!c.mine && (
                      <button type="button" className="text-muted-foreground" onClick={() => setReportId(c.id)}>
                        Reportar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-3 flex min-w-0 flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Textarea
              aria-label="Escribe un comentario"
              value={draft}
              maxLength={COMMENT_MAX}
              className="min-h-20 w-full"
              placeholder="Escribe un comentario"
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={busy || !draft.trim()} loading={busy}>
              Enviar
            </Button>
          </form>
        </SheetContent>
      </Sheet>
      <ReportSheet
        open={reportId != null}
        onOpenChange={(o) => !o && setReportId(null)}
        targetType="comment"
        targetId={reportId ?? ""}
      />
    </>
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
  targetType: ReportTarget;
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
  const heading = targetType === "user" ? "Reportar usuario" : targetType === "comment" ? "Reportar comentario" : "Reportar publicación";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="px-5 pt-3 pb-2">
        <SheetTitle>{heading}</SheetTitle>
        <SheetDescription>Elige un motivo. La otra persona no sabrá quién lo ha enviado.</SheetDescription>
        <div className="mt-4 flex flex-col gap-2">
          {(Object.keys(REPORT_LABELS) as ReportReason[]).map((reason) => (
            <Button
              key={reason}
              variant="secondary"
              className="w-full justify-start"
              disabled={report.isPending || !targetId}
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
