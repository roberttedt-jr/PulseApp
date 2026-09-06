import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
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

const RATE_LIMIT_MSG =
  "Has hecho demasiados intentos. Espera unos segundos antes de volver a intentarlo.";
const SLOW_MSG = "Estamos tardando más de lo normal. No cierres la pantalla.";
const CONNECT_MSG = "No se ha podido conectar. Inténtalo de nuevo.";
const HARD_WAIT_MS = 20_000;

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
  if (isRateLimited(error)) return RATE_LIMIT_MSG;
  const code = error?.code ?? "";
  const raw = (error?.message ?? "").toLowerCase();
  if (alreadyRegistered(error)) {
    return "Este correo ya está registrado. Inicia sesión.";
  }
  if (code === "PASSWORD_TOO_SHORT" || raw.includes("too short")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (raw.includes("invalid email or password") || raw.includes("invalid password") || code === "INVALID_EMAIL_OR_PASSWORD") {
    return "El correo o la contraseña no son correctos.";
  }
  if (code === "INVALID_EMAIL" || (raw.includes("invalid email") && !raw.includes("password"))) {
    return "El email no es válido.";
  }
  if (kind === "up") return CONNECT_MSG;
  if (kind === "forgot") return "No se ha podido restablecer la contraseña.";
  return "El correo o la contraseña no son correctos.";
}

function captureAuthToken(ctx: { response?: Response }) {
  persistSessionToken(ctx.response?.headers.get("set-auth-token"));
}

async function persistAndEnter(token: string | null | undefined): Promise<boolean> {
  persistSessionToken(token);
  // Sign-up / sign-in already returned the user. A follow-up getSession that
  // misses (cookie dropped, bearer not attached yet) would cache "signed out"
  // and bounce the visitor back to login after a successful create.
  if (token) return true;
  try {
    const session = await authClient.getSession();
    if (session.data?.user) return true;
  } catch {
    /* retry once */
  }
  try {
    const session = await authClient.getSession();
    return Boolean(session.data?.user);
  } catch {
    return false;
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
  const [formError, setFormError] = useState<string | null>(null);
  const [slowNotice, setSlowNotice] = useState(false);
  const submittingRef = useRef(false);
  const userCancelRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const slowTimerRef = useRef<number | null>(null);
  const hardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      if (hardTimerRef.current) window.clearTimeout(hardTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPending && user && !submittingRef.current) {
      void navigate({ to: "/" });
    }
  }, [isPending, user, navigate]);

  function armSlowNotice() {
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    if (hardTimerRef.current) window.clearTimeout(hardTimerRef.current);
    setSlowNotice(false);
    slowTimerRef.current = window.setTimeout(() => {
      setSlowNotice(true);
    }, 8000);
    hardTimerRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
    }, HARD_WAIT_MS);
  }

  function disarmSlowNotice() {
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    if (hardTimerRef.current) {
      window.clearTimeout(hardTimerRef.current);
      hardTimerRef.current = null;
    }
    setSlowNotice(false);
  }

  function onCancelWait() {
    // Abort the in-flight request. Does not start a second one.
    userCancelRef.current = true;
    requestIdRef.current += 1;
    abortRef.current?.abort();
    disarmSlowNotice();
    submittingRef.current = false;
    setBusy(false);
    setFormError(null);
  }

  async function enterApp(token: string | null | undefined, recoveryEmail: string) {
    const ok = await persistAndEnter(token);
    if (!ok && !token) {
      throw new Error(CONNECT_MSG);
    }
    window.setTimeout(() => void issueAndStoreRecovery(recoveryEmail), 1500);
    await navigate({ to: "/" });
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy || submittingRef.current) return;
    submittingRef.current = true;
    userCancelRef.current = false;
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const trimmed = String(fd.get("email") || email).trim().toLowerCase();
    const pwd = String(fd.get("password") || password);
    const displayName = String(fd.get("name") || name).trim() || trimmed.split("@")[0] || "Atleta";
    setFormError(null);
    setBusy(true);
    armSlowNotice();
    const fetchOptions = { onSuccess: captureAuthToken, signal: ac.signal };
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
        if (requestId !== requestIdRef.current) return;
        const signed = await authClient.signIn.email({
          email: trimmed,
          password: pwd,
          rememberMe: true,
          fetchOptions,
        });
        if (requestId !== requestIdRef.current) return;
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
          fetchOptions,
        });
        if (requestId !== requestIdRef.current) return;
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
          setFormError(CONNECT_MSG);
          toast.error(CONNECT_MSG);
          return;
        }
        await enterApp(data.token, trimmed);
        return;
      }

      const { data, error } = await authClient.signIn.email({
        email: trimmed,
        password: pwd,
        rememberMe: true,
        fetchOptions,
      });
      if (requestId !== requestIdRef.current) return;
      if (error) {
        const message = mapAuthError(error, "in");
        setFormError(message);
        toast.error(message);
        return;
      }
      await enterApp(data?.token, trimmed);
    } catch (err) {
      if (requestId !== requestIdRef.current || userCancelRef.current) return;
      const rateErr =
        err && typeof err === "object"
          ? (err as AuthErr)
          : err instanceof Error
            ? { message: err.message }
            : null;
      if (isRateLimited(rateErr) || (err instanceof Error && /too many|429/i.test(err.message))) {
        setFormError(RATE_LIMIT_MSG);
        toast.error(RATE_LIMIT_MSG);
        return;
      }
      const message = isNetworkFailure(err)
        ? CONNECT_MSG
        : err instanceof Error
          ? err.message
          : mapAuthError(null, mode);
      setFormError(message);
      toast.error(message);
    } finally {
      if (requestId !== requestIdRef.current) return;
      disarmSlowNotice();
      submittingRef.current = false;
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
            <p className="pb-1 text-center text-[13px] leading-relaxed text-muted-foreground">
              {mode === "up"
                ? "Crea tu cuenta con email para guardar tus entrenamientos."
                : mode === "forgot"
                  ? "Introduce tu email, una nueva contraseña y el código de recuperación."
                  : "Entra con el email de tu cuenta."}
            </p>

            <form onSubmit={(ev) => void onEmail(ev)} className="space-y-3">
              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    name="name"
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
                  name="email"
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
                  name="password"
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
              {busy && slowNotice && !formError ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{SLOW_MSG}</p>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                    onClick={onCancelWait}
                  >
                    Volver
                  </button>
                </div>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy} loading={busy} loadingText={submitLabel}>
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
