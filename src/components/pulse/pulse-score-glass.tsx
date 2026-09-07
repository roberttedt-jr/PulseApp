import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { PulseScoreBreakdown } from "@/lib/pulse/formulas";
import { cn } from "@/lib/utils";

const RINGS = [
  { key: "consistency", label: "Consistencia", color: "#FF2D55", track: "rgba(255,45,85,0.18)", r: 54, max: 40 },
  { key: "overload", label: "Sobrecarga", color: "#AF52DE", track: "rgba(175,82,222,0.18)", r: 40, max: 40 },
  { key: "recovery", label: "Recuperación", color: "#00F0FF", track: "rgba(0,240,255,0.18)", r: 26, max: 20 },
] as const;

function Ring({
  r,
  pct,
  color,
  track,
}: {
  r: number;
  pct: number;
  color: string;
  track: string;
}) {
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, pct));
  return (
    <>
      <circle cx="70" cy="70" r={r} fill="none" stroke={track} strokeWidth="10" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </>
  );
}

export function PulseScoreGlass({
  score,
  breakdown,
}: {
  score: number;
  breakdown?: PulseScoreBreakdown | null;
}) {
  const [open, setOpen] = useState(false);
  const value = Math.min(100, Math.max(0, breakdown?.score ?? score));
  const consistency = breakdown?.consistency ?? 0;
  const overload = breakdown?.overload ?? 0;
  const recovery = breakdown?.recovery ?? 0;
  const pcts = [consistency / 40, overload / 40, recovery / 20];

  return (
    <section className="pulse-score-glass" data-pulse-score="1">
      <button
        type="button"
        className="flex w-full items-center gap-4 text-left pressable-feedback"
        aria-expanded={open}
        aria-label={`Pulse Score ${value}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="relative grid size-[140px] shrink-0 place-items-center overflow-visible">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            {RINGS.map((ring, i) => (
              <Ring key={ring.key} r={ring.r} pct={pcts[i] ?? 0} color={ring.color} track={ring.track} />
            ))}
          </svg>
          <span className="absolute flex flex-col items-center">
            <span className="tabular text-[28px] leading-none font-semibold tracking-tight">{value}</span>
            <span className="mt-1 text-[9px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              PulseScore
            </span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">Pulse Score</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {breakdown?.copy.headline ?? "Rendimiento semanal consolidado."}
          </p>
          <ul className="mt-3 space-y-1.5">
            {RINGS.map((ring, i) => {
              const pts = [consistency, overload, recovery][i] ?? 0;
              return (
                <li key={ring.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ background: ring.color }} />
                  <span className="min-w-0 flex-1 truncate">{ring.label}</span>
                  <span className="tabular text-foreground">
                    {pts}/{ring.max}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </button>

      <button
        type="button"
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 text-sm text-muted-foreground pressable-feedback"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ¿Cómo se calcula?
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && breakdown ? (
        <ul className="space-y-2 pb-1 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-[#FF2D55]">Consistencia.</span> {breakdown.copy.consistency}
          </li>
          <li>
            <span className="font-medium text-[#AF52DE]">Sobrecarga.</span> {breakdown.copy.overload}
          </li>
          <li>
            <span className="font-medium text-[#00F0FF]">Recuperación.</span> {breakdown.copy.recovery}
          </li>
        </ul>
      ) : null}
    </section>
  );
}
