import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inspectUsername } from "@/lib/pulse/social";
import { checkUsernameAvailable } from "@/lib/pulse/social-fns";
import { cn } from "@/lib/utils";

export type UsernameStatus = "empty" | "invalid" | "checking" | "available" | "taken";

export function UsernameField({
  value,
  onChange,
  onStatus,
  current,
  disabled,
  autoFocus,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onStatus?: (status: UsernameStatus, username: string) => void;
  current?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
}) {
  const id = useId();
  const [status, setStatus] = useState<UsernameStatus>("empty");
  const [hint, setHint] = useState("Elige entre 3 y 20 caracteres");
  const req = useRef(0);
  const statusCb = useRef(onStatus);
  statusCb.current = onStatus;

  useEffect(() => {
    const inspected = inspectUsername(value);
    if (inspected.code !== "ok") {
      const next: UsernameStatus = inspected.code === "empty" ? "empty" : "invalid";
      setStatus(next);
      setHint(inspected.message);
      statusCb.current?.(next, inspected.username);
      return;
    }
    setStatus("checking");
    setHint("Comprobando…");
    statusCb.current?.("checking", inspected.username);
    const idn = ++req.current;
    const t = window.setTimeout(() => {
      void checkUsernameAvailable({ data: { username: inspected.username, current } })
        .then((res) => {
          if (idn !== req.current) return;
          const next: UsernameStatus = res.available ? "available" : "taken";
          setStatus(next);
          setHint(res.message);
          statusCb.current?.(next, res.username);
        })
        .catch((e) => {
          if (idn !== req.current) return;
          setStatus("invalid");
          setHint(e instanceof Error ? e.message : "No se pudo comprobar el usuario.");
          statusCb.current?.("invalid", inspected.username);
        });
    }, 350);
    return () => window.clearTimeout(t);
  }, [value, current]);

  const shown = error || hint;
  const tone =
    error || status === "taken" || status === "invalid"
      ? "text-destructive"
      : status === "available"
        ? "text-success"
        : "text-muted-foreground";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Nombre de usuario</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-base font-medium text-muted-foreground">
          @
        </span>
        <Input
          id={id}
          name="username"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/^@+/, ""))}
          placeholder="roberto"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error) || status === "taken" || status === "invalid"}
          className="pl-8 pr-10"
        />
        {status === "available" && !error ? (
          <Check className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-success" aria-hidden />
        ) : null}
      </div>
      <p className={cn("flex min-h-5 items-center gap-1 text-xs", tone)} role="status">
        {shown}
      </p>
    </div>
  );
}
