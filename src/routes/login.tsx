import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PulseLogo } from "@/components/pulse-logo";
import { UsernameField, type UsernameStatus } from "@/components/pulse/username-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistSessionToken, readRecoveryCode, storeRecoveryCode } from "@/lib/session-token";
import { issueRecoveryCode, resetWithRecovery } from "@/lib/pulse/password-reset";
import { hasSeenPublicOnboarding } from "@/lib/pulse/flow";
import { inspectUsername } from "@/lib/pulse/social";
import { saveSocialProfile } from "@/lib/pulse/social-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { mode?: "in" | "up" } => ({
    mode: s.mode === "in" || s.mode === "up" ? s.mode : undefined,
  }),
  component: Login,
});

type Mode = "in" | "up" | "forgot";

type AuthErr = { message?: string; code?: string; status?: number } | null | undefined;

const RATE_LIMIT_MSG =
  "Has hecho demasiados intentos. Espera unos segundos antes de volver a intentarlo.";
const SLOW_MSG = "Estamos tardando más de lo normal. No cierres la pantalla.";
const CONNECT_MSG = "No se ha podido conectar. Inténtalo de nuevo.";
const SLOW_NOTICE_MS = 8_000;
const HANG_ABORT_MS = 45_000;

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

function isAbortLike(error: AuthErr | unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    const m = error.message.toLowerCase();
    return error.name === "AbortError" || m.includes("abort") || m.includes("aborted");
  }
  const raw = String((error as AuthErr)?.message ?? "").toLowerCase();
  return raw.includes("abort") || raw.includes("aborted");
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
  if (isAbortLike(error)) return CONNECT_MSG;
  const code = error?.code ?? "";
  const raw = (error?.message ?? "").toLowerCase();
  if (alreadyRegistered(error)) {
    return "Este correo ya está registrado. Inicia sesión.";
  }
  if (error?.status === 403 || code.includes("ORIGIN") || raw.includes("invalid origin")) {
    return CONNECT_MSG;
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
  if (kind === "in") return CONNECT_MSG;
  return CONNECT_MSG;
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
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode === "in" ? "in" : "up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("empty");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slowNotice, setSlowNotice] = useState(false);
  const submittingRef = useRef(false);
  const enteredRef = useRef(false);
  const userCancelRef = useRef(false);
  const claimingRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const slowTimerRef = useRef<number | null>(null);
  const hangTimerRef = useRef<number | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      if (hangTimerRef.current) window.clearTimeout(hangTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (enteredRef.current || claimingRef.current) return;
    if (!isPending && user && !submittingRef.current) {
      void navigate({ to: "/" });
    }
  }, [isPending, user, navigate]);

  useEffect(() => {
    if (isPending || user) return;
    if (!hasSeenPublicOnboarding()) {
      void navigate({ to: "/welcome" });
    }
  }, [isPending, user, navigate]);

  function armSlowNotice() {
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    if (hangTimerRef.current) window.clearTimeout(hangTimerRef.current);
    setSlowNotice(false);
    slowTimerRef.current = window.setTimeout(() => {
      setSlowNotice(true);
    }, SLOW_NOTICE_MS);
    // Last-resort only. An 8s notice must NOT abort — a late success still enters.
    hangTimerRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
    }, HANG_ABORT_MS);
  }

  function disarmSlowNotice() {
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    if (hangTimerRef.current) {
      window.clearTimeout(hangTimerRef.current);
      hangTimerRef.current = null;
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
    try {
      await authClient.getSession();
    } catch {
      /* hard redirect below re-reads cookies + tab bearer */
    }
    window.setTimeout(() => void issueAndStoreRecovery(recoveryEmail), 1500);
    enteredRef.current = true;
    submittingRef.current = true;
    // Full navigation so a stale signed-out session cache cannot paint the
    // marketing landing after a successful sign-in.
    window.location.assign(mode === "up" ? "/setup" : "/");
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
    // Password managers (especially iOS) often fill the DOM without React
    // onChange, and sometimes omit the value from FormData. Prefer the live
    // input value so signup and login submit the same characters.
    const trimmed = String(
      emailRef.current?.value || fd.get("email") || email || "",
    )
      .trim()
      .toLowerCase();
    const pwd = String(passwordRef.current?.value || fd.get("password") || password || "");
    const confirmPwd = String(confirmRef.current?.value || confirm || "");
    const displayName = String(fd.get("name") || name).trim() || trimmed.split("@")[0] || "Atleta";
    setEmail(trimmed);
    setPassword(pwd);
    if (!trimmed) {
      submittingRef.current = false;
      setFormError("El email no es válido.");
      toast.error("El email no es válido.");
      return;
    }
    if (pwd.length < 8) {
      submittingRef.current = false;
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if ((mode === "up" || mode === "forgot") && pwd !== confirmPwd) {
      submittingRef.current = false;
      setFormError("Las contraseñas no coinciden.");
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setFormError(null);
    setBusy(true);
    armSlowNotice();
    const fetchOptions = { onSuccess: captureAuthToken, signal: ac.signal };
    try {
      if (mode === "forgot") {
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
          if (userCancelRef.current) return;
          const message = mapAuthError(signed.error, "in");
          setFormError(message);
          toast.error(message);
          return;
        }
        await enterApp(signed.data?.token, trimmed);
        return;
      }

      if (mode === "up") {
        const inspected = inspectUsername(username);
        if (inspected.code !== "ok" || usernameStatus !== "available") {
          submittingRef.current = false;
          const msg =
            usernameStatus === "checking"
              ? "Espera a que se compruebe el usuario."
              : usernameStatus === "taken"
                ? "Este usuario ya está en uso"
                : inspected.message;
          setUsernameError(msg);
          toast.error(msg);
          return;
        }
        if (claimingRef.current) {
          try {
            await saveSocialProfile({ data: { username: inspected.username } });
            await enterApp(null, trimmed);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Este usuario ya está en uso";
            setUsernameError(message);
            setUsernameStatus("taken");
            toast.error(message);
          }
          return;
        }
        const { data, error } = await authClient.signUp.email({
          email: trimmed,
          password: pwd,
          name: displayName,
          fetchOptions,
        });
        if (requestId !== requestIdRef.current) return;
        if (error) {
          if (userCancelRef.current) return;
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
        try {
          await saveSocialProfile({ data: { username: inspected.username } });
        } catch (err) {
          claimingRef.current = true;
          const message = err instanceof Error ? err.message : "Este usuario ya está en uso";
          setUsernameError(message);
          setUsernameStatus("taken");
          toast.error(message);
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
        if (userCancelRef.current) return;
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
      const message =
        isAbortLike(err) || isNetworkFailure(err) ? CONNECT_MSG : mapAuthError(rateErr, mode);
      setFormError(message);
      toast.error(message);
    } finally {
      if (requestId !== requestIdRef.current) return;
      disarmSlowNotice();
      if (!enteredRef.current) {
        submittingRef.current = false;
        setBusy(false);
      }
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
    <main className="relative grid min-h-dvh place-items-center overflow-visible bg-background px-5 pt-[var(--safe-top)] pb-[max(1.25rem,var(--safe-bottom))]">
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
                ? "Crea tu cuenta, elige un @usuario y guarda tus entrenamientos."
                : mode === "forgot"
                  ? "Introduce tu email, una nueva contraseña y el código de recuperación."
                  : "Entra con el email de tu cuenta."}
            </p>

            <form
              method="post"
              action="/login"
              onSubmit={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                void onEmail(ev);
              }}
              className="space-y-3"
              data-auth-form="1"
            >
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
              {mode === "up" && (
                <UsernameField
                  value={username}
                  onChange={(v) => {
                    setUsername(v);
                    setUsernameError(null);
                  }}
                  onStatus={(s) => setUsernameStatus(s)}
                  error={usernameError}
                  disabled={busy}
                />
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  onInput={(ev) => setEmail(ev.currentTarget.value)}
                  placeholder="alex@email.com"
                  autoComplete={mode === "in" ? "username" : "email"}
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
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  defaultValue=""
                  onInput={(ev) => setPassword(ev.currentTarget.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  disabled={busy}
                />
              </div>
              {mode === "up" || mode === "forgot" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Repite la contraseña</Label>
                  <Input
                    ref={confirmRef}
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    minLength={8}
                    defaultValue=""
                    onInput={(ev) => setConfirm(ev.currentTarget.value)}
                    placeholder="Confirma la contraseña"
                    autoComplete="new-password"
                    disabled={busy}
                  />
                </div>
              ) : null}
              {mode === "forgot" ? (
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
              ) : null}
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
              <Button
                type="submit"
                className="w-full"
                disabled={busy || (mode === "up" && usernameStatus !== "available")}
                loading={busy}
                loadingText={submitLabel}
              >
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
                  setPassword("");
                  setConfirm("");
                  if (passwordRef.current) passwordRef.current.value = "";
                  if (confirmRef.current) confirmRef.current.value = "";
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
