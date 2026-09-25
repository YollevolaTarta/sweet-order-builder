import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { euro } from "@/lib/menu";
import { CatalogoPicker, LiquidoPicker, Swatch } from "@/components/configurator-parts";
import { WEB_FORMATS, formatoDe, useWebOrder } from "@/lib/web-order";
import { precioPorFormato } from "@/lib/supabase-yllt";
import { conLiquido, itemDePack, itemDeReceta, opcionLiquido } from "@/lib/cart";

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
    recetaId,
    setRecetaId,
    packId,
    setPackId,
    setMode,
    setFormatId,
    addToCart,
  } = useWebOrder();

  // Al elegir receta o pack pasamos a una pantalla propia de formato.
  const [pantalla, setPantalla] = useState<"catalogo" | "formato" | "liquido">("catalogo");
  const [liquidoId, setLiquidoId] = useState<string | null>(null);

  const receta = recetas.find((r) => r.receta_id === recetaId) ?? null;
  const pack = packs.find((p) => p.pack_id === packId) ?? null;
  const seleccion = receta ?? pack;

  const shakeFormat = WEB_FORMATS.find((f) => f.id === "cake-shake")!;

  const anadir = (f: (typeof WEB_FORMATS)[number], lid: string | null) => {
    const fmt = formatoDe(f.id)!;
    setFormatId(f.id);
    const base = pack ? itemDePack(pack, f, fmt) : itemDeReceta(receta!, f, fmt);
    addToCart(conLiquido(base, opcionLiquido(lid)));
    setRecetaId(null);
    setPackId(null);
    navigate({ to: "/web/configura", search: { vista: "cesta" } });
  };

  if (pantalla === "liquido" && seleccion) {
    return (
      <main className="flex-1 px-5 pb-10 pt-5">
        <h1 className="text-3xl font-black leading-tight">¿Cómo lo quieres?</h1>
        <p className="mb-6 text-sm font-bold text-muted-foreground">{seleccion.nombre}</p>
        <LiquidoPicker value={liquidoId} onSelect={setLiquidoId} />
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setLiquidoId(null);
              setPantalla("formato");
            }}
            className="rounded-full border-2 border-border px-6 py-4 text-base font-extrabold"
          >
            Atrás
          </button>
          <button
            type="button"
            disabled={!opcionLiquido(liquidoId)}
            onClick={() => anadir(shakeFormat, liquidoId)}
            className="flex-1 rounded-full bg-brand-red px-6 py-4 text-lg font-extrabold text-brand-red-foreground shadow-pop transition disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      </main>
    );
  }

  if (pantalla === "formato" && seleccion) {
    return (
      <main className="flex-1 px-5 pb-10 pt-5">
        <h1 className="text-3xl font-black leading-tight">Elige el formato</h1>
        <p className="mb-6 text-sm font-bold text-muted-foreground">{seleccion.nombre}</p>
        <div className="grid gap-4">
          {WEB_FORMATS.map((f) => {
            const fmt = formatoDe(f.id)!;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (fmt === "shake") {
                    setLiquidoId(null);
                    setPantalla("liquido");
                    return;
                  }
                  anadir(f, null);
                }}
                className="card-soft flex items-center gap-4 p-5 text-left"
              >
                <Swatch color={f.color} label={f.name} className="h-20 w-20 shrink-0 p-2" />
                <div>
                  <p className="text-xl font-black">{f.name}</p>
                  <p className="text-sm font-bold text-muted-foreground">{f.size}</p>
                  <p className="text-lg font-extrabold text-brand-red">
                    {euro(precioPorFormato(seleccion, fmt))}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            setRecetaId(null);
            setPackId(null);
            setPantalla("catalogo");
          }}
          className="mt-8 rounded-full border-2 border-border px-6 py-4 text-base font-extrabold"
        >
          Atrás
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 pb-28 pt-5">
      <h1 className="text-3xl font-black leading-tight">Recetas y promociones</h1>
      <p className="mb-6 text-sm font-bold text-muted-foreground">Elige una opción</p>

      <CatalogoPicker
        recetas={recetas}
        packs={packs}
        formato={null}
        recetaId={recetaId}
        packId={packId}
        loading={loading}
        onSelectReceta={(id) => {
          setPackId(null);
          setRecetaId(id);
          setMode("recetas");
          if (id) setPantalla("formato");
        }}
        onSelectPack={(id) => {
          setRecetaId(null);
          setPackId(id);
          setMode("recetas");
          if (id) setPantalla("formato");
        }}
      />

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-5 pb-5 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={() => navigate({ to: "/web" })}
            className="rounded-full border-2 border-border px-5 py-4 text-base font-extrabold"
          >
            Atrás
          </button>
        </div>
      </footer>
    </main>
  );
}
