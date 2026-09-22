import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  supabaseYLLT,
  precioPorFormato,
  type Formato,
  type Pack,
  type Receta,
} from "@/lib/supabase-yllt";
import { Check, Play } from "lucide-react";
import { CREAMS, FORMATS, STORE_ID, TOPPINGS, TOPPING_CATEGORIES, euro } from "@/lib/menu";

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

type Step = "intro" | "formato" | "modo" | "crema" | "toppings" | "catalogo" | "foto" | "resumen";
type Mode = "crear" | "recetas";

function Swatch({ color, label, className = "" }: { color: string; label: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl text-center text-xs font-extrabold uppercase tracking-wide ${className}`}
      style={{ backgroundColor: color, color: "oklch(0.25 0.03 30)" }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

const packRecetas = (pack: Pack): Receta[] =>
  (pack.pack_recetas ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((pr) => pr.recetas)
    .filter((r): r is Receta => !!r);

function Configurator() {
  const [step, setStep] = useState<Step>("intro");
  const [mode, setMode] = useState<Mode | null>(null);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [creamId, setCreamId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [wantsPhoto, setWantsPhoto] = useState<boolean | null>(null);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [recetaId, setRecetaId] = useState<number | null>(null);
  const [packId, setPackId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [orderLabel, setOrderLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canal] = useState<"tablet" | "qr">(() => {
    if (typeof window === "undefined") return "tablet";
    return new URLSearchParams(window.location.search).get("canal") === "qr" ? "qr" : "tablet";
  });

  const format = FORMATS.find((f) => f.id === formatId) ?? null;
  const cream = CREAMS.find((c) => c.id === creamId) ?? null;
  const isShake = format?.id === "cake-shake";
  const isOpenTart = format?.id === "tarta-abierta";
  const formato: Formato =
    format?.id === "cake-shake" ? "shake" : format?.id === "tarta-lata" ? "lata" : "abierta";
  const toppings = toppingIds
    .map((id) => TOPPINGS.find((t) => t.id === id))
    .filter((topping) => topping !== undefined);

  const receta = recetas.find((r) => r.id === recetaId) ?? null;
  const pack = packs.find((p) => p.id === packId) ?? null;

  useEffect(() => {
    if (step !== "catalogo" || recetas.length > 0 || packs.length > 0 || catalogLoading) return;
    let active = true;
    setCatalogLoading(true);
    (async () => {
      const [r, p] = await Promise.all([
        supabaseYLLT.from("recetas").select("*").eq("activa", true).order("orden"),
        supabaseYLLT
          .from("packs")
          .select("*, pack_recetas(orden, recetas(*))")
          .eq("activo", true)
          .order("orden"),
      ]);
      if (!active) return;
      setRecetas((r.data as Receta[]) ?? []);
      setPacks((p.data as Pack[]) ?? []);
      setCatalogLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [step, recetas.length, packs.length, catalogLoading]);

  const total = useMemo(() => {
    if (!format) return 0;
    if (mode === "recetas") {
      if (receta) return precioPorFormato(receta, formato);
      if (pack) return precioPorFormato(pack, formato);
      return 0;
    }
    if (isShake) return format.basePrice;
    return format.basePrice + toppings.reduce((s, t) => s + t.price, 0);
  }, [format, formato, isShake, mode, pack, receta, toppings]);

  const flow: Step[] = useMemo(() => {
    const base: Step[] = ["formato", "modo"];
    if (mode === "crear") base.push("crema", "toppings");
    if (mode === "recetas") base.push("catalogo");
    if (mode && isOpenTart) base.push("foto");
    if (mode) base.push("resumen");
    return base;
  }, [mode, isOpenTart]);

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

  const goNext = () => {
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
    resetSelection();
  };

  const confirm = async () => {
    if (!format) return;
    if (mode === "crear" && !cream) return;
    if (mode === "recetas" && !receta && !pack) return;
    if (isOpenTart && wantsPhoto === null) return;
    setSending(true);
    setError(null);
    const foto = isOpenTart ? wantsPhoto === true : false;
    const precio = Number(total.toFixed(2));
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

    let lineas: Record<string, unknown>[];
    if (mode === "recetas" && pack) {
      const grupo = crypto.randomUUID();
      const items = packRecetas(pack);
      const unit = Number((precio / (pack.tamano || items.length || 1)).toFixed(2));
      lineas = items.map((r) => ({
        pedido_id: data.id,
        tipo: "pack",
        formato,
        pack_id: pack.id,
        pack_grupo: grupo,
        receta_id: r.id,
        receta: r.nombre,
        crema: r.crema,
        topping_1: r.topping_1,
        topping_2: r.topping_2,
        foto,
        precio: unit,
      }));
    } else if (mode === "recetas" && receta) {
      lineas = [
        {
          pedido_id: data.id,
          tipo: "receta",
          formato,
          receta_id: receta.id,
          receta: receta.nombre,
          crema: receta.crema,
          topping_1: receta.topping_1,
          topping_2: receta.topping_2,
          foto,
          precio,
        },
      ];
    } else {
      lineas = [
        {
          pedido_id: data.id,
          tipo: "personalizada",
          formato,
          crema: cream!.name,
          topping_1: toppings[0]?.name ?? null,
          topping_2: toppings[1]?.name ?? null,
          foto,
          precio,
        },
      ];
    }

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
          </>
        )}

        {step === "modo" && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">¿Cómo lo quieres?</h1>
            <div className="grid gap-4">
              {[
                { v: "crear" as Mode, label: "Crea tu tarta", desc: "Elige crema y toppings a tu gusto", emoji: "🎨" },
                { v: "recetas" as Mode, label: "Recetas y packs", desc: "Combinaciones ya creadas por nosotros", emoji: "⭐" },
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
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {CREAMS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCreamId(c.id)}
                  className={`card-soft w-40 shrink-0 p-3 text-left ${creamId === c.id ? "card-selected animate-pop" : ""}`}
                >
                  <Swatch color={c.color} label={c.name} className="mb-2 h-24 w-full p-2" />
                  <p className="text-base font-black leading-tight">{c.name}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{c.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "toppings" && (
          <>
            <h1 className="text-3xl font-black leading-tight">Elige tus toppings</h1>
            <p className="mb-6 text-sm font-bold text-muted-foreground">
              {isShake ? "Elige exactamente 2 — incluidos en el precio" : "Mínimo 1, máximo 2"}
            </p>
            <div className="space-y-7">
              {TOPPING_CATEGORIES.map((category) => (
                <section key={category.id} aria-labelledby={`category-${category.id}`}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <h2 id={`category-${category.id}`} className="text-xl font-black">
                      {category.name}
                    </h2>
                    {!isShake && <span className="text-sm font-extrabold text-brand-red">— {category.priceLabel}</span>}
                  </div>
                  <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
                    {TOPPINGS.filter((topping) => topping.category === category.id).map((topping) => {
                      const selected = toppingIds.includes(topping.id);
                      const disabled = !selected && toppingIds.length >= 2;
                      return (
                        <button
                          key={topping.id}
                          type="button"
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() => toggleTopping(topping.id)}
                          className={`card-soft relative w-40 shrink-0 snap-start overflow-hidden p-2 text-left disabled:cursor-not-allowed ${selected ? "card-selected animate-pop" : ""} ${disabled ? "opacity-40" : ""}`}
                        >
                          <span
                            className="relative mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl"
                            style={{ backgroundColor: topping.color }}
                            aria-hidden="true"
                          >
                            <span className="flex size-9 items-center justify-center rounded-full bg-card/85 text-foreground shadow-card">
                              <Play className="size-4 fill-current" />
                            </span>
                            {selected && (
                              <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-4 stroke-[3]" />
                              </span>
                            )}
                          </span>
                          <span className="block min-h-10 text-sm font-black leading-tight">{topping.name}</span>
                          {!isShake && (
                            <span className="mt-2 block text-sm font-black text-brand-red">{euro(topping.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        {step === "catalogo" && (
          <>
            <h1 className="text-3xl font-black leading-tight">Recetas y packs</h1>
            <p className="mb-6 text-sm font-bold text-muted-foreground">Elige una opción</p>
            {catalogLoading && <p className="font-bold text-muted-foreground">Cargando…</p>}

            {recetas.length > 0 && (
              <section className="mb-7" aria-labelledby="sec-recetas">
                <h2 id="sec-recetas" className="mb-3 text-xl font-black">
                  Recetas
                </h2>
                <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
                  {recetas.map((r) => {
                    const selected = recetaId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setPackId(null);
                          setRecetaId(selected ? null : r.id);
                        }}
                        className={`card-soft relative w-48 shrink-0 snap-start p-3 text-left ${selected ? "card-selected animate-pop" : ""}`}
                      >
                        {selected && (
                          <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-4 stroke-[3]" />
                          </span>
                        )}
                        <span className="block min-h-14 pr-6 text-sm font-black leading-tight">{r.nombre}</span>
                        <span className="mt-2 block text-base font-black text-brand-red">
                          {euro(precioPorFormato(r, formato))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {[2, 4, 6].map((size) => {
              const group = packs.filter((p) => p.tamano === size);
              if (group.length === 0) return null;
              return (
                <section key={size} className="mb-7" aria-labelledby={`sec-pack-${size}`}>
                  <h2 id={`sec-pack-${size}`} className="mb-3 text-xl font-black">
                    Pack {size}
                  </h2>
                  <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
                    {group.map((p) => {
                      const selected = packId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setRecetaId(null);
                            setPackId(selected ? null : p.id);
                          }}
                          className={`card-soft relative w-56 shrink-0 snap-start p-3 text-left ${selected ? "card-selected animate-pop" : ""}`}
                        >
                          {selected && (
                            <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-4 stroke-[3]" />
                            </span>
                          )}
                          <span className="block pr-6 text-base font-black leading-tight">{p.nombre}</span>
                          <span className="mt-2 block space-y-0.5">
                            {packRecetas(p).map((r) => (
                              <span key={r.id} className="block text-xs font-bold text-muted-foreground">
                                · {r.nombre}
                              </span>
                            ))}
                          </span>
                          <span className="mt-2 block text-base font-black text-brand-red">
                            {euro(precioPorFormato(p, formato))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
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
            <h1 className="mb-4 text-3xl font-black leading-tight">Tu pedido</h1>
            <div className="card-soft space-y-3 p-5">
              <Row label="Formato" value={`${format.name} · ${format.size}`} />
              {mode === "recetas" ? (
                <>
                  {receta && <Row label="Receta" value={receta.nombre} />}
                  {pack && (
                    <>
                      <Row label="Pack" value={`${pack.nombre} · ${pack.tamano} uds`} />
                      {packRecetas(pack).map((r) => (
                        <Row key={r.id} label="·" value={r.nombre} />
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
                <Row label="Todo incluido" value={euro(total)} />
              ) : (
                <>
                  <Row label="Precio base" value={euro(format.basePrice)} />
                  {toppings.map((t) => (
                    <Row key={t.id} label={t.name} value={euro(t.price)} />
                  ))}
                </>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-black">Total</span>
                <span className="text-2xl font-black text-brand-red">{euro(total)}</span>
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-bold text-brand-red">{error}</p>}
          </>
        )}
      </section>

      {!isIntro && (
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
              <p className="text-2xl font-black leading-none text-brand-red">{euro(total)}</p>
            </div>
            {step !== "resumen" ? (
              <button
                disabled={!canContinue}
                onClick={goNext}
                className="rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card transition disabled:opacity-40"
              >
                Seguir
              </button>
            ) : (
              <button
                disabled={sending}
                onClick={confirm}
                className="rounded-full bg-brand-red px-7 py-4 text-lg font-extrabold text-brand-red-foreground shadow-pop transition disabled:opacity-50"
              >
                {sending ? "Enviando…" : "CONFIRMAR"}
              </button>
            )}
          </div>
        </footer>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-extrabold">{value}</span>
    </div>
  );
}
