import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  cargarCampana, cargarConfigWeb, confirmarPedido, fechaEnvioLabel,
  mensajeError, pedirPresupuesto, plazoLabel,
  type Campana, type ConfigWeb, type DatosPedidoWeb, type Presupuesto, type ResultadoPedido,
} from "@/lib/checkout-web";
import { STORE_ID, euro } from "@/lib/menu";
import { track } from "@/lib/meta-pixel";

export const Route = createFileRoute("/web/diciembre")({
  head: () => ({ meta: [
    { title: "Pack de Diciembre — Yo Llevo la Tarta" },
    { name: "description", content: "Pack cerrado de 6 tartas en lata. Envío a España peninsular el 17 de diciembre de 2026." },
    { property: "og:title", content: "Pack de Diciembre — Yo Llevo la Tarta" },
    { property: "og:description", content: "Pack cerrado de 6 tartas en lata. Envío a España peninsular el 17 de diciembre de 2026." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Diciembre,
});

const CODIGO = "diciembre-2026";
const CAMPOS = [
  { key: "nombre", label: "Nombre", type: "text", autoComplete: "given-name" },
  { key: "apellidos", label: "Apellidos", type: "text", autoComplete: "family-name" },
  { key: "email", label: "Email", type: "email", autoComplete: "email" },
  { key: "telefono", label: "Teléfono", type: "tel", autoComplete: "tel" },
  { key: "direccion", label: "Dirección", type: "text", autoComplete: "street-address" },
  { key: "codigo_postal", label: "Código postal", type: "text", autoComplete: "postal-code" },
  { key: "ciudad", label: "Ciudad", type: "text", autoComplete: "address-level2" },
] as const;

function CondicionesCampana() {
  return (
    <section className="space-y-3 text-sm leading-relaxed">
      <h2 className="text-xl font-bold">Condiciones de la campaña de diciembre</h2>
      <p>Estas condiciones se aplican al Pack de Diciembre y forman parte de nuestras <a href="/condiciones" target="_blank" rel="noopener" className="underline">Condiciones de compra</a>. Donde digan algo distinto, mandan estas.</p>
      <ul className="list-disc space-y-3 pl-5">
        <li><strong>Qué compras:</strong> un pack cerrado de 6 tartas, una de cada receta indicada. No se puede cambiar ni sustituir ninguna. 30 € por pack, IVA incluido.</li>
        <li><strong>Cómo llega:</strong> en frío, como kit para montar en casa: ingredientes por separado y etiquetados, con lo necesario para montarlas y las instrucciones.</li>
        <li><strong>Solo envío a domicilio</strong>, en España peninsular. No hay recogida en tienda.</li>
        <li><strong>Gastos de envío:</strong> 8,90 € por expedición. Cada expedición lleva hasta 2 packs: 1 pack, 38,90 €; 2 packs, 68,90 €; 3 packs, 107,80 € (dos expediciones, que pueden llegar por separado).</li>
        <li><strong>Envío y entrega:</strong> todos los pedidos salen el jueves 17 de diciembre de 2026 con SEUR. Entrega prevista el viernes 18 de diciembre antes de las 13:30. No se puede elegir otro día.</li>
        <li><strong>Unidades limitadas:</strong> 30 packs en total. La venta se cierra el 16 de diciembre de 2026 a las 16:00 (hora peninsular), o antes si se agotan. El pedido solo queda confirmado cuando se completa el pago.</li>
        <li><strong>Cancelación:</strong> gratis hasta el 16 de diciembre de 2026 a las 16:00. Escríbenos a rrss.yollevolatarta@gmail.com con tu número de pedido y te devolvemos el importe íntegro, envío incluido, por el mismo medio de pago y en un máximo de 14 días. Después ya no se puede cancelar: es un producto perecedero preparado para una única expedición.</li>
        <li><strong>Al recibirlo:</strong> guárdalo en la nevera nada más llegar y sigue las instrucciones del kit.</li>
        <li><strong>Si no se puede entregar</strong> porque no hay nadie o la dirección o el teléfono son incorrectos, no hay reembolso ni reenvío.</li>
        <li><strong>Si llega dañado, incompleto o en mal estado,</strong> avísanos en las 24 horas siguientes a la entrega, en rrss.yollevolatarta@gmail.com, con el número de pedido y fotos del producto y del embalaje. Si la causa es nuestra o del transportista, te lo reponemos si es posible o te devolvemos el importe de lo afectado.</li>
      </ul>
      <p><a href="/condiciones#campanas" target="_blank" rel="noopener" className="underline">Ver condiciones de la campaña</a></p>
    </section>
  );
}

function Diciembre() {
  const [campana, setCampana] = useState<Campana | null>(null);
  const [config, setConfig] = useState<ConfigWeb | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [compra, setCompra] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [cliente, setCliente] = useState({ nombre: "", apellidos: "", email: "", telefono: "", direccion: "", codigo_postal: "", ciudad: "" });
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);
  const [aceptaComercial, setAceptaComercial] = useState(false);
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [quoteFor, setQuoteFor] = useState("");
  const [quoteKey, setQuoteKey] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<ResultadoPedido | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setNoDisponible(false);
    Promise.all([cargarCampana(CODIGO), cargarConfigWeb()])
      .then(([c, cfg]) => {
        if (!active) return;
        if (!("codigo" in c)) {
          if (c.error === "campana_no_disponible") setNoDisponible(true);
          else setLoadError(mensajeError(c));
          return;
        }
        setCampana(c);
        setConfig(cfg);
      })
      .catch(() => active && setLoadError(mensajeError({ ok: false, error: "red" })))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadKey]);

  const cp = cliente.codigo_postal.trim();
  const cpCompleto = /^[0-9]{5}$/.test(cp);
  const datos = useMemo<DatosPedidoWeb>(() => ({
    store_id: STORE_ID, entrega: "envio",
    items: [{ tipo: "campana", campana: CODIGO, cantidad }],
    cliente: Object.fromEntries(Object.entries(cliente).map(([k, v]) => [k, v.trim()])),
    acepta_condiciones: false, acepta_comercial: false,
  }), [cantidad, cliente]);
  const datosRef = useRef(datos);
  // Meta Pixel (T-012, DEC-010): solo eventos aprobados y sin datos personales. track() no hace nada sin consentimiento.
  const viewContentEnviado = useRef(false);
  useEffect(() => {
    if (!campana?.se_puede_comprar || viewContentEnviado.current) return;
    viewContentEnviado.current = true;
    track("ViewContent", { content_ids: [CODIGO], content_type: "product", content_name: campana.nombre, value: campana.precio_pack, currency: "EUR" });
  }, [campana]);
  datosRef.current = datos;
  const firma = `${cantidad}:${cp}:${quoteKey}`;
  const disponibilidad = campana?.disponibles ?? 0;
  const comprable = !!campana?.se_puede_comprar;

  useEffect(() => {
    if (!compra || !comprable || !cpCompleto || cantidad < 1 || cantidad > disponibilidad) {
      setPresupuesto(null);
      setQuoteLoading(false);
      return;
    }
    let active = true;
    setQuoteLoading(true);
    setQuoteError(null);
    const t = setTimeout(async () => {
      const r = await pedirPresupuesto(datosRef.current);
      if (!active) return;
      setQuoteLoading(false);
      if (r.ok) {
        setPresupuesto(r);
        setQuoteFor(firma);
      } else {
        setPresupuesto(null);
        setQuoteError(mensajeError(r));
        if (r.error === "campana_agotada") {
          const restantes = Number(r.disponibles ?? 0);
          setCampana((c) => c ? { ...c, disponibles: restantes, agotado: restantes === 0, se_puede_comprar: restantes > 0 } : c);
          if (restantes > 0) setCantidad(restantes);
        } else if (r.error === "campana_cerrada" || r.error === "campana_no_disponible") {
          setCampana((c) => c ? { ...c, se_puede_comprar: false } : c);
        }
      }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [compra, comprable, cantidad, disponibilidad, cpCompleto, firma]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cliente.email.trim());
  const telOk = /^[+0-9][0-9\s]{7,}$/.test(cliente.telefono.trim());
  const clienteOk = cliente.nombre.trim().length > 1 && cliente.apellidos.trim().length > 1 && emailOk && telOk;
  const entregaOk = cliente.direccion.trim().length > 3 && cpCompleto && cliente.ciudad.trim().length > 1;
  const quoteActual = quoteFor === firma && !quoteLoading && !quoteError && cpCompleto;
  const puedePagar = comprable && cantidad >= 1 && cantidad <= disponibilidad && !!config && aceptaCondiciones && clienteOk && entregaOk && !!presupuesto?.fecha_envio && quoteActual && !sending;

  async function confirmar() {
    if (!puedePagar || !presupuesto || !config || !presupuesto.fecha_envio) return;
    setSending(true);
    setError(null);
    const r = await confirmarPedido({
      ...datos, acepta_condiciones: true, condiciones_version: config.condiciones_version,
      acepta_comercial: aceptaComercial, total_esperado: presupuesto.total,
      fecha_envio_esperada: presupuesto.fecha_envio,
    });
    setSending(false);
    if (r.ok) { registrarPurchase(r); setDone(r); return; }
    setError(mensajeError(r));
    if (r.error === "precio_actualizado" || r.error === "fecha_envio_actualizada") {
      setPresupuesto((p) => p ? {
        ...p,
        ...(r.subtotal !== undefined ? { subtotal: Number(r.subtotal) } : {}),
        ...(r.envio !== undefined ? { envio: Number(r.envio) } : {}),
        ...(r.total !== undefined ? { total: Number(r.total) } : {}),
        ...(r.fecha_envio !== undefined ? { fecha_envio: r.fecha_envio } : {}),
        ...(r.plazo_cancelacion !== undefined ? { plazo_cancelacion: r.plazo_cancelacion } : {}),
        ...(r.puede_cancelar !== undefined ? { puede_cancelar: !!r.puede_cancelar } : {}),
      } : p);
      if (r.error === "precio_actualizado") setQuoteKey((k) => k + 1);
    } else if (r.error === "campana_agotada") {
      const restantes = Number(r.disponibles ?? 0);
      setCampana((c) => c ? { ...c, disponibles: restantes, agotado: restantes === 0, se_puede_comprar: restantes > 0 } : c);
      if (restantes > 0) { setCantidad(restantes); setQuoteKey((k) => k + 1); }
    } else if (r.error === "campana_cerrada" || r.error === "campana_no_disponible") {
      setCampana((c) => c ? { ...c, se_puede_comprar: false } : c);
    } else if (r.error === "condiciones_version_no_vigente") {
      setAceptaCondiciones(false);
      setConfig(null);
      setLoadKey((k) => k + 1);
    }
  }

  if (loading) return <main className="mx-auto w-full max-w-2xl px-5 py-12"><p role="status" className="text-muted-foreground">Cargando campaña…</p></main>;
  if (noDisponible) return <main className="px-5 py-12"><h1 className="text-2xl font-bold">Campaña no disponible</h1></main>;
  if (loadError || !campana || !config) return <main className="mx-auto w-full max-w-2xl space-y-4 px-5 py-12"><p role="alert">{loadError ?? mensajeError({ ok: false, error: "red" })}</p><Button onClick={() => setLoadKey((k) => k + 1)}>Reintentar</Button></main>;

  if (done) return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      {done.numero ? <>
        <p className="text-lg font-bold text-muted-foreground">Tu pedido es el</p>
        <div className="flex items-center gap-4">
          <img src="/brand/yllt-sello.png" alt="" aria-hidden="true" className="h-14 w-14 object-contain" />
          <p className="animate-pop font-display text-7xl font-bold text-yllt-naranja">{done.numero}</p>
        </div>
      </> : <p className="text-2xl font-black">Pedido recibido, pendiente de pago</p>}
      <p className="text-xl font-bold">Total (IVA incluido): {euro(done.total)}</p>
      {done.fecha_envio && <p className="max-w-sm text-lg font-bold">Tu pedido saldrá el {fechaEnvioLabel(done.fecha_envio)} con SEUR.</p>}
      <p className="max-w-sm">Entrega prevista el viernes 18 de diciembre antes de las 13:30.</p>
      {done.puede_cancelar && done.plazo_cancelacion ? <p className="max-w-sm text-sm text-muted-foreground">Puedes cancelarlo gratis hasta el {plazoLabel(done.plazo_cancelacion)}. Escríbenos a rrss.yollevolatarta@gmail.com con tu número de pedido.</p> : <p className="max-w-sm text-sm text-muted-foreground">Este pedido ya no se puede cancelar.</p>}
      {done.pago_simulado && <p className="rounded-lg bg-warn-soft px-4 py-3 font-bold">MODO PRUEBAS — no se cobra</p>}
      <Button asChild className="mt-6 h-auto rounded-full px-8 py-4 text-lg font-extrabold"><Link to="/web">Volver al inicio</Link></Button>
    </main>
  );

  const expediciones = campana.packs_por_envio > 0 ? Math.ceil((presupuesto?.packs ?? cantidad) / campana.packs_por_envio) : 1;
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-12 pt-5">
      <div className="flex aspect-[16/9] items-center justify-center bg-yllt-rosa text-sm font-medium text-foreground" role="img" aria-label="Imagen de la campaña">Imagen de la campaña</div>
      <section className="space-y-4 py-7">
        <h1 className="text-3xl font-black leading-tight sm:text-4xl">{campana.nombre}</h1>
        <p className="text-lg leading-relaxed">Pack cerrado de 6 tartas en lata. 30 € el pack, envío 8,90 € por cada 2 packs. Sale el 17 de diciembre y llega el 18 antes de las 13:30. Solo envío a España peninsular.</p>
        {!comprable && <p role="status" className="rounded-lg bg-warn-soft px-4 py-4 text-xl font-bold">{campana.agotado ? "Campaña agotada" : "Campaña cerrada"}</p>}
        {config.pago_web_modo === "simulado" && <p className="rounded-lg bg-warn-soft px-4 py-3 text-center font-black">MODO PRUEBAS — no se cobra</p>}
      </section>
      <section className="border-y border-border py-6">
        <h2 className="mb-5 text-2xl font-bold">Las 6 tartas</h2>
        {!campana.alergenos_completos && <p role="status" className="mb-5 rounded-lg border border-warn bg-warn-soft px-4 py-4 font-bold">Información de alérgenos pendiente de confirmar</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {campana.tartas.map((t) => <article key={t.receta_id} className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-lg font-bold">{t.nombre}</h3>
            <p className="mt-2 text-sm leading-relaxed">{t.descripcion}</p>
            {t.alergenos.length > 0 && <ul aria-label={`Alérgenos de ${t.nombre}`} className="mt-3 flex flex-wrap gap-2">
              {t.alergenos.map((a) => <li key={a.codigo} className="rounded border border-border bg-muted px-2 py-1 text-xs" title={a.nombre}><span className="font-bold">{a.sigla}</span> · {a.nombre}</li>)}
            </ul>}
          </article>)}
        </div>
        <div className="mt-6 space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-bold">Alérgenos</h2>
          <p>Debajo de cada tarta tienes sus alérgenos: los de la crema, el topping y el crumble de galleta. Revísalos antes de comprar, porque el pack es cerrado y no se puede cambiar ninguna tarta.</p>
          <p>Todas se elaboran en nuestro obrador, donde se manipulan gluten, frutos de cáscara, sésamo, leche y huevo. Puede contener trazas de cualquiera de ellos. Si tienes una alergia o intolerancia, escríbenos a rrss.yollevolatarta@gmail.com antes de comprar.</p>
        </div>
      </section>
      <div className="space-y-5 py-7">
        <CondicionesCampana />
        {comprable && !compra && <Button className="h-auto w-full rounded-full bg-yllt-naranja px-7 py-4 text-lg font-extrabold text-yllt-naranja-foreground hover:bg-yllt-naranja/90" onClick={() => { track("InitiateCheckout", { content_ids: [CODIGO], content_type: "product", num_items: cantidad, currency: "EUR" }); setCompra(true); setAceptaCondiciones(false); setAceptaComercial(false); requestAnimationFrame(() => document.getElementById("compra-diciembre")?.scrollIntoView({ block: "start" })); }}>Comprar pack</Button>}
      </div>
      {comprable && compra && <section id="compra-diciembre" className="scroll-mt-5 border-t border-border pt-7">
        {config.pago_web_modo === "simulado" && <p className="mb-5 rounded-lg bg-warn-soft px-4 py-3 text-center font-black">MODO PRUEBAS — no se cobra</p>}
        <h2 className="mb-5 text-2xl font-black">Tu pedido</h2>
        <form onSubmit={(e) => { e.preventDefault(); void confirmar(); }} className="space-y-6">
          <label className="block max-w-xs"><span className="mb-2 block text-sm font-bold">Cantidad de packs</span>
            <select value={cantidad} disabled={sending} onChange={(e) => setCantidad(Number(e.target.value))} className="min-h-12 w-full rounded-lg border-2 border-border bg-card px-4 py-3 text-base font-bold">
              {Array.from({ length: disponibilidad }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          {disponibilidad < 10 && <p className="font-bold">Quedan {disponibilidad} packs</p>}
          <fieldset disabled={sending} className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-3 text-xl font-bold">Tus datos y dirección de envío</legend>
            {CAMPOS.map((f) => <label key={f.key} className={f.key === "direccion" ? "block sm:col-span-2" : "block"}>
              <span className="mb-1 block text-xs font-extrabold uppercase text-muted-foreground">{f.label}</span>
              <input type={f.type} autoComplete={f.autoComplete} value={cliente[f.key]} required inputMode={f.key === "codigo_postal" ? "numeric" : undefined} onChange={(e) => setCliente((c) => ({ ...c, [f.key]: e.target.value }))} className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-base font-bold outline-none focus:border-primary" />
            </label>)}
          </fieldset>
          <p className="text-[11px] text-muted-foreground">YO LLEVO LA TARTA, S.L.U. trata tus datos para gestionar tu pedido. Más información y tus derechos en la <a href="/privacidad" className="underline">Política de privacidad</a>.</p>
          <div aria-live="polite" className="space-y-3 border-y border-border py-5">
            <div className="flex justify-between gap-4 font-bold"><span>Productos</span><span>{presupuesto && quoteActual ? euro(presupuesto.subtotal) : "—"}</span></div>
            <div className="flex justify-between gap-4 font-bold"><span>Envío</span><span>{presupuesto && quoteActual ? euro(presupuesto.envio) : "—"}</span></div>
            <div className="flex justify-between gap-4 text-lg font-black"><span>Total (IVA incluido)</span><span className="shrink-0">{presupuesto && quoteActual ? euro(presupuesto.total) : "—"}</span></div>
            {quoteLoading && <p className="text-sm text-muted-foreground">Calculando…</p>}
            {presupuesto && quoteActual && <>
              {presupuesto.fecha_envio && <p>Tu pedido saldrá el {fechaEnvioLabel(presupuesto.fecha_envio)} con SEUR.</p>}
              {expediciones > 1 && <p>Sale en {expediciones} expediciones, que pueden llegar por separado</p>}
            </>}
          </div>
          {quoteError && <div role="alert" className="space-y-3 text-destructive"><p>{quoteError}</p><Button type="button" variant="outline" onClick={() => setQuoteKey((k) => k + 1)}>Reintentar</Button></div>}
          <div className="space-y-3">
            <label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" checked={aceptaCondiciones} disabled={sending} onChange={(e) => setAceptaCondiciones(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-strong" /><span>{config.texto_casilla_condiciones}</span></label>
            <label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" checked={aceptaComercial} disabled={sending} onChange={(e) => setAceptaComercial(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-strong" /><span>{config.texto_casilla_comercial}</span></label>
          </div>
          <CondicionesCampana />
          {presupuesto && quoteActual && <p className="text-sm text-muted-foreground">{presupuesto.puede_cancelar && presupuesto.plazo_cancelacion ? `Puedes cancelarlo gratis hasta el ${plazoLabel(presupuesto.plazo_cancelacion)}.` : "Una vez pagado, este pedido ya no se puede cancelar."}</p>}
          {error && <p role="alert" className="font-bold text-destructive">{error}</p>}
          <Button type="submit" disabled={!puedePagar} className="h-auto w-full rounded-full bg-yllt-naranja px-7 py-4 text-lg font-extrabold text-yllt-naranja-foreground hover:bg-yllt-naranja/90">{sending ? "Enviando…" : "Pagar ahora"}</Button>
        </form>
      </section>}
    </main>
  );
}

/** Purchase solo con pago real confirmado por el servidor; nunca con pago simulado. Una vez por pedido.
 *  El pedido_id solo se usa en este navegador para no repetir el evento: no se envía a Meta. */
function registrarPurchase(r: ResultadoPedido) {
  if (r.pago_simulado !== false || r.pago !== "pagado") return;
  const marca = `yllt_purchase_${r.pedido_id}`;
  try {
    if (window.sessionStorage.getItem(marca)) return;
    window.sessionStorage.setItem(marca, "1");
  } catch {
    // sin sessionStorage: se envía igualmente una vez en esta confirmación
  }
  track("Purchase", { value: r.total, currency: "EUR" });
}
