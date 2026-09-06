import { epley1rm } from "./formulas.ts";

export type PrKind = "one_rm" | "max_weight" | "max_reps" | "max_volume";

export type LiftSet = {
  exerciseId: string;
  weight: number;
  reps: number;
  kind?: string | null;
  workoutId: string;
  startedAt: string;
};

export type ExercisePr = {
  exerciseId: string;
  kind: PrKind;
  weight: number;
  reps: number;
  oneRepMax: number;
  volume: number;
  recordedAt: string;
};

export const PR_KIND_LABEL: Record<PrKind, string> = {
  one_rm: "1RM est.",
  max_weight: "Peso máximo",
  max_reps: "Más repeticiones",
  max_volume: "Mayor volumen",
};

/** Work sets only. Warmups never mint records. */
export function isWorkSet(kind?: string | null): boolean {
  return kind !== "warmup";
}

export function computeCurrentPrs(sets: LiftSet[]): ExercisePr[] {
  const byEx = new Map<string, LiftSet[]>();
  for (const s of sets) {
    if (!isWorkSet(s.kind)) continue;
    if (s.reps <= 0) continue;
    const arr = byEx.get(s.exerciseId) ?? [];
    arr.push(s);
    byEx.set(s.exerciseId, arr);
  }
  const out: ExercisePr[] = [];
  for (const [exerciseId, rows] of byEx) {
    let bestOrm: LiftSet | null = null;
    let bestOrmVal = 0;
    let bestW: LiftSet | null = null;
    let bestReps: LiftSet | null = null;
    const volByWorkout = new Map<string, { volume: number; startedAt: string; best: LiftSet }>();

    for (const s of rows) {
      if (s.weight > 0) {
        const orm = epley1rm(s.weight, s.reps);
        if (orm > bestOrmVal + 1e-9) {
          bestOrmVal = orm;
          bestOrm = s;
        }
        if (!bestW || s.weight > bestW.weight + 1e-9 || (Math.abs(s.weight - bestW.weight) < 1e-9 && s.reps > bestW.reps)) {
          bestW = s;
        }
      }
      if (!bestReps || s.reps > bestReps.reps || (s.reps === bestReps.reps && s.weight > bestReps.weight)) {
        bestReps = s;
      }
      const vol = s.weight > 0 ? s.weight * s.reps : 0;
      const cur = volByWorkout.get(s.workoutId);
      if (!cur) {
        volByWorkout.set(s.workoutId, { volume: vol, startedAt: s.startedAt, best: s });
      } else {
        cur.volume += vol;
        if (s.weight > cur.best.weight || (s.weight === cur.best.weight && s.reps > cur.best.reps)) cur.best = s;
      }
    }

    if (bestOrm) {
      out.push({
        exerciseId,
        kind: "one_rm",
        weight: bestOrm.weight,
        reps: bestOrm.reps,
        oneRepMax: epley1rm(bestOrm.weight, bestOrm.reps),
        volume: bestOrm.weight * bestOrm.reps,
        recordedAt: bestOrm.startedAt,
      });
    }
    if (bestW) {
      out.push({
        exerciseId,
        kind: "max_weight",
        weight: bestW.weight,
        reps: bestW.reps,
        oneRepMax: epley1rm(bestW.weight, bestW.reps),
        volume: bestW.weight * bestW.reps,
        recordedAt: bestW.startedAt,
      });
    }
    if (bestReps) {
      out.push({
        exerciseId,
        kind: "max_reps",
        weight: bestReps.weight,
        reps: bestReps.reps,
        oneRepMax: epley1rm(bestReps.weight, bestReps.reps),
        volume: bestReps.weight * bestReps.reps,
        recordedAt: bestReps.startedAt,
      });
    }
    let maxVol: { volume: number; startedAt: string; best: LiftSet } | null = null;
    for (const v of volByWorkout.values()) {
      if (v.volume > 0 && (!maxVol || v.volume > maxVol.volume)) maxVol = v;
    }
    if (maxVol) {
      out.push({
        exerciseId,
        kind: "max_volume",
        weight: maxVol.best.weight,
        reps: maxVol.best.reps,
        oneRepMax: epley1rm(maxVol.best.weight, maxVol.best.reps),
        volume: maxVol.volume,
        recordedAt: maxVol.startedAt,
      });
    }
  }
  return out;
}

export function compareToLast(
  current: { weight: number; reps: number; volume: number },
  last: { weight: number; reps: number; volume: number } | null | undefined,
): "weight" | "reps" | "volume" | "same" | null {
  if (!last) return null;
  if (current.weight > last.weight + 0.05) return "weight";
  if (current.reps > last.reps) return "reps";
  if (current.volume > last.volume + 0.5) return "volume";
  return "same";
}

export const COMPARE_LABEL: Record<"weight" | "reps" | "volume" | "same", string> = {
  weight: "Más peso",
  reps: "Más repeticiones",
  volume: "Más volumen",
  same: "Sin cambio",
};
