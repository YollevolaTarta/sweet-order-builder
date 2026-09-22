import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { euro } from "@/lib/menu";
import { packRecetas } from "@/components/configurator-parts";
import { useWebOrder } from "@/lib/web-order";

export const Route = createFileRoute("/web/")({
  head: () => ({
    meta: [
      { title: "Pide online — Yo Llevo la Tarta" },
      {
        name: "description",
        content: "Packs y recetas de tarta para recoger en Bilbao Casco Viejo o recibir en casa.",
      },
      { property: "og:title", content: "Pide online — Yo Llevo la Tarta" },
      {
        property: "og:description",
        content: "Elige tu pack favorito o configura tu postre y recógelo cuando quieras.",
      },
    ],
  }),
  component: WebLanding,
});

function WebLanding() {
  const navigate = useNavigate();
  const { packs, loading, reset, setMode, setPackId } = useWebOrder();
  const destacados = packs.filter((p) => p.destacado);

  const elegirPack = (id: number) => {
    reset();
    setMode("recetas");
    setPackId(id);
    navigate({ to: "/web/configura" });
  };

  return (
    <main className="flex-1 px-5 pb-16 pt-6">
      <h1 className="text-4xl font-black leading-tight">Tu postre, cuando quieras</h1>
      <p className="mt-2 text-sm font-bold text-muted-foreground">
        Recoge en Bilbao · Casco Viejo o pídelo a casa.
      </p>

      <section className="mt-8" aria-labelledby="mas-vendidos">
        <h2 id="mas-vendidos" className="mb-3 text-2xl font-black">
          Los más vendidos
        </h2>
        {loading && <p className="font-bold text-muted-foreground">Cargando…</p>}
        {!loading && destacados.length === 0 && (
          <p className="font-bold text-muted-foreground">Pronto tendremos novedades.</p>
        )}
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
          {destacados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => elegirPack(p.id)}
              className="card-soft w-60 shrink-0 snap-start p-4 text-left"
            >
              <span className="block text-lg font-black leading-tight">{p.nombre}</span>
              <span className="mt-1 block text-xs font-extrabold uppercase text-muted-foreground">
                {p.tamano} latas
              </span>
              <span className="mt-2 block space-y-0.5">
                {packRecetas(p).map((r) => (
                  <span key={r.id} className="block text-xs font-bold text-muted-foreground">
                    · {r.nombre}
                  </span>
                ))}
              </span>
              <span className="mt-3 block text-lg font-black text-brand-red">
                Desde {euro(p.precio_lata)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-4">
        <button
          type="button"
          onClick={() => {
            reset();
            navigate({ to: "/web/recetas" });
          }}
          className="rounded-full bg-primary px-8 py-5 text-lg font-extrabold text-primary-foreground shadow-card"
        >
          Descubre nuestras recetas
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setMode("crear");
            navigate({ to: "/web/configura" });
          }}
          className="rounded-full border-2 border-border px-8 py-5 text-lg font-extrabold"
        >
          Configura tu postre
        </button>
      </div>
    </main>
  );
}
