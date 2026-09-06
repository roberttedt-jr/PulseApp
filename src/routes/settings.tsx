import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronRight, Download, Info, KeyRound, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { deleteAccountData, exportData, getBootstrap, updateProfile } from "@/lib/pulse/fns";
import { issueRecoveryCode } from "@/lib/pulse/password-reset";
import { ageFromBirthDate, bmi, bmiLabel, mifflinStJeor, recommendedCalories } from "@/lib/pulse/formulas";
import { readRecoveryCode, storeRecoveryCode } from "@/lib/session-token";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const p = data?.profile;
  const email = user?.primaryEmail ?? "";
  const [recovery, setRecovery] = useState(() => (email ? readRecoveryCode(email) : null));
  const [minting, setMinting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updateProfile>[0]["data"]) => updateProfile({ data: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      void qc.invalidateQueries({ queryKey: ["consistency"] });
      toast.success("Guardado");
    },
  });

  const bmiValue = p?.weightKg && p.heightCm ? bmi(p.weightKg, p.heightCm) : 0;
  const age = p?.birthDate ? ageFromBirthDate(p.birthDate) : 0;
  const kcal =
    p?.weightKg && p.heightCm && age && p.sex
      ? recommendedCalories(mifflinStJeor({ weightKg: p.weightKg, heightCm: p.heightCm, ageYears: age, sex: p.sex }), p.goal)
      : 0;

  return (
    <AppPage title="Perfil">
      <div className="mx-auto max-w-xl space-y-5 pt-4 pb-10">
        <div className="flex items-center gap-3 rounded-3xl bg-card p-4 hairline">
          <Avatar src={p?.image ?? user?.profileImageUrl} fallback={p?.displayName ?? user?.displayName ?? "P"} className="size-14" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{p?.displayName ?? user?.displayName ?? "Atleta"}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.primaryEmail}</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-60"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut("/").catch(() => {
                setSigningOut(false);
                toast.error("No se ha podido cerrar sesión. Inténtalo de nuevo.");
              });
            }}
          >
            {signingOut ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-card p-4 hairline">
            <p className="text-xs text-muted-foreground">IMC</p>
            <p className="text-xl font-semibold tabular">{bmiValue ? bmiValue.toFixed(1) : "—"}</p>
            <p className="text-xs text-muted-foreground">{bmiValue ? bmiLabel(bmiValue) : ""}</p>
          </div>
          <div className="rounded-3xl bg-card p-4 hairline">
            <p className="text-xs text-muted-foreground">kcal / día</p>
            <p className="text-xl font-semibold tabular">{kcal || "—"}</p>
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
              <Label>Peso kg</Label>
              <Input
                defaultValue={p?.weightKg ?? ""}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                autoComplete="off"
                className="text-base"
                onBlur={(e) => save.mutate({ weightKg: Number(e.target.value.replace(",", ".")) })}
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
                className="text-base"
                onBlur={(e) => save.mutate({ heightCm: Number(e.target.value) })}
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
            {minting ? "Generando…" : recovery ? "Generar otro código" : "Generar código"}
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
          <p className="mt-2">Versión 1.0 · Tracker de entrenamientos con el pulso de iOS.</p>
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
      <select className="h-10 rounded-xl bg-muted px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
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
    <Link to={to} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <Icon className="size-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

