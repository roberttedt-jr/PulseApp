import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PulseLogo } from "@/components/pulse-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistSessionToken, readRecoveryCode, storeRecoveryCode } from "@/lib/session-token";
import { issueRecoveryCode, resetWithRecovery } from "@/lib/pulse/password-reset";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

type Mode = "in" | "up" | "forgot";

type AuthErr = { message?: string; code?: string; status?: number } | null | undefined;

/**
 * Google / X federate through the Grok auth broker. The shared preview client
 * only accepts callbacks on `*.grok-sandbox.com`. On Vercel those buttons 302
 * to the broker and it replies `Invalid redirect URI`.
 * Email / password is this app's own Better Auth and works everywhere.
 */
function socialLoginAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".grok-sandbox.com");
}

function alreadyRegistered(error: AuthErr): boolean {
  const code = error?.code ?? "";
  const raw = (error?.message ?? "").toLowerCase();
  return (
    code.includes("USER_ALREADY_EXISTS") ||
    raw.includes("already exists") ||
    raw.includes("ya está registrado")
  );
}

function isRateLimited(error: AuthErr): boolean {
  const code = error?.code ?? "";
  const raw = (error?.message ?? "").toLowerCase();
  return (
    error?.status === 429 ||
    code.includes("TOO_MANY") ||
    raw.includes("too many") ||
    raw.includes("rate limit")
  );
}

function isNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("load failed") ||
    m.includes("timeout") ||
    err.name === "TimeoutError" ||
    err.name === "AbortError"
  );
}

function mapAuthError(error: AuthErr, kind: Mode): string {
  if (isRateLimited(error)) return "No se ha podido conectar. Inténtalo de nuevo.";
  const code = error?.code ?? "";
  const raw = (error?.message ?? "").toLowerCase();
  if (alreadyRegistered(error)) {
    return "Este correo ya está registrado. Inicia sesión.";
  }
  if (code === "PASSWORD_TOO_SHORT" || raw.includes("too short")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (code === "INVALID_EMAIL" || raw.includes("invalid email")) {
    return "El email no es válido.";
  }
  if (kind === "up") return "No se ha podido conectar. Inténtalo de nuevo.";
  if (kind === "forgot") return "No se ha podido restablecer la contraseña.";
  return "El correo o la contraseña no son correctos.";
}

function captureAuthToken(ctx: { response?: Response }) {
  persistSessionToken(ctx.response?.headers.get("set-auth-token"));
}

async function persistAndEnter(token: string | null | undefined): Promise<boolean> {
  persistSessionToken(token);
  try {
    const session = await authClient.getSession();
    if (session.data?.user) return true;
  } catch {
    /* retry once below */
  }
  try {
    const session = await authClient.getSession();
    return Boolean(session.data?.user);
  } catch {
    return Boolean(token);
  }
}

async function issueAndStoreRecovery(email: string): Promise<void> {
  try {
    const issued = await issueRecoveryCode();
    if (issued?.code) storeRecoveryCode(email, issued.code);
  } catch {
    /* recovery code is optional — do not block sign-in */
  }
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [social, setSocial] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const slowTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSocial(socialLoginAvailable());
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      toast.error("No se pudo conectar con Google o X. Entra con tu email.");
    }
    return () => {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPending && user && !submittingRef.current) {
      void navigate({ to: "/" });
    }
  }, [isPending, user, navigate]);

  function armSlowNotice() {
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    slowTimerRef.current = window.setTimeout(() => {
      setFormError("Estamos tardando más de lo normal. Comprueba tu conexión e inténtalo otra vez.");
    }, 8000);
  }

  function disarmSlowNotice() {
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }

  async function enterApp(token: string | null | undefined, recoveryEmail: string) {
    const ok = await persistAndEnter(token);
    if (!ok && !token) {
      throw new Error("No se ha podido conectar. Inténtalo de nuevo.");
    }
    window.setTimeout(() => void issueAndStoreRecovery(recoveryEmail), 1500);
    await navigate({ to: "/" });
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy || submittingRef.current) return;
    submittingRef.current = true;
    const trimmed = email.trim().toLowerCase();
    const pwd = password;
    const displayName = name.trim() || trimmed.split("@")[0] || "Atleta";
    setFormError(null);
    setBusy(true);
    armSlowNotice();
    try {
      if (mode === "forgot") {
        if (pwd.length < 8) {
          setFormError("La contraseña debe tener al menos 8 caracteres.");
          toast.error("La contraseña debe tener al menos 8 caracteres.");
          return;
        }
        if (pwd !== confirm) {
          setFormError("Las contraseñas no coinciden.");
          toast.error("Las contraseñas no coinciden.");
          return;
        }
        const code = recoveryCode.trim() || readRecoveryCode(trimmed) || "";
        if (!code) {
          setFormError("Introduce el código de recuperación (PULSE-XXXX-XXXX) o entra con tu contraseña.");
          toast.error("Introduce el código de recuperación (PULSE-XXXX-XXXX) o entra con tu contraseña.");
          return;
        }
        await resetWithRecovery({
          data: { email: trimmed, recoveryCode: code, newPassword: pwd },
        });
        const signed = await authClient.signIn.email({
          email: trimmed,
          password: pwd,
          rememberMe: true,
          fetchOptions: { onSuccess: captureAuthToken },
        });
        if (signed.error) {
          const message = mapAuthError(signed.error, "in");
          setFormError(message);
          toast.error(message);
          return;
        }
        await enterApp(signed.data?.token, trimmed);
        return;
      }

      if (mode === "up") {
        const { data, error } = await authClient.signUp.email({
          email: trimmed,
          password: pwd,
          name: displayName,
          fetchOptions: { onSuccess: captureAuthToken },
        });
        if (error) {
          const message = mapAuthError(error, "up");
          if (alreadyRegistered(error)) {
            setMode("in");
            setFormError(message);
            toast.error(message);
            return;
          }
          setFormError(message);
          toast.error(message);
          return;
        }
        if (!data?.user) {
          setFormError("No se ha podido conectar. Inténtalo de nuevo.");
          toast.error("No se ha podido conectar. Inténtalo de nuevo.");
          return;
        }
        await enterApp(data.token, trimmed);
        return;
      }

      const { data, error } = await authClient.signIn.email({
        email: trimmed,
        password: pwd,
        rememberMe: true,
        fetchOptions: { onSuccess: captureAuthToken },
      });
      if (error) {
        const message = mapAuthError(error, "in");
        setFormError(message);
        toast.error(message);
        return;
      }
      await enterApp(data?.token, trimmed);
    } catch (err) {
      const message = isNetworkFailure(err)
        ? "No se ha podido conectar. Inténtalo de nuevo."
        : err instanceof Error
          ? err.message
          : mapAuthError(null, mode);
      setFormError(message);
      toast.error(message);
    } finally {
      disarmSlowNotice();
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function onSocial(providerId: string) {
    if (!socialLoginAvailable()) {
      toast.error("Google y X no están disponibles en esta URL. Crea una cuenta con email.");
      return;
    }
    setBusy(true);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login?error=oauth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo conectar");
      setBusy(false);
    }
  }

  const submitLabel =
    busy
      ? mode === "up"
        ? "Creando cuenta…"
        : mode === "forgot"
          ? "Guardando…"
          : "Iniciando sesión…"
      : mode === "up"
        ? "Crear cuenta"
        : mode === "forgot"
          ? "Restablecer contraseña"
          : "Entrar";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(255,45,85,0.18),transparent_60%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <PulseLogo animated size={88} alt="Pulse" className="mb-5" />
          <h1 className="text-3xl font-semibold tracking-tight">Pulse</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu ritmo. Tu progreso.</p>
        </div>

        {authEnabled ? (
          <div className="space-y-3">
            {social
              ? GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void onSocial(p.providerId)}
                  >
                    Continuar con {p.label}
                  </Button>
                ))
              : null}

            {social ? (
              <div className="flex items-center gap-3 py-2">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">o con email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : (
              <p className="pb-1 text-center text-[13px] leading-relaxed text-muted-foreground">
                {mode === "up"
                  ? "Crea tu cuenta con email para guardar tus entrenamientos."
                  : mode === "forgot"
                    ? "Introduce tu email, una nueva contraseña y el código de recuperación."
                    : "Entra con el email de tu cuenta."}
              </p>
            )}

            <form onSubmit={(ev) => void onEmail(ev)} className="space-y-3">
              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    placeholder="Alex"
                    autoComplete="name"
                    disabled={busy}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="alex@email.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{mode === "forgot" ? "Nueva contraseña" : "Contraseña"}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  disabled={busy}
                />
              </div>
              {mode === "forgot" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Repite la contraseña</Label>
                    <Input
                      id="confirm"
                      type="password"
                      required
                      minLength={8}
                      value={confirm}
                      onChange={(ev) => setConfirm(ev.target.value)}
                      placeholder="Confirma la nueva contraseña"
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recovery">Código de recuperación</Label>
                    <Input
                      id="recovery"
                      value={recoveryCode}
                      onChange={(ev) => setRecoveryCode(ev.target.value)}
                      placeholder="PULSE-XXXX-XXXX (si estás en otro dispositivo)"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={busy}
                    />
                  </div>
                </>
              )}
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {submitLabel}
              </Button>
            </form>

            {mode === "in" ? (
              <button
                type="button"
                className="w-full pt-1 text-center text-sm text-primary"
                disabled={busy}
                onClick={() => {
                  setMode("forgot");
                  setFormError(null);
                }}
              >
                ¿Has olvidado la contraseña?
              </button>
            ) : null}

            <button
              type="button"
              className="w-full pt-1 text-center text-sm text-muted-foreground"
              disabled={busy}
              onClick={() => {
                setMode(mode === "up" ? "in" : "up");
                setFormError(null);
                setConfirm("");
                setRecoveryCode("");
              }}
            >
              {mode === "up" ? "¿Ya tienes cuenta? Entra" : "¿Nueva aquí? Crea una cuenta"}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">El acceso está desactivado.</p>
        )}
      </div>
    </main>
  );
}
