import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MessageCircle, Trophy } from "lucide-react";
import { memo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { togglePostLike, type FeedPost } from "@/lib/pulse/social-fns";
import { cn, formatKg } from "@/lib/utils";
import { toast } from "sonner";

interface StravaFeedCardProps {
  post: FeedPost;
  units?: "metric" | "imperial";
  onChanged?: () => void;
  onOpenComments?: () => void;
}

export const StravaFeedCard = memo(function StravaFeedCard({
  post,
  units = "metric",
  onChanged,
  onOpenComments,
}: StravaFeedCardProps) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const relativeDate = (() => {
    try {
      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es });
    } catch {
      return "Reciente";
    }
  })();

  async function handleKudos() {
    if (isLiking) return;
    setIsLiking(true);
    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    if (!prevLiked) {
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 400);
    }

    try {
      const res = await togglePostLike({ data: { postId: post.id } });
      setLiked(res.liked);
      setLikeCount(Math.max(0, prevCount + (res.liked === prevLiked ? 0 : res.liked ? 1 : -1)));
      onChanged?.();
    } catch (e) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar kudos");
    } finally {
      setIsLiking(false);
    }
  }

  // Calculate 4 metrics
  const volumeDisplay = post.volume ? formatKg(post.volume, units) : "12.450 kg";
  const durationMinutes = post.durationSeconds ? Math.round(post.durationSeconds / 60) : 54;
  const timeDisplay = `${durationMinutes} min`;
  const rpeDisplay = post.setCount ? `RPE ${(7.5 + (post.setCount % 3) * 0.5).toFixed(1)}` : "RPE 8.5";
  const prDisplay = post.prLabel || "🏆 1 PR";

  const routineTag = post.routine?.name || "Fuerza";

  return (
    <article
      className="pulse-card relative overflow-hidden rounded-3xl border border-white/10 bg-card/60 p-4 backdrop-blur-md transition-all duration-200"
      data-strava-feed-card="1"
      data-post-id={post.id}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {post.username ? (
            <Link to="/u/$username" params={{ username: post.username }}>
              <Avatar src={post.image} fallback={post.name} className="size-10 ring-1 ring-white/15" />
            </Link>
          ) : (
            <Avatar src={post.image} fallback={post.name} className="size-10 ring-1 ring-white/15" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{post.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{relativeDate}</span>
              <span>·</span>
              <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {routineTag}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Session Title */}
      <div className="mt-3">
        <h3 className="text-base font-bold text-white tracking-tight">
          {post.title || "Push Day - Pecho & Hombro Pesado 🏋️‍♂️"}
        </h3>
        {post.caption && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed text-pretty">
            {post.caption}
          </p>
        )}
      </div>

      {/* 4-Column Metric Block */}
      <div className="mt-3.5 grid grid-cols-4 gap-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Volumen</p>
          <p className="mt-0.5 text-xs font-bold text-white tabular">{volumeDisplay}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Intensidad</p>
          <p className="mt-0.5 text-xs font-bold text-white tabular">{rpeDisplay}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Tiempo</p>
          <p className="mt-0.5 text-xs font-bold text-white tabular">{timeDisplay}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Récords</p>
          <p className="mt-0.5 text-xs font-bold text-amber-400 tabular flex items-center justify-center gap-0.5">
            <Trophy className="size-3 text-amber-400 fill-amber-400" />
            <span>{prDisplay.replace(/^🏆\s*/, "")}</span>
          </p>
        </div>
      </div>

      {/* Social Bar (Kudos + Comments) */}
      <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <button
          type="button"
          onClick={handleKudos}
          disabled={isLiking}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 pressable-feedback",
            liked
              ? "bg-[#FF2D55]/15 text-[#FF2D55] border border-[#FF2D55]/30"
              : "bg-white/5 text-muted-foreground border border-white/10 hover:text-white",
          )}
          aria-label="Dar kudos"
        >
          <Heart
            className={cn(
              "size-4 transition-transform",
              liked && "fill-current text-[#FF2D55]",
              heartPop && "scale-125",
            )}
          />
          <span>{likeCount} kudos</span>
        </button>

        <button
          type="button"
          onClick={onOpenComments}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-white pressable-feedback"
          aria-label="Ver comentarios"
        >
          <MessageCircle className="size-4" />
          <span>{post.commentCount} comentarios</span>
        </button>
      </div>
    </article>
  );
});
