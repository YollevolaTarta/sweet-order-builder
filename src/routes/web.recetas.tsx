import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { euro } from "@/lib/menu";
import { CatalogoPicker, Swatch } from "@/components/configurator-parts";
import { WEB_FORMATS, formatoDe, useWebOrder } from "@/lib/web-order";
import { precioPorFormato } from "@/lib/supabase-yllt";

export const Route = createFileRoute("/web/recetas")({
  head: () => ({
    meta: [
      { title: "Recetas y promociones — Yo Llevo la Tarta" },
      {
        name: "description",
        content: "Nuestras recetas y packs de temporada, en lata o cake shake.",
      },
      { property: "og:title", content: "Recetas y promociones — Yo Llevo la Tarta" },
      {
        property: "og:description",
        content: "Elige una receta o un pack y pídelo para recoger o a domicilio.",
      },
    ],
  }),
  component: WebRecetas,
});

function WebRecetas() {
  const navigate = useNavigate();
  const {
    recetas,
    packs,
    loading,
    formatId,
    setFormatId,
    recetaId,
    setRecetaId,
    packId,
    setPackId,
    setMode,
  } = useWebOrder();

  const formato = formatoDe(formatId);
  const seleccion = recetas.find((r) => r.id === recetaId) ?? packs.find((p) => p.id === packId) ?? null;

  return (
    <main className="flex-1 px-5 pb-40 pt-5">
      <h1 className="text-3xl font-black leading-tight">Recetas y promociones</h1>
      <p className="mb-6 text-sm font-bold text-muted-foreground">Elige una opción</p>

      <CatalogoPicker
        recetas={recetas}
        packs={packs}
        formato={formato}
        recetaId={recetaId}
        packId={packId}
        loading={loading}
        onSelectReceta={(id) => {
          setPackId(null);
          setRecetaId(id);
          setMode("recetas");
        }}
        onSelectPack={(id) => {
          setRecetaId(null);
          setPackId(id);
          setMode("recetas");
        }}
      />

      {seleccion && (
        <section className="mt-2" aria-labelledby="sec-formato">
          <h2 id="sec-formato" className="mb-3 text-xl font-black">
            Elige el formato
          </h2>
          <div className="grid gap-4">
            {WEB_FORMATS.map((f) => {
              const fmt = formatoDe(f.id)!;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormatId(f.id)}
                  className={`card-soft flex items-center gap-4 p-4 text-left ${formatId === f.id ? "card-selected animate-pop" : ""}`}
                >
                  <Swatch color={f.color} label={f.name} className="h-16 w-16 shrink-0 p-2" />
                  <div>
                    <p className="text-lg font-black">{f.name}</p>
                    <p className="text-sm font-bold text-muted-foreground">{f.size}</p>
                    <p className="text-base font-extrabold text-brand-red">
                      {euro(precioPorFormato(seleccion, fmt))}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-5 pb-5 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={() => navigate({ to: "/web" })}
            className="rounded-full border-2 border-border px-5 py-4 text-base font-extrabold"
          >
            Atrás
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Total</p>
            <p className="text-2xl font-black leading-none text-brand-red">
              {euro(seleccion && formato ? precioPorFormato(seleccion, formato) : 0)}
            </p>
          </div>
          <button
            disabled={!seleccion || !formato}
            onClick={() => navigate({ to: "/web/configura" })}
            className="rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card transition disabled:opacity-40"
          >
            Seguir
          </button>
        </div>
      </footer>
    </main>
  );
}
