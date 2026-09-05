import { cn } from "@/lib/utils";

export function ScoreRing({
  value,
  size = 72,
  label = "Pulse",
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value)) / 100;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-label={`${label} ${value}`}>
      <svg width={size} height={size} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" className="text-muted" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className={cn("absolute tabular text-xl font-semibold tracking-tight")}>{value}</span>
    </div>
  );
}
