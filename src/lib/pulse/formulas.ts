/** Epley 1RM: weight * (1 + reps/30). Reps of 1 return the weight itself. */
export function epley1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Body mass index. Height is centimetres, weight is kilograms. */
export function bmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiLabel(value: number): string {
  if (value <= 0) return "—";
  if (value < 18.5) return "Bajo peso";
  if (value < 25) return "Saludable";
  if (value < 30) return "Sobrepeso";
  return "Obesidad";
}

/**
 * Mifflin–St Jeor resting energy expenditure (kcal/day).
 * Sex: male uses +5, female uses −161.
 */
export function mifflinStJeor(opts: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: "male" | "female";
}): number {
  const { weightKg, heightCm, ageYears, sex } = opts;
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "female" ? base - 161 : base + 5;
}

/** Sedentary-to-active multiplier for a gym-going adult (~1.55). */
export function recommendedCalories(
  ree: number,
  goal: "gain" | "lose" | "maintain" | "strength" | "active" | "log" | null | undefined,
): number {
  if (ree <= 0) return 0;
  const tdee = ree * 1.55;
  if (goal === "gain") return Math.round(tdee + 300);
  if (goal === "strength") return Math.round(tdee + 200);
  if (goal === "lose") return Math.round(tdee - 400);
  return Math.round(tdee);
}

export function ageFromBirthDate(birthDate: string | Date, now = new Date()): number {
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(d.getTime())) return 0;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function sessionVolume(sets: { weight: number; reps: number; completed?: boolean }[]): number {
  return sets.reduce((sum, s) => {
    if (s.completed === false) return sum;
    return sum + s.weight * s.reps;
  }, 0);
}

export type PulseScoreInput = {
  workoutsThisWeek: number;
  weeklyGoal: number;
  volumeThisWeek: number;
  volumePrev3WeeksAvg?: number;
  restDaysThisWeek?: number;
  /** Kept so older callers still type-check. Unused in 3.6. */
  streakDays?: number;
};

export type PulseScoreBreakdown = {
  score: number;
  consistency: number;
  overload: number;
  recovery: number;
  copy: {
    headline: string;
    consistency: string;
    overload: string;
    recovery: string;
  };
};

function clampPts(n: number, max: number) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(max, n);
}

/**
 * Weekly Pulse Score 0–100.
 * 40 consistency (sessions vs weekly goal), 40 overload (volume vs 3-week avg),
 * 20 recovery (rest-day distribution).
 */
export function pulseScoreBreakdown(opts: PulseScoreInput): PulseScoreBreakdown {
  const goal = Math.max(1, opts.weeklyGoal || 0);
  const sessions = Math.max(0, opts.workoutsThisWeek || 0);
  const volume = Math.max(0, opts.volumeThisWeek || 0);
  const avg = Math.max(0, opts.volumePrev3WeeksAvg || 0);
  const restDays = opts.restDaysThisWeek ?? Math.max(0, 7 - sessions);
  const idealRest = Math.max(0, 7 - goal);

  const consistency = clampPts((sessions / goal) * 40, 40);

  let overload = 0;
  if (volume > 0) {
    if (avg <= 0) overload = clampPts((volume / 8000) * 32, 40);
    else overload = clampPts((volume / avg) * 32, 40);
  }

  let recovery = 0;
  if (idealRest === 0) {
    recovery = sessions >= 6 ? 20 : clampPts((sessions / 7) * 20, 20);
  } else {
    const closeness = 1 - Math.min(1, Math.abs(restDays - idealRest) / Math.max(idealRest, 1));
    recovery = clampPts(closeness * 20, 20);
  }

  const score = Math.round(Math.min(100, consistency + overload + recovery));

  const consistencyCopy =
    sessions >= goal
      ? `Consistencia perfecta esta semana. ${sessions} de ${goal} sesiones completadas.`
      : sessions === 0
        ? `Todavía no hay sesiones esta semana. Objetivo: ${goal}.`
        : `${sessions} de ${goal} sesiones completadas.`;

  const overloadCopy =
    volume <= 0
      ? "Sin volumen esta semana."
      : avg <= 0
        ? "Primeras semanas: el volumen empieza a construir tu media."
        : volume >= avg * 1.05
          ? "Volumen por encima de tu media de 3 semanas."
          : volume >= avg * 0.9
            ? "Volumen alineado con tu media de 3 semanas."
            : "Esta semana el volumen está por debajo de tu media.";

  const recoveryCopy =
    recovery >= 16
      ? "Descansos bien distribuidos."
      : restDays === 0 && idealRest > 0
        ? "Faltan días de recuperación."
        : restDays > idealRest + 1
          ? "Demasiados descansos respecto a tu objetivo."
          : "Ajusta los descansos para recuperar mejor.";

  const headline =
    score <= 0
      ? "Completa tu primer entrenamiento para ver el Pulse Score."
      : score >= 80
        ? "Semana excelente. Consistencia, sobrecarga y recuperación alineadas."
        : score >= 50
          ? "Buen ritmo esta semana. Un poco más de volumen o consistencia sube la cifra."
          : "Aún puedes sumar esta semana.";

  return {
    score,
    consistency: Math.round(consistency),
    overload: Math.round(overload),
    recovery: Math.round(recovery),
    copy: {
      headline,
      consistency: consistencyCopy,
      overload: overloadCopy,
      recovery: recoveryCopy,
    },
  };
}

export function pulseScore(opts: PulseScoreInput): number {
  return pulseScoreBreakdown(opts).score;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const BAR_KG = 20;

/** Split a loaded barbell into plates per side (olympic 20 kg bar). */
export function platesFor(
  totalKg: number,
  barKg = BAR_KG,
): { barKg: number; perSide: number[]; leftover: number } {
  if (!Number.isFinite(totalKg) || totalKg <= 0) return { barKg, perSide: [], leftover: 0 };
  let remaining = (totalKg - barKg) / 2;
  if (remaining < 0) return { barKg, perSide: [], leftover: totalKg };
  const perSide: number[] = [];
  for (const p of KG_PLATES) {
    while (remaining + 1e-6 >= p) {
      perSide.push(p);
      remaining -= p;
    }
  }
  return { barKg, perSide, leftover: Math.round(remaining * 100) / 100 };
}
