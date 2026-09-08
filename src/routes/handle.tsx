import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppPage, ScreenSkeleton } from "@/components/auth-gate";
import { UsernameField, type UsernameStatus } from "@/components/pulse/username-field";
import { Button } from "@/components/ui/button";
import { flowPath, resolveAppFlow } from "@/lib/pulse/flow";
import { getBootstrap } from "@/lib/pulse/fns";
import { inspectUsername } from "@/lib/pulse/social";
import { saveSocialProfile } from "@/lib/pulse/social-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/handle")({ component: HandlePage });

function HandlePage() {
  return (
    <AppPage hideNav>
      <ClaimHandle />
    </AppPage>
  );
}

function ClaimHandle() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap(), staleTime: 60_000 });
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<UsernameStatus>("empty");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const profile = data?.profile;

  if (!profile) return <ScreenSkeleton />;
  const flow = resolveAppFlow(profile);
  if (flow !== "handle") return <Navigate to={flowPath(flow)} />;

  const canSubmit = status === "available" && !busy;

  async function submit() {
    if (!canSubmit) return;
    const inspected = inspectUsername(value);
    if (inspected.code !== "ok") {
      setFieldError(inspected.message);
      return;
    }
    setBusy(true);
    setFieldError(null);
    try {
      await saveSocialProfile({ data: { username: inspected.username } });
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      const next = await getBootstrap();
      void navigate({ to: flowPath(resolveAppFlow(next.profile)) });
    } catch (e) {
      setFieldError(e instanceof Error ? e.message : "Este usuario ya está en uso");
      toast.error(e instanceof Error ? e.message : "Este usuario ya está en uso");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-sm flex-col justify-center px-1 pb-8">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">Tu identidad</p>
      <h1 className="mt-2 text-[clamp(1.7rem,7vw,2.1rem)] leading-tight font-semibold tracking-tight">
        Elige tu @usuario
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Es tu nombre público en Pulse. Lo usarás para que te encuentren y para compartir sesiones.
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <UsernameField
          value={value}
          onChange={(v) => {
            setValue(v);
            setFieldError(null);
          }}
          onStatus={(s) => setStatus(s)}
          error={fieldError}
          autoFocus
          disabled={busy}
        />
        <Button type="submit" className="w-full" size="lg" disabled={!canSubmit} loading={busy} loadingText="Guardando…">
          Continuar
        </Button>
      </form>
    </div>
  );
}
