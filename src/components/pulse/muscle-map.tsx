import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { normalizeMuscle } from "@/lib/pulse/exercise-meta";
import { cn, formatKg } from "@/lib/utils";

export type MuscleLoad = {
  muscle: string;
  sets: number;
  volume: number;
  last?: string | null;
  prevSets?: number;
  prevVolume?: number;
};

export type MuscleExercise = { muscle: string; name: string; sets: number };

export const MUSCLE_ZONES = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Core",
  "Cuádriceps",
  "Femorales",
  "Glúteos",
  "Pantorrillas",
] as const;

export type MuscleZone = (typeof MUSCLE_ZONES)[number];

type Level = 0 | 1 | 2 | 3;
type SortKey = "most" | "least" | "alpha";
type Trend = "up" | "down" | "flat" | "new" | null;

const LEVEL_LABEL: Record<Level, string> = {
  0: "Inactivo",
  1: "Bajo",
  2: "Medio",
  3: "Alto",
};

function level(sets: number, max: number): Level {
  if (sets <= 0 || max <= 0) return 0;
  const r = sets / max;
  if (r < 0.28) return 1;
  if (r < 0.62) return 2;
  return 3;
}

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

function trendOf(sets: number, prevSets: number | undefined): Trend {
  if (prevSets == null) return null;
  if (prevSets === 0 && sets === 0) return "flat";
  if (prevSets === 0 && sets > 0) return "new";
  if (sets > prevSets * 1.08) return "up";
  if (sets < prevSets * 0.92) return "down";
  return "flat";
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

type Row = {
  muscle: MuscleZone;
  sets: number;
  volume: number;
  last: string | null;
  prevSets: number | undefined;
  prevVolume: number | undefined;
  lv: Level;
  pct: number;
  share: number;
  trend: Trend;
};

function buildRows(loads: MuscleLoad[]): { rows: Row[]; max: number; totalSets: number; totalVolume: number } {
  const map = mergeLoads(loads);
  const max = Math.max(1, ...MUSCLE_ZONES.map((z) => map.get(z)?.sets ?? 0));
  const totalSets = MUSCLE_ZONES.reduce((s, z) => s + (map.get(z)?.sets ?? 0), 0);
  const totalVolume = MUSCLE_ZONES.reduce((s, z) => s + (map.get(z)?.volume ?? 0), 0);
  const rows: Row[] = MUSCLE_ZONES.map((muscle) => {
    const raw = map.get(muscle);
    const sets = raw?.sets ?? 0;
    const hasPrev = raw && "prevSets" in raw && raw.prevSets != null;
    return {
      muscle,
      sets,
      volume: raw?.volume ?? 0,
      last: raw?.last ?? null,
      prevSets: hasPrev ? raw.prevSets : undefined,
      prevVolume: hasPrev ? raw.prevVolume : undefined,
      lv: level(sets, max),
      pct: max > 0 ? Math.min(1, sets / max) : 0,
      share: totalSets > 0 ? sets / totalSets : 0,
      trend: trendOf(sets, hasPrev ? raw?.prevSets : undefined),
    };
  });
  return { rows, max, totalSets, totalVolume };
}

function sortRows(rows: Row[], sort: SortKey) {
  const copy = [...rows];
  if (sort === "alpha") return copy.sort((a, b) => a.muscle.localeCompare(b.muscle, "es"));
  if (sort === "least") {
    return copy.sort((a, b) => a.sets - b.sets || a.muscle.localeCompare(b.muscle, "es"));
  }
  return copy.sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle, "es"));
}

export function muscleInsight(
  loads: MuscleLoad[],
  periodPhrase = "esta semana",
): { top?: MuscleLoad; low?: MuscleLoad; hint: string; totalSets: number } {
  const { rows, totalSets } = buildRows(loads);
  const trained = rows.filter((r) => r.sets > 0).sort((a, b) => b.sets - a.sets);
  const top = trained[0];
  const low = trained.length ? trained[trained.length - 1] : rows.slice().sort((a, b) => a.sets - b.sets)[0];
  if (!top) {
    return {
      hint: "Completa tu primer entrenamiento para ver tu equilibrio muscular.",
      totalSets: 0,
    };
  }
  const chest = rows.find((r) => r.muscle === "Pecho")?.sets ?? 0;
  const back = rows.find((r) => r.muscle === "Espalda")?.sets ?? 0;
  const quads = rows.find((r) => r.muscle === "Cuádriceps")?.sets ?? 0;
  const hams = rows.find((r) => r.muscle === "Femorales")?.sets ?? 0;
  let hint = `${periodPhrase.charAt(0).toUpperCase()}${periodPhrase.slice(1)} has completado ${Math.round(totalSets)} series.`;
  if (chest > 0 && back > 0 && chest >= back * 1.35) {
    hint = `Tu volumen de pecho está por encima del de espalda ${periodPhrase}.`;
  } else if (back > 0 && chest > 0 && back >= chest * 1.35) {
    hint = `Tu volumen de espalda está por encima del de pecho ${periodPhrase}.`;
  } else if (quads > 0 && hams > 0 && quads >= hams * 1.35) {
    hint = `Has trabajado más cuádriceps que femorales ${periodPhrase}.`;
  } else if (hams > 0 && quads > 0 && hams >= quads * 1.35) {
    hint = `Has trabajado más femorales que cuádriceps ${periodPhrase}.`;
  } else if (low && low.muscle !== top.muscle) {
    hint = `${top.muscle} lidera con ${Math.round(top.sets)} series. ${low.muscle} va más atrás.`;
  }
  return {
    top: { muscle: top.muscle, sets: top.sets, volume: top.volume, last: top.last },
    low: low ? { muscle: low.muscle, sets: low.sets, volume: low.volume, last: low.last } : undefined,
    hint,
    totalSets,
  };
}

function balanceLabel(rows: Row[]) {
  const trained = rows.filter((r) => r.sets > 0);
  if (trained.length === 0) return "Sin datos";
  if (trained.length < 4) return "Incompleto";
  const max = Math.max(...trained.map((r) => r.sets));
  const min = Math.min(...trained.map((r) => r.sets));
  return max > min * 3 ? "Desigual" : "Equilibrado";
}

const ICONS: Record<MuscleZone, (p: { className?: string }) => ReactNode> = {
  Pecho: IconPecho,
  Espalda: IconEspalda,
  Hombros: IconHombros,
  Bíceps: IconBiceps,
  Tríceps: IconTriceps,
  Core: IconCore,
  Cuádriceps: IconQuads,
  Femorales: IconHams,
  Glúteos: IconGlutes,
  Pantorrillas: IconCalves,
};

function iconStroke(p: { className?: string; children: ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={p.className}
      role="img"
      aria-label={`Icono de ${p.label}`}
    >
      <title>{p.label}</title>
      {p.children}
    </svg>
  );
}

function IconPecho({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Pecho",
    children: (
      <>
        <path d="M11.3 6.6c-3.9.4-6.1 2.8-6.1 6.2 0 2.9 1.6 5.3 5.4 7" />
        <path d="M12.7 6.6c3.9.4 6.1 2.8 6.1 6.2 0 2.9-1.6 5.3-5.4 7" />
        <path d="M11.3 6.6h1.4" />
      </>
    ),
  });
}

function IconEspalda({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Espalda",
    children: (
      <>
        <path d="M12 5.2v13.6" />
        <path d="M8.4 6.2h7.2" />
        <path d="M12 7.2C8.2 8.4 5.8 11.6 5.2 16.6" />
        <path d="M12 7.2c3.8 1.2 6.2 4.4 6.8 9.4" />
        <path d="M8 18.2h8" />
      </>
    ),
  });
}

function IconHombros({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Hombros",
    children: (
      <>
        <path d="M5.2 16.4V11.2C5.2 7.8 8.2 5.8 12 5.8s6.8 2 6.8 5.4v5.2" />
        <path d="M5.2 11.4c-1.6-.4-2.4-2-1.4-3.3" />
        <path d="M18.8 11.4c1.6-.4 2.4-2 1.4-3.3" />
      </>
    ),
  });
}

function IconBiceps({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Bíceps",
    children: (
      <>
        <path d="M5.4 18c.4-4 2.6-7.2 6.8-8.4" />
        <path d="M12.2 9.6c1.5 2.5 1.2 6.2-1.2 8.4" />
        <path d="M12.2 9.6c2.8-3.4 8-2.6 8.8 2.2.6 3.2-1.8 5.2-4.6 5" />
      </>
    ),
  });
}

function IconTriceps({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Tríceps",
    children: (
      <>
        <path d="M4.8 9.6h8.6" />
        <path d="M13.4 9.6v9.2" />
        <path d="M13.4 9.6c2.6.1 4.4 2 4.7 4.6" />
      </>
    ),
  });
}

function IconCore({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Core",
    children: (
      <>
        <circle cx="12" cy="12" r="7.6" />
        <circle cx="12" cy="12" r="4.4" />
        <circle cx="12" cy="12" r="1.25" />
      </>
    ),
  });
}

function IconQuads({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Cuádriceps",
    children: (
      <>
        <path d="M6 19V11.2" />
        <path d="M10 19V5.8" />
        <path d="M14 19V5.8" />
        <path d="M18 19V11.2" />
      </>
    ),
  });
}

function IconHams({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Femorales",
    children: (
      <>
        <path d="M8.4 5.2c-1.5 4.6-1.4 9.4.8 14.3" />
        <path d="M15.6 5.2c1.5 4.6 1.4 9.4-.8 14.3" />
      </>
    ),
  });
}

function IconGlutes({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Glúteos",
    children: (
      <>
        <path d="M4.2 17.6c0-5 2.3-8.4 4.8-8.4 2.4 0 4.5 3.2 4.8 8.4" />
        <path d="M19.8 17.6c0-5-2.3-8.4-4.8-8.4-2.4 0-4.5 3.2-4.8 8.4" />
        <path d="M4.2 17.6h15.6" />
      </>
    ),
  });
}

function IconCalves({ className }: { className?: string }) {
  return iconStroke({
    className,
    label: "Pantorrillas",
    children: (
      <>
        <path d="M8.7 5c-2.8 2.4-3.3 8.8-.2 14.6 2.2-5.2 2.6-10.4.2-14.6Z" />
        <path d="M15.3 5c2.8 2.4 3.3 8.8.2 14.6-2.2-5.2-2.6-10.4-.2-14.6Z" />
      </>
    ),
  });
}

function MuscleIcon({ muscle, className }: { muscle: MuscleZone; className?: string }) {
  const Icon = ICONS[muscle];
  return <Icon className={cn("size-5", className)} />;
}

function TrendMark({ trend, className }: { trend: Trend; className?: string }) {
  if (!trend) return null;
  if (trend === "flat") {
    return <Minus className={cn("size-3.5 text-muted-foreground", className)} aria-hidden />;
  }
  if (trend === "up" || trend === "new") {
    return <TrendingUp className={cn("size-3.5 text-success", className)} aria-hidden />;
  }
  return <TrendingDown className={cn("size-3.5 text-warning", className)} aria-hidden />;
}

function trendCopy(row: Row) {
  if (row.trend == null) return null;
  const prev = row.prevSets ?? 0;
  const delta = Math.round(row.sets - prev);
  if (row.trend === "new") return "Nuevo en este periodo";
  if (delta === 0 || row.trend === "flat") return "Igual que el periodo anterior";
  if (delta > 0) return `${delta} series más que el periodo anterior`;
  return `${Math.abs(delta)} series menos que el periodo anterior`;
}

function SegmentedRing({
  rows,
  selected,
  onSelect,
  size,
  totalSets,
}: {
  rows: Row[];
  selected: string | null;
  onSelect: (muscle: MuscleZone) => void;
  size: number;
  totalSets: number;
}) {
  const uid = useId().replace(/:/g, "");
  const n = rows.length;
  const gap = 4;
  const slice = 360 / n;
  const r = 38;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="overflow-visible"
        role="img"
        aria-label="Distribución de series por grupo muscular"
      >
        <defs>
          <filter id={`ms-glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {rows.map((row, i) => {
          const start = i * slice + gap / 2;
          const end = (i + 1) * slice - gap / 2;
          const on = selected === row.muscle;
          return (
            <path
              key={row.muscle}
              d={arcPath(50, 50, r, start, end)}
              fill="none"
              className={cn("muscle-seg", on ? "muscle-seg-on" : `muscle-seg-${row.lv}`)}
              strokeWidth={on ? 11 : 8.5}
              strokeLinecap="butt"
              style={on ? { filter: `url(#ms-glow-${uid})` } : undefined}
              role="button"
              tabIndex={0}
              aria-label={`${row.muscle}: ${Math.round(row.sets)} series`}
              aria-pressed={on}
              onClick={() => onSelect(row.muscle)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(row.muscle);
                }
              }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="tabular text-[22px] leading-none font-semibold tracking-tight">{Math.round(totalSets)}</p>
          <p className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">series</p>
        </div>
      </div>
    </div>
  );
}

function MuscleTile({
  row,
  selected,
  compact,
  onSelect,
}: {
  row: Row;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const label = [
    row.muscle,
    `${Math.round(row.sets)} series`,
    LEVEL_LABEL[row.lv],
    row.trend === "up" || row.trend === "new" ? "tendencia al alza" : row.trend === "down" ? "tendencia a la baja" : "",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        "muscle-tile pressable h-full min-h-touch w-full rounded-2xl text-left",
        compact ? "px-3 py-2.5" : "px-3 py-3",
        selected ? "muscle-tile-on" : "bg-muted/70",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-xl",
            compact ? "size-8" : "size-9",
            `muscle-ico-${row.lv}`,
            selected && "muscle-ico-on",
          )}
        >
          <MuscleIcon muscle={row.muscle} className={compact ? "size-[18px]" : "size-5"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-semibold tracking-tight">{row.muscle}</span>
            {row.trend ? <TrendMark trend={row.trend} /> : null}
          </span>
          <span className="mt-0.5 flex items-baseline justify-between gap-2">
            <span className="tabular text-[12px] text-muted-foreground">
              {Math.round(row.sets)} {row.sets === 1 ? "serie" : "series"}
            </span>
            <span className="text-[11px] font-medium text-foreground-tertiary">{LEVEL_LABEL[row.lv]}</span>
          </span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-ios-elevated">
            <span
              className={cn("block h-full rounded-full muscle-bar", `muscle-bar-${row.lv}`)}
              style={{ width: `${Math.max(row.lv === 0 ? 0 : 8, row.pct * 100)}%` }}
            />
          </span>
        </span>
      </div>
    </button>
  );
}

function DetailSheet({
  row,
  totalSets,
  totalVolume,
  exercises,
  periodPhrase,
  open,
  onOpenChange,
  onOpenHistory,
  onOpenLibrary,
  onOpenProgress,
}: {
  row: Row | null;
  totalSets: number;
  totalVolume: number;
  exercises: MuscleExercise[];
  periodPhrase: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenHistory?: (muscle: string) => void;
  onOpenLibrary?: (muscle: string) => void;
  onOpenProgress?: (muscle: string) => void;
}) {
  if (!row) return null;
  const share = totalSets > 0 ? Math.round(row.share * 100) : 0;
  const volShare = totalVolume > 0 ? Math.round((row.volume / totalVolume) * 100) : 0;
  const last = row.last ? format(new Date(row.last), "d MMM", { locale: es }) : null;
  const Icon = ICONS[row.muscle];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="px-5 pt-3 pb-6">
        <SheetTitle className="sr-only">{row.muscle}</SheetTitle>
        <SheetDescription className="sr-only">
          Detalle de series, volumen y ejercicios de {row.muscle}
        </SheetDescription>
        <div className="flex items-start gap-3 pr-8">
          <span className={cn("grid size-12 place-items-center rounded-2xl", `muscle-ico-${row.lv}`, "muscle-ico-on")}>
            <Icon className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[22px] leading-tight font-semibold tracking-tight">{row.muscle}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {LEVEL_LABEL[row.lv]} · {share}% de las series {periodPhrase}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatCell k="Series" v={String(Math.round(row.sets))} />
          <StatCell k="Volumen" v={formatKg(row.volume)} />
          <StatCell k="Del total" v={`${volShare}%`} />
        </div>

        <div className="mt-3 rounded-2xl bg-muted px-4 py-3">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Última sesión</p>
          <p className="mt-0.5 text-sm font-medium">{last ? last : "Sin sesiones en este periodo"}</p>
          {trendCopy(row) && (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <TrendMark trend={row.trend} />
              <span className="text-muted-foreground">{trendCopy(row)}</span>
            </p>
          )}
        </div>

        {exercises.length > 0 ? (
          <div className="mt-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Ejercicios principales</p>
            <ul className="mt-2 divide-y divide-border">
              {exercises.slice(0, 5).map((e) => (
                <li key={e.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate">{e.name}</span>
                  <span className="tabular text-muted-foreground">{e.sets} series</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Aún no hay series de {row.muscle.toLowerCase()} {periodPhrase}.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {onOpenHistory && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenHistory(row.muscle);
              }}
            >
              Ver historial
            </Button>
          )}
          {onOpenLibrary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenLibrary(row.muscle);
              }}
            >
              Biblioteca
            </Button>
          )}
          {onOpenProgress && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenProgress(row.muscle);
              }}
            >
              Ver balance
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatCell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-3">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{k}</p>
      <p className="mt-1 tabular text-[15px] font-semibold tracking-tight">{v}</p>
    </div>
  );
}

function SummaryChip({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{k}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tracking-tight">{v}</p>
      {sub ? <p className="truncate text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function MuscleMap({
  loads,
  selected,
  onSelect,
  compact,
  periodLabel = "Esta semana",
  periodPhrase = "esta semana",
  topExercises = [],
  onOpenHistory,
  onOpenLibrary,
  onOpenProgress,
}: {
  loads: MuscleLoad[];
  selected?: string | null;
  onSelect?: (muscle: string | null) => void;
  compact?: boolean;
  periodLabel?: string;
  periodPhrase?: string;
  topExercises?: MuscleExercise[];
  onOpenHistory?: (muscle: string) => void;
  onOpenLibrary?: (muscle: string) => void;
  onOpenProgress?: (muscle: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("most");
  const [internal, setInternal] = useState<string | null>(null);
  const current = selected !== undefined ? selected : internal;

  useEffect(() => {
    if (selected) setInternal(selected);
  }, [selected]);

  const { rows, totalSets, totalVolume } = useMemo(() => buildRows(loads), [loads]);
  const insight = useMemo(() => muscleInsight(loads, periodPhrase), [loads, periodPhrase]);
  const ordered = useMemo(() => sortRows(rows, compact ? "most" : sort), [rows, sort, compact]);
  const selectedRow = rows.find((r) => r.muscle === current) ?? null;
  const trained = rows.filter((r) => r.sets > 0);
  const top = insight.top;
  const low = insight.low;
  const empty = totalSets <= 0;

  function pick(muscle: string) {
    const next = current === muscle ? null : muscle;
    setInternal(next);
    onSelect?.(next);
  }

  const selectedEx = topExercises.filter((e) => String(normalizeMuscle(e.muscle)) === current);

  return (
    <div className="flex min-w-0 max-w-full flex-col overflow-x-clip">
      {!compact && (
        <div className="mb-4 hidden gap-2 md:grid md:grid-cols-4">
          <SummaryChip
            k="Más trabajado"
            v={top && top.sets > 0 ? top.muscle : "—"}
            sub={top && top.sets > 0 ? `${Math.round(top.sets)} series` : "Sin datos"}
          />
          <SummaryChip
            k="Menos trabajado"
            v={low && trained.length ? low.muscle : "—"}
            sub={low && trained.length ? `${Math.round(low.sets)} series` : "Sin datos"}
          />
          <SummaryChip k="Series totales" v={String(Math.round(totalSets))} sub={periodLabel} />
          <SummaryChip k="Balance" v={balanceLabel(rows)} sub={`${trained.length}/10 grupos`} />
        </div>
      )}

      <div className={cn("flex items-center gap-4", compact ? "mb-4" : "mb-5")}>
        <SegmentedRing
          rows={rows}
          selected={current}
          onSelect={pick}
          size={compact ? 108 : 132}
          totalSets={totalSets}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{periodLabel}</p>
          {empty ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Completa tu primer entrenamiento para ver tu equilibrio muscular.
            </p>
          ) : (
            <>
              <p className="mt-1 text-[15px] leading-snug font-medium">
                {Math.round(totalSets)} series · {trained.length} grupos
              </p>
              {top && top.sets > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Más: {top.muscle} · {Math.round(top.sets)}
                  {low && low.muscle !== top.muscle ? ` · Menos: ${low.muscle} · ${Math.round(low.sets)}` : ""}
                </p>
              )}
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{insight.hint}</p>
            </>
          )}
        </div>
      </div>

      {!compact && (
        <div
          className="mb-3 flex rounded-full bg-muted p-1"
          role="tablist"
          aria-label="Ordenar grupos musculares"
        >
          {(
            [
              ["most", "Más"],
              ["least", "Menos"],
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
                "h-8 flex-1 rounded-full text-[13px] font-medium transition-colors duration-200",
                sort === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {lab}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn("grid grid-cols-2 gap-2", compact ? "md:grid-cols-2" : "md:grid-cols-3")}
      >
        {ordered.map((row) => (
          <MuscleTile
            key={row.muscle}
            row={row}
            selected={current === row.muscle}
            compact={compact}
            onSelect={() => pick(row.muscle)}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {([0, 1, 2, 3] as Level[]).map((lv) => (
          <li key={lv} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-[3px]", `muscle-swatch-${lv}`)} />
            {LEVEL_LABEL[lv]}
          </li>
        ))}
      </ul>

      <DetailSheet
        row={selectedRow}
        totalSets={totalSets}
        totalVolume={totalVolume}
        exercises={selectedEx}
        periodPhrase={periodPhrase}
        open={!!current}
        onOpenChange={(v) => {
          if (!v) {
            setInternal(null);
            onSelect?.(null);
          }
        }}
        onOpenHistory={onOpenHistory}
        onOpenLibrary={onOpenLibrary}
        onOpenProgress={onOpenProgress}
      />
    </div>
  );
}

export const MuscleBalance = MuscleMap;
