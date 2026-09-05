import { useState } from "react";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { movementFamily, type MovementFamily } from "@/lib/pulse/exercise-meta";
import { cn } from "@/lib/utils";

function DemoSvg({ family, className }: { family: MovementFamily; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-full w-full", className)} aria-hidden>
      <rect width="160" height="120" rx="20" fill="rgb(28 28 30)" />
      {family === "press" && (
        <g className="demo-press" fill="none" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round">
          <line x1="40" y1="70" x2="120" y2="70" />
          <circle cx="80" cy="52" r="10" />
          <path d="M58 70 L58 46 M102 70 L102 46" />
        </g>
      )}
      {family === "pull" && (
        <g className="demo-pull" fill="none" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round">
          <path d="M40 28 H120" />
          <path d="M58 28 V62 H102 V28" />
          <circle cx="80" cy="78" r="10" />
        </g>
      )}
      {family === "squat" && (
        <g className="demo-squat" fill="none" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round">
          <circle cx="80" cy="28" r="8" />
          <path d="M80 36 V58" />
          <path d="M80 58 L58 88 M80 58 L102 88" />
        </g>
      )}
      {family === "hinge" && (
        <g className="demo-hinge" fill="none" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round">
          <circle cx="52" cy="38" r="8" />
          <path d="M58 44 L88 62 L88 96" />
          <path d="M88 62 L118 54" />
        </g>
      )}
      {family === "raise" && (
        <g className="demo-raise" fill="none" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round">
          <circle cx="80" cy="54" r="10" />
          <path d="M80 64 V88" />
          <path d="M80 58 L44 42 M80 58 L116 42" />
        </g>
      )}
      {family === "curl" && (
        <g className="demo-curl" fill="none" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round">
          <circle cx="62" cy="50" r="9" />
          <path d="M70 56 L104 78" />
          <path d="M104 78 L124 58" />
        </g>
      )}
      {(family === "core" || family === "cardio") && (
        <g className="demo-core" fill="none" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round">
          <path d="M40 80 H120" />
          <path d="M52 80 V52 H108 V80" />
          <circle cx="80" cy="40" r="8" />
        </g>
      )}
    </svg>
  );
}

export function ExerciseDemo({
  name,
  muscle,
  type,
  gifUrl,
  compact,
}: {
  name: string;
  muscle: string;
  type: string;
  gifUrl?: string | null;
  compact?: boolean;
}) {
  const family = movementFamily(name, muscle, type);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showGif = Boolean(gifUrl) && !failed;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card",
        compact ? "size-11 shrink-0 rounded-xl hairline" : "rounded-3xl hairline aspect-[16/11]",
      )}
    >
      {showGif ? (
        <>
          {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
          <img
            src={gifUrl!}
            alt={`Demostración de ${name}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <div className="relative h-full w-full">
          <DemoSvg family={family} />
          {!compact && (
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-foreground">
              <Play className="size-3 fill-current" /> Demo Pulse
            </span>
          )}
        </div>
      )}
    </div>
  );
}
