import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { PulseScoreBreakdown } from "@/lib/pulse/formulas";
import { cn } from "@/lib/utils";

export function PulseScoreGlass({
  score,
  breakdown,
}: {
  score: number;
  breakdown?: PulseScoreBreakdown | null;
}) {
  const [open, setOpen] = useState(false);
  const value = Math.min(100, Math.max(0, breakdown?.score ?? score));
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = value / 100;

  return (
    <section className="pulse-score-glass" data-pulse-score="1">
      <div className="flex items-center gap-4">
        <div className="relative grid size-[108px] shrink-0 place-items-center" aria-label={`Pulse Score ${value}`}>
          <svg width="108" height="108" viewBox="0 0 108 108" className="-rotate-90">
            <defs>
              <linearGradient id="pulse-score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF2D55" />
                <stop offset="100%" stopColor="#FF375F" />
              </linearGradient>
            </defs>
            <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="54"
              cy="54"
              r={r}
              fill="none"
              stroke="url(#pulse-score-grad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </svg>
          <span className="absolute tabular text-[28px] font-semibold tracking-tight">{value}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">Pulse Score</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {breakdown?.copy.headline ?? "Rendimiento semanal consolidado."}
          </p>
        </div>
      </div>

      {breakdown ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Metric label="Consistencia" value={breakdown.consistency} max={40} />
          <Metric label="Sobrecarga" value={breakdown.overload} max={40} />
          <Metric label="Recuperación" value={breakdown.recovery} max={20} />
        </div>
      ) : null}

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
          <li>{breakdown.copy.consistency}</li>
          <li>{breakdown.copy.overload}</li>
          <li>{breakdown.copy.recovery}</li>
        </ul>
      ) : null}
    </section>
  );
}

function Metric({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="rounded-2xl bg-white/4 px-2 py-2">
      <p className="text-[22px] font-semibold tabular tracking-tight">
        {value}
        <span className="text-[11px] font-medium text-muted-foreground">/{max}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
