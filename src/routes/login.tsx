import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PulseLogo } from "@/components/pulse-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

/**
 * Google / X federate through the Grok auth broker. The shared preview client
 * only accepts callbacks on `*.grok-sandbox.com`. On Vercel (or any other host)
 * those buttons 302 to the broker and it replies `Invalid redirect URI`.
 * Email / password is this app's own Better Auth and works everywhere.
 */
function socialLoginAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".grok-sandbox.com");
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [social, setSocial] = useState(false);

  useEffect(() => {
    const available = socialLoginAvailable();
    setSocial(available);
    if (!available) setMode("up");
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      toast.error("No se pudo conectar con Google o X. Entra con tu email.");
    }
  }, []);

  if (!isPending && user) {
    void navigate({ to: "/" });
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message);
      }
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo entrar");
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
                {mode === "up" ? "Crea tu cuenta con email para guardar tus entrenamientos." : "Entra con el email de tu cuenta."}
              </p>
            )}

            <form onSubmit={onEmail} className="space-y-3">
              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" autoComplete="name" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@email.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Entrando…" : mode === "up" ? "Crear cuenta" : "Entrar"}
              </Button>
            </form>
            <button
              type="button"
              className="w-full pt-1 text-center text-sm text-muted-foreground"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
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
