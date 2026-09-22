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
import { WEB_FORMATS, formatoDe, useWebOrder } from "@/lib/web-order";
import { precioPorFormato, supabaseYLLT } from "@/lib/supabase-yllt";

export const Route = createFileRoute("/web/configura")({
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

type Step = "formato" | "catalogo" | "crema" | "toppings" | "resumen" | "checkout";
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

function WebConfigura() {
  const navigate = useNavigate();
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

  const flow: Step[] = useMemo(() => {
    const base: Step[] = ["formato"];
    if (mode === "recetas") base.push("catalogo");
    else base.push("crema", "toppings");
    base.push("resumen", "checkout");
    return base;
  }, [mode]);

  const [step, setStep] = useState<Step>(() =>
    mode === "recetas" && formatId && (recetaId || packId) ? "resumen" : "formato",
  );

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

  const numTartas = pack ? pack.tamano : 1;

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

  const total = useMemo(() => {
    if (!format || !formato) return 0;
    if (mode === "recetas") {
      if (receta) return precioPorFormato(receta, formato);
      if (pack) return precioPorFormato(pack, formato);
      return 0;
    }
    if (isShake) return format.basePrice;
    return format.basePrice + toppings.reduce((s, t) => s + t.price, 0);
  }, [format, formato, isShake, mode, pack, receta, toppings]);

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
      default:
        return true;
    }
  })();

  const goNext = () => {
    const next = flow[index + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
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
    if (!format || !formato || !clienteOk || !entregaOk) return;
    setSending(true);
    setError(null);
    const precio = Number(total.toFixed(2));
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

    // En la web nunca hay tarta abierta, así que no hay decoración con foto.
    const foto = false;
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
    if (lineErr) {
      setSending(false);
      setError("No hemos podido enviar el pedido. Inténtalo otra vez.");
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
          <p className="max-w-xs text-lg font-bold">Te avisaremos cuando salga 🚚</p>
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
              <hr className="border-border" />
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-black">Total</span>
                <span className="text-2xl font-black text-brand-red">{euro(total)}</span>
              </div>
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
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setEntrega(o.v)}
                  className={`card-soft p-4 text-left ${entrega === o.v ? "card-selected animate-pop" : ""}`}
                >
                  <span className="block text-3xl">{o.emoji}</span>
                  <span className="mt-1 block text-base font-black leading-tight">{o.label}</span>
                </button>
              ))}
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
            <p className="text-2xl font-black leading-none text-brand-red">{euro(total)}</p>
          </div>
          {step !== "checkout" ? (
            <button
              disabled={!canContinue}
              onClick={goNext}
              className="rounded-full bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground shadow-card transition disabled:opacity-40"
            >
              Seguir
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
