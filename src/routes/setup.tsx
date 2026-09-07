import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PublicEntryRedirect, ScreenSkeleton } from "@/components/auth-gate";
import { ChoiceButton, FlowActions, FlowShell, UnitSegment } from "@/components/pulse/flow-shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { flowPath, resolveAppFlow } from "@/lib/pulse/flow";
import { getBootstrap, saveSetupProgress } from "@/lib/pulse/fns";
import {
  DEFAULT_REST_OPTIONS,
  EXPERIENCE_LEVELS,
  GOALS,
  TRAINING_LOCATIONS,
  WEEKLY_TRAINING_OPTIONS,
  type ExperienceLevel,
  type GoalId,
  type TrainingLocation,
  type Units,
} from "@/lib/pulse/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({ component: SetupPage });

function SetupPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <ScreenSkeleton />;
  if (!user) return <PublicEntryRedirect />;
  return <SetupFlow />;
}

function SetupFlow() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const profile = data?.profile;
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [location, setLocation] = useState<TrainingLocation | null>(null);
  const [weekly, setWeekly] = useState<number | null>(null);
  const [units, setUnits] = useState<Units>("metric");
  const [rest, setRest] = useState<number>(90);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile || ready) return;
    const flow = resolveAppFlow(profile);
    if (flow !== "setup") {
      void navigate({ to: flowPath(flow) });
      return;
    }
    setGoal(profile.goal);
    setExperience(profile.experienceLevel);
    setLocation(profile.trainingLocation);
    setWeekly(profile.setupStep >= 2 ? profile.weeklyGoal : null);
    setUnits(profile.units);
    setRest(profile.defaultRestSeconds || 90);
    setStep(Math.min(3, Math.max(0, profile.setupStep)));
    setReady(true);
  }, [profile, ready, navigate]);

  if (isPending || !profile || !ready) return <ScreenSkeleton />;

  async function persist(patch: Parameters<typeof saveSetupProgress>[0]["data"]) {
    const next = await saveSetupProgress({ data: patch });
    qc.setQueryData(["bootstrap"], (old: unknown) => {
      if (!old || typeof old !== "object") return old;
      return { ...(old as object), profile: next };
    });
    return next;
  }

  async function goNext(complete = false) {
    if (busy) return;
    setBusy(true);
    try {
      const nextStep = complete ? 4 : Math.min(3, step + 1);
      const patch: Parameters<typeof saveSetupProgress>[0]["data"] = {
        setupStep: nextStep,
        complete,
      };
      if (step === 0) patch.goal = goal;
      if (step === 1) {
        patch.experienceLevel = experience;
        patch.trainingLocation = location;
      }
      if (step === 2) patch.weeklyGoal = weekly ?? 0;
      if (step === 3) {
        patch.units = units;
        patch.defaultRestSeconds = rest;
      }
      await persist(patch);
      if (complete || step === 3) {
        await qc.invalidateQueries({ queryKey: ["bootstrap"] });
        await navigate({ to: "/tutorial" });
        return;
      }
      setStep(nextStep);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  const screens = [
    <div key="goal" className="space-y-4">
      <h1 className="text-[clamp(1.6rem,7vw,2rem)] leading-tight font-semibold tracking-tight">
        ¿Cuál es tu objetivo principal?
      </h1>
      <div className="grid gap-2">
        {GOALS.map((g) => (
          <ChoiceButton
            key={g.id}
            selected={goal === g.id}
            title={g.label}
            hint={g.hint}
            onClick={() => setGoal(g.id)}
          />
        ))}
      </div>
    </div>,
    <div key="xp" className="space-y-6">
      <h1 className="text-[clamp(1.6rem,7vw,2rem)] leading-tight font-semibold tracking-tight">
        ¿Cómo entrenas normalmente?
      </h1>
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Nivel</p>
        {EXPERIENCE_LEVELS.map((item) => (
          <ChoiceButton
            key={item.id}
            selected={experience === item.id}
            title={item.label}
            onClick={() => setExperience(item.id)}
          />
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Lugar</p>
        {TRAINING_LOCATIONS.map((item) => (
          <ChoiceButton
            key={item.id}
            selected={location === item.id}
            title={item.label}
            onClick={() => setLocation(item.id)}
          />
        ))}
      </div>
    </div>,
    <div key="week" className="space-y-4">
      <h1 className="text-[clamp(1.6rem,7vw,2rem)] leading-tight font-semibold tracking-tight">
        ¿Cuántos días quieres entrenar?
      </h1>
      <div className="grid gap-2">
        {WEEKLY_TRAINING_OPTIONS.map((item) => (
          <ChoiceButton
            key={item.id}
            selected={weekly === item.id}
            title={item.label}
            onClick={() => setWeekly(item.id)}
          />
        ))}
      </div>
    </div>,
    <div key="prefs" className="space-y-6">
      <h1 className="text-[clamp(1.6rem,7vw,2rem)] leading-tight font-semibold tracking-tight">Déjalo a tu medida</h1>
      <div className="space-y-2">
        <p className="text-sm font-medium">Unidad de peso</p>
        <UnitSegment value={units} onChange={setUnits} />
        <p className="text-xs text-muted-foreground">Los cálculos se guardan en kilogramos.</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Descanso por defecto</p>
        <div role="radiogroup" aria-label="Descanso por defecto" className="grid grid-cols-3 gap-2">
          {DEFAULT_REST_OPTIONS.map((sec) => {
            const on = rest === sec;
            return (
              <button
                key={sec}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setRest(sec)}
                className={cn(
                  "h-12 rounded-2xl text-sm font-semibold pressable glass-pill",
                  on && "glass-pill-on",
                )}
              >
                {sec} s
              </button>
            );
          })}
        </div>
      </div>
    </div>,
  ];

  return (
    <FlowShell
      step={step}
      total={4}
      pages={screens}
      onStepChange={setStep}
      onBack={step > 0 ? () => setStep(step - 1) : undefined}
      footer={
        <FlowActions
          primary={() => void goNext(step === 3)}
          primaryLabel="Continuar"
          secondaryLabel="Omitir por ahora"
          onSecondary={() => void goNext(true)}
          busy={busy}
        />
      }
    >
      {screens[step]}
    </FlowShell>
  );
}
