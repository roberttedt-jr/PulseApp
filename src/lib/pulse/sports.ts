export type SportCategory = "foot" | "cycle" | "strength" | "water_racket_other";

export type SportCalculationType =
  | "pace_distance"
  | "speed_distance"
  | "weight_reps"
  | "laps_distance"
  | "intervals"
  | "general";

export interface SportMeta {
  id: string;
  name: string;
  category: SportCategory;
  emoji: string;
  iconName: string;
  primaryMetrics: string[];
  primaryUnit: string;
  isGpsCapable: boolean;
  isStrength: boolean;
  calculationType: SportCalculationType;
  description: string;
}

export const SPORTS_CATALOG: SportMeta[] = [
  // 1. Foot Sports
  {
    id: "run",
    name: "Carrera",
    category: "foot",
    emoji: "🏃",
    iconName: "Footprints",
    primaryMetrics: ["distance", "pace", "time", "elevation"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "pace_distance",
    description: "Carrera continua en asfalto, pista o ruta.",
  },
  {
    id: "trail_run",
    name: "Trail Running",
    category: "foot",
    emoji: "⛰️",
    iconName: "Mountain",
    primaryMetrics: ["distance", "elevation", "pace", "time"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "pace_distance",
    description: "Carrera de montaña con desnivel positivo y terreno técnico.",
  },
  {
    id: "walk",
    name: "Caminata",
    category: "foot",
    emoji: "🚶",
    iconName: "Footprints",
    primaryMetrics: ["distance", "steps", "time", "calories"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "pace_distance",
    description: "Paseo a pie, marcha urbana y pasos diarios.",
  },
  {
    id: "hike",
    name: "Senderismo",
    category: "foot",
    emoji: "🥾",
    iconName: "Compass",
    primaryMetrics: ["distance", "elevation", "time", "altitude"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "pace_distance",
    description: "Rutas de senderismo en la naturaleza y travesías.",
  },

  // 2. Cycle Sports
  {
    id: "ride",
    name: "Ciclismo",
    category: "cycle",
    emoji: "🚴",
    iconName: "Bike",
    primaryMetrics: ["distance", "speed", "time", "elevation"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "speed_distance",
    description: "Ciclismo en carretera o ruta con velocidad y desnivel.",
  },
  {
    id: "mtb",
    name: "Ciclismo de montaña",
    category: "cycle",
    emoji: "🚵",
    iconName: "Bike",
    primaryMetrics: ["distance", "elevation", "speed", "time"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "speed_distance",
    description: "MTB en sendas, pistas forestales y trialeras.",
  },
  {
    id: "gravel",
    name: "Gravel",
    category: "cycle",
    emoji: "🚲",
    iconName: "Bike",
    primaryMetrics: ["distance", "speed", "elevation", "time"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "speed_distance",
    description: "Ciclismo mixto por pistas de tierra y carreteras secundarias.",
  },
  {
    id: "ebike",
    name: "Bicicleta Eléctrica",
    category: "cycle",
    emoji: "⚡",
    iconName: "Zap",
    primaryMetrics: ["distance", "speed", "time", "elevation"],
    primaryUnit: "km",
    isGpsCapable: true,
    isStrength: false,
    calculationType: "speed_distance",
    description: "Salidas en e-bike o pedaleo asistido.",
  },

  // 3. Core Pulse / Strength Sports
  {
    id: "weight_training",
    name: "Fuerza / Pesas",
    category: "strength",
    emoji: "🏋️",
    iconName: "Dumbbell",
    primaryMetrics: ["volume", "sets", "reps", "time"],
    primaryUnit: "kg",
    isGpsCapable: false,
    isStrength: true,
    calculationType: "weight_reps",
    description: "Entrenamiento de fuerza con barras, mancuernas y discos.",
  },
  {
    id: "bodybuilding",
    name: "Culturismo",
    category: "strength",
    emoji: "💪",
    iconName: "Dumbbell",
    primaryMetrics: ["volume", "sets", "reps", "rir"],
    primaryUnit: "kg",
    isGpsCapable: false,
    isStrength: true,
    calculationType: "weight_reps",
    description: "Hipertrofia, volumen muscular y bombeo de alta intensidad.",
  },
  {
    id: "calisthenics",
    name: "Calistenia",
    category: "strength",
    emoji: "🤸",
    iconName: "Activity",
    primaryMetrics: ["sets", "reps", "time", "weight"],
    primaryUnit: "reps",
    isGpsCapable: false,
    isStrength: true,
    calculationType: "weight_reps",
    description: "Ejercicios con el propio peso corporal y lastre.",
  },
  {
    id: "functional",
    name: "CrossFit / Funcional",
    category: "strength",
    emoji: "🔥",
    iconName: "Flame",
    primaryMetrics: ["rounds", "time", "reps", "calories"],
    primaryUnit: "rondas",
    isGpsCapable: false,
    isStrength: true,
    calculationType: "intervals",
    description: "WODs, intervalos metabólicos y circuitos de alta intensidad.",
  },

  // 4. Water, Racket & Other Sports
  {
    id: "swim",
    name: "Natación",
    category: "water_racket_other",
    emoji: "🏊",
    iconName: "Waves",
    primaryMetrics: ["distance", "pace", "time", "strokes"],
    primaryUnit: "m",
    isGpsCapable: false,
    isStrength: false,
    calculationType: "laps_distance",
    description: "Natación en piscina o aguas abiertas.",
  },
  {
    id: "padel",
    name: "Pádel",
    category: "water_racket_other",
    emoji: "🎾",
    iconName: "Trophy",
    primaryMetrics: ["time", "sets", "games", "calories"],
    primaryUnit: "min",
    isGpsCapable: false,
    isStrength: false,
    calculationType: "general",
    description: "Partidos y sesiones de entrenamiento de pádel.",
  },
  {
    id: "tennis",
    name: "Tenis",
    category: "water_racket_other",
    emoji: "🎾",
    iconName: "Trophy",
    primaryMetrics: ["time", "sets", "games", "calories"],
    primaryUnit: "min",
    isGpsCapable: false,
    isStrength: false,
    calculationType: "general",
    description: "Partidos individuales o dobles en pista.",
  },
  {
    id: "yoga",
    name: "Yoga",
    category: "water_racket_other",
    emoji: "🧘",
    iconName: "Heart",
    primaryMetrics: ["time", "heart_rate", "calories", "flow"],
    primaryUnit: "min",
    isGpsCapable: false,
    isStrength: false,
    calculationType: "general",
    description: "Sesiones de movilidad, respiración y vinyasa.",
  },
  {
    id: "hiit",
    name: "HIIT",
    category: "water_racket_other",
    emoji: "⚡",
    iconName: "Zap",
    primaryMetrics: ["intervals", "time", "heart_rate", "calories"],
    primaryUnit: "min",
    isGpsCapable: false,
    isStrength: false,
    calculationType: "intervals",
    description: "Intervalos de alta intensidad y acondicionamiento.",
  },
  {
    id: "boxing",
    name: "Boxeo",
    category: "water_racket_other",
    emoji: "🥊",
    iconName: "Flame",
    primaryMetrics: ["rounds", "time", "heart_rate", "calories"],
    primaryUnit: "rounds",
    isGpsCapable: false,
    isStrength: false,
    calculationType: "intervals",
    description: "Saco, asaltos, sparring y técnica de golpeo.",
  },
  {
    id: "climbing",
    name: "Escalada",
    category: "water_racket_other",
    emoji: "🧗",
    iconName: "Mountain",
    primaryMetrics: ["routes", "grade", "time", "attempts"],
    primaryUnit: "vías",
    isGpsCapable: false,
    isStrength: false,
    calculationType: "general",
    description: "Boulder, escalada deportiva o en rocódromo.",
  },
];

export const SPORTS_BY_ID: Record<string, SportMeta> = Object.fromEntries(
  SPORTS_CATALOG.map((s) => [s.id, s])
);

export function getSportMeta(id: string): SportMeta {
  return SPORTS_BY_ID[id] ?? SPORTS_CATALOG[0]!;
}

export function getSportsByCategory(category: SportCategory): SportMeta[] {
  return SPORTS_CATALOG.filter((s) => s.category === category);
}

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600) {
    return "--:--";
  }
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

export function formatSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh < 0) return "0.0 km/h";
  return `${kmh.toFixed(1)} km/h`;
}

export function formatDistance(meters: number, units: "metric" | "imperial" = "metric"): string {
  if (!Number.isFinite(meters) || meters < 0) return "0,00 km";
  if (units === "imperial") {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2).replace(".", ",")} km`;
}

export function formatElevation(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "+0 m";
  return `+${Math.round(meters)} m`;
}
