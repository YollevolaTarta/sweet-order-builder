import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  supabaseYLLT,
  precioPorFormato,
  type Formato,
  type Pack,
  type Receta,
  fetchRecetasYPacks,
} from "@/lib/supabase-yllt";
import { FORMATS, STORE_ID, euro } from "@/lib/menu";
import { useIngredientes } from "@/lib/ingredientes";
import {
  CatalogoPicker,
  CremaPicker,
  LiquidoPicker,
  Row,
  Swatch,
  ToppingsPicker,
  packRecetas,
} from "@/components/configurator-parts";
import { CartView } from "@/components/cart-view";
import { cartTotal, conLiquido, lineasDeCesta, liquidoLabel, opcionLiquido, type CartItem } from "@/lib/cart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Configura tu tarta — Yo Llevo la Tarta" },
      {
        name: "description",
        content:
          "Elige formato, crema y toppings y pide tu postre personalizado en menos de 60 segundos.",
      },
      { property: "og:title", content: "Configura tu tarta — Yo Llevo la Tarta" },
      {
        property: "og:description",
        content: "Postres personalizados en formato pequeño. Tu pedido en menos de 60 segundos.",
      },
    ],
  }),
  component: Configurator,
});

type Step =
  | "intro"
  | "formato"
  | "liquido"
  | "modo"
  | "crema"
  | "toppings"
  | "catalogo"
  | "foto"
  | "resumen"
  | "cesta";
type Mode = "crear" | "recetas";

function Configurator() {
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<Mode | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [creamId, setCreamId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [wantsPhoto, setWantsPhoto] = useState<boolean | null>(null);
  const [liquidoId, setLiquidoId] = useState<string | null>(null);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [recetaId, setRecetaId] = useState<number | null>(null);
  const [packId, setPackId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sending, setSending] = useState(false);
  const [orderLabel, setOrderLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canal] = useState<"tablet" | "qr">(() => {
    if (typeof window === "undefined") return "tablet";
    return new URLSearchParams(window.location.search).get("canal") === "qr" ? "qr" : "tablet";
  });

  const format = FORMATS.find((f) => f.id === formatId) ?? null;
  const { creams: CREAMS, toppings: TOPPINGS } = useIngredientes();
  const cream = CREAMS.find((c) => c.id === creamId) ?? null;
  const isShake = format?.id === "cake-shake";
  const isOpenTart = format?.id === "tarta-abierta";
  const formato: Formato =
    format?.id === "cake-shake" ? "shake" : format?.id === "tarta-lata" ? "lata" : "abierta";
  const toppings = toppingIds
    .map((id) => TOPPINGS.find((t) => t.id === id))
    .filter((topping) => topping !== undefined);

  const receta = recetas.find((r) => r.receta_id === recetaId) ?? null;
  const pack = packs.find((p) => p.pack_id === packId) ?? null;

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    (async () => {
      const { recetas: r, packs: pk } = await fetchRecetasYPacks(STORE_ID);
      if (!active) return;
      setRecetas(r);
      setPacks(pk);
      setCatalogLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Precio del postre que se está configurando ahora mismo.
  const itemPrecio = useMemo(() => {
    if (!format) return 0;
    if (mode === "recetas") {
      if (receta) return precioPorFormato(receta, formato);
      if (pack) return precioPorFormato(pack, formato);
      return 0;
    }
    if (isShake) return format.basePrice;
    return format.basePrice + toppings.reduce((s, t) => s + t.price, 0);
  }, [format, formato, isShake, mode, pack, receta, toppings]);

  const cestaTotal = cartTotal(cart);
  const footerTotal = step === "cesta" ? cestaTotal : cestaTotal + itemPrecio;

  const flow: Step[] = useMemo(() => {
    const base: Step[] = ["formato"];
    if (isShake) base.push("liquido");
    base.push("modo");
    if (mode === "recetas") base.push("catalogo");
    else base.push("crema", "toppings");
    if (isOpenTart) base.push("foto");
    base.push("resumen", "cesta");
    return base;
  }, [mode, isOpenTart, isShake]);

  const index = flow.indexOf(step);
  const stepInfo = { label: index + 1, total: flow.length, progress: ((index + 1) / flow.length) * 100 };

  const resetSelection = () => {
    setCreamId(null);
    setToppingIds([]);
    setRecetaId(null);
    setPackId(null);
  };

  const canContinue = (() => {
    switch (step) {
      case "formato":
        return !!format;
      case "liquido":
        return !!opcionLiquido(liquidoId);
      case "modo":
        return !!mode;
      case "crema":
        return !!cream;
      case "toppings":
        return isShake ? toppingIds.length === 2 : toppingIds.length >= 1;
      case "catalogo":
        return !!receta || !!pack;
      case "foto":
        return wantsPhoto !== null;
      default:
        return true;
    }
  })();

  const buildItem = (): CartItem | null => {
    if (!format) return null;
    const foto = isOpenTart ? wantsPhoto === true : false;
    const precio = Number(itemPrecio.toFixed(2));
    if (mode === "recetas" && pack) {
      return {
        uid: crypto.randomUUID(),
        tipo: "pack",
        formato,
        formatName: `${format.name} · ${format.size}`,
        nombre: `${pack.nombre} · ${pack.tamano} uds`,
        detalle: packRecetas(pack).map((r) => r.nombre),
        precio,
        foto,
        pack,
      };
    }
    if (mode === "recetas" && receta) {
      return {
        uid: crypto.randomUUID(),
        tipo: "receta",
        formato,
        formatName: `${format.name} · ${format.size}`,
        nombre: receta.nombre,
        detalle: [],
        precio,
        foto,
        receta,
      };
    }
    if (!cream) return null;
    return {
      uid: crypto.randomUUID(),
      tipo: "personalizada",
      formato,
      formatName: `${format.name} · ${format.size}`,
      nombre: `Tu tarta de ${cream.name}`,
      detalle: [toppings.map((t) => t.name).join(" + ")].filter(Boolean),
      precio,
      foto,
      crema: cream.name,
      toppings: toppings.map((t) => t.name),
    };
  };

  const addToCart = () => {
    const base = buildItem();
    if (!base) return;
    const item = conLiquido(base, opcionLiquido(liquidoId));
    setCart((prev) => [...prev, item]);
    setStep("cesta");
  };

  const nuevoPostre = () => {
    setMode(null);
    setFormatId(null);
    setWantsPhoto(null);
    setLiquidoId(null);
    resetSelection();
    setStep("formato");
  };

  const goNext = () => {
    if (step === "resumen") {
      addToCart();
      return;
    }
    const next = flow[index + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = index <= 0 ? "intro" : flow[index - 1]!;
    setStep(prev);
  };

  const toggleTopping = (id: string) => {
    setToppingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? prev : [...prev, id],
    );
  };

  const resetAll = () => {
    setOrderLabel(null);
    setStep("intro");
    setMode(null);
    setFormatId(null);
    setWantsPhoto(null);
    setLiquidoId(null);
    setCart([]);
    resetSelection();
  };

  const confirm = async () => {
    if (cart.length === 0) return;
    setSending(true);
    setError(null);
    const precio = Number(cestaTotal.toFixed(2));
    // PROVISIONAL: marcamos el pedido como pagado con metodo_pago 'prueba'
    // hasta integrar el pago real (máquina/pasarela).
    const { data, error: err } = await supabaseYLLT
      .from("pedidos")
      .insert({
        store_id: STORE_ID,
        canal,
        tipo_pedido: "en_tienda",
        estado: "pendiente",
        pago: "pagado",
        metodo_pago: "prueba",
        total: precio,
      })
      .select("id, numero_pedido, serie")
      .single();
    if (err || !data) {
      setSending(false);
      setError("No hemos podido enviar el pedido. Inténtalo otra vez.");
      return;
    }

    const lineas = lineasDeCesta(cart, data.id);

    const { error: lineErr } = await supabaseYLLT.from("lineas_pedido").insert(lineas);
    setSending(false);
    if (lineErr) {
      setError("No hemos podido enviar el pedido. Inténtalo otra vez.");
      return;
    }
    setOrderLabel(`${data.serie}-${String(data.numero_pedido ?? 0).padStart(2, "0")}`);
  };

  if (orderLabel !== null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-bold text-muted-foreground">Tu pedido es el</p>
        <p className="animate-pop text-8xl font-black text-brand-red">{orderLabel}</p>
        <p className="max-w-xs text-lg font-bold">Te avisamos cuando esté listo 🍰</p>
        <button
          onClick={resetAll}
          className="mt-6 rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card"
        >
          Nuevo pedido
        </button>
      </main>
    );
  }

  const isIntro = step === "intro";
  const isCesta = step === "cesta";

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 pt-4">
        <span className="text-sm font-black tracking-tight">
          Yo Llevo <span className="text-brand-red">la Tarta</span>
        </span>
        {!isIntro && (
          <span className="text-xs font-bold text-muted-foreground">
            Paso {stepInfo.label} de {stepInfo.total}
          </span>
        )}
      </header>

      {!isIntro && (
        <div className="px-5 pt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${stepInfo.progress}%` }}
            />
          </div>
        </div>
      )}

      <section
        key={step}
        className={`animate-step-in flex-1 px-5 pt-5 ${isIntro ? "flex flex-col items-center justify-center pb-10 text-center" : "pb-40"}`}
      >
        {isIntro && (
          <>
            <h1 className="mb-8 text-4xl font-black leading-tight">Crea tu postre único</h1>
            <button
              type="button"
              onClick={() => setStep("formato")}
              className="rounded-full bg-primary px-12 py-5 text-xl font-extrabold text-primary-foreground shadow-card"
            >
              Empezar
            </button>
          </>
        )}

        {step === "formato" && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">Elige tu formato</h1>
            <div className="grid gap-4">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFormatId(f.id);
                    resetSelection();
                    setWantsPhoto(f.id === "tarta-abierta" ? null : false);
                  }}
                  className={`card-soft flex items-center gap-4 p-4 text-left ${formatId === f.id ? "card-selected animate-pop" : ""}`}
                >
                  <Swatch color={f.color} label={f.name} className="h-20 w-20 shrink-0 p-2" />
                  <div>
                    <p className="text-xl font-black">{f.name}</p>
                    <p className="text-sm font-bold text-muted-foreground">{f.size}</p>
                    <p className="text-base font-extrabold text-brand-red">
                      {f.id === "cake-shake" ? euro(f.basePrice) : `Desde ${euro(f.basePrice)}`}
                    </p>
                    {f.note && (
                      <p className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold">
                        {f.note}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-normal text-muted-foreground">
              Todos nuestros postres llevan base de galleta y se elaboran en un obrador donde se manipula gluten, frutos secos y lácteos.
            </p>
          </>
        )}

        {step === "liquido" && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">¿Cómo lo quieres?</h1>
            <LiquidoPicker value={liquidoId} onSelect={setLiquidoId} />
          </>
        )}

        {step === "modo" && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">¿Cómo lo quieres?</h1>
            <div className="grid gap-4">
              {[
                { v: "crear" as Mode, label: "Crea tu tarta", desc: "Elige crema y toppings a tu gusto", emoji: "🎨" },
                { v: "recetas" as Mode, label: "Recetas y promociones", desc: "Combinaciones ya creadas por nosotros", emoji: "⭐" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => {
                    if (mode !== o.v) resetSelection();
                    setMode(o.v);
                  }}
                  className={`card-soft flex items-center gap-4 p-6 text-left ${mode === o.v ? "card-selected animate-pop" : ""}`}
                >
                  <span className="text-4xl">{o.emoji}</span>
                  <span>
                    <span className="block text-2xl font-black">{o.label}</span>
                    <span className="block text-sm font-bold text-muted-foreground">{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "crema" && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">Elige tu crema</h1>
            <CremaPicker creamId={creamId} onSelect={setCreamId} />
          </>
        )}

        {step === "toppings" && (
          <>
            <h1 className="text-3xl font-black leading-tight">Elige tus toppings</h1>
            <p className="mb-6 text-sm font-bold text-muted-foreground">
              {isShake ? "Elige exactamente 2 — incluidos en el precio" : "Mínimo 1, máximo 2"}
            </p>
            <ToppingsPicker toppingIds={toppingIds} isShake={isShake} onToggle={toggleTopping} />
          </>
        )}

        {step === "catalogo" && (
          <>
            <h1 className="text-3xl font-black leading-tight">Recetas y promociones</h1>
            <p className="mb-6 text-sm font-bold text-muted-foreground">Elige una opción</p>
            <CatalogoPicker
              recetas={recetas}
              packs={packs}
              formato={formato}
              recetaId={recetaId}
              packId={packId}
              loading={catalogLoading}
              onSelectReceta={(id) => {
                setPackId(null);
                setRecetaId(id);
              }}
              onSelectPack={(id) => {
                setRecetaId(null);
                setPackId(id);
              }}
            />
          </>
        )}

        {step === "foto" && (
          <>
            <h1 className="text-3xl font-black leading-tight">¿Vas a querer sacar foto?</h1>
            <p className="mb-6 text-sm font-bold text-muted-foreground">
              Si es así, añadiremos una decoración especial
            </p>
            <div className="grid gap-4">
              {[
                { v: true, label: "Sí, quiero foto", emoji: "📸" },
                { v: false, label: "No, gracias", emoji: "🙂" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  onClick={() => {
                    setWantsPhoto(o.v);
                    setStep("resumen");
                  }}
                  className={`card-soft flex items-center gap-4 p-6 text-left ${wantsPhoto === o.v ? "card-selected animate-pop" : ""}`}
                >
                  <span className="text-4xl">{o.emoji}</span>
                  <span className="text-2xl font-black">{o.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "resumen" && format && (
          <>
            <h1 className="mb-4 text-3xl font-black leading-tight">Tu postre</h1>
            <div className="card-soft space-y-3 p-5">
              <Row label="Formato" value={`${format.name} · ${format.size}`} />
              {isShake && liquidoLabel({ formato, ...opcionLiquido(liquidoId) }) && (
                <p className="text-xs font-bold text-muted-foreground">
                  {liquidoLabel({ formato, ...opcionLiquido(liquidoId) })}
                </p>
              )}
              {mode === "recetas" ? (
                <>
                  {receta && <Row label="Receta" value={receta.nombre} />}
                  {pack && (
                    <>
                      <Row label="Pack" value={`${pack.nombre} · ${pack.tamano} uds`} />
                      {packRecetas(pack).map((r) => (
                        <Row key={r.receta_id} label="·" value={r.nombre} />
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {cream && <Row label="Crema" value={cream.name} />}
                  <Row label="Toppings" value={toppings.map((t) => t.name).join(" + ")} />
                </>
              )}
              <Row label="Decoración" value={wantsPhoto ? "Sí" : "No"} />
              <hr className="border-border" />
              {mode === "recetas" || isShake ? (
                <Row label="Todo incluido" value={euro(itemPrecio)} />
              ) : (
                <>
                  <Row label="Precio base" value={euro(format.basePrice)} />
                  {toppings.map((t) => (
                    <Row key={t.id} label={t.name} value={euro(t.price)} />
                  ))}
                </>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-black">Este postre</span>
                <span className="text-2xl font-black text-brand-red">{euro(itemPrecio)}</span>
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-bold text-brand-red">{error}</p>}
          </>
        )}

        {isCesta && (
          <>
            <h1 className="mb-1 text-3xl font-black leading-tight">¿Quieres algo más?</h1>
            <p className="mb-5 text-sm font-bold text-muted-foreground">Estos son tus postres</p>
            <CartView
              cart={cart}
              onRemove={(uid) => setCart((prev) => prev.filter((i) => i.uid !== uid))}
            />
            {error && <p className="mt-3 text-sm font-bold text-brand-red">{error}</p>}
            <div className="mt-8 grid gap-3">
              <button
                disabled={sending || cart.length === 0}
                onClick={confirm}
                className="rounded-full bg-brand-red px-8 py-5 text-xl font-extrabold text-brand-red-foreground shadow-pop transition disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Pagar"}
              </button>
              <button
                type="button"
                onClick={nuevoPostre}
                className="rounded-full border-2 border-border px-8 py-4 text-lg font-extrabold"
              >
                Añadir otro postre
              </button>
            </div>
          </>
        )}
      </section>

      {!isIntro && !isCesta && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-5 pb-5 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <button
              onClick={goBack}
              className="rounded-full border-2 border-border px-5 py-4 text-base font-extrabold"
            >
              Atrás
            </button>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Total</p>
              <p className="text-2xl font-black leading-none text-brand-red">{euro(footerTotal)}</p>
            </div>
            <button
              disabled={!canContinue}
              onClick={goNext}
              className="rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card transition disabled:opacity-40"
            >
              {step === "resumen" ? "Continuar" : "Seguir"}
            </button>
          </div>
        </footer>
      )}
    </main>
  );
}
