import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { EmptyState } from "@/components/pulse/empty-state";
import { PostCard } from "@/components/pulse/social";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBootstrap } from "@/lib/pulse/fns";
import { getFeedPost } from "@/lib/pulse/social-fns";

export const Route = createFileRoute("/feed/p/$postId")({ component: FeedPostPage });

function FeedPostPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const units = bootstrap.data?.profile.units ?? "metric";
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["feed-post", postId],
    queryFn: () => getFeedPost({ data: { postId } }),
  });

  return (
    <AppPage
      title="Entrenamiento"
      action={
        <button type="button" className="text-sm text-primary" onClick={() => void navigate({ to: "/feed" })}>
          Cerrar
        </button>
      }
    >
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        {isPending && <Skeleton className="h-48 w-full rounded-[22px]" />}
        {isError && (
          <EmptyState
            icon={Dumbbell}
            title="No se ha encontrado este entrenamiento."
            hint="Puede que sea privado o que ya no esté disponible."
            action={<Button onClick={() => void refetch()}>Reintentar</Button>}
          />
        )}
        {data?.post && (
          <PostCard post={data.post} units={units} openComments onChanged={() => void refetch()} />
        )}
      </div>
    </AppPage>
  );
}
