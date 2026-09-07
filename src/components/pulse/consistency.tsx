import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Flame, Minus, Moon, Plus } from "lucide-react";
import { EmptyState } from "@/components/pulse/empty-state";
import { HScroll } from "@/components/pulse/h-scroll";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getConsistency, updateProfile } from "@/lib/pulse/fns";
import {
  addDays,
  computeStreaks,
  dayStatus,
  DOW_LABELS,
  formatRange,
  groupSessionsByDay,
  heatmapColumns,
  highVolumeThreshold,
  localISO,
  monthGrid,
  restWeekdaysFromPlan,
  sessionsInRange,
  weekDates,
  weekdayMon,
  type ConsistencySession,
  type DayStatus,
  type PlanDay,
} from "@/lib/pulse/consistency";
import { cn, formatDuration, formatKg } from "@/lib/utils";

type Metric = "sessions" | "sets" | "volume";

function useConsistency() {
  return useQuery({ queryKey: ["consistency"], queryFn: () => getConsistency() });
}

function useCalendar(sessions: ConsistencySession[], plan: PlanDay[]) {
  return useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const byDay = groupSessionsByDay(sessions);
    const { hasPlan, rest } = restWeekdaysFromPlan(plan);
    const trained = new Set(byDay.keys());
    const firstTrained = trained.size ? [...trained].reduce((a, b) => (a < b ? a : b)) : null;
    const streaks = computeStreaks(trained, rest, hasPlan, today);
    const highCut = highVolumeThreshold(byDay);
    return { today, byDay, hasPlan, rest, streaks, highCut, firstTrained };
  }, [sessions, plan]);
}

function statusOf(
  date: Date,
  ctx: ReturnType<typeof useCalendar>,
): DayStatus {
  return dayStatus({
    date,
    today: ctx.today,
    sessions: ctx.byDay.get(localISO(date)) ?? [],
    hasPlan: ctx.hasPlan,
    restWeekdays: ctx.rest,
    highVolume: ctx.highCut,
    firstTrained: ctx.firstTrained,
  });
}

const STATUS_LABEL: Record<DayStatus, string> = {
  future: "Próximo",
  empty: "Sin entrenamiento",
  rest: "Descanso",
  missed: "Planificado, sin completar",
  done: "Entrenamiento completado",
  high: "Alta actividad",
};

function DayCell({
  date,
  status,
  selected,
  showNum,
  dim,
  isToday,
  onSelect,
}: {
  date: Date;
  status: DayStatus;
  selected: boolean;
  showNum?: boolean;
  dim?: boolean;
  isToday?: boolean;
  onSelect: (d: Date) => void;
}) {
  const num = date.getDate();
  const label = `${format(date, "EEEE d MMMM", { locale: es })}. ${STATUS_LABEL[status]}`;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      disabled={status === "future"}
      onClick={() => onSelect(date)}
      className={cn(
        "consistency-cell relative grid aspect-square min-h-touch w-full place-items-center rounded-[13px] text-[12px] font-semibold tabular",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        status === "future" && "bg-muted/40 text-muted-foreground/70",
        status === "empty" && "bg-muted text-muted-foreground",
        status === "rest" && "bg-ios-elevated/80 text-muted-foreground",
        status === "missed" && "bg-warning/18 text-warning",
        status === "done" && "bg-success/40 text-white",
        status === "high" && "bg-success text-white",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
        isToday && !selected && "ring-1 ring-foreground/45",
        dim && "opacity-40",
      )}
    >
      {status === "done" || status === "high" ? (
        <>
          {showNum ? <span className="absolute top-0.5 text-[9px] font-medium opacity-80">{num}</span> : null}
          <Check className={cn("size-3.5", showNum && "mt-1")} strokeWidth={2.6} />
        </>
      ) : status === "rest" ? (
        <>
          {showNum ? <span className="absolute top-0.5 text-[9px] font-medium opacity-80">{num}</span> : null}
          <Moon className={cn("size-3", showNum && "mt-1")} />
        </>
      ) : status === "missed" ? (
        <>
          {showNum ? <span className="absolute top-0.5 text-[9px] font-medium opacity-80">{num}</span> : null}
          <span className={cn("block size-1.5 rounded-full bg-warning", showNum && "mt-1")} />
        </>
      ) : (
        <span>{num}</span>
      )}
    </button>
  );
}

function Legend({ compact }: { compact?: boolean }) {
  const items = compact
    ? [
        { swatch: "bg-muted", icon: null, label: "Sin entreno" },
        { swatch: "bg-success/35", icon: Check, label: "Completado" },
        { swatch: "bg-success", icon: Check, label: "Alta actividad" },
        { swatch: "bg-ios-elevated/80", icon: Moon, label: "Descanso" },
      ]
    : [
        { swatch: "bg-muted", icon: null, label: "Sin entrenamiento" },
        { swatch: "bg-success/35", icon: Check, label: "Completado" },
        { swatch: "bg-success", icon: Check, label: "Alta actividad" },
        { swatch: "bg-ios-elevated/80", icon: Moon, label: "Descanso" },
        { swatch: "bg-warning/18", icon: null, label: "No completado" },
      ];
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className={cn("grid size-3.5 place-items-center rounded-[5px]", it.swatch)}>
            {it.icon ? <it.icon className="size-2.5" /> : null}
          </span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function DaySheet({
  date,
  sessions,
  status,
  plannedName,
  onClose,
}: {
  date: Date | null;
  sessions: ConsistencySession[];
  status: DayStatus | null;
  plannedName: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!date} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="px-5 pt-4 pb-6">
        {date && (
          <>
            <SheetTitle className="pr-10 text-[17px] font-semibold tracking-tight capitalize">
              {format(date, "EEEE d MMMM yyyy", { locale: es })}
            </SheetTitle>
            <p className="mt-1 text-sm text-muted-foreground">{status ? STATUS_LABEL[status] : ""}</p>
            {status === "rest" && (
              <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">Descanso planificado. No penaliza la racha.</p>
            )}
            {status === "missed" && (
              <p className="mt-3 rounded-2xl bg-warning/15 px-4 py-3 text-sm text-warning">
                {plannedName ? `Tenías ${plannedName} y no se registró.` : "Día planificado sin entrenamiento."}
              </p>
            )}
            {sessions.length === 0 && status !== "rest" && status !== "missed" && status !== "future" && (
              <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">Sin entrenamiento registrado.</p>
            )}
            <ul className="mt-4 space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="rounded-2xl bg-muted px-4 py-3">
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDuration(s.durationSeconds ?? 0)} · {s.setCount} series · {formatKg(s.volume)}
                  </p>
                  {s.exercises.length > 0 && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{s.exercises.join(" · ")}</p>
                  )}
                  <Button asChild size="sm" variant="secondary" className="mt-3">
                    <Link to="/history/$workoutId" params={{ workoutId: s.id }}>
                      Ver detalle
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex h-touch rounded-full glass-pill p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "h-full min-w-11 rounded-full px-3 text-[13px] font-medium transition-colors pressable-feedback",
            value === o.id ? "glass-pill-on" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ConsistencyCard() {
  const qc = useQueryClient();
  const { data, isPending } = useConsistency();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [selected, setSelected] = useState<Date | null>(null);
  const sessions = data?.sessions ?? [];
  const plan = data?.plan ?? [];
  const weeklyGoal = data?.weeklyGoal ?? 4;
  const ctx = useCalendar(sessions, plan);

  const goalMut = useMutation({
    mutationFn: (weeklyGoal: number) => updateProfile({ data: { weeklyGoal } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["consistency"] });
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  const week = weekDates(ctx.today);
  const month = monthGrid(ctx.today);
  const dates = period === "week" ? week : month;
  const weekSessions = sessionsInRange(ctx.byDay, week[0]!, week[6]!);
  const weekCount = weekSessions.length;
  const pct = Math.min(100, Math.round((weekCount / Math.max(1, weeklyGoal)) * 100));
  const rangeLabel =
    period === "week" ? formatRange(week[0]!, week[6]!) : format(ctx.today, "MMMM yyyy", { locale: es });

  const selectedKey = selected ? localISO(selected) : null;
  const selectedSessions = selectedKey ? (ctx.byDay.get(selectedKey) ?? []) : [];
  const selectedStatus = selected ? statusOf(selected, ctx) : null;
  const plannedName = selected
    ? (plan.find((p) => p.weekday === weekdayMon(selected))?.routineName ?? null)
    : null;

  if (isPending && !data) {
    return (
      <section className="rounded-3xl bg-card p-4 hairline sm:p-5">
        <h2 className="text-[15px] font-semibold tracking-tight">Consistencia</h2>
        <div className="mt-4 h-28 animate-pulse rounded-2xl bg-muted" />
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-x-clip rounded-3xl bg-card p-4 hairline sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Consistencia</h2>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { id: "week", label: "Semana" },
            { id: "month", label: "Mes" },
          ]}
        />
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="Aún no hay ritmo"
          hint="Completa tu primer entrenamiento para ver tu consistencia."
          className="py-8"
        />
      ) : (
        <>
          <p className="text-[15px] leading-snug">
            <span className="font-semibold tabular">
              {weekCount} de {weeklyGoal}
            </span>{" "}
            entrenamientos esta semana
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12px] font-medium tabular text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
            <p>
              Racha{" "}
              <span className="font-semibold text-foreground tabular">
                {ctx.streaks.current} {ctx.streaks.current === 1 ? "día" : "días"}
              </span>
            </p>
            <p className="capitalize">{rangeLabel}</p>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>Objetivo</span>
            <button
              type="button"
              aria-label="Bajar objetivo"
              className="grid size-touch place-items-center rounded-full bg-muted"
              onClick={() => goalMut.mutate(Math.max(1, weeklyGoal - 1))}
            >
              <Minus className="size-4" />
            </button>
            <span className="tabular min-w-4 text-center font-medium text-foreground">{weeklyGoal}</span>
            <button
              type="button"
              aria-label="Subir objetivo"
              className="grid size-touch place-items-center rounded-full bg-muted"
              onClick={() => goalMut.mutate(Math.min(7, weeklyGoal + 1))}
            >
              <Plus className="size-4" />
            </button>
          </div>
        </>
      )}

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {DOW_LABELS.map((l) => (
          <span key={l} className="text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {l}
          </span>
        ))}
        {dates.map((date) => {
          const key = localISO(date);
          const dim = period === "month" && date.getMonth() !== ctx.today.getMonth();
          return (
            <DayCell
              key={key}
              date={date}
              status={statusOf(date, ctx)}
              selected={selectedKey === key}
              showNum
              dim={dim}
              isToday={key === localISO(ctx.today)}
              onSelect={setSelected}
            />
          );
        })}
      </div>
      <div className="mt-3">
        <Legend compact />
      </div>

      <DaySheet
        date={selected}
        sessions={selectedSessions}
        status={selectedStatus}
        plannedName={plannedName}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function heatValue(list: ConsistencySession[], metric: Metric): number {
  if (metric === "sessions") return list.length;
  if (metric === "sets") return list.reduce((s, x) => s + x.setCount, 0);
  return list.reduce((s, x) => s + x.volume, 0);
}

function heatLevel(value: number, max: number): 0 | 1 | 2 | 3 {
  if (value <= 0 || max <= 0) return 0;
  const r = value / max;
  if (r < 0.34) return 1;
  if (r < 0.67) return 2;
  return 3;
}

const HEAT_SWATCH = ["bg-muted", "bg-success/30", "bg-success/60", "bg-success"] as const;

function HeatCell({
  date,
  status,
  level,
  selected,
  isToday,
  onSelect,
}: {
  date: Date;
  status: DayStatus;
  level: 0 | 1 | 2 | 3;
  selected: boolean;
  isToday: boolean;
  onSelect: (d: Date) => void;
}) {
  const trained = status === "done" || status === "high";
  const lv = trained ? (level === 0 ? 1 : level) : 0;
  return (
    <button
      type="button"
      aria-label={`${format(date, "EEEE d MMMM", { locale: es })}. ${STATUS_LABEL[status]}`}
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      disabled={status === "future"}
      onClick={() => onSelect(date)}
      className={cn(
        "consistency-cell grid size-touch place-items-center rounded-xl",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        lv === 0 && status === "future" && "bg-muted/40 text-muted-foreground/70",
        lv === 0 && status === "empty" && "bg-muted text-muted-foreground",
        lv === 0 && status === "rest" && "bg-ios-elevated text-muted-foreground",
        lv === 0 && status === "missed" && "bg-warning/20 text-warning",
        lv === 1 && "bg-success/30 text-white",
        lv === 2 && "bg-success/60 text-white",
        lv === 3 && "bg-success text-white",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
        isToday && !selected && "ring-1 ring-foreground/45",
      )}
    >
      {trained ? (
        <Check className="size-3.5" strokeWidth={2.6} />
      ) : status === "rest" ? (
        <Moon className="size-3" />
      ) : status === "missed" ? (
        <span className="block size-1.5 rounded-full bg-warning" />
      ) : null}
    </button>
  );
}

export function ConsistencyHeatmap() {
  const { data, isPending } = useConsistency();
  const [metric, setMetric] = useState<Metric>("sessions");
  const [selected, setSelected] = useState<Date | null>(null);
  const sessions = data?.sessions ?? [];
  const plan = data?.plan ?? [];
  const ctx = useCalendar(sessions, plan);
  const cols = heatmapColumns(ctx.today, 12);
  const first = cols[0]![0]!;
  const last = cols[cols.length - 1]![6]!;
  const prevFirst = addDays(first, -12 * 7);
  const prevLast = addDays(first, -1);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const col of cols) {
      for (const date of col) {
        const v = heatValue(ctx.byDay.get(localISO(date)) ?? [], metric);
        if (v > m) m = v;
      }
    }
    return m;
  }, [cols, ctx.byDay, metric]);

  const periodSessions = sessionsInRange(ctx.byDay, first, ctx.today);
  const prevSessions = sessionsInRange(ctx.byDay, prevFirst, prevLast);
  const prevN = prevSessions.length;
  const nowN = periodSessions.length;
  const cmpPct = prevN > 0 ? Math.round(((nowN - prevN) / prevN) * 100) : nowN > 0 ? 100 : 0;

  const selectedKey = selected ? localISO(selected) : null;
  const selectedSessions = selectedKey ? (ctx.byDay.get(selectedKey) ?? []) : [];
  const selectedStatus = selected ? statusOf(selected, ctx) : null;
  const plannedName = selected
    ? (plan.find((p) => p.weekday === weekdayMon(selected))?.routineName ?? null)
    : null;

  const monthTicks = cols.map((col, i) => {
    const d = col[0]!;
    const prev = cols[i - 1]?.[0];
    return !prev || prev.getMonth() !== d.getMonth() ? format(d, "LLL", { locale: es }) : "";
  });

  const todayKey = localISO(ctx.today);

  return (
    <section className="min-w-0 overflow-x-clip rounded-3xl bg-card p-4 hairline sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Consistencia</h2>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
            {formatRange(first, last)}
          </p>
        </div>
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { id: "sessions", label: "Sesiones" },
            { id: "sets", label: "Series" },
            { id: "volume", label: "Volumen" },
          ]}
        />
      </div>

      {isPending && !data ? (
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="Sin historial todavía"
          hint="Completa tu primer entrenamiento para ver el mapa de las últimas 12 semanas."
          className="py-8"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat k="Racha actual" v={`${ctx.streaks.current} ${ctx.streaks.current === 1 ? "día" : "días"}`} />
            <Stat k="Racha más larga" v={`${ctx.streaks.longest} ${ctx.streaks.longest === 1 ? "día" : "días"}`} />
            <Stat
              k="Vs. 12 semanas previas"
              v={prevN === 0 && nowN === 0 ? "—" : `${cmpPct >= 0 ? "+" : ""}${cmpPct}%`}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {nowN} {nowN === 1 ? "sesión" : "sesiones"} en este periodo
            {prevN > 0 ? ` · ${prevN} en el anterior` : ""}.
          </p>

          <HScroll gap="gap-1.5" snap="none" startAt="end" className="mt-4" contentClassName="py-1 pr-1">
            <div className="flex w-6 shrink-0 flex-col gap-1.5 pt-4">
              {DOW_LABELS.map((l) => (
                <span
                  key={l}
                  className="grid h-touch items-center text-[9px] font-medium text-muted-foreground"
                >
                  {l}
                </span>
              ))}
            </div>
            {cols.map((col, i) => (
              <div key={localISO(col[0]!)} className="flex w-touch shrink-0 flex-col gap-1.5">
                <span className="h-4 text-center text-[9px] font-medium text-muted-foreground capitalize">
                  {monthTicks[i]}
                </span>
                {col.map((date) => {
                  const key = localISO(date);
                  const list = ctx.byDay.get(key) ?? [];
                  const lv = key > todayKey ? 0 : heatLevel(heatValue(list, metric), maxVal);
                  return (
                    <HeatCell
                      key={key}
                      date={date}
                      status={statusOf(date, ctx)}
                      level={lv}
                      selected={selectedKey === key}
                      isToday={key === todayKey}
                      onSelect={setSelected}
                    />
                  );
                })}
              </div>
            ))}
          </HScroll>

          <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span>Menos</span>
              {HEAT_SWATCH.map((c, i) => (
                <span key={c} className={cn("size-3 rounded-[4px]", c)} aria-label={`Nivel ${i}`} />
              ))}
              <span>Más</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="grid size-3.5 place-items-center rounded-[5px] bg-ios-elevated">
                <Moon className="size-2.5" />
              </span>
              Descanso
            </li>
            <li className="flex items-center gap-1.5">
              <span className="grid size-3.5 place-items-center rounded-[5px] bg-warning/20">
                <span className="size-1.5 rounded-full bg-warning" />
              </span>
              No completado
            </li>
          </ul>
        </>
      )}

      <DaySheet
        date={selected}
        sessions={selectedSessions}
        status={selectedStatus}
        plannedName={plannedName}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className="mt-0.5 text-[15px] font-semibold tracking-tight tabular">{v}</p>
    </div>
  );
}
