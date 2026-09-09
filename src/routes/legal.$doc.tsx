import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PulseLogo } from "@/components/pulse-logo";
import { getLegalDoc, LEGAL_UPDATED, type LegalDocId } from "@/lib/pulse/legal";
import { useHideNav } from "@/components/layout/app-shell";

export const Route = createFileRoute("/legal/$doc")({
  component: LegalPage,
});

const DOCS: { id: LegalDocId; label: string }[] = [
  { id: "terms", label: "Términos" },
  { id: "privacy", label: "Privacidad" },
  { id: "cookies", label: "Cookies" },
  { id: "comunidad", label: "Comunidad" },
];

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

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: "/account" });
    }
  }

  return (
    <div className="mx-auto max-w-xl pt-2 pb-16">
      <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">{legal.title}</h1>
        <button type="button" className="shrink-0 text-sm font-medium text-primary pressable py-1 px-2" onClick={goBack}>
          Listo
        </button>
      </header>

      {/* Document switcher pills */}
      <nav aria-label="Documentos legales" className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DOCS.map((d) => {
          const active = legal.id === d.id;
          return (
            <Link
              key={d.id}
              to="/legal/$doc"
              params={{ doc: d.id }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-3 px-0.5">
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
      <div className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-[11px] text-muted-foreground">
        {DOCS.map((d) => (
          <Link
            key={d.id}
            to="/legal/$doc"
            params={{ doc: d.id }}
            className={`hover:text-primary transition-colors ${legal.id === d.id ? "text-foreground font-medium" : "text-primary"}`}
          >
            {d.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
