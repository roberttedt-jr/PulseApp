import { platesFor } from "@/lib/pulse/formulas";

const TINT: Record<number, string> = {
  25: "bg-destructive",
  20: "bg-accent",
  15: "bg-warning",
  10: "bg-success",
  5: "bg-primary",
  2.5: "bg-ios-elevated",
  1.25: "bg-muted-foreground",
};

export function PlateStack({ weight }: { weight: number }) {
  const { barKg, perSide, leftover } = platesFor(weight);
  if (weight <= 0) {
    return <p className="text-sm text-muted-foreground">Introduce un peso para ver los discos.</p>;
  }
  if (weight < barKg) {
    return <p className="text-sm text-muted-foreground">Por debajo de la barra de {barKg} kg.</p>;
  }
  return (
    <div>
      <div className="flex items-center justify-center gap-1 py-4">
        <div className="flex flex-row-reverse items-center gap-0.5">
          {perSide.map((p, i) => (
            <span
              key={`l${i}`}
              className={`w-3 rounded-sm ${TINT[p] ?? "bg-muted"}`}
              style={{ height: 18 + Math.min(p, 25) * 1.6 }}
              title={`${p} kg`}
            />
          ))}
        </div>
        <span className="h-3 w-16 rounded-full bg-foreground/80" />
        <div className="flex items-center gap-0.5">
          {perSide.map((p, i) => (
            <span
              key={`r${i}`}
              className={`w-3 rounded-sm ${TINT[p] ?? "bg-muted"}`}
              style={{ height: 18 + Math.min(p, 25) * 1.6 }}
              title={`${p} kg`}
            />
          ))}
        </div>
      </div>
      <p className="text-center text-sm">
        Barra {barKg} kg · {perSide.length ? perSide.map((p) => `${p}`).join(" + ") : "sin discos"} kg por lado
      </p>
      {leftover > 0 && (
        <p className="mt-1 text-center text-xs text-warning">Sobra {leftover} kg por lado (usa microdiscos).</p>
      )}
    </div>
  );
}
