import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Dumbbell, LayoutTemplate, Play } from "lucide-react";
import { AppPage } from "@/components/auth-gate";
import { PulseLogo } from "@/components/pulse-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/pulse/fns";
import { GOALS } from "@/lib/pulse/types";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

type GoalId = (typeof GOALS)[number]["id"];
type Next = "create" | "free" | "templates";

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
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [weekly, setWeekly] = useState(4);
  const [busy, setBusy] = useState(false);

  async function finish(next: Next) {
    if (busy) return;
    setBusy(true);
    try {
      await completeOnboarding({
        data: {
          displayName: name.trim() || "Atleta",
          goal,
          units,
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
      if (next === "create") await navigate({ to: "/routines/$routineId", params: { routineId: "new" } });
      else if (next === "templates") await navigate({ to: "/routines", search: { templates: true } });
      else await navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  const slides = [
    <div key="name" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">¿Cómo te llamas?</h2>
      <p className="text-sm text-muted-foreground">Así te saludaremos en el inicio. Puedes cambiarlo después.</p>
      <div className="space-y-1.5">
        <Label htmlFor="onb-name">Nombre</Label>
        <Input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" autoComplete="name" />
      </div>
    </div>,
    <div key="goal" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Tu objetivo</h2>
      <p className="text-sm text-muted-foreground">No inventamos datos. Solo usamos esto para orientar la app.</p>
      <div className="grid gap-2">
        {GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGoal(g.id)}
            className={`rounded-2xl px-4 py-3 text-left pressable ${goal === g.id ? "bg-primary/12 ring-1 ring-primary" : "bg-muted"}`}
          >
            <p className="text-sm font-medium">{g.label}</p>
            <p className="text-xs text-muted-foreground">{g.hint}</p>
          </button>
        ))}
      </div>
    </div>,
    <div key="units" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Unidades</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setUnits("metric")}
          className={`h-12 rounded-2xl text-sm font-medium pressable ${units === "metric" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          kg
        </button>
        <button
          type="button"
          onClick={() => setUnits("imperial")}
          className={`h-12 rounded-2xl text-sm font-medium pressable ${units === "imperial" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          lb
        </button>
      </div>
    </div>,
    <div key="week" className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Días por semana</h2>
      <p className="text-sm text-muted-foreground">Objetivo de consistencia, no un plan inventado.</p>
      <p className="text-3xl font-semibold tabular">{weekly}</p>
      <input
        type="range"
        min={1}
        max={7}
        value={weekly}
        onChange={(e) => setWeekly(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label="Días de entrenamiento por semana"
      />
    </div>,
    <div key="next" className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">¿Cómo quieres empezar?</h2>
      <p className="text-sm text-muted-foreground">Las plantillas no se guardan hasta que las elijas.</p>
      <Button className="w-full" disabled={busy} loading={busy} loadingText="Creando cuenta…" onClick={() => void finish("create")}>
        <Dumbbell /> Crear mi primera rutina
      </Button>
      <Button className="w-full" variant="secondary" disabled={busy} onClick={() => void finish("templates")}>
        <LayoutTemplate /> Explorar plantillas
      </Button>
      <Button className="w-full" variant="ghost" disabled={busy} onClick={() => void finish("free")}>
        <Play /> Empezar sin rutina
      </Button>
    </div>,
  ];

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col pt-6">
      <div className="mb-6 flex justify-center">
        <PulseLogo animated size={64} />
      </div>
      <div className="mb-5 flex gap-1.5">
        {slides.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1"
        >
          {slides[step]}
        </motion.div>
      </AnimatePresence>
      {step < 4 && (
        <div className="mt-auto flex w-full gap-2 pt-10 pb-8">
          {step > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
              Atrás
            </Button>
          )}
          <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={step === 0 && !name.trim()}>
            Continuar
          </Button>
        </div>
      )}
    </div>
  );
}
