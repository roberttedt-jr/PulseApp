import { displayMuscle, MUSCLE_CARD_ORDER, normalizeMuscle } from "@/lib/pulse/exercise-meta";
import { cn, daysAgoEs, formatKg } from "@/lib/utils";
import { useMemo, useState } from "react";

export type MuscleLoad = {
  muscle: string;
  sets: number;
  volume: number;
  last?: string | null;
  prevSets?: number;
  prevVolume?: number;
};

export type MuscleExercise = { muscle: string; name: string; sets: number };

export const MUSCLE_ZONES = MUSCLE_CARD_ORDER;
export type MuscleZone = (typeof MUSCLE_ZONES)[number];

type SortKey = "most" | "alpha";

function mergeLoads(loads: MuscleLoad[]) {
  const m = new Map<string, MuscleLoad>();
  for (const row of loads) {
    const key = String(normalizeMuscle(row.muscle));
    const prev = m.get(key);
    if (!prev) {
      m.set(key, { ...row, muscle: key });
      continue;
    }
    m.set(key, {
      muscle: key,
      sets: prev.sets + row.sets,
      volume: prev.volume + row.volume,
      last: row.last && (!prev.last || row.last > prev.last) ? row.last : prev.last,
      prevSets: (prev.prevSets ?? 0) + (row.prevSets ?? 0),
      prevVolume: (prev.prevVolume ?? 0) + (row.prevVolume ?? 0),
    });
  }
  return m;
}

export function muscleInsight(
  loads: MuscleLoad[],
  periodPhrase = "esta semana",
): { hint: string; totalSets: number } {
  const map = mergeLoads(loads);
  const trained = MUSCLE_ZONES.map((z) => map.get(z)).filter((r): r is MuscleLoad => !!r && r.sets > 0);
  const totalSets = trained.reduce((s, r) => s + r.sets, 0);
  if (trained.length === 0) {
    return { hint: "Completa tu primer entrenamiento para ver tu balance.", totalSets: 0 };
  }
  const chest = map.get("Pecho");
  const back = map.get("Espalda");
  if (chest && back && chest.volume > 0 && back.volume > 0) {
    if (back.volume >= chest.volume * 1.25) {
      return {
        hint: `${periodPhrase.charAt(0).toUpperCase()}${periodPhrase.slice(1)} has registrado más volumen de espalda que de pecho.`,
        totalSets,
      };
    }
    if (chest.volume >= back.volume * 1.25) {
      return {
        hint: `${periodPhrase.charAt(0).toUpperCase()}${periodPhrase.slice(1)} has registrado más volumen de pecho que de espalda.`,
        totalSets,
      };
    }
  }
  const top = [...trained].sort((a, b) => b.volume - a.volume || b.sets - a.sets)[0];
  return {
    hint: `${displayMuscle(top!.muscle)} concentra ${Math.round(top!.sets)} series ${periodPhrase}.`,
    totalSets,
  };
}

export function MuscleBalance({
  loads,
  compact,
  periodLabel = "Esta semana",
  periodPhrase = "esta semana",
  units = "metric",
  onOpenHistory,
}: {
  loads: MuscleLoad[];
  selected?: string | null;
  onSelect?: (muscle: string | null) => void;
  compact?: boolean;
  periodLabel?: string;
  periodPhrase?: string;
  units?: "metric" | "imperial";
  topExercises?: MuscleExercise[];
  onOpenHistory?: (muscle: string) => void;
  onOpenLibrary?: (muscle: string) => void;
  onOpenProgress?: (muscle: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("most");
  const [showAll, setShowAll] = useState(false);
  const map = useMemo(() => mergeLoads(loads), [loads]);
  const maxSets = Math.max(1, ...MUSCLE_ZONES.map((z) => map.get(z)?.sets ?? 0));
  const rows = MUSCLE_ZONES.map((muscle) => {
    const raw = map.get(muscle);
    return {
      muscle,
      label: displayMuscle(muscle),
      sets: raw?.sets ?? 0,
      volume: raw?.volume ?? 0,
      last: raw?.last ?? null,
      prevSets: raw?.prevSets,
      prevVolume: raw?.prevVolume,
    };
  });
  const trained = rows.filter((r) => r.sets > 0);
  const visible = (showAll ? rows : trained).slice().sort((a, b) => {
    if (sort === "alpha") return a.label.localeCompare(b.label, "es");
    return b.sets - a.sets || b.volume - a.volume || a.label.localeCompare(b.label, "es");
  });
  const insight = muscleInsight(loads, periodPhrase);
  const empty = trained.length === 0;

  return (
    <div className="flex min-w-0 max-w-full flex-col overflow-x-clip">
      {!compact && (
        <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{periodLabel}</p>
      )}
      {empty ? (
        <p className="py-4 text-sm leading-relaxed text-muted-foreground">
          Completa tu primer entrenamiento para ver tu balance.
        </p>
      ) : (
        <>
          {!compact && insight.hint && (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{insight.hint}</p>
          )}
          {!compact && (
            <div className="mb-3 flex items-center gap-2">
              <div className="flex flex-1 rounded-full glass-pill p-1" role="tablist" aria-label="Ordenar">
                {(
                  [
                    ["most", "Más volumen"],
                    ["alpha", "A–Z"],
                  ] as const
                ).map(([k, lab]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={sort === k}
                    onClick={() => setSort(k)}
                    className={cn(
                      "h-8 flex-1 rounded-full text-[13px] font-medium transition-colors pressable-feedback",
                      sort === k ? "glass-pill-on" : "text-muted-foreground",
                    )}
                  >
                    {lab}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ul className={cn("space-y-1.5", compact && "space-y-1")}>
            {visible.map((row) => {
              const bar = Math.min(1, row.sets / maxSets);
              const delta =
                row.prevSets != null && row.prevSets > 0
                  ? row.sets - row.prevSets
                  : null;
              return (
                <li key={row.muscle}>
                  <button
                    type="button"
                    onClick={() => onOpenHistory?.(row.muscle)}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-3 rounded-2xl glass-pill px-3 text-left pressable",
                      compact ? "h-11" : "min-h-14 py-2.5",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[15px] font-medium">{row.label}</p>
                        <p className="shrink-0 tabular text-sm font-semibold">
                          {Math.round(row.sets)} {Math.round(row.sets) === 1 ? "serie" : "series"}
                        </p>
                      </div>
                      {!compact && (
                        <>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/80">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(bar * 100)}%` }} />
                          </div>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {row.volume > 0 ? formatKg(row.volume, units) : "Sin peso"}
                            {row.last ? ` · ${daysAgoEs(row.last)}` : ""}
                            {delta != null && delta !== 0
                              ? ` · ${delta > 0 ? "+" : ""}${Math.round(delta)} vs periodo anterior`
                              : ""}
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {!compact && trained.length < rows.length && (
            <button
              type="button"
              className="mt-3 w-full text-center text-sm text-accent"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Ver solo con datos" : "Ver todos"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const MuscleMap = MuscleBalance;
