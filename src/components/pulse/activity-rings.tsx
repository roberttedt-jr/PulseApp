import { cn } from "@/lib/utils";

function Ring({
  cx,
  cy,
  r,
  pct,
  color,
  track,
}: {
  cx: number;
  cy: number;
  r: number;
  pct: number;
  color: string;
  track: string;
}) {
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, pct));
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth="9.5" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        style={{ transition: "stroke-dashoffset 420ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </>
  );
}

export function ActivityRings({
  sessions,
  sessionGoal,
  volumePct,
  streakPct,
  size = 132,
  className,
}: {
  sessions: number;
  sessionGoal: number;
  volumePct: number;
  streakPct: number;
  size?: number;
  className?: string;
}) {
  const sessionPct = sessionGoal > 0 ? sessions / sessionGoal : 0;
  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 132 132" className="-rotate-90">
        <Ring cx={66} cy={66} r={54} pct={sessionPct} color="#FF2D55" track="rgb(255 45 85 / 0.16)" />
        <Ring cx={66} cy={66} r={40} pct={volumePct} color="#34C759" track="rgb(52 199 89 / 0.16)" />
        <Ring cx={66} cy={66} r={26} pct={streakPct} color="#FF9F0A" track="rgb(255 159 10 / 0.16)" />
      </svg>
    </div>
  );
}

export function WeekDots({
  dates,
}: {
  dates: { key: string; hit: boolean; label: string; today?: boolean }[];
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Días entrenados esta semana">
      {dates.map((d) => (
        <span key={d.key} className="flex flex-col items-center gap-1">
          <span
            className={cn(
              "size-2.5 rounded-full",
              d.hit ? "bg-warning" : "bg-muted",
              d.today && !d.hit && "ring-1 ring-warning/70",
            )}
          />
          <span className="text-[10px] text-foreground-tertiary">{d.label}</span>
        </span>
      ))}
    </div>
  );
}
