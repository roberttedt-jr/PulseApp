import { Drawer } from "vaul";
import { Check, ChevronRight, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { inspectUsername, validateUsername, type ProfileVisibility, type WorkoutVisibility } from "@/lib/pulse/social";
import { checkUsernameAvailable, saveSocialProfile } from "@/lib/pulse/social-fns";
import type { Profile } from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

export interface SocialProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

export function SocialProfileSheet({ open, onOpenChange, profile, triggerRef }: SocialProfileSheetProps) {
  const qc = useQueryClient();

  // Local form state
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(profile.profileVisibility ?? "private");
  const [defaultWorkoutVisibility, setDefaultWorkoutVisibility] = useState<WorkoutVisibility>(
    profile.defaultWorkoutVisibility ?? "followers",
  );
  const [shareVolume, setShareVolume] = useState<boolean>(Boolean(profile.shareVolume));
  const [sharePrs, setSharePrs] = useState<boolean>(Boolean(profile.sharePrs));

  // Username validation & availability state
  const [usernameStatus, setUsernameStatus] = useState<"empty" | "invalid" | "checking" | "available" | "taken">("empty");
  const [usernameHint, setUsernameHint] = useState("");
  const req = useRef(0);

  // Discard confirmation state
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Sync form state when sheet opens or profile changes
  useEffect(() => {
    if (open) {
      const initialUsername = profile.username ?? "";
      setUsername(initialUsername);
      setBio(profile.bio ?? "");
      setProfileVisibility(profile.profileVisibility ?? "private");
      setDefaultWorkoutVisibility(profile.defaultWorkoutVisibility ?? "followers");
      setShareVolume(Boolean(profile.shareVolume));
      setSharePrs(Boolean(profile.sharePrs));
      setShowDiscardDialog(false);

      if (initialUsername) {
        setUsernameStatus("available");
        setUsernameHint("Tu nombre de usuario actual.");
      } else {
        setUsernameStatus("empty");
        setUsernameHint("Elige entre 3 y 20 caracteres.");
      }
    }
  }, [open, profile]);

  // Username availability check
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus("empty");
      setUsernameHint("Elige entre 3 y 20 caracteres.");
      return;
    }

    if (trimmed === (profile.username ?? "")) {
      setUsernameStatus("available");
      setUsernameHint("Tu nombre de usuario actual.");
      return;
    }

    const inspected = inspectUsername(trimmed);
    if (inspected.code !== "ok") {
      setUsernameStatus("invalid");
      setUsernameHint(inspected.message);
      return;
    }

    setUsernameStatus("checking");
    setUsernameHint("Comprobando disponibilidad…");
    const idn = ++req.current;

    const timer = window.setTimeout(() => {
      void checkUsernameAvailable({ data: { username: inspected.username, current: profile.username } })
        .then((res) => {
          if (idn !== req.current) return;
          if (res.available) {
            setUsernameStatus("available");
            setUsernameHint("¡Nombre de usuario disponible!");
          } else {
            setUsernameStatus("taken");
            setUsernameHint(res.message || "Este usuario ya está en uso.");
          }
        })
        .catch((e) => {
          if (idn !== req.current) return;
          setUsernameStatus("invalid");
          setUsernameHint(e instanceof Error ? e.message : "No se pudo comprobar.");
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [username, profile.username]);

  // Calculate isDirty
  const isDirty =
    username !== (profile.username ?? "") ||
    bio !== (profile.bio ?? "") ||
    profileVisibility !== (profile.profileVisibility ?? "private") ||
    defaultWorkoutVisibility !== (profile.defaultWorkoutVisibility ?? "followers") ||
    shareVolume !== Boolean(profile.shareVolume) ||
    sharePrs !== Boolean(profile.sharePrs);

  // Close handlers
  const safeClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      triggerRef?.current?.focus();
    }, 50);
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      safeClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setProfileVisibility(profile.profileVisibility ?? "private");
    setDefaultWorkoutVisibility(profile.defaultWorkoutVisibility ?? "followers");
    setShareVolume(Boolean(profile.shareVolume));
    setSharePrs(Boolean(profile.sharePrs));
    safeClose();
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (patch: Parameters<typeof saveSocialProfile>[0]["data"]) => saveSocialProfile({ data: patch }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Perfil social actualizado");
      safeClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el perfil social.");
    },
  });

  const handleSave = () => {
    const rawUser = username.trim();
    let validatedUser: string | undefined = undefined;

    if (rawUser && rawUser !== (profile.username ?? "")) {
      if (usernameStatus !== "available") {
        toast.error(usernameStatus === "taken" ? "Este usuario ya está en uso" : "Elige un nombre de usuario válido");
        return;
      }
      try {
        validatedUser = validateUsername(rawUser);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nombre de usuario no válido");
        return;
      }
    } else if (rawUser === (profile.username ?? "")) {
      validatedUser = rawUser;
    }

    const patch: Parameters<typeof saveSocialProfile>[0]["data"] = {
      username: validatedUser,
      bio: bio.trim(),
      profileVisibility,
      defaultWorkoutVisibility,
      shareVolume,
      sharePrs,
    };

    saveMutation.mutate(patch);
  };

  return (
    <>
      <Drawer.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            handleRequestClose();
          } else {
            onOpenChange(true);
          }
        }}
        dismissible={!isDirty}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border-t border-border/40 bg-card text-card-foreground shadow-float outline-none sm:rounded-3xl sm:max-h-[85vh]">
            {/* iOS Top Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-1.5 shrink-0" />

            {/* Sticky Header with Blur */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/40 bg-card/90 px-5 pt-2 pb-3.5 backdrop-blur-md">
              <div className="min-w-0 flex-1 pr-2">
                <Drawer.Title className="text-lg font-semibold tracking-tight text-foreground">
                  Perfil social
                </Drawer.Title>
                <Drawer.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                  Usuario, privacidad y visibilidad
                </Drawer.Description>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                aria-label="Cerrar"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-white/6 text-foreground/80 transition-all hover:bg-white/10 hover:text-foreground active:scale-95 pressable"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Body: 6 Structured Sections */}
            <div
              data-social-profile-body="1"
              className="no-scrollbar min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pt-5 pb-28"
            >
              {/* Sección 1: Identidad pública */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Identidad pública
                </h3>
                <div className="pulse-card space-y-2.5 p-4">
                  <Label htmlFor="social-username">Nombre de usuario</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-sm font-semibold text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="social-username"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/^@+/, ""))}
                      placeholder="usuario"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={20}
                      className="pl-8 pr-10"
                    />
                    {usernameStatus === "checking" ? (
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                        …
                      </span>
                    ) : null}
                    {usernameStatus === "available" && username !== (profile.username ?? "") ? (
                      <Check className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-success" />
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "flex min-h-4 items-center text-xs",
                      usernameStatus === "taken" || usernameStatus === "invalid"
                        ? "text-destructive"
                        : usernameStatus === "available" && username !== (profile.username ?? "")
                          ? "text-success"
                          : "text-muted-foreground",
                    )}
                    role="status"
                  >
                    {usernameHint}
                  </p>
                </div>
              </section>

              {/* Sección 2: Presentación */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Presentación
                </h3>
                <div className="pulse-card space-y-2 p-4">
                  <Label htmlFor="social-bio">Biografía</Label>
                  <Textarea
                    id="social-bio"
                    value={bio}
                    maxLength={160}
                    className="min-h-[84px] resize-none"
                    placeholder="Cómo entrenas, tus objetivos o qué te motiva..."
                    onChange={(e) => setBio(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <span className="text-[11px] tabular text-muted-foreground">{bio.length}/160</span>
                  </div>
                </div>
              </section>

              {/* Sección 3: Privacidad del perfil */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Privacidad del perfil
                </h3>
                <div className="pulse-card space-y-3 p-4">
                  <Segmented
                    ariaLabel="Privacidad del perfil"
                    className="flex w-full"
                    value={profileVisibility}
                    options={[
                      { value: "private", label: "Privado" },
                      { value: "public", label: "Público" },
                    ]}
                    onChange={(v) => setProfileVisibility(v as ProfileVisibility)}
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {profileVisibility === "private"
                      ? "Solo los atletas que apruebes podrán ver tus entrenamientos y estadísticas."
                      : "Cualquier usuario de Pulse podrá ver tu perfil y seguirte."}
                  </p>
                </div>
              </section>

              {/* Sección 4: Visibilidad de entrenamientos */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Visibilidad de entrenamientos
                </h3>
                <div className="pulse-card space-y-3 p-4">
                  <p className="text-sm font-medium">Por defecto en nuevas sesiones</p>
                  <Segmented
                    ariaLabel="Visibilidad por defecto de entrenamientos"
                    className="flex w-full"
                    itemClassName="text-xs sm:text-sm px-2 sm:px-4"
                    value={defaultWorkoutVisibility}
                    options={[
                      { value: "me", label: "Solo yo" },
                      { value: "followers", label: "Seguidores" },
                      { value: "public", label: "Público" },
                    ]}
                    onChange={(v) => setDefaultWorkoutVisibility(v as WorkoutVisibility)}
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {defaultWorkoutVisibility === "me"
                      ? "Tus nuevos entrenamientos serán privados por defecto."
                      : defaultWorkoutVisibility === "followers"
                        ? "Solo tus seguidores podrán ver tus nuevos entrenamientos."
                        : "Tus nuevos entrenamientos serán visibles para toda la comunidad."}
                  </p>
                </div>
              </section>

              {/* Sección 5: Detalles en publicaciones */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detalles en publicaciones
                </h3>
                <div className="pulse-card divide-y divide-border overflow-hidden">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium">Compartir volumen</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Muestra los kilogramos totales levantados en tus publicaciones
                      </p>
                    </div>
                    <Switch
                      checked={shareVolume}
                      onCheckedChange={setShareVolume}
                      aria-label="Compartir volumen"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium">Compartir récords (PR)</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Muestra las marcas personales alcanzadas en la sesión
                      </p>
                    </div>
                    <Switch
                      checked={sharePrs}
                      onCheckedChange={setSharePrs}
                      aria-label="Compartir récords"
                    />
                  </div>
                </div>
              </section>

              {/* Sección 6: Acción secundaria (Ver mi perfil público) */}
              {profile.username ? (
                <section className="pt-1 pb-2">
                  <Link
                    to="/u/$username"
                    params={{ username: profile.username }}
                    onClick={() => onOpenChange(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl glass-pill px-4 py-3 text-sm font-medium text-foreground transition-all hover:text-primary active:scale-[0.98]"
                  >
                    <span>Ver mi perfil público</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </section>
              ) : null}
            </div>

            {/* Floating Sticky Save Bar (only rendered when isDirty === true) */}
            {isDirty ? (
              <div
                data-social-save-bar="1"
                className="sticky bottom-0 z-20 border-t border-border/40 bg-card/95 px-5 py-3.5 backdrop-blur-md pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-float"
              >
                <Button
                  type="button"
                  className="h-12 w-full rounded-2xl text-sm font-semibold shadow-md"
                  disabled={
                    saveMutation.isPending ||
                    (username !== (profile.username ?? "") && usernameStatus !== "available")
                  }
                  loading={saveMutation.isPending}
                  loadingText="Guardando cambios…"
                  onClick={handleSave}
                >
                  Guardar cambios
                </Button>
              </div>
            ) : null}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Discard Confirmation Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="max-w-sm p-5">
          <DialogTitle className="text-base font-semibold">¿Descartar cambios?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Tienes modificaciones no guardadas. Si sales ahora, se perderán todos los cambios realizados.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDiscardDialog(false)}
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDiscard}
            >
              Descartar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
