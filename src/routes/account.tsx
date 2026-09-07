import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronRight, HeartPulse, Info, KeyRound, Shield, Trophy, UserRound } from "lucide-react";
import { useState } from "react";
import { AppPage } from "@/components/auth-gate";
import { AppleHealthRow } from "@/components/pulse/apple-health";
import { ProfileAvatar } from "@/components/pulse/avatar-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { deleteAccountData, devToolsAvailable, getBootstrap, purgeMySeededData, updateProfile } from "@/lib/pulse/fns";
import { issueRecoveryCode } from "@/lib/pulse/password-reset";
import { ageFromBirthDate, bmi, bmiLabel, mifflinStJeor, recommendedCalories } from "@/lib/pulse/formulas";
import { readRecoveryCode, storeRecoveryCode } from "@/lib/session-token";
import { fromKg, toKg } from "@/lib/utils";
import { DEFAULT_REST_OPTIONS, EXPERIENCE_LEVELS, GOALS, TRAINING_LOCATIONS, WEEKLY_TRAINING_OPTIONS, type Profile } from "@/lib/pulse/types";
import { formatHandle, validateUsername, type ProfileVisibility, type WorkoutVisibility } from "@/lib/pulse/social";
import { listBlockedUsers, saveSocialProfile, unblockUser } from "@/lib/pulse/social-fns";
import { COMPARE_COPY, COMPARE_METRICS, type CompareMetricId, type ComparePrefs } from "@/lib/pulse/compare";
import { saveComparePrefs } from "@/lib/pulse/compare-fns";
import { toast } from "sonner";
import { PulseLogo } from "@/components/pulse-logo";
import { PULSE_VERSION, PULSE_VERSION_NAME } from "@/lib/pulse/version";

export const Route = createFileRoute("/account")({ component: SettingsPage });

function SettingsPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: () => getBootstrap() });
  const tools = useQuery({ queryKey: ["dev-tools"], queryFn: () => devToolsAvailable() });
  const p = data?.profile;
  const email = user?.primaryEmail ?? "";
  const [recovery, setRecovery] = useState(() => (email ? readRecoveryCode(email) : null));
  const [minting, setMinting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
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
    <AppPage
      title="Ajustes"
      action={
        <button type="button" className="text-sm text-primary" onClick={() => void navigate({ to: "/settings" })}>
          Listo
        </button>
      }
    >
      <div className="mx-auto max-w-xl space-y-5 pt-4 pb-10">
        <div className="pulse-card p-5 text-center">
          <ProfileAvatar src={p?.image ?? user?.profileImageUrl} name={display} />
          <p className="mt-3 font-semibold">{display}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.primaryEmail}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="pulse-card p-4">
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
          <div className="pulse-card p-4">
            <p className="text-xs text-muted-foreground">kcal / día</p>
            {kcal ? (
              <p className="text-xl font-semibold tabular">{kcal}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Completa el perfil para estimarlo.</p>
            )}
          </div>
        </div>

        <section className="space-y-3 pulse-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Nombre</Label>
            <Input
              id="display-name"
              defaultValue={p?.displayName ?? ""}
              onBlur={(e) => save.mutate({ displayName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Peso {p?.units === "imperial" ? "lb" : "kg"}</Label>
              <Input
                key={`${p?.units}-${p?.weightKg ?? ""}`}
                defaultValue={p?.weightKg ? fromKg(p.weightKg, p.units) : ""}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                autoComplete="off"
                placeholder="Añadir peso"
                className="text-base"
                onBlur={(e) => {
                  const n = Number(e.target.value.replace(",", "."));
                  if (n > 0) save.mutate({ weightKg: toKg(n, p?.units ?? "metric") });
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

        <section className="space-y-3 pulse-card p-4">
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

        <section className="divide-y divide-border pulse-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Unidades</p>
              <p className="text-xs text-muted-foreground">Los pesos se guardan en kilogramos</p>
            </div>
            <Segmented
              ariaLabel="Unidades de peso"
              value={p?.units === "imperial" ? "imperial" : "metric"}
              options={[
                { value: "metric", label: "kg" },
                { value: "imperial", label: "lb" },
              ]}
              onChange={(v) => save.mutate({ units: v })}
            />
          </div>
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
            label="Mostrar RPE"
            hint="Esfuerzo percibido en cada serie"
            checked={p?.showRpe ?? true}
            onChange={(v) => save.mutate({ showRpe: v })}
          />
          <RowSelect
            label="Objetivo"
            value={p?.goal ?? ""}
            options={[["", "Sin definir"], ...GOALS.map((g) => [g.id, g.label])]}
            onChange={(v) => save.mutate({ goal: (v || null) as Profile["goal"] })}
          />
          <RowSelect
            label="Nivel"
            value={p?.experienceLevel ?? ""}
            options={[["", "Sin definir"], ...EXPERIENCE_LEVELS.map((g) => [g.id, g.label])]}
            onChange={(v) => save.mutate({ experienceLevel: (v || null) as Profile["experienceLevel"] })}
          />
          <RowSelect
            label="Lugar"
            value={p?.trainingLocation ?? ""}
            options={[["", "Sin definir"], ...TRAINING_LOCATIONS.map((g) => [g.id, g.label])]}
            onChange={(v) => save.mutate({ trainingLocation: (v || null) as Profile["trainingLocation"] })}
          />
          <RowSelect
            label="Descanso"
            value={String(p?.defaultRestSeconds ?? 90)}
            options={DEFAULT_REST_OPTIONS.map((n) => [String(n), `${n} s`])}
            onChange={(v) => save.mutate({ defaultRestSeconds: Number(v) })}
          />
          <RowSelect
            label="Objetivo semanal"
            value={String(p?.weeklyGoal ?? 4)}
            options={WEEKLY_TRAINING_OPTIONS.map((n) => [String(n.id), n.label])}
            onChange={(v) => save.mutate({ weeklyGoal: Number(v) })}
          />
        </section>

        {p && <SocialSection profile={p} />}

        {p && <CompareSection profile={p} />}

        <section className="overflow-hidden pulse-card">
          <p className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-medium">
            <HeartPulse className="size-4 text-primary" /> Integraciones
          </p>
          <AppleHealthRow notify={p?.healthkitNotify ?? false} />
        </section>

        <nav className="overflow-hidden pulse-card">
          <Go to="/plan" icon={Calendar} label="Plan semanal" />
          <Go to="/stats" icon={Trophy} label="Estadísticas y logros" />
          <Link
            to="/welcome"
            search={{ replay: true }}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 pressable"
            data-welcome-replay="1"
          >
            <Info className="size-4 text-primary" />
            <span className="flex-1 text-sm">Ver presentación</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 last:border-0 pressable"
            onClick={() => setBlockedOpen(true)}
          >
            <UserRound className="size-4 text-primary" />
            <span className="flex-1 text-left text-sm">Usuarios bloqueados</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </nav>

        <div className="flex flex-col gap-2">
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
          <Button
            variant="secondary"
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

        <div className="pulse-card p-5 text-center" data-about-pulse="1">
          <PulseLogo size={56} alt="" className="mx-auto" />
          <p className="mt-3 text-base font-semibold tracking-tight text-foreground">Pulse</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Versión {PULSE_VERSION} · {PULSE_VERSION_NAME}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Diseñada por <span className="font-medium text-foreground">Roberto</span>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Copyright © {new Date().getFullYear()} Pulse.</p>
        </div>
      </div>
      <BlockedSheet open={blockedOpen} onOpenChange={setBlockedOpen} />
    </AppPage>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  toggleId,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  toggleId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3" data-compare-toggle={toggleId}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
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

function Go({ to, icon: Icon, label }: { to: "/plan" | "/stats"; icon: typeof Trophy; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 pressable">
      <Icon className="size-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function SocialSection({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [usernameError, setUsernameError] = useState("");
  const save = useMutation({
    mutationFn: (patch: Parameters<typeof saveSocialProfile>[0]["data"]) => saveSocialProfile({ data: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Perfil social guardado");
    },
    onError: (e) => toast.error(e.message),
  });

  function commitUsername() {
    const raw = username.trim();
    if (!raw) {
      setUsernameError("");
      return;
    }
    try {
      const next = validateUsername(raw);
      setUsernameError("");
      setUsername(next);
      if (next !== profile.username) save.mutate({ username: next });
    } catch (e) {
      setUsernameError(e instanceof Error ? e.message : "Usuario no válido.");
    }
  }

  return (
    <section id="perfil-social" className="space-y-3 pulse-card p-4 scroll-mt-20">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Perfil social</p>
        {profile.username && (
          <Link to="/u/$username" params={{ username: profile.username }} className="text-xs font-medium text-primary">
            Ver perfil
          </Link>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="social-username">@usuario</Label>
        <Input
          id="social-username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameError("");
          }}
          onBlur={commitUsername}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="roberto"
          maxLength={20}
          aria-invalid={Boolean(usernameError)}
        />
        <p className={`text-xs ${usernameError ? "text-destructive" : "text-muted-foreground"}`}>
          {usernameError || (profile.username ? formatHandle(profile.username) : "3–20 caracteres. Letras, números y _.")}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="social-bio">Bio</Label>
        <Textarea
          id="social-bio"
          value={bio}
          maxLength={160}
          className="min-h-20"
          placeholder="Cómo entrenas, a qué te dedicas…"
          onChange={(e) => setBio(e.target.value)}
          onBlur={() => {
            if ((profile.bio ?? "") !== bio.trim()) save.mutate({ bio });
          }}
        />
        <p className="text-right text-[11px] text-muted-foreground">{bio.length}/160</p>
      </div>
      <div className="space-y-2">
        <Label>Visibilidad del perfil</Label>
        <Segmented
          ariaLabel="Visibilidad del perfil"
          className="flex w-full"
          value={profile.profileVisibility}
          options={[
            { value: "private", label: "Privado" },
            { value: "public", label: "Público" },
          ]}
          onChange={(v) => save.mutate({ profileVisibility: v as ProfileVisibility })}
        />
      </div>
      <div className="space-y-2">
        <Label>Entrenamientos por defecto</Label>
        <Segmented
          ariaLabel="Visibilidad predeterminada de entrenamientos"
          className="flex w-full"
          value={profile.defaultWorkoutVisibility}
          options={[
            { value: "me", label: "Solo yo" },
            { value: "followers", label: "Seguidores" },
            { value: "public", label: "Público" },
          ]}
          onChange={(v) => save.mutate({ defaultWorkoutVisibility: v as WorkoutVisibility })}
        />
      </div>
      <Toggle
        label="Compartir volumen"
        hint="El volumen total puede verse en tus publicaciones"
        checked={profile.shareVolume}
        onChange={(v) => save.mutate({ shareVolume: v })}
      />
      <Toggle
        label="Compartir récords"
        hint="Los PR de esa sesión pueden verse si los hay"
        checked={profile.sharePrs}
        onChange={(v) => save.mutate({ sharePrs: v })}
      />
    </section>
  );
}

function prefsFromProfile(profile: Profile): ComparePrefs {
  return {
    enabled: profile.compareEnabled,
    workouts: profile.compareWorkouts,
    days: profile.compareDays,
    streak: profile.compareStreak,
    sets: profile.compareSets,
    volume: profile.compareVolume,
    exercises: profile.compareExercises,
    prs: profile.comparePrs,
  };
}

function CompareSection({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const prefs = prefsFromProfile(profile);
  const save = useMutation({
    mutationFn: (patch: Partial<ComparePrefs>) => saveComparePrefs({ data: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      void qc.invalidateQueries({ queryKey: ["compare"] });
      void qc.invalidateQueries({ queryKey: ["compare-friends"] });
      toast.success("Guardado");
    },
    onError: (e) => toast.error(e.message),
  });
  function toggle(id: "enabled" | CompareMetricId, value: boolean) {
    save.mutate({ [id]: value });
  }
  return (
    <section id="comparativas" className="overflow-hidden pulse-card scroll-mt-20">
      <div className="px-4 pt-4 pb-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Shield className="size-4 text-primary" /> Comparativas
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{COMPARE_COPY.subtitle}</p>
      </div>
      <div className="divide-y divide-border">
        <Toggle
          toggleId="enabled"
          label={COMPARE_COPY.enableMaster}
          hint={COMPARE_COPY.enableHint}
          checked={prefs.enabled}
          onChange={(v) => toggle("enabled", v)}
        />
        {COMPARE_METRICS.map((m) => (
          <Toggle
            key={m.id}
            toggleId={m.id}
            label={m.label}
            hint={m.hint}
            checked={prefs[m.id]}
            onChange={(v) => toggle(m.id, v)}
          />
        ))}
      </div>
      <p className="px-4 pt-2 pb-4 text-xs text-muted-foreground">{COMPARE_COPY.privacyNote}</p>
    </section>
  );
}

function BlockedSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: () => listBlockedUsers(),
    enabled: open,
  });
  const unblock = useMutation({
    mutationFn: (userId: string) => unblockUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuario desbloqueado");
      void qc.invalidateQueries({ queryKey: ["blocked-users"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="px-5 pt-3 pb-4">
        <SheetTitle>Usuarios bloqueados</SheetTitle>
        <SheetDescription>No verás su actividad y ellos no verán la tuya.</SheetDescription>
        {isPending && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}
        {!isPending && (data?.people.length ?? 0) === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No tienes a nadie bloqueado.</p>
        )}
        <ul className="mt-4 space-y-3">
          {(data?.people ?? []).map((p) => (
            <li key={p.userId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.handle}</p>
              </div>
              <Button size="sm" variant="secondary" disabled={unblock.isPending} onClick={() => unblock.mutate(p.userId)}>
                Desbloquear
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

