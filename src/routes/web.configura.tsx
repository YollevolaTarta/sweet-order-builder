import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  cargarConfigWeb,
  confirmarPedido,
  fechaEnvioLabel,
  itemsParaServidor,
  mensajeError,
  pedirPresupuesto,
  plazoLabel,
  type ConfigWeb,
  type DatosPedidoWeb,
  type Presupuesto,
} from "@/lib/checkout-web";
import { STORE_ID, euro } from "@/lib/menu";
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
import { WEB_FORMATS, formatoDe, useWebOrder } from "@/lib/web-order";
import { precioPorFormato, supabaseYLLT } from "@/lib/supabase-yllt";
import {
  cartTieneShake,
  cartTotal,
  cartUnidades,
  itemDePack,
  conLiquido,
  liquidoLabel,
  opcionLiquido,
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

type Step = "formato" | "liquido" | "catalogo" | "crema" | "toppings" | "resumen" | "cesta" | "checkout";
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

// "Condiciones de compra" → /condiciones y "alérgenos" → /alergenos dentro del texto de la BD.
function textoConEnlaces(texto: string) {
  const partes = texto.split(/(Condiciones de compra|alérgenos)/);
  return partes.map((p, i) =>
    p === "Condiciones de compra" ? (
      <a key={i} href="/condiciones" target="_blank" rel="noopener" className="underline">
        {p}
      </a>
    ) : p === "alérgenos" ? (
      <a key={i} href="/alergenos" target="_blank" rel="noopener" className="underline">
        {p}
      </a>
    ) : (
      p
    ),
  );
}

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
  const { creams: CREAMS, toppings: TOPPINGS } = useIngredientes();
  const cream = CREAMS.find((c) => c.id === creamId) ?? null;
  const toppings = toppingIds
    .map((id) => TOPPINGS.find((t) => t.id === id))
    .filter((t) => t !== undefined);
  const receta = recetas.find((r) => r.receta_id === recetaId) ?? null;
  const pack = packs.find((p) => p.pack_id === packId) ?? null;

  // Si se entra con una receta/pack ya elegido (landing), no se muestra el catálogo.
  const [liquidoId, setLiquidoId] = useState<string | null>(null);
  const [preseleccion] = useState(() => mode === "recetas" && (!!recetaId || !!packId));

  const flow: Step[] = useMemo(() => {
    const base: Step[] = ["formato"];
    if (isShake) base.push("liquido");
    if (mode === "recetas") {
      if (!preseleccion) base.push("catalogo");
    } else base.push("crema", "toppings");
    base.push("resumen", "cesta", "checkout");
    return base;
  }, [mode, preseleccion, isShake]);

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
  const [done, setDone] = useState<{
    numero: string | null;
    entrega: Entrega;
    franja: string | null;
    fecha_envio: string | null;
  } | null>(null);

  // Config pública, casillas y presupuesto del servidor.
  const [config, setConfig] = useState<ConfigWeb | null>(null);
  const [configError, setConfigError] = useState(false);
  const [configKey, setConfigKey] = useState(0);
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);
  const [aceptaComercial, setAceptaComercial] = useState(false);
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [presupuestoError, setPresupuestoError] = useState<string | null>(null);
  const [cargandoPresupuesto, setCargandoPresupuesto] = useState(false);
  const [quoteKey, setQuoteKey] = useState(0);
  const [franjasKey, setFranjasKey] = useState(0);

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
  }, [step, franjasKey]);

  useEffect(() => {
    if (step !== "checkout") return;
    let active = true;
    setConfigError(false);
    cargarConfigWeb()
      .then((c) => active && setConfig(c))
      .catch(() => active && setConfigError(true));
    return () => {
      active = false;
    };
  }, [step, configKey]);

  const cp = codigoPostal.trim();
  const cpCompleto = /^[0-9]{5}$/.test(cp);
  const itemsServidor = useMemo(() => itemsParaServidor(cart), [cart]);
  const datosBase = useMemo(
    () => ({
      store_id: STORE_ID,
      entrega,
      ...(entrega === "recoger" && franja ? { franja } : {}),
      items: itemsServidor,
      cliente: {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        ...(entrega === "envio"
          ? { direccion: direccion.trim(), codigo_postal: cp, ciudad: ciudad.trim() }
          : {}),
      },
    }),
    [entrega, franja, itemsServidor, nombre, apellidos, email, telefono, direccion, cp, ciudad],
  );

  // Presupuesto: solo depende de cesta, entrega, franja y CP (no de nombre, email…).
  const datosRef = useRef(datosBase);
  datosRef.current = datosBase;
  useEffect(() => {
    if (step !== "checkout" || cart.length === 0) return;
    if (entrega === "envio" && !cpCompleto) {
      setPresupuesto(null);
      setPresupuestoError(null);
      return;
    }
    let active = true;
    setCargandoPresupuesto(true);
    const t = setTimeout(async () => {
      const r = await pedirPresupuesto({
        ...datosRef.current,
        acepta_condiciones: false,
        acepta_comercial: false,
      });
      if (!active) return;
      setCargandoPresupuesto(false);
      if (r.ok) {
        setPresupuesto(r);
        setPresupuestoError(null);
      } else {
        setPresupuesto(null);
        setPresupuestoError(mensajeError(r));
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [step, itemsServidor, entrega, franja, cp, cpCompleto, quoteKey, cart.length]);

  const fechaEnvioActual = entrega === "envio" ? (presupuesto?.fecha_envio ?? null) : null;

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
  const puedePagar =
    !sending &&
    cart.length > 0 &&
    !!config &&
    aceptaCondiciones &&
    clienteOk &&
    entregaOk &&
    !!presupuesto &&
    !presupuestoError &&
    !cargandoPresupuesto;

  const canContinue = (() => {
    switch (step) {
      case "formato":
        return !!format;
      case "liquido":
        return !!opcionLiquido(liquidoId);
      case "catalogo":
        return !!receta || !!pack;
      case "crema":
        return !!cream;
      case "toppings":
        return isShake ? toppingIds.length === 2 : true;
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
      crema_id: Number(cream.id),
      toppings: toppings.map((t) => t.name),
      topping_ids: toppings.map((t) => Number(t.id)),
    };
  };

  const goNext = () => {
    if (step === "resumen") {
      const base = buildItem();
      if (!base) return;
      addToCart(conLiquido(base, opcionLiquido(liquidoId)));
      setLiquidoId(null);
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
    if (!puedePagar || !presupuesto || !config) return;
    setSending(true);
    setError(null);
    const datos: DatosPedidoWeb = {
      ...datosBase,
      acepta_condiciones: true,
      condiciones_version: config.condiciones_version,
      acepta_comercial: aceptaComercial,
      total_esperado: presupuesto.total,
      ...(entrega === "envio" && presupuesto.fecha_envio
        ? { fecha_envio_esperada: presupuesto.fecha_envio }
        : {}),
    };
    const r = await confirmarPedido(datos);
    setSending(false);
    if (r.ok) {
      clearCart();
      setDone({
        numero: r.numero,
        entrega,
        franja: r.franja_recogida ?? franja,
        fecha_envio: r.fecha_envio,
      });
      return;
    }
    setError(mensajeError(r));
    switch (r.error) {
      case "fecha_envio_actualizada":
        setPresupuesto((p) =>
          p
            ? {
                ...p,
                fecha_envio: (r.fecha_envio as string) ?? p.fecha_envio,
                plazo_cancelacion: (r.plazo_cancelacion as string) ?? p.plazo_cancelacion,
                puede_cancelar: r.puede_cancelar !== undefined ? !!r.puede_cancelar : p.puede_cancelar,
              }
            : p,
        );
        break;
      case "precio_actualizado":
        setQuoteKey((k) => k + 1);
        break;
      case "franja_completa":
      case "franja_no_valida":
        setFranja(null);
        setFranjasKey((k) => k + 1);
        break;
      case "condiciones_version_no_vigente":
        setAceptaCondiciones(false);
        setConfigKey((k) => k + 1);
        break;
    }
  };

  if (done) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {done.numero ? (
          <>
            <p className="text-lg font-bold text-muted-foreground">Tu pedido es el</p>
            <div className="flex items-center gap-4">
              <img src="/brand/yllt-sello.png" alt="" aria-hidden="true" className="h-14 w-14 object-contain" />
              <p className="animate-pop font-display text-7xl font-bold text-yllt-naranja">{done.numero}</p>
            </div>
          </>
        ) : (
          <p className="text-2xl font-black">Pedido recibido, pendiente de pago</p>
        )}
        {done.entrega === "recoger" && done.franja ? (
          <p className="max-w-xs text-lg font-bold">
            Recógelo el {diaLabel(done.franja)} a las {horaLabel(done.franja)} en {STORE_NAME} 🍰
          </p>
        ) : done.fecha_envio ? (
          <p className="max-w-xs text-lg font-bold">
            Tu pedido saldrá el {fechaEnvioLabel(done.fecha_envio)} 🚚
          </p>
        ) : null}
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
                    <p className="text-base font-extrabold text-foreground">
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
              {isShake ? "Elige exactamente 2 — incluidos en el precio" : "Máximo 2"}
            </p>
            <ToppingsPicker toppingIds={toppingIds} isShake={isShake} onToggle={toggleTopping} />
          </>
        )}

        {step === "resumen" && format && (
          <>
            <h1 className="mb-4 text-3xl font-black leading-tight">Tu postre</h1>
            <div className="card-soft space-y-3 p-5">
              <Row label="Formato" value={`${format.name} · ${format.size}`} />
              {formato && liquidoLabel({ formato, ...opcionLiquido(liquidoId) }) && (
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
              <hr className="border-border" />
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-black">Este postre</span>
                <span className="text-2xl font-black text-foreground">{euro(itemPrecio)}</span>
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
            {presupuesto?.pago_simulado && (
              <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-foreground">
                MODO PRUEBAS — no se cobra
              </p>
            )}
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
                {fechaEnvioActual && (
                  <div className="card-soft border-2 border-primary bg-accent p-4">
                    <p className="text-lg font-black leading-snug">
                      📦 Tu pedido saldrá el {fechaEnvioLabel(fechaEnvioActual)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-muted-foreground">
                      Enviamos los miércoles y los jueves. Transporte en frío en 24h.
                    </p>
                  </div>
                )}
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
            <p className="mt-2 text-[11px] font-normal text-muted-foreground">
              YO LLEVO LA TARTA, S.L.U. trata tus datos para gestionar tu pedido. Más información y tus derechos en la{" "}
              <a href="/privacidad" className="underline">Política de privacidad</a>.
            </p>

            <div className="card-soft mt-6 space-y-2 p-4">
              <div className="flex justify-between text-base font-bold">
                <span>Productos</span>
                <span>{presupuesto ? euro(presupuesto.subtotal) : "—"}</span>
              </div>
              {entrega === "envio" && (
                <div className="flex justify-between text-base font-bold">
                  <span>Envío</span>
                  <span>{presupuesto ? euro(presupuesto.envio) : "—"}</span>
                </div>
              )}
              <hr className="border-border" />
              <div className="flex justify-between text-lg font-black">
                <span>Total (IVA incluido)</span>
                <span>{presupuesto ? euro(presupuesto.total) : "—"}</span>
              </div>
              {cargandoPresupuesto && (
                <p className="text-xs font-bold text-muted-foreground">Calculando…</p>
              )}
            </div>
            {presupuestoError && (
              <p className="mt-3 text-sm font-bold text-destructive">{presupuestoError}</p>
            )}

            {config ? (
              <div className="mt-5 space-y-3">
                <label className="flex items-start gap-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={aceptaCondiciones}
                    onChange={(e) => setAceptaCondiciones(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-brand-strong)]"
                  />
                  <span>{textoConEnlaces(config.texto_casilla_condiciones)}</span>
                </label>
                <label className="flex items-start gap-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={aceptaComercial}
                    onChange={(e) => setAceptaComercial(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-brand-strong)]"
                  />
                  <span>{config.texto_casilla_comercial}</span>
                </label>
              </div>
            ) : (
              <p className="mt-5 text-sm font-bold text-muted-foreground">
                {configError ? (
                  <button type="button" className="underline" onClick={() => setConfigKey((k) => k + 1)}>
                    No hemos podido cargar las condiciones. Reintentar
                  </button>
                ) : (
                  "Cargando condiciones…"
                )}
              </p>
            )}

            {presupuesto && (entrega === "envio" || franja) && (
              <p className="mt-4 text-xs font-bold text-muted-foreground">
                {presupuesto.puede_cancelar && presupuesto.plazo_cancelacion
                  ? `Producto fresco y hecho a tu gusto: no tiene derecho de desistimiento. Puedes cancelarlo gratis hasta el ${plazoLabel(presupuesto.plazo_cancelacion)}.`
                  : "Producto fresco y hecho a tu gusto: no tiene derecho de desistimiento y, una vez pagado, este pedido ya no se puede cancelar."}
              </p>
            )}
            {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
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
            <p className="text-2xl font-black leading-none text-foreground">
              {step === "checkout" ? (presupuesto ? euro(presupuesto.total) : "—") : euro(footerTotal)}
            </p>
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
              disabled={!puedePagar}
              onClick={confirm}
              className="rounded-full bg-yllt-naranja px-7 py-4 text-lg font-extrabold text-yllt-naranja-foreground shadow-card transition disabled:opacity-50"
            >
              {sending ? "Enviando…" : "Pagar ahora"}
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
