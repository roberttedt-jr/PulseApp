import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PulseLogo } from "@/components/pulse-logo";
import { getLegalDoc, LEGAL_UPDATED } from "@/lib/pulse/legal";
import { useHideNav } from "@/components/layout/app-shell";

export const Route = createFileRoute("/legal/$doc")({
  component: LegalPage,
});

function LegalPage() {
  useHideNav(true);
  const navigate = useNavigate();
  const { doc } = Route.useParams();
  const legal = getLegalDoc(doc);

  if (!legal) {
    return (
      <div className="mx-auto max-w-xl px-1 pt-6 pb-16">
        <p className="text-sm text-muted-foreground">No se ha encontrado este documento.</p>
        <Link to="/account" className="mt-3 inline-block text-sm text-primary">
          Volver a Ajustes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl pt-2 pb-16">
      <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">{legal.title}</h1>
        <button type="button" className="shrink-0 text-sm text-primary" onClick={() => void navigate({ to: "/account" })}>
          Listo
        </button>
      </header>
      <div className="mt-2 flex items-center gap-3 px-0.5">
        <PulseLogo size={36} alt="" />
        <div>
          <p className="text-sm font-medium">Pulse</p>
          <p className="text-[11px] text-muted-foreground">Actualizado el {LEGAL_UPDATED}</p>
        </div>
      </div>
      <article className="mt-6 space-y-6" data-legal-doc={legal.id}>
        {legal.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            {section.body.map((p) => (
              <p key={p.slice(0, 48)} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
      <p className="mt-10 text-center text-[11px] text-muted-foreground">
        <Link to="/legal/$doc" params={{ doc: legal.id === "terms" ? "privacy" : "terms" }} className="text-primary">
          {legal.id === "terms" ? "Política de privacidad" : "Términos y condiciones"}
        </Link>
      </p>
    </div>
  );
}
