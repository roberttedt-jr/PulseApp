/** Local-timezone calendar helpers and streak logic for Pulse consistency. */

export const DOW_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const DOW_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

export type PlanDay = {
  weekday: number;
  routineId: string | null;
  routineName: string | null;
};

export type ConsistencySession = {
  id: string;
  startedAt: string;
  title: string;
  durationSeconds: number | null;
  volume: number;
  setCount: number;
  exercises: string[];
};

export type DayStatus = "future" | "empty" | "rest" | "missed" | "done" | "high";

export function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekdayMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - weekdayMon(x));
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

export function restWeekdaysFromPlan(plan: PlanDay[]): { hasPlan: boolean; rest: Set<number> } {
  const assigned = plan.filter((p) => p.routineId);
  const hasPlan = assigned.length > 0;
  const rest = new Set<number>();
  if (!hasPlan) return { hasPlan: false, rest };
  for (let i = 0; i < 7; i++) {
    const row = plan.find((p) => p.weekday === i);
    if (!row?.routineId) rest.add(i);
  }
  return { hasPlan, rest };
}

export function groupSessionsByDay(sessions: ConsistencySession[]): Map<string, ConsistencySession[]> {
  const map = new Map<string, ConsistencySession[]>();
  const seen = new Set<string>();
  for (const s of sessions) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const key = localISO(new Date(s.startedAt));
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return map;
}

export function dayStatus(opts: {
  date: Date;
  today: Date;
  sessions: ConsistencySession[];
  hasPlan: boolean;
  restWeekdays: Set<number>;
  highVolume?: number;
  firstTrained?: string | null;
}): DayStatus {
  const key = localISO(opts.date);
  const todayKey = localISO(opts.today);
  if (key > todayKey) return "future";
  const n = opts.sessions.length;
  const volume = opts.sessions.reduce((s, x) => s + x.volume, 0);
  const highCut = opts.highVolume ?? 0;
  if (n >= 2 || (n > 0 && highCut > 0 && volume >= highCut)) return "high";
  if (n > 0) return "done";
  const rest = opts.hasPlan && opts.restWeekdays.has(weekdayMon(opts.date));
  if (rest) return "rest";
  if (opts.hasPlan && opts.firstTrained && key >= opts.firstTrained) return "missed";
  return "empty";
}

export function highVolumeThreshold(byDay: Map<string, ConsistencySession[]>): number {
  const vols = [...byDay.values()]
    .map((list) => list.reduce((s, x) => s + x.volume, 0))
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (vols.length === 0) return Number.POSITIVE_INFINITY;
  const idx = Math.floor(vols.length * 0.66);
  return vols[idx] ?? vols[vols.length - 1]!;
}

type DayKind = "train" | "rest" | "gap" | "future";

function kindOf(
  date: Date,
  todayKey: string,
  trained: Set<string>,
  restWeekdays: Set<number>,
  hasPlan: boolean,
): DayKind {
  const key = localISO(date);
  if (key > todayKey) return "future";
  if (trained.has(key)) return "train";
  if (hasPlan && restWeekdays.has(weekdayMon(date))) return "rest";
  return "gap";
}

export function computeStreaks(
  trained: Set<string>,
  restWeekdays: Set<number>,
  hasPlan: boolean,
  today: Date,
): { current: number; longest: number } {
  const todayNoon = new Date(today);
  todayNoon.setHours(12, 0, 0, 0);
  const todayKey = localISO(todayNoon);

  const kind = (d: Date) => kindOf(d, todayKey, trained, restWeekdays, hasPlan);

  let cursor = new Date(todayNoon);
  if (kind(cursor) === "gap") cursor = addDays(cursor, -1);

  let current = 0;
  for (let i = 0; i < 420; i++) {
    const k = kind(cursor);
    if (k === "train") current += 1;
    else if (k !== "rest") break;
    cursor = addDays(cursor, -1);
  }

  const oldest = trained.size
    ? [...trained].reduce((a, b) => (a < b ? a : b))
    : todayKey;
  let d = parseLocalISO(oldest);
  d = addDays(d, -1);
  const end = todayNoon;
  let run = 0;
  let longest = 0;
  while (localISO(d) <= localISO(end)) {
    const k = kind(d);
    if (k === "train") run += 1;
    else if (k === "rest") {
      /* planned rest does not break or count */
    } else {
      if (run > longest) longest = run;
      run = 0;
    }
    d = addDays(d, 1);
  }
  if (run > longest) longest = run;
  if (current > longest) longest = current;

  return { current, longest };
}

export function weekDates(today: Date): Date[] {
  const mon = mondayOf(today);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

export function monthGrid(today: Date): Date[] {
  const first = startOfMonth(today);
  const start = mondayOf(first);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12, 0, 0, 0);
  const end = addDays(mondayOf(last), 6);
  const days: Date[] = [];
  let d = start;
  while (localISO(d) <= localISO(end)) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

/** 12 columns (weeks), each with 7 days Mon–Sun, ending this week. */
export function heatmapColumns(today: Date, weeks = 12): Date[][] {
  const thisMon = mondayOf(today);
  const start = addDays(thisMon, -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)),
  );
}

export function sessionsInRange(
  byDay: Map<string, ConsistencySession[]>,
  from: Date,
  to: Date,
): ConsistencySession[] {
  const a = localISO(from);
  const b = localISO(to);
  const out: ConsistencySession[] = [];
  for (const [key, list] of byDay) {
    if (key >= a && key <= b) out.push(...list);
  }
  return out;
}

export function formatRange(from: Date, to: Date): string {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  if (sameMonth) return `${from.getDate()}–${to.getDate()} ${months[to.getMonth()]}`;
  return `${from.getDate()} ${months[from.getMonth()]} – ${to.getDate()} ${months[to.getMonth()]}`;
}
