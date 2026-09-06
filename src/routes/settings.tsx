import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronRight, Download, HeartPulse, Info, KeyRound, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { AppleHealthRow } from "@/components/pulse/apple-health";
import { ProfileAvatar } from "@/components/pulse/avatar-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { deleteAccountData, devToolsAvailable, exportData, getBootstrap, purgeMySeededData, updateProfile } from "@/lib/pulse/fns";
import { issueRecoveryCode } from "@/lib/pulse/password-reset";
import { ageFromBirthDate, bmi, bmiLabel, mifflinStJeor, recommendedCalories } from "@/lib/pulse/formulas";
import { readRecoveryCode, storeRecoveryCode } from "@/lib/session-token";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const tools = useQuery({ queryKey: ["dev-tools"], queryFn: () => devToolsAvailable() });
  const p = data?.profile;
  const email = user?.primaryEmail ?? "";
  const [recovery, setRecovery] = useState(() => (email ? readRecoveryCode(email) : null));
  const [minting, setMinting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const display = p?.displayName ?? user?.displayName ?? "Atleta";

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updateProfile>[0]["data"]) => updateProfile({ data: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      void qc.invalidateQueries({ queryKey: ["consistency"] });
      toast.success("Guardado");
    },
  });

  const hasBody = Boolean(p?.weightKg && p.heightCm);
  const bmiValue = hasBody ? bmi(p!.weightKg!, p!.heightCm!) : 0;
  const age = p?.birthDate ? ageFromBirthDate(p.birthDate) : 0;
  const kcal =
    hasBody && age && p?.sex
      ? recommendedCalories(mifflinStJeor({ weightKg: p.weightKg!, heightCm: p.heightCm!, ageYears: age, sex: p.sex }), p.goal)
      : 0;

  return (
    <AppPage title="Perfil">
      <div className="mx-auto max-w-xl space-y-5 pt-4 pb-10">
        <div className="rounded-3xl bg-card p-5 text-center hairline">
          <ProfileAvatar src={p?.image ?? user?.profileImageUrl} name={display} />
          <p className="mt-3 font-semibold">{display}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.primaryEmail}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            loading={signingOut}
            loadingText="Cerrando…"
            onClick={() => {
              setSigningOut(true);
              void signOut("/").catch(() => {
                setSigningOut(false);
                toast.error("No se ha podido cerrar sesión. Inténtalo de nuevo.");
              });
            }}
          >
            Cerrar sesión
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-card p-4 hairline">
            <p className="text-xs text-muted-foreground">IMC</p>
            {hasBody ? (
              <>
                <p className="text-xl font-semibold tabular">{bmiValue.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{bmiLabel(bmiValue)}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Añade peso y altura para calcularlo.</p>
            )}
          </div>
          <div className="rounded-3xl bg-card p-4 hairline">
            <p className="text-xs text-muted-foreground">kcal / día</p>
            {kcal ? (
              <p className="text-xl font-semibold tabular">{kcal}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Completa el perfil para estimarlo.</p>
            )}
          </div>
        </div>

        <section className="space-y-3 rounded-3xl bg-card p-4 hairline">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              defaultValue={p?.displayName ?? ""}
              onBlur={(e) => save.mutate({ displayName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Peso {p?.units === "imperial" ? "lb" : "kg"}</Label>
              <Input
                defaultValue={p?.weightKg ?? ""}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                autoComplete="off"
                placeholder="Añadir peso"
                className="text-base"
                onBlur={(e) => {
                  const n = Number(e.target.value.replace(",", "."));
                  if (n > 0) save.mutate({ weightKg: n });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Altura cm</Label>
              <Input
                defaultValue={p?.heightCm ?? ""}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="Completar perfil"
                className="text-base"
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (n > 0) save.mutate({ heightCm: n });
                }}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl bg-card p-4 hairline">
          <p className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4" /> ¿Has olvidado la contraseña?
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Guarda este código. En la pantalla de acceso, pulsa «¿Has olvidado la contraseña?» e introdúcelo para elegir una nueva.
          </p>
          {recovery ? (
            <p className="rounded-2xl bg-secondary px-3 py-2 font-mono text-sm tracking-wide">{recovery}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Aún no hay código en este dispositivo.</p>
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={minting || !email}
            loading={minting}
            loadingText="Generando…"
            onClick={() => {
              setMinting(true);
              void issueRecoveryCode()
                .then((issued) => {
                  if (issued?.code) {
                    storeRecoveryCode(email, issued.code);
                    setRecovery(issued.code);
                    toast.success("Código nuevo. Guárdalo.");
                  }
                })
                .catch(() => toast.error("No se pudo generar el código"))
                .finally(() => setMinting(false));
            }}
          >
            {recovery ? "Generar otro código" : "Generar código"}
          </Button>
        </section>

        <section className="divide-y divide-border rounded-3xl bg-card hairline">
          <Toggle
            label="Unidades"
            hint={p?.units === "imperial" ? "Libras" : "Kilogramos"}
            checked={p?.units === "imperial"}
            onChange={(v) => save.mutate({ units: v ? "imperial" : "metric" })}
          />
          <RowSelect
            label="Tema"
            value={p?.theme ?? "dark"}
            options={[
              ["dark", "Oscuro"],
              ["light", "Claro"],
              ["system", "Automático"],
            ]}
            onChange={(v) => {
              save.mutate({ theme: v as "dark" | "light" | "system" });
              const dark = v === "dark" || (v === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.classList.toggle("dark", dark);
              document.documentElement.classList.toggle("light", !dark);
            }}
          />
          <Toggle
            label="Sonido de descanso"
            hint="Beep al terminar el timer"
            checked={p?.restSound ?? true}
            onChange={(v) => save.mutate({ restSound: v })}
          />
          <Toggle
            label="Descanso automático"
            hint="Arranca el timer al completar una serie"
            checked={p?.autoRest ?? true}
            onChange={(v) => save.mutate({ autoRest: v })}
          />
          <Toggle
            label="Perfil público"
            hint="Apareces en el feed"
            checked={p?.publicProfile ?? false}
            onChange={(v) => save.mutate({ publicProfile: v })}
          />
          <RowSelect
            label="Objetivo semanal"
            value={String(p?.weeklyGoal ?? 4)}
            options={["1", "2", "3", "4", "5", "6", "7"].map((n) => [
              n,
              `${n} ${n === "1" ? "día" : "días"}`,
            ])}
            onChange={(v) => save.mutate({ weeklyGoal: Number(v) })}
          />
        </section>

        <section className="overflow-hidden rounded-3xl bg-card hairline">
          <p className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-medium">
            <HeartPulse className="size-4 text-primary" /> Integraciones
          </p>
          <AppleHealthRow notify={p?.healthkitNotify ?? false} />
        </section>

        <nav className="overflow-hidden rounded-3xl bg-card hairline">
          <Go to="/plan" icon={Calendar} label="Plan semanal" />
          <Go to="/stats" icon={Trophy} label="Estadísticas y logros" />
          <Go to="/feed" icon={Users} label="Actividad social" />
        </nav>

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const json = await exportData();
              const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "pulse-export.json";
              a.click();
              const csv = [
                "id,title,started_at,duration,status",
                ...json.workouts.map(
                  (w) => `${w.id},${w.title},${w.startedAt},${w.durationSeconds},${w.status}`,
                ),
              ].join("\n");
              const a2 = document.createElement("a");
              a2.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              a2.download = "pulse-workouts.csv";
              a2.click();
            }}
          >
            <Download /> Exportar JSON + CSV
          </Button>
          {tools.data?.enabled && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (!confirm("Esto borra el historial, PRs, peso y plantillas automáticas de ESTA cuenta. No toca a otros usuarios. ¿Continuar?")) return;
                await purgeMySeededData();
                await qc.invalidateQueries();
                toast.success("Datos de prueba eliminados");
              }}
            >
              Limpiar datos de prueba
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Esto borra entrenamientos, rutinas y el perfil. ¿Continuar?")) return;
              await deleteAccountData();
              toast.success("Datos eliminados");
              window.location.href = "/";
            }}
          >
            Borrar cuenta
          </Button>
        </div>

        <div className="rounded-3xl bg-card p-4 text-sm text-muted-foreground hairline">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Info className="size-4" /> About Pulse
          </p>
          <p className="mt-2">Versión 1.1 · Tracker de entrenamientos con el pulso de iOS.</p>
        </div>
      </div>
    </AppPage>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function RowSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="text-sm font-medium">{label}</p>
      <select className="h-10 rounded-xl bg-muted px-2 text-base" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Go({ to, icon: Icon, label }: { to: "/plan" | "/stats" | "/feed"; icon: typeof Trophy; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 pressable">
      <Icon className="size-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
