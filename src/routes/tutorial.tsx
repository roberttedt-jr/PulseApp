import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Dumbbell, House, Plus, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ScreenSkeleton, PublicEntryRedirect } from "@/components/auth-gate";
import { FlowActions, FlowShell } from "@/components/pulse/flow-shell";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { flowPath, resolveAppFlow } from "@/lib/pulse/flow";
import { completeTutorial, getBootstrap, startWorkout } from "@/lib/pulse/fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/tutorial")({ component: TutorialPage });

function TutorialPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <ScreenSkeleton />;
  if (!user) return <PublicEntryRedirect />;
  return <TutorialFlow />;
}

function TutorialFlow() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!data?.profile || ready) return;
    const flow = resolveAppFlow(data.profile);
    if (flow === "setup") {
      void navigate({ to: "/setup" });
      return;
    }
    if (flow === "app") {
      void navigate({ to: "/" });
      return;
    }
    setReady(true);
  }, [data, ready, navigate]);

  if (isPending || !data?.profile || !ready) return <ScreenSkeleton />;

  async function finish(next: "routine" | "free" | "app") {
    if (busy) return;
    setBusy(true);
    try {
      await completeTutorial();
      qc.setQueryData(["bootstrap"], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const rec = old as { profile?: { tutorialCompletedAt?: string | null; setupCompletedAt?: string | null } };
        if (!rec.profile) return old;
        return {
          ...rec,
          profile: {
            ...rec.profile,
            tutorialCompletedAt: rec.profile.tutorialCompletedAt ?? new Date().toISOString(),
            setupCompletedAt: rec.profile.setupCompletedAt ?? new Date().toISOString(),
          },
        };
      });
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      if (next === "routine") {
        await navigate({ to: "/routines/$routineId", params: { routineId: "new" } });
        return;
      }
      if (next === "free") {
        const res = await startWorkout({ data: {} });
        await navigate({ to: "/train", search: { id: res.id } });
        return;
      }
      await navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo continuar");
      setBusy(false);
    }
  }

  const screens = [
    <div key="train" className="space-y-5">
      <h1 className="text-[clamp(1.6rem,7vw,2rem)] leading-tight font-semibold tracking-tight">Empieza aquí</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        Crea una rutina o registra un entrenamiento libre.
      </p>
      <TabPreview highlight="Entrenar" />
    </div>,
    <div key="set" className="space-y-5">
      <h1 className="text-[clamp(1.6rem,7vw,2rem)] leading-tight font-semibold tracking-tight">Registra cada serie</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        Añade peso y repeticiones para guardar tu progreso.
      </p>
      <div className="pulse-card p-4">
        <p className="text-sm font-medium">Remo con barra</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="grid h-11 flex-1 place-items-center rounded-xl bg-muted text-sm font-semibold tabular">70 kg</span>
          <span className="grid h-11 flex-1 place-items-center rounded-xl bg-muted text-sm font-semibold tabular">10</span>
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Plus className="size-4" />
          </span>
        </div>
      </div>
    </div>,
    <div key="log" className="space-y-5">
      <h1 className="text-[clamp(1.6rem,7vw,2rem)] leading-tight font-semibold tracking-tight">Todo queda registrado</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        Consulta tus entrenamientos y mejora sesión a sesión.
      </p>
      <TabPreview highlight="Inicio" />
    </div>,
  ];

  return (
    <FlowShell
      step={step}
      total={3}
      pages={screens}
      onStepChange={setStep}
      onSkip={() => void finish("app")}
      onBack={step > 0 ? () => setStep(step - 1) : undefined}
      skipLabel="Saltar"
      footer={
        step < 2 ? (
          <FlowActions primary={() => setStep(step + 1)} primaryLabel="Siguiente" />
        ) : (
          <>
            <Button className="w-full" size="lg" disabled={busy} loading={busy} loadingText="Abriendo…" onClick={() => void finish("routine")}>
              Crear mi primera rutina
            </Button>
            <Button className="w-full" variant="secondary" disabled={busy} onClick={() => void finish("free")}>
              Empezar entrenamiento libre
            </Button>
            <button
              type="button"
              className="w-full min-h-11 text-center text-sm text-muted-foreground"
              disabled={busy}
              onClick={() => void finish("app")}
            >
              Explorar Pulse
            </button>
          </>
        )
      }
    >
      {screens[step]}
    </FlowShell>
  );
}

function TabPreview({ highlight }: { highlight: "Entrenar" | "Inicio" }) {
  const tabs = [
    { label: "Inicio", icon: House },
    { label: "Entrenar", icon: Dumbbell },
    { label: "Actividad", icon: Users },
    { label: "Progreso", icon: Activity },
    { label: "Perfil", icon: UserRound },
  ];
  return (
    <div className="pulse-card px-2 py-3">
      <div className="mx-auto max-w-sm rounded-[28px] glass px-1.5 py-1.5">
        <div className="grid grid-cols-5">
          {tabs.map((tab) => {
            const on = tab.label === highlight;
            const Icon = tab.icon;
            return (
              <div key={tab.label} className={cn("flex min-w-0 flex-col items-center gap-1 py-1", on ? "text-foreground" : "text-foreground-tertiary")}>
                <span className={cn("grid size-8 place-items-center rounded-full", on && "bg-white/12")}>
                  <Icon className="size-4" strokeWidth={on ? 2.4 : 1.85} />
                </span>
                <span className="max-w-full truncate px-0.5 text-[8px] font-semibold">{tab.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
