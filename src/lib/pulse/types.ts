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
  { id: "strength", label: "Ganar fuerza", hint: "Cargas y progresión" },
  { id: "gain", label: "Ganar músculo", hint: "Hipertrofia y volumen" },
  { id: "lose", label: "Perder grasa", hint: "Déficit y consistencia" },
  { id: "active", label: "Mantenerme activo", hint: "Ritmo y constancia" },
  { id: "log", label: "Registrar mis entrenamientos", hint: "Control de cada sesión" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"] | "maintain";

export const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Principiante" },
  { id: "intermediate", label: "Intermedio" },
  { id: "advanced", label: "Avanzado" },
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]["id"];

export const TRAINING_LOCATIONS = [
  { id: "gym", label: "Gimnasio" },
  { id: "home", label: "Casa" },
  { id: "both", label: "Ambos" },
] as const;
export type TrainingLocation = (typeof TRAINING_LOCATIONS)[number]["id"];

export const WEEKLY_TRAINING_OPTIONS = [
  { id: 2, label: "2 días" },
  { id: 3, label: "3 días" },
  { id: 4, label: "4 días" },
  { id: 5, label: "5 días" },
  { id: 6, label: "6+ días" },
  { id: 0, label: "Aún no lo sé" },
] as const;

export const DEFAULT_REST_OPTIONS = [60, 90, 120] as const;

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
  username: string | null;
  bio: string | null;
  profileVisibility: "public" | "private";
  defaultWorkoutVisibility: "me" | "followers" | "public";
  shareVolume: boolean;
  sharePrs: boolean;
  onboardingDone: boolean;
  weeklyGoal: number;
  reminderHour: number | null;
  healthkitNotify: boolean;
  showRpe: boolean;
  experienceLevel: ExperienceLevel | null;
  trainingLocation: TrainingLocation | null;
  defaultRestSeconds: number;
  setupStep: number;
  setupCompletedAt: string | null;
  tutorialCompletedAt: string | null;
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
  kind?: "one_rm" | "max_weight" | "max_reps" | "max_volume";
  oneRepMax: number;
  weight: number;
  reps: number;
  volume?: number;
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
