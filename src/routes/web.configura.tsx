import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CREAMS, STORE_ID, TOPPINGS, euro } from "@/lib/menu";
import {
  CatalogoPicker,
  CremaPicker,
  Row,
  Swatch,
  ToppingsPicker,
  packRecetas,
} from "@/components/configurator-parts";
import { CartView } from "@/components/cart-view";
import { WEB_FORMATS, formatoDe, useWebOrder } from "@/lib/web-order";
import { precioPorFormato, supabaseYLLT } from "@/lib/supabase-yllt";
import {
  cartTieneShake,
  cartTotal,
  cartUnidades,
  lineasDeCesta,
  itemDePack,
  itemDeReceta,
  type CartItem,
} from "@/lib/cart";

export const Route = createFileRoute("/web/configura")({
  validateSearch: (search: Record<string, unknown>) => ({
    vista: search["vista"] === "cesta" ? ("cesta" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Configura tu pedido — Yo Llevo la Tarta" },
      {
        name: "description",
        content: "Elige formato, crema y toppings y decide si recoges en tienda o lo recibes en casa.",
      },
      { property: "og:title", content: "Configura tu pedido — Yo Llevo la Tarta" },
      {
        property: "og:description",
        content: "Tu postre a medida, para recoger en Bilbao Casco Viejo o a domicilio.",
      },
    ],
  }),
  component: WebConfigura,
});

type Step = "formato" | "catalogo" | "crema" | "toppings" | "resumen" | "cesta" | "checkout";
type Entrega = "recoger" | "envio";
type Franja = { franja: string; libres: number };

const STORE_NAME = "Bilbao - Casco Viejo";

const diaLabel = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());

const horaLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// Envíos: salen miércoles y jueves a las 16:00 (hora de Madrid).
// Jueves 16:01 → miércoles 16:00: sale el miércoles. Miércoles 16:01 → jueves 16:00: sale el jueves.
function fechaEnvio(): Date {
  const ahora = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }),
  );
  const dow = ahora.getDay(); // 0 dom … 3 mié … 4 jue
  const pasoCorte = ahora.getHours() > 16 || (ahora.getHours() === 16 && ahora.getMinutes() > 0);
  let objetivo: 3 | 4;
  if (dow === 3) objetivo = pasoCorte ? 4 : 3;
  else if (dow === 4) objetivo = pasoCorte ? 3 : 4;
  else objetivo = 3;
  const delta = (objetivo - dow + 7) % 7; // 0 = sale hoy (antes del corte de las 16:00)
  const salida = new Date(ahora);
  salida.setDate(ahora.getDate() + delta);
  return salida;
}

const envioLabel = (d: Date) =>
  d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });

function WebConfigura() {
  const navigate = useNavigate();
  const { vista } = Route.useSearch();
  const order = useWebOrder();
  const {
    recetas,
    packs,
    loading,
    mode,
    setMode,
    formatId,
    setFormatId,
    creamId,
    setCreamId,
    toppingIds,
    setToppingIds,
    recetaId,
    setRecetaId,
    packId,
    setPackId,
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    resetSeleccion,
  } = order;

  const format = WEB_FORMATS.find((f) => f.id === formatId) ?? null;
  const formato = formatoDe(formatId);
  const isShake = formatId === "cake-shake";
  const cream = CREAMS.find((c) => c.id === creamId) ?? null;
  const toppings = toppingIds
    .map((id) => TOPPINGS.find((t) => t.id === id))
    .filter((t) => t !== undefined);
  const receta = recetas.find((r) => r.id === recetaId) ?? null;
  const pack = packs.find((p) => p.id === packId) ?? null;

  // Si se entra con una receta/pack ya elegido (landing), no se muestra el catálogo.
  const [preseleccion] = useState(() => mode === "recetas" && (!!recetaId || !!packId));

  const flow: Step[] = useMemo(() => {
    const base: Step[] = ["formato"];
    if (mode === "recetas") {
      if (!preseleccion) base.push("catalogo");
    } else base.push("crema", "toppings");
    base.push("resumen", "cesta", "checkout");
    return base;
  }, [mode, preseleccion]);

  const [step, setStep] = useState<Step>(() => {
    if (vista === "cesta") return "cesta";
    if (mode === "recetas" && formatId && (recetaId || packId)) return "resumen";
    return "formato";
  });

  useEffect(() => {
    if (!mode) setMode("crear");
  }, [mode, setMode]);

  const index = Math.max(0, flow.indexOf(step));
  const progress = ((index + 1) / flow.length) * 100;

  // Entrega + cliente
  const [entrega, setEntrega] = useState<Entrega>("recoger");
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [franja, setFranja] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ label: string } | null>(null);

  const hayShake = cartTieneShake(cart);
  const numTartas = Math.max(1, cartUnidades(cart));

  // El cake shake solo se puede recoger en tienda.
  useEffect(() => {
    if (hayShake) setEntrega("recoger");
  }, [hayShake]);

  useEffect(() => {
    if (step !== "checkout") return;
    let active = true;
    (async () => {
      const { data } = await supabaseYLLT.rpc("franjas_disponibles", {
        p_store: STORE_ID,
        p_dias: 7,
      });
      if (active) setFranjas((data as Franja[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [step]);

  const itemPrecio = useMemo(() => {
    if (!format || !formato) return 0;
    if (mode === "recetas") {
      if (receta) return precioPorFormato(receta, formato);
      if (pack) return precioPorFormato(pack, formato);
      return 0;
    }
    if (isShake) return format.basePrice;
    return format.basePrice + toppings.reduce((s, t) => s + t.price, 0);
  }, [format, formato, isShake, mode, pack, receta, toppings]);

  const cestaTotal = cartTotal(cart);
  const enCesta = step === "cesta" || step === "checkout";
  const footerTotal = enCesta ? cestaTotal : cestaTotal + itemPrecio;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const telOk = /^[+0-9][0-9\s]{7,}$/.test(telefono.trim());
  const clienteOk = nombre.trim().length > 1 && apellidos.trim().length > 1 && emailOk && telOk;
  const entregaOk =
    entrega === "recoger"
      ? !!franja
      : direccion.trim().length > 3 && /^[0-9]{5}$/.test(codigoPostal.trim()) && ciudad.trim().length > 1;

  const canContinue = (() => {
    switch (step) {
      case "formato":
        return !!format;
      case "catalogo":
        return !!receta || !!pack;
      case "crema":
        return !!cream;
      case "toppings":
        return isShake ? toppingIds.length === 2 : toppingIds.length >= 1;
      case "cesta":
        return cart.length > 0;
      default:
        return true;
    }
  })();

  const buildItem = (): CartItem | null => {
    if (!format || !formato) return null;
    if (mode === "recetas" && pack) return itemDePack(pack, format, formato);
    if (mode === "recetas" && receta) return itemDeReceta(receta, format, formato);
    if (!cream) return null;
    return {
      uid: crypto.randomUUID(),
      tipo: "personalizada",
      formato,
      formatName: `${format.name} · ${format.size}`,
      nombre: `Tu tarta de ${cream.name}`,
      detalle: [toppings.map((t) => t.name).join(" + ")].filter(Boolean),
      precio: Number(itemPrecio.toFixed(2)),
      // En la web nunca hay tarta abierta, así que no hay decoración con foto.
      foto: false,
      crema: cream.name,
      toppings: toppings.map((t) => t.name),
    };
  };

  const goNext = () => {
    if (step === "resumen") {
      const item = buildItem();
      if (!item) return;
      addToCart(item);
      setStep("cesta");
      return;
    }
    const next = flow[index + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    if (step === "checkout") {
      setStep("cesta");
      return;
    }
    if (index <= 0) {
      navigate({ to: "/web" });
      return;
    }
    setStep(flow[index - 1]!);
  };

  const toggleTopping = (id: string) => {
    setToppingIds(
      toppingIds.includes(id)
        ? toppingIds.filter((x) => x !== id)
        : toppingIds.length >= 2
          ? toppingIds
          : [...toppingIds, id],
    );
  };

  const confirm = async () => {
    if (cart.length === 0 || !clienteOk || !entregaOk) return;
    setSending(true);
    setError(null);
    const precio = Number(cestaTotal.toFixed(2));
    // PROVISIONAL: marcamos el pedido como pagado con metodo_pago 'prueba'
    // hasta integrar la pasarela de pago real.
    const { data, error: err } = await supabaseYLLT
      .from("pedidos")
      .insert({
        store_id: STORE_ID,
        canal: "web",
        tipo_pedido: entrega,
        franja_recogida: entrega === "recoger" ? franja : null,
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
    if (lineErr) {
      setSending(false);
      setError(
        /shake/i.test(lineErr.message)
          ? "El cake shake solo se puede recoger en tienda. Cambia la entrega a recogida."
          : "No hemos podido enviar el pedido. Inténtalo otra vez.",
      );
      return;
    }

    // pedido_clientes solo permite insertar, nunca leer: sin .select().
    const { error: cliErr } = await supabaseYLLT.from("pedido_clientes").insert({
      pedido_id: data.id,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      ...(entrega === "envio"
        ? {
            direccion: direccion.trim(),
            codigo_postal: codigoPostal.trim(),
            ciudad: ciudad.trim(),
          }
        : {}),
    });
    setSending(false);
    if (cliErr) {
      setError("No hemos podido guardar tus datos. Inténtalo otra vez.");
      return;
    }
    clearCart();
    setDone({ label: `${data.serie}-${String(data.numero_pedido ?? 0).padStart(2, "0")}` });
  };

  if (done) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold text-muted-foreground">Tu pedido es el</p>
        <p className="animate-pop text-7xl font-black text-brand-red">{done.label}</p>
        {entrega === "recoger" && franja ? (
          <p className="max-w-xs text-lg font-bold">
            Recógelo el {diaLabel(franja)} a las {horaLabel(franja)} en {STORE_NAME} 🍰
          </p>
        ) : (
          <p className="max-w-xs text-lg font-bold">
            Tu pedido saldrá el {envioLabel(fechaEnvio())} 🚚
          </p>
        )}
        <button
          onClick={() => {
            order.reset();
            navigate({ to: "/web" });
          }}
          className="mt-6 rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card"
        >
          Volver al inicio
        </button>
      </main>
    );
  }

  const franjasPorDia = franjas.reduce<Record<string, Franja[]>>((acc, f) => {
    const key = diaLabel(f.franja);
    (acc[key] ??= []).push(f);
    return acc;
  }, {});

  return (
    <>
      <div className="px-5 pt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs font-bold text-muted-foreground">
          Paso {index + 1} de {flow.length}
        </p>
      </div>

      <section key={step} className="animate-step-in flex-1 px-5 pb-40 pt-5">
        {step === "formato" && (
          <>
            <h1 className="mb-5 text-3xl font-black leading-tight">Elige tu formato</h1>
            <div className="grid gap-4">
              {WEB_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormatId(f.id)}
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
              loading={loading}
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

        {step === "resumen" && format && (
          <>
            <h1 className="mb-4 text-3xl font-black leading-tight">Tu postre</h1>
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
              <hr className="border-border" />
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-black">Este postre</span>
                <span className="text-2xl font-black text-brand-red">{euro(itemPrecio)}</span>
              </div>
            </div>
          </>
        )}

        {step === "cesta" && (
          <>
            <h1 className="mb-1 text-3xl font-black leading-tight">¿Quieres algo más?</h1>
            <p className="mb-5 text-sm font-bold text-muted-foreground">Estos son tus postres</p>
            <CartView cart={cart} onRemove={removeFromCart} />
            <div className="mt-8 grid gap-3">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setStep("checkout")}
                className="rounded-full bg-primary px-8 py-5 text-xl font-extrabold text-primary-foreground shadow-card transition disabled:opacity-40"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSeleccion();
                  navigate({ to: "/web" });
                }}
                className="rounded-full border-2 border-border px-8 py-4 text-lg font-extrabold"
              >
                Añadir otro postre
              </button>
            </div>
          </>
        )}

        {step === "checkout" && (
          <>
            <h1 className="mb-4 text-3xl font-black leading-tight">¿Cómo lo recibes?</h1>
            <div className="mb-6 grid grid-cols-2 gap-3">
              {(
                [
                  { v: "recoger" as Entrega, label: "Recoger en tienda", emoji: "🏪" },
                  { v: "envio" as Entrega, label: "Envío a domicilio", emoji: "🚚" },
                ]
              ).map((o) => {
                const disabled = o.v === "envio" && hayShake;
                return (
                  <button
                    key={o.v}
                    type="button"
                    disabled={disabled}
                    onClick={() => setEntrega(o.v)}
                    className={`card-soft p-4 text-left ${entrega === o.v ? "card-selected animate-pop" : ""} ${disabled ? "opacity-40" : ""}`}
                  >
                    <span className="block text-3xl">{o.emoji}</span>
                    <span className="mt-1 block text-base font-black leading-tight">{o.label}</span>
                    {disabled && (
                      <span className="mt-1 block text-xs font-bold text-muted-foreground">
                        El cake shake solo se puede recoger en tienda
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {entrega === "recoger" ? (
              <section className="mb-6">
                <h2 className="text-xl font-black">{STORE_NAME}</h2>
                <p className="mb-3 text-sm font-bold text-muted-foreground">Elige tu franja de recogida</p>
                {franjas.length === 0 && (
                  <p className="font-bold text-muted-foreground">Cargando franjas…</p>
                )}
                <div className="space-y-4">
                  {Object.entries(franjasPorDia).map(([dia, items]) => (
                    <div key={dia}>
                      <p className="mb-2 text-sm font-black">{dia}</p>
                      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                        {items.map((f) => {
                          const disabled = f.libres < numTartas;
                          const selected = franja === f.franja;
                          return (
                            <button
                              key={f.franja}
                              type="button"
                              disabled={disabled}
                              onClick={() => setFranja(f.franja)}
                              className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-extrabold transition ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"} ${disabled ? "opacity-30" : ""}`}
                            >
                              {horaLabel(f.franja)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="mb-6 grid gap-3">
                <div className="card-soft border-2 border-primary bg-accent p-4">
                  <p className="text-lg font-black leading-snug">
                    📦 Tu pedido saldrá el {envioLabel(fechaEnvio())}
                  </p>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">
                    Enviamos los miércoles y los jueves. Los pedidos hechos después de las 16:00
                    pasan al siguiente envío.
                  </p>
                </div>
                <Field label="Dirección" value={direccion} onChange={setDireccion} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Código postal" value={codigoPostal} onChange={setCodigoPostal} />
                  <Field label="Ciudad" value={ciudad} onChange={setCiudad} />
                </div>
              </section>
            )}

            <h2 className="mb-3 text-xl font-black">Tus datos</h2>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" value={nombre} onChange={setNombre} />
                <Field label="Apellidos" value={apellidos} onChange={setApellidos} />
              </div>
              <Field label="Email" type="email" value={email} onChange={setEmail} />
              <Field label="Teléfono" type="tel" value={telefono} onChange={setTelefono} />
            </div>
            {error && <p className="mt-3 text-sm font-bold text-brand-red">{error}</p>}
          </>
        )}
      </section>

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
          {step === "cesta" ? null : step !== "checkout" ? (
            <button
              disabled={!canContinue}
              onClick={goNext}
              className="rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card transition disabled:opacity-40"
            >
              {step === "resumen" ? "Continuar" : "Seguir"}
            </button>
          ) : (
            <button
              disabled={sending || !clienteOk || !entregaOk}
              onClick={confirm}
              className="rounded-full bg-brand-red px-7 py-4 text-lg font-extrabold text-brand-red-foreground shadow-pop transition disabled:opacity-50"
            >
              {sending ? "Enviando…" : "CONFIRMAR"}
            </button>
          )}
        </div>
      </footer>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-extrabold uppercase text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-base font-bold outline-none focus:border-primary"
      />
    </label>
  );
}
