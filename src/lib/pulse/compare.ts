/** Pure helpers for optional, private, healthy comparison between friends. */

export const COMPARE_PERIODS = ["week", "month"] as const;
export type ComparePeriod = (typeof COMPARE_PERIODS)[number];

export const COMPARE_METRIC_IDS = [
  "workouts",
  "days",
  "streak",
  "sets",
  "volume",
  "exercises",
  "prs",
] as const;
export type CompareMetricId = (typeof COMPARE_METRIC_IDS)[number];

export type ComparePrefs = {
  enabled: boolean;
  workouts: boolean;
  days: boolean;
  streak: boolean;
  sets: boolean;
  volume: boolean;
  exercises: boolean;
  prs: boolean;
};

export const DEFAULT_COMPARE_PREFS: ComparePrefs = {
  enabled: false,
  workouts: false,
  days: false,
  streak: false,
  sets: false,
  volume: false,
  exercises: false,
  prs: false,
};

export const COMPARE_METRICS: {
  id: CompareMetricId;
  label: string;
  hint: string;
}[] = [
  { id: "workouts", label: "Entrenamientos completados", hint: "Número de sesiones terminadas" },
  { id: "days", label: "Días activos", hint: "Días distintos con al menos una sesión" },
  { id: "streak", label: "Racha actual", hint: "La misma racha que ves en Progreso" },
  { id: "sets", label: "Series", hint: "Series de trabajo completadas" },
  { id: "volume", label: "Volumen registrado", hint: "Peso × repeticiones de series de trabajo" },
  { id: "exercises", label: "Progreso por ejercicio", hint: "Ejercicios del catálogo que ambos habéis entrenado" },
  { id: "prs", label: "Récords", hint: "Récords del periodo en ejercicios que ambos tenéis" },
];

export const COMPARE_COPY = {
  title: "Comparar",
  subtitle: "Ambos decidís qué compartir.",
  you: "Tu actividad",
  them: (handle: string) => (handle ? `Actividad de ${handle}` : "Actividad de tu amigo"),
  enableMaster: "Permitir comparativas con amigos",
  enableHint: "Nadie más las ve. Solo amigos, y solo las métricas que elijas.",
  viewerOff: "Activa las comparativas en Privacidad para comparar con amigos.",
  unavailable: "No se puede comparar con esta cuenta.",
  emptyMetrics: "No hay métricas en común para este periodo.",
  emptyFriends: "Cuando os sigáis mutuamente y activéis comparativas, aparecerán aquí.",
  pickHint: "Elige con quién quieres ver vuestra actividad, lado a lado.",
  self: "Elige a un amigo para comparar.",
  catalogOnly: "Solo ejercicios del catálogo que ambos hayáis entrenado.",
  noExercises: "No hay ejercicios del catálogo en común este periodo.",
  noPrs: "No hay récords en común este periodo.",
  week: "Esta semana",
  month: "Este mes",
  cta: "Comparar",
  ctaFriends: "Comparar con amigos",
  privacyNote: "No se comparte email, peso, medidas, fotos ni notas privadas.",
} as const;

export const FORBIDDEN_COMPARE_WORDS = [
  "ganar",
  "ganas",
  "ganando",
  "perder",
  "pierdes",
  "débil",
  "peor",
  "atrasado",
  "ranking",
  "clasificación",
  "derrota",
  "victoria",
] as const;

export type CompareAccess = "ok" | "self" | "viewer_off" | "unavailable";

export function compareAccess(args: {
  viewerEnabled: boolean;
  friendEnabled: boolean;
  mutualAccepted: boolean;
  blocked: boolean;
  isSelf: boolean;
}): CompareAccess {
  if (args.isSelf) return "self";
  if (args.blocked || !args.mutualAccepted || !args.friendEnabled) return "unavailable";
  if (!args.viewerEnabled) return "viewer_off";
  return "ok";
}

export function authorizedMetrics(prefs: ComparePrefs): CompareMetricId[] {
  if (!prefs.enabled) return [];
  return COMPARE_METRIC_IDS.filter((id) => prefs[id]);
}

export function sharedMetrics(a: ComparePrefs, b: ComparePrefs): CompareMetricId[] {
  const other = new Set(authorizedMetrics(b));
  return authorizedMetrics(a).filter((id) => other.has(id));
}

/** Monday 00:00 local for week; 1st of month 00:00 local for month. Matches Progress. */
export function periodOrigin(period: ComparePeriod, now = new Date()): Date {
  if (period === "week") {
    const x = new Date(now);
    const day = (x.getDay() + 6) % 7;
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return x;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export function parseComparePeriod(v: unknown): ComparePeriod {
  return v === "month" ? "month" : "week";
}

export function isComparableSet(kind?: string | null, completed?: boolean): boolean {
  return Boolean(completed) && kind !== "warmup";
}

export function volumeOfSets(
  sets: { weight: number; reps: number; kind?: string | null; completed?: boolean }[],
): number {
  return sets.reduce((sum, s) => sum + (isComparableSet(s.kind, s.completed) ? s.weight * s.reps : 0), 0);
}

export function countWorkSets(
  sets: { kind?: string | null; completed?: boolean }[],
): number {
  return sets.filter((s) => isComparableSet(s.kind, s.completed)).length;
}

export function uniqueLocalDays(isoDates: string[], localISO: (d: Date) => string): number {
  const keys = new Set<string>();
  for (const raw of isoDates) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    keys.add(localISO(d));
  }
  return keys.size;
}

export function intersectById<T extends { exerciseId: string }>(a: T[], b: T[]): string[] {
  const other = new Set(b.map((x) => x.exerciseId));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of a) {
    if (!other.has(row.exerciseId) || seen.has(row.exerciseId)) continue;
    seen.add(row.exerciseId);
    out.push(row.exerciseId);
  }
  return out;
}

export function prKey(exerciseId: string, kind: string): string {
  return `${exerciseId}:${kind || "one_rm"}`;
}

export function intersectPrKeys(
  a: { exerciseId: string; kind: string }[],
  b: { exerciseId: string; kind: string }[],
): string[] {
  const other = new Set(b.map((x) => prKey(x.exerciseId, x.kind)));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of a) {
    const k = prKey(row.exerciseId, row.kind);
    if (!other.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function barRatio(value: number, max: number): number {
  if (max <= 0) return 0;
  const n = value / max;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function containsForbiddenCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_COMPARE_WORDS.some((w) => lower.includes(w));
}
