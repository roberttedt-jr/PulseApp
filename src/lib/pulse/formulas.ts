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
  goal: "gain" | "lose" | "maintain" | null | undefined,
): number {
  if (ree <= 0) return 0;
  const tdee = ree * 1.55;
  if (goal === "gain") return Math.round(tdee + 300);
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

/**
 * Weekly Pulse Score 0–100.
 * 40 pts consistency vs weekly goal, 30 pts volume vs a 12k kg weekly target,
 * 30 pts streak (capped at 14 days).
 */
export function pulseScore(opts: {
  workoutsThisWeek: number;
  weeklyGoal: number;
  volumeThisWeek: number;
  streakDays: number;
}): number {
  const goal = Math.max(1, opts.weeklyGoal);
  const consistency = Math.min(40, (opts.workoutsThisWeek / goal) * 40);
  const volume = Math.min(30, (opts.volumeThisWeek / 12000) * 30);
  const streak = Math.min(30, (opts.streakDays / 14) * 30);
  return Math.round(Math.min(100, consistency + volume + streak));
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
