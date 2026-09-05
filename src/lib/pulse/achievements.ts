export const ACHIEVEMENT_DEFS = [
  {
    key: "first_workout",
    name: "Primer entrenamiento",
    description: "Completaste tu primera sesión en Pulse.",
    icon: "spark",
    tier: "bronze" as const,
  },
  {
    key: "streak_7",
    name: "7 días de racha",
    description: "Entrenaste 7 días seguidos.",
    icon: "flame",
    tier: "gold" as const,
  },
  {
    key: "sets_100",
    name: "100 series",
    description: "Completaste 100 series en total.",
    icon: "layers",
    tier: "silver" as const,
  },
  {
    key: "pr_squat",
    name: "PR en sentadilla",
    description: "Nuevo récord estimado de 1RM en sentadilla.",
    icon: "trophy",
    tier: "gold" as const,
  },
  {
    key: "pr_bench",
    name: "PR en press de banca",
    description: "Nuevo récord estimado de 1RM en banca.",
    icon: "trophy",
    tier: "gold" as const,
  },
  {
    key: "night_owl",
    name: "Entrenador nocturno",
    description: "Entrenaste después de las 22:00.",
    icon: "moon",
    tier: "silver" as const,
  },
  {
    key: "pulse_master",
    name: "Pulse Master",
    description: "Pulse Score de 100 durante 4 semanas seguidas.",
    icon: "crown",
    tier: "gold" as const,
  },
  {
    key: "volume_10t",
    name: "10 toneladas",
    description: "Levantaste 10.000 kg de volumen acumulado.",
    icon: "dumbbell",
    tier: "silver" as const,
  },
  {
    key: "workouts_10",
    name: "Constancia",
    description: "10 entrenamientos completados.",
    icon: "calendar",
    tier: "bronze" as const,
  },
  {
    key: "workouts_25",
    name: "Hábitat",
    description: "25 entrenamientos completados.",
    icon: "calendar",
    tier: "silver" as const,
  },
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_DEFS)[number]["key"];
