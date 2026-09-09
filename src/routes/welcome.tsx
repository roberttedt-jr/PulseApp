import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScreenSkeleton } from "@/components/auth-gate";
import { PulseLogo } from "@/components/pulse-logo";
import { FlowActions, FlowShell } from "@/components/pulse/flow-shell";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { markPublicOnboardingSeen } from "@/lib/pulse/flow";

export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>): { replay?: boolean } => ({
    replay: s.replay === true || s.replay === "1" || s.replay === "true",
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [step, setStep] = useState(0);

  if (!search.replay && user) {
    return <Navigate to="/" />;
  }
  if (!search.replay && isPending) {
    return <ScreenSkeleton />;
  }

  function finish(mode: "up" | "in") {
    markPublicOnboardingSeen();
    if (search.replay && user) {
      void navigate({ to: "/" });
      return;
    }
    void navigate({ to: "/login", search: { mode } });
  }

  const screens = [
    <div key="hi" className="flex flex-1 flex-col items-center justify-center overflow-visible text-center">
      <PulseLogo animated size={96} alt="" className="mb-2" />
      <p className="text-lg font-semibold tracking-tight">Pulse</p>
      <h1 className="mt-8 text-[clamp(1.85rem,8vw,2.45rem)] leading-[1.05] font-semibold tracking-tight">
        El ritmo de tu fuerza.
      </h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        Registra tus entrenamientos y sigue tu progreso.
      </p>
    </div>,
    <div key="train" className="flex flex-1 flex-col">
      <h1 className="text-[clamp(1.7rem,7vw,2.1rem)] leading-tight font-semibold tracking-tight">
        Todo tu entrenamiento, en un sitio.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Crea rutinas, registra series, peso y repeticiones.
      </p>
      <div className="mt-8 pulse-card p-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">Press de banca</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
          <span>Serie</span>
          <span>kg</span>
          <span>Reps</span>
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="mt-2 grid grid-cols-3 items-center gap-2">
            <span className="grid h-10 place-items-center rounded-xl bg-muted text-sm font-medium tabular">{n}</span>
            <span className="grid h-10 place-items-center rounded-xl bg-muted text-sm tabular text-muted-foreground">—</span>
            <span className="grid h-10 place-items-center rounded-xl bg-muted text-sm tabular text-muted-foreground">—</span>
          </div>
        ))}
      </div>
    </div>,
    <div key="progress" className="flex flex-1 flex-col">
      <h1 className="text-[clamp(1.7rem,7vw,2.1rem)] leading-tight font-semibold tracking-tight">
        Haz visible tu progreso.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Historial completo, récords personales y balance muscular.
      </p>
      <div className="mt-8 space-y-3">
        <div className="pulse-card px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Historial</p>
          <p className="mt-2 text-sm font-medium">Cada sesión queda guardada</p>
          <p className="text-xs text-muted-foreground">Duración, series y volumen reales</p>
        </div>
        <div className="pulse-card px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-warning uppercase">Mejor marca</p>
          <p className="mt-1 text-sm font-medium">Cuando superas tu mejor serie, Pulse la guarda</p>
        </div>
      </div>
    </div>,
  ];

  return (
    <FlowShell
      step={step}
      total={3}
      pages={screens}
      onStepChange={setStep}
      onSkip={step < 2 ? () => setStep(2) : undefined}
      onBack={step > 0 ? () => setStep((s) => Math.max(0, s - 1)) : undefined}
      footer={
        step < 2 ? (
          <FlowActions primary={() => setStep(step + 1)} primaryLabel={step === 0 ? "Continuar" : "Siguiente"} />
        ) : (
          <>
            <Button className="w-full" size="lg" onClick={() => finish("up")}>
              Crear cuenta
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => finish("in")}>
              Ya tengo cuenta
            </Button>
          </>
        )
      }
    >
      {screens[step]}
    </FlowShell>
  );
}
