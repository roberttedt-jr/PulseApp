import type { ExerciseType, MuscleGroup } from "./types";

const SECONDARY: Record<string, string[]> = {
  Pecho: ["Hombros", "Tríceps"],
  Espalda: ["Bíceps", "Core"],
  Hombros: ["Tríceps"],
  Bíceps: ["Hombros"],
  Tríceps: ["Pecho"],
  Cuádriceps: ["Glúteos", "Core"],
  Femorales: ["Glúteos", "Espalda"],
  Glúteos: ["Femorales", "Core"],
  Pantorrillas: [],
  Abdomen: ["Core"],
  Core: ["Hombros"],
};

const OVERRIDES: Record<string, { secondary: string[]; instructions: string; mistakes: string }> = {
  bench_press: {
    secondary: ["Hombros", "Tríceps"],
    instructions: "Escápulas juntas, pies firmes. Baja la barra al pecho medio y empuja en línea recta. El glúteo no despega del banco.",
    mistakes: "Rebotar en el pecho, abrir los codos a 90° y perder el arco natural de la lumbar.",
  },
  squat: {
    secondary: ["Glúteos", "Core", "Femorales"],
    instructions: "Barra sobre trapecios, braceo tenso. Siéntate entre los talones, rodillas en la línea del pie, y empuja el suelo.",
    mistakes: "Rodillas que colapsan hacia dentro, talones que se levantan y perder la espalda neutra.",
  },
  deadlift: {
    secondary: ["Femorales", "Glúteos", "Core"],
    instructions: "Barra sobre el mediopié. Caderas atrás, dorsal activo. Empuja el suelo y termina de pie, sin hiperextender.",
    mistakes: "Redondear la lumbar, arrancar con los brazos o dejar la barra lejos del cuerpo.",
  },
  ohp: {
    secondary: ["Tríceps", "Core"],
    instructions: "Agarre al ancho de hombros. Glúteo y abdomen tensos. Empuja la barra por encima de la cabeza y termina detrás de las orejas.",
    mistakes: "Inclinar en exceso la lumbar y no completar el bloqueo de codos.",
  },
  rdl: {
    secondary: ["Glúteos", "Espalda"],
    instructions: "Rodillas suaves. Caderas atrás hasta sentir el isquio. La barra roza el muslo en todo el trayecto.",
    mistakes: "Doblar demasiado las rodillas o perder el contacto de la barra con las piernas.",
  },
};

export type MovementFamily = "press" | "pull" | "squat" | "hinge" | "raise" | "curl" | "core" | "cardio";

export function movementFamily(name: string, muscle: string, type: string): MovementFamily {
  const n = name.toLowerCase();
  if (type === "Cardio") return "cardio";
  if (muscle === "Core" || muscle === "Abdomen" || n.includes("plancha") || n.includes("crunch")) return "core";
  if (n.includes("peso muerto") || n.includes("rdl") || n.includes("hiperext") || n.includes("good morning")) return "hinge";
  if (n.includes("sentadilla") || n.includes("prensa") || n.includes("zancada") || n.includes("squat")) return "squat";
  if (n.includes("dominada") || n.includes("jalón") || n.includes("remo") || n.includes("pull")) return "pull";
  if (n.includes("curl")) return "curl";
  if (n.includes("elevacion") || n.includes("elevación") || n.includes("pájaro") || n.includes("face pull")) return "raise";
  return "press";
}

export function exerciseMeta(
  id: string,
  name: string,
  muscle: string,
  type: string,
): { secondary: string[]; instructions: string; mistakes: string; family: MovementFamily } {
  const family = movementFamily(name, muscle, type);
  const ov = OVERRIDES[id];
  if (ov) return { ...ov, family };
  const secondary = SECONDARY[muscle] ?? [];
  const instructions =
    type === "Estiramiento"
      ? `Mantén ${name.toLowerCase()} 20–40 s por lado, sin rebotar. Respira y busca rango, no dolor.`
      : type === "Cardio"
        ? `Ritmo constante. Postura alta, core activo. Ajusta intensidad para poder hablar en frases cortas.`
        : type === "Aislamiento"
          ? `Recorrido controlado en ${name}. 1 s arriba, 2 s abajo. El músculo objetivo (${muscle.toLowerCase()}) debe iniciar el movimiento.`
          : `Planta firme y core tenso. Ejecuta ${name} con rango completo y para 1 s en el punto de máxima tensión.`;
  const mistakes =
    type === "Estiramiento"
      ? "Rebotar, aguantar la respiración o forzar hasta dolor articular."
      : "Usar inercia, recortar el rango y dejar que otros músculos roben el trabajo.";
  return { secondary, instructions, mistakes, family };
}

export function normalizeMuscle(muscle: string): MuscleGroup | string {
  if (muscle === "Abdomen") return "Core";
  return muscle;
}
