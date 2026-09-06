export const MUSCLES = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Cuádriceps",
  "Femorales",
  "Glúteos",
  "Pantorrillas",
  "Abdomen",
  "Core",
] as const;

export type MuscleGroup = (typeof MUSCLES)[number];

export const EXERCISE_TYPES = ["Compuesto", "Aislamiento", "Cardio", "Estiramiento"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EQUIPMENT = [
  "Barra",
  "Mancuernas",
  "Máquina",
  "Cable",
  "Peso corporal",
  "Kettlebell",
  "Banda",
  "Smith",
  "TRX",
  "Disco",
] as const;

export type Equipment = (typeof EQUIPMENT)[number];

export const GOALS = [
  { id: "gain", label: "Ganar músculo", hint: "Hipertrofia y volumen" },
  { id: "lose", label: "Perder grasa", hint: "Déficit y consistencia" },
  { id: "maintain", label: "Mantener", hint: "Salud y rendimiento" },
  { id: "strength", label: "Mejorar fuerza", hint: "Cargas y progresión" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];

export type Units = "metric" | "imperial";
export type ThemePref = "dark" | "light" | "system";

export type Profile = {
  userId: string;
  displayName: string | null;
  image: string | null;
  sex: "male" | "female" | null;
  weightKg: number | null;
  heightCm: number | null;
  birthDate: string | null;
  goal: GoalId | null;
  units: Units;
  theme: ThemePref;
  restSound: boolean;
  autoRest: boolean;
  publicProfile: boolean;
  onboardingDone: boolean;
  weeklyGoal: number;
  reminderHour: number | null;
  healthkitNotify: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  muscle: MuscleGroup | string;
  type: ExerciseType | string;
  equipment: string | null;
  gifUrl: string | null;
  videoUrl?: string | null;
  instructions?: string | null;
  commonMistakes?: string | null;
  secondaryMuscles?: string[];
  isCustom: boolean;
  userId: string | null;
  isFavorite?: boolean;
};

export type RoutineExercise = {
  id: string;
  exerciseId: string;
  name: string;
  muscle: string;
  equipment: string | null;
  sortOrder: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
};

export type Routine = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  isPublic: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  shareSlug: string | null;
  lastUsedAt: string | null;
  exerciseCount: number;
  exercises?: RoutineExercise[];
};

export type WorkoutSet = {
  id: string;
  exerciseId: string;
  setOrder: number;
  reps: number;
  weight: number;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
  kind: "work" | "warmup" | "drop" | "fail";
};

export type WorkoutExerciseBlock = {
  exerciseId: string;
  name: string;
  muscle: string;
  equipment: string | null;
  restSeconds: number;
  targetSets: number;
  targetReps: string;
  estimated1rm: number | null;
  pr: number | null;
  lastSets: WorkoutSet[];
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  title: string;
  routineId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  photoData: string | null;
  status: "in_progress" | "paused" | "completed";
  volume: number;
  setCount: number;
  exerciseCount: number;
};

export type PersonalRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscle: string;
  oneRepMax: number;
  weight: number;
  reps: number;
  recordedAt: string;
};

export type Achievement = {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  tier: "gold" | "silver" | "bronze";
};

export type BodyLog = {
  id: string;
  loggedAt: string;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  armCm: number | null;
  thighCm: number | null;
};

export const ROUTINE_ICONS = [
  "dumbbell",
  "flame",
  "zap",
  "target",
  "heart",
  "activity",
  "person",
  "layers",
] as const;

export const ROUTINE_COLORS = [
  "#FF2D55",
  "#007AFF",
  "#34C759",
  "#FF9F0A",
  "#AF52DE",
  "#5AC8FA",
  "#FF3B30",
  "#8E8E93",
] as const;
