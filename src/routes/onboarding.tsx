import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Activity, Flame, Target } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { PulseLogo } from "@/components/pulse-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/pulse/fns";
import { GOALS } from "@/lib/pulse/types";
import { ageFromBirthDate, bmi, mifflinStJeor, recommendedCalories } from "@/lib/pulse/formulas";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

const SLIDES = [
  {
    icon: Activity,
    title: "Siente el ritmo",
    body: "Pulse convierte cada serie en una señal clara: volumen, progreso y consistencia, sin ruido.",
  },
  {
    icon: Flame,
    title: "Entrena en vivo",
    body: "Cronómetro de descanso, 1RM estimado y un flujo que se siente como una app nativa de iPhone.",
  },
  {
    icon: Target,
    title: "Mide lo que importa",
    body: "PRs, racha, Pulse Score y un historial que te empuja a volver mañana.",
  },
];

function OnboardingPage() {
  return (
    <AppPage hideNav>
      <Onboarding />
    </AppPage>
  );
}

function Onboarding() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.displayName ?? "");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [weight, setWeight] = useState("78");
  const [height, setHeight] = useState("178");
  const [birth, setBirth] = useState("1996-04-12");
  const [goal, setGoal] = useState<"gain" | "lose" | "maintain">("gain");
  const [weekly, setWeekly] = useState(4);
  const [busy, setBusy] = useState(false);

  const w = Number(weight);
  const h = Number(height);
  const age = ageFromBirthDate(birth);
  const ree = mifflinStJeor({ weightKg: w, heightCm: h, ageYears: age, sex });
  const kcal = recommendedCalories(ree, goal);
  const index = bmi(w, h);

  async function finish() {
    setBusy(true);
    try {
      await completeOnboarding({
        data: {
          displayName: name.trim() || "Atleta",
          sex,
          weightKg: w,
          heightCm: h,
          birthDate: birth,
          goal,
          weeklyGoal: weekly,
        },
      });
      qc.setQueryData(["bootstrap"], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const rec = old as { profile?: { onboardingDone?: boolean } };
        if (!rec.profile) return old;
        return { ...rec, profile: { ...rec.profile, onboardingDone: true } };
      });
      await qc.refetchQueries({ queryKey: ["bootstrap"] });
      await navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col pt-6">
      <div className="mb-6 flex justify-center">
        <PulseLogo animated size={64} />
      </div>

      {step < 3 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col items-center text-center"
          >
          {(() => {
            const Icon = SLIDES[step].icon;
            return (
              <div className="mb-6 grid size-20 place-items-center rounded-3xl bg-primary/12 text-primary">
                <Icon className="size-9" />
              </div>
            );
          })()}
          <h2 className="text-3xl font-semibold tracking-tight">{SLIDES[step].title}</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{SLIDES[step].body}</p>
          <div className="mt-8 flex gap-1.5">
            {SLIDES.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
            ))}
          </div>
          <div className="mt-auto flex w-full gap-2 pt-10">
            {step > 0 && (
              <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
                Atrás
              </Button>
            )}
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Continuar
            </Button>
          </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="space-y-4 pb-8">
          <h2 className="text-2xl font-semibold tracking-tight">Tu perfil</h2>
          <p className="text-sm text-muted-foreground">Lo usamos para IMC, calorías y el saludo de cada mañana.</p>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`h-12 rounded-2xl text-sm font-medium ${sex === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {s === "male" ? "Hombre" : "Mujer"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Peso (kg)</Label>
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                enterKeyHint="next"
                autoComplete="off"
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Altura (cm)</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="next"
                autoComplete="off"
                value={height}
                onChange={(e) => setHeight(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de nacimiento</Label>
            <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
          </div>
          <div className="grid gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                className={`rounded-2xl px-4 py-3 text-left ${goal === g.id ? "bg-primary/12 ring-1 ring-primary" : "bg-muted"}`}
              >
                <p className="text-sm font-medium">{g.label}</p>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Objetivo semanal: {weekly} entrenamientos</Label>
            <input
              type="range"
              min={2}
              max={6}
              value={weekly}
              onChange={(e) => setWeekly(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="rounded-3xl bg-card p-4 hairline">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Estimación</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-semibold tabular">{index ? index.toFixed(1) : "—"}</p>
                <p className="text-xs text-muted-foreground">IMC</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular">{kcal || "—"}</p>
                <p className="text-xs text-muted-foreground">kcal / día</p>
              </div>
            </div>
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void finish()}>
            {busy ? "Guardando…" : "Entrar a Pulse"}
          </Button>
        </div>
      )}
    </div>
  );
}
